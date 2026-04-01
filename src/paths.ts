import os from "os";
import path from "path";

export function getMachineGlobalRoot(): string {
  return path.join(os.homedir(), ".agent-skills");
}

export function getGlobalRegistryDir(): string {
  return path.join(getMachineGlobalRoot(), "registry");
}

export function getGlobalIndexPath(): string {
  return path.join(getMachineGlobalRoot(), "index.json");
}

export function getProjectSkillsDir(projectRoot: string): string {
  return path.join(projectRoot, ".agent-skills");
}

export function getProjectRegistryDir(projectRoot: string): string {
  return path.join(getProjectSkillsDir(projectRoot), "registry");
}

export function getProjectDiaryDir(projectRoot: string): string {
  return path.join(projectRoot, ".diary");
}
