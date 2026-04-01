import path from "path";
import { appendText, ensureDir, exists, readText, writeText } from "./fs-utils";
import { getProjectDiaryDir } from "./paths";
import { DiaryCategory, DiaryPreference, DiaryStore } from "./types";

function storePath(projectRoot: string): string {
  return path.join(getProjectDiaryDir(projectRoot), "preferences.json");
}

function eventsPath(projectRoot: string): string {
  return path.join(getProjectDiaryDir(projectRoot), "events.jsonl");
}

function defaultStore(): DiaryStore {
  return {
    version: 1,
    categories: {
      "personal-knowledge": [],
      "professional-knowledge": [],
      hobbies: [],
      interests: [],
      preferences: [],
      archetype: []
    }
  };
}

export function loadDiary(projectRoot: string): DiaryStore {
  const file = storePath(projectRoot);
  if (!exists(file)) {
    return defaultStore();
  }

  try {
    const parsed = JSON.parse(readText(file)) as DiaryStore;
    if (!(parsed as DiaryStore).categories) {
      const legacy = parsed as unknown as { preferences?: DiaryPreference[] };
      const migrated = defaultStore();
      for (const pref of legacy.preferences ?? []) {
        migrated.categories.preferences.push(pref);
      }
      return migrated;
    }
    const base = defaultStore();
    const merged: DiaryStore = {
      version: parsed.version ?? 1,
      categories: {
        ...base.categories,
        ...parsed.categories
      }
    };
    return merged;
  } catch {
    return defaultStore();
  }
}

export function saveDiary(projectRoot: string, store: DiaryStore): void {
  ensureDir(getProjectDiaryDir(projectRoot));
  writeText(storePath(projectRoot), `${JSON.stringify(store, null, 2)}\n`);
}

export function setPreference(input: {
  projectRoot: string;
  category?: DiaryCategory;
  key: string;
  value: string;
  confidence?: number;
  source?: "user_explicit" | "inferred";
}): DiaryStore {
  const store = loadDiary(input.projectRoot);
  const now = new Date().toISOString();
  const confidence = input.confidence ?? 1;
  const source = input.source ?? "user_explicit";
  const category = input.category ?? "preferences";
  const bucket = store.categories[category];

  const existing = bucket.find((p) => p.key === input.key);
  if (existing) {
    existing.value = input.value;
    existing.confidence = confidence;
    existing.source = source;
    existing.updated_at = now;
  } else {
    const pref: DiaryPreference = {
      key: input.key,
      value: input.value,
      confidence,
      source,
      updated_at: now
    };
    bucket.push(pref);
  }

  saveDiary(input.projectRoot, store);
  appendEvent(input.projectRoot, {
    type: "preference_set",
    category,
    key: input.key,
    value: input.value,
    confidence,
    source,
    ts: now
  });

  return store;
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 80);
}

function upsertInferred(projectRoot: string, key: string, value: string): void {
  setPreference({
    projectRoot,
    category: "preferences",
    key,
    value: normalizeValue(value),
    confidence: 0.85,
    source: "inferred"
  });
}

export function inferPreferencesFromRequest(projectRoot: string, task: string): void {
  const t = task.toLowerCase();

  if (/(prefer|always|default to).*(react)/.test(t) || /(use react)/.test(t)) {
    upsertInferred(projectRoot, "frontend.framework", "react");
  }
  if (/(prefer|always|default to).*(vue)/.test(t) || /(use vue)/.test(t)) {
    upsertInferred(projectRoot, "frontend.framework", "vue");
  }
  if (/(no inline styles|avoid inline styles|never inline styles)/.test(t)) {
    upsertInferred(projectRoot, "frontend.styling", "no-inline-styles");
  }
  if (/(use bem|bem naming)/.test(t)) {
    upsertInferred(projectRoot, "frontend.css_convention", "bem");
  }
  if (/(use tokens|design tokens|token based)/.test(t)) {
    upsertInferred(projectRoot, "frontend.design_system", "token-first");
  }
  if (/(be concise|short answers|brief)/.test(t)) {
    upsertInferred(projectRoot, "assistant.response_style", "concise");
  }
  if (/(be detailed|thorough|explain deeply)/.test(t)) {
    upsertInferred(projectRoot, "assistant.response_style", "detailed");
  }

  if (/(i am|i'm|my role is).*(developer|engineer|architect|founder|designer)/.test(t)) {
    setPreference({
      projectRoot,
      category: "professional-knowledge",
      key: "user.role",
      value: normalizeValue(t.match(/(developer|engineer|architect|founder|designer)/)?.[1] ?? "unknown"),
      confidence: 0.75,
      source: "inferred"
    });
  }
  if (/(my hobby|i enjoy|i like).*(gaming|music|fitness|reading|coding|video)/.test(t)) {
    setPreference({
      projectRoot,
      category: "hobbies",
      key: "user.hobby",
      value: normalizeValue(t.match(/(gaming|music|fitness|reading|coding|video)/)?.[1] ?? "general"),
      confidence: 0.7,
      source: "inferred"
    });
  }
}

export function getPreferenceMap(projectRoot: string): Record<string, string> {
  const store = loadDiary(projectRoot);
  const map: Record<string, string> = {};
  for (const category of Object.keys(store.categories) as DiaryCategory[]) {
    for (const pref of store.categories[category]) {
      map[`${category}.${pref.key}`] = pref.value;
    }
  }
  return map;
}

export function buildDiaryPrompt(projectRoot: string, maxItems = 12, maxChars = 600): string {
  const store = loadDiary(projectRoot);
  const sectionOrder: DiaryCategory[] = [
    "archetype",
    "preferences",
    "professional-knowledge",
    "personal-knowledge",
    "interests",
    "hobbies"
  ];

  const lines: string[] = ["### User Session Prep (Diary)"];
  let total = 0;

  for (const category of sectionOrder) {
    const bucket = [...store.categories[category]].sort((a, b) => {
      if (a.source !== b.source) {
        return a.source === "user_explicit" ? -1 : 1;
      }
      return b.updated_at.localeCompare(a.updated_at);
    });

    const picked = bucket.slice(0, 3);
    if (picked.length === 0) {
      continue;
    }

    const heading = `- ${category}:`;
    if (total + heading.length > maxChars) {
      break;
    }
    lines.push(heading);
    total += heading.length;

    for (const pref of picked) {
      if (maxItems <= 0) {
        break;
      }
      const line = `  - ${pref.key}=${pref.value}`;
      if (total + line.length > maxChars) {
        break;
      }
      lines.push(line);
      total += line.length;
      maxItems -= 1;
    }
  }

  if (lines.length <= 1) {
    return "";
  }
  return lines.join("\n");
}

export function appendEvent(projectRoot: string, event: Record<string, unknown>): void {
  ensureDir(getProjectDiaryDir(projectRoot));
  const file = eventsPath(projectRoot);
  const line = `${JSON.stringify(event)}\n`;
  appendText(file, line);
}
