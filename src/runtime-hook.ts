import { loadMergedSkills } from "./registry";
import { resolveSkills } from "./resolver";
import { AgentType, RuntimeResolveResult, SelectedSkill } from "./types";
import { appendEvent, buildDiaryPrompt, inferPreferencesFromRequest } from "./diary";

export interface RuntimeResolveOptions {
  projectRoot?: string;
  topK?: number;
  threshold?: number;
}

export function resolveForRuntime(input: {
  agent: AgentType;
  task: string;
  options?: RuntimeResolveOptions;
}): RuntimeResolveResult {
  const projectRoot = input.options?.projectRoot ?? process.cwd();
  const topK = input.options?.topK ?? 3;
  const threshold = input.options?.threshold ?? 0.72;

  inferPreferencesFromRequest(projectRoot, input.task);

  const allSkills = loadMergedSkills(projectRoot);
  const ranked = resolveSkills({
    task: input.task,
    agent: input.agent,
    skills: allSkills,
    topK,
    confidenceThreshold: threshold
  });

  const byId = new Map(allSkills.map((s) => [s.manifest.skill_id, s]));
  const selected: SelectedSkill[] = ranked.selected
    .map((s) => {
      const loaded = byId.get(s.manifest.skill_id);
      if (!loaded) {
        return undefined;
      }
      return {
        ...s,
        prompt: loaded.prompt,
        source: loaded.source
      };
    })
    .filter((v): v is SelectedSkill => Boolean(v));

  const injectedPrompt = selected
    .map((s) => {
      return [
        `### Skill: ${s.manifest.title} (${s.manifest.skill_id})`,
        `Source: ${s.source}`,
        `Score: ${s.score.toFixed(4)}`,
        s.prompt.trim()
      ].join("\n");
    })
    .join("\n\n");

  const preferenceBlock = buildDiaryPrompt(projectRoot, 12, 600);

  const mergedInjectedPrompt = [injectedPrompt, preferenceBlock].filter((v) => v.trim().length > 0).join("\n\n");

  appendEvent(projectRoot, {
    type: "runtime_resolve",
    ts: new Date().toISOString(),
    agent: input.agent,
    task: input.task,
    intent: ranked.intent,
    selected_skill_ids: selected.map((s) => s.manifest.skill_id)
  });

  return {
    intent: ranked.intent,
    selected,
    skipped: ranked.skipped,
    injectedPrompt: mergedInjectedPrompt
  };
}

export function buildMessagesWithSkills(input: {
  agent: AgentType;
  userPrompt: string;
  baseSystemPrompt?: string;
  options?: RuntimeResolveOptions;
}): {
  messages: Array<{ role: "system" | "user"; content: string }>;
  resolve: RuntimeResolveResult;
} {
  const resolve = resolveForRuntime({
    agent: input.agent,
    task: input.userPrompt,
    options: input.options
  });

  const systemParts: string[] = [];
  if (input.baseSystemPrompt) {
    systemParts.push(input.baseSystemPrompt.trim());
  }
  if (resolve.injectedPrompt.trim().length > 0) {
    systemParts.push("Auto-selected skills:");
    systemParts.push(resolve.injectedPrompt.trim());
  }

  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (systemParts.length > 0) {
    messages.push({ role: "system", content: systemParts.join("\n\n") });
  }
  messages.push({ role: "user", content: input.userPrompt });

  return { messages, resolve };
}
