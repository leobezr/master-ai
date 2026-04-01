#!/usr/bin/env node
import path from "path";
import { getGlobalIndexPath, getGlobalRegistryDir, getProjectRegistryDir } from "./paths";
import { initializeGlobalRegistry, loadMergedSkills } from "./registry";
import { resolveSkills } from "./resolver";
import { AgentType } from "./types";
import { resolveForRuntime } from "./runtime-hook";
import { getPreferenceMap, loadDiary, setPreference } from "./diary";

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) {
    return undefined;
  }
  return process.argv[idx + 1];
}

function parseAgent(raw: string | undefined): AgentType {
  const value = (raw ?? "senior_developer") as AgentType;
  if (value !== "senior_developer" && value !== "senior_architect" && value !== "youtuber") {
    throw new Error(`Invalid --agent value: ${String(raw)}`);
  }
  return value;
}

function printUsage(): void {
  console.log("Usage:");
  console.log("  node dist/cli.js init");
  console.log("  node dist/cli.js list [--project <path>]");
  console.log("  node dist/cli.js resolve --agent <senior_developer|senior_architect|youtuber> --task <text> [--project <path>] [--top-k 3] [--threshold 0.72] [--json]");
  console.log("  node dist/cli.js runtime --agent <senior_developer|senior_architect|youtuber> --task <text> [--project <path>] [--top-k 3] [--threshold 0.72] [--json]");
  console.log("  node dist/cli.js diary-set --category <personal-knowledge|professional-knowledge|hobbies|interests|preferences|archetype> --key <name> --value <value> [--project <path>] [--confidence 1] [--source user_explicit|inferred]");
  console.log("  node dist/cli.js diary-list [--project <path>] [--json]");
}

function runInit(): void {
  const registryDir = initializeGlobalRegistry();
  console.log(`Initialized machine-global skill registry at: ${registryDir}`);
  console.log(`Global index: ${getGlobalIndexPath()}`);
}

function runList(): void {
  const project = getArg("--project") ? path.resolve(getArg("--project") as string) : process.cwd();
  const skills = loadMergedSkills(project);
  console.log(`Global registry: ${getGlobalRegistryDir()}`);
  console.log(`Project registry: ${getProjectRegistryDir(project)}`);
  console.log(`Merged skill count: ${skills.length}`);

  for (const skill of skills) {
    console.log(`- ${skill.manifest.skill_id} (${skill.source}) :: agents=[${skill.manifest.agent_affinity.join(", ")}]`);
  }
}

