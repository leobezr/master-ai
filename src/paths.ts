import os from "os";
import path from "path";
import crypto from "crypto";

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
  const digest = crypto.createHash("sha1").update(projectRoot).digest("hex").slice(0, 12);
  const projectName = path.basename(projectRoot).toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return path.join(getMachineGlobalRoot(), "diary", `${projectName}-${digest}`);
}
