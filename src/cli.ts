import path from "path";
import { getGlobalIndexPath, getGlobalRegistryDir, getProjectRegistryDir } from "./paths";
import { initializeGlobalRegistry, loadMergedSkills } from "./registry";
import { resolveSkills } from "./resolver";
import { AgentType } from "./types";

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
  console.log("  node dist/cli.js resolve --agent <senior_developer|senior_architect|youtuber> --task <text> [--project <path>] [--top-k 3] [--threshold 0.72]");
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

  console.log(`agent=${agent}`);
  console.log(`intent=${result.intent}`);
  if (result.selected.length === 0) {
    console.log("No skills selected above threshold. Falling back to default behavior.");
    return;
  }

  console.log("Selected skills:");
  for (const skill of result.selected) {
    console.log(`- ${skill.manifest.skill_id} score=${skill.score.toFixed(4)} reasons=[${skill.reasons.join(", ")}]`);
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