function runResolve(): void {
  const task = getArg("--task");
  if (!task) {
    throw new Error("Missing required --task argument");
  }

  const agent = parseAgent(getArg("--agent"));
  const topKRaw = getArg("--top-k");
  const thresholdRaw = getArg("--threshold");
  const topK = topKRaw ? Number(topKRaw) : 3;
  const threshold = thresholdRaw ? Number(thresholdRaw) : 0.72;
  const project = getArg("--project") ? path.resolve(getArg("--project") as string) : process.cwd();

  const merged = loadMergedSkills(project);
  const result = resolveSkills({
    task,
    agent,
    skills: merged,
    topK,
    confidenceThreshold: threshold
  });

  const asJson = process.argv.includes("--json");
  if (asJson) {
    console.log(
      JSON.stringify(
        {
          agent,
          intent: result.intent,
          selected: result.selected,
          skipped: result.skipped
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`agent=${agent}`);
  console.log(`intent=${result.intent}`);
  if (result.selected.length === 0) {
    console.log("No skills selected above threshold. Falling back to default behavior.");
    return;
  }

  console.log("Selected skills:");
  for (const skill of result.selected) {
    console.log(`- ${skill.manifest.skill_id} score=${skill.score.toFixed(4)} reasons=[${skill.reasons.join(", ")}]`);
    if (skill.manifest.model_strategy) {
      const strategy = skill.manifest.model_strategy;
      console.log(
        `  model_strategy primary=${strategy.primary_model} secondary=${strategy.secondary_model ?? "n/a"}`
      );
      if (strategy.phase_model_overrides) {
        const phases = Object.entries(strategy.phase_model_overrides)
          .map(([phase, model]) => `${phase}:${model}`)
          .join(", ");
        console.log(`  phase_overrides ${phases}`);
      }
    }
  }
}

function runRuntime(): void {
  const task = getArg("--task");
  if (!task) {
    throw new Error("Missing required --task argument");
  }

  const agent = parseAgent(getArg("--agent"));
  const topKRaw = getArg("--top-k");
  const thresholdRaw = getArg("--threshold");
  const topK = topKRaw ? Number(topKRaw) : 3;
  const threshold = thresholdRaw ? Number(thresholdRaw) : 0.72;
  const project = getArg("--project") ? path.resolve(getArg("--project") as string) : process.cwd();
  const asJson = process.argv.includes("--json");

  const runtime = resolveForRuntime({
    agent,
    task,
    options: {
      projectRoot: project,
      topK,
      threshold
    }
  });

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          agent,
          intent: runtime.intent,
          selected: runtime.selected,
          injectedPrompt: runtime.injectedPrompt
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`agent=${agent}`);
  console.log(`intent=${runtime.intent}`);
  if (runtime.selected.length === 0) {
    console.log("No skills selected above threshold. Falling back to default behavior.");
    return;
  }

  console.log("Selected skills:");
  for (const skill of runtime.selected) {
    console.log(`- ${skill.manifest.skill_id} (${skill.source}) score=${skill.score.toFixed(4)}`);
  }
  console.log("Injected prompt:");
  console.log(runtime.injectedPrompt);
}

function runDiarySet(): void {
  const key = getArg("--key");
  const value = getArg("--value");
  if (!key || !value) {
    throw new Error("Missing required --key or --value argument");
  }
  const project = getArg("--project") ? path.resolve(getArg("--project") as string) : process.cwd();
  const confidenceRaw = getArg("--confidence");
  const sourceRaw = getArg("--source");
  const categoryRaw = getArg("--category");
  const confidence = confidenceRaw ? Number(confidenceRaw) : 1;
  const source = sourceRaw === "inferred" ? "inferred" : "user_explicit";
  const validCategories = [
    "personal-knowledge",
    "professional-knowledge",
    "hobbies",
    "interests",
    "preferences",
    "archetype"
  ];
  const category = validCategories.includes(String(categoryRaw))
    ? (categoryRaw as
        | "personal-knowledge"
        | "professional-knowledge"
        | "hobbies"
        | "interests"
        | "preferences"
        | "archetype")
    : "preferences";

  const store = setPreference({
    projectRoot: project,
    category,
    key,
    value,
    confidence,
    source
  });

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(store, null, 2));
    return;
  }

  console.log(`Saved preference: ${key}=${value}`);
}

function runDiaryList(): void {
  const project = getArg("--project") ? path.resolve(getArg("--project") as string) : process.cwd();
  const asJson = process.argv.includes("--json");
  const store = loadDiary(project);

  if (asJson) {
    console.log(JSON.stringify(store, null, 2));
    return;
  }

  const map = getPreferenceMap(project);
  const keys = Object.keys(map);
  if (keys.length === 0) {
    console.log("No diary preferences found.");
    return;
  }

  console.log("Diary preferences:");
  for (const key of keys) {
    console.log(`- ${key}: ${map[key]}`);
  }
}

function main(): void {
  const command = process.argv[2];

  try {
    switch (command) {
      case "init":
        runInit();
        break;
      case "list":
        runList();
        break;
      case "resolve":
        runResolve();
        break;
      case "runtime":
        runRuntime();
        break;
      case "diary-set":
        runDiarySet();
        break;
      case "diary-list":
        runDiaryList();
        break;
      default:
        printUsage();
        process.exitCode = 1;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  }
}

main();
