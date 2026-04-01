import fs from "fs";
import path from "path";
import { ensureDir, exists, readText, writeText } from "./fs-utils";
import { getGlobalIndexPath, getGlobalRegistryDir, getProjectRegistryDir } from "./paths";
import { SkillManifest } from "./types";

interface LoadedSkill {
  source: "project" | "global";
  manifest: SkillManifest;
  prompt: string;
}

function skillDir(baseRegistryDir: string, skillId: string): string {
  return path.join(baseRegistryDir, skillId);
}

function skillManifestPath(baseRegistryDir: string, skillId: string): string {
  return path.join(skillDir(baseRegistryDir, skillId), "skill.json");
}

function skillPromptPath(baseRegistryDir: string, skillId: string): string {
  return path.join(skillDir(baseRegistryDir, skillId), "prompt.md");
}

function getPackagedSkillsDir(): string {
  return path.resolve(__dirname, "..", "skills");
}

function loadFromPackagedSkills(): LoadedSkill[] {
  const packagedDir = getPackagedSkillsDir();
  if (!exists(packagedDir)) {
    return [];
  }

  const dirs = fs.readdirSync(packagedDir, { withFileTypes: true });
  const skills: LoadedSkill[] = [];

  for (const dirent of dirs) {
    if (!dirent.isDirectory()) {
      continue;
    }
    const skillId = dirent.name;
    const manifestPath = path.join(packagedDir, skillId, "skill.json");
    const promptPath = path.join(packagedDir, skillId, "prompt.md");
    if (!exists(manifestPath) || !exists(promptPath)) {
      continue;
    }

    const manifest = JSON.parse(readText(manifestPath)) as SkillManifest;
    const prompt = readText(promptPath);
    skills.push({ source: "global", manifest, prompt });
  }

  return skills;
}

export function initializeGlobalRegistry(): string {
  const registryDir = getGlobalRegistryDir();
  ensureDir(registryDir);

  const packagedSkills = loadFromPackagedSkills();

  for (const skill of packagedSkills) {
    const dir = skillDir(registryDir, skill.manifest.skill_id);
    ensureDir(dir);
    writeText(skillManifestPath(registryDir, skill.manifest.skill_id), JSON.stringify(skill.manifest, null, 2));
    writeText(skillPromptPath(registryDir, skill.manifest.skill_id), `${skill.prompt}\n`);
  }

  const index = {
    version: 1,
    skills: packagedSkills.map((s) => s.manifest.skill_id)
  };
  writeText(getGlobalIndexPath(), JSON.stringify(index, null, 2));
  return registryDir;
}

function loadFromRegistry(baseRegistryDir: string, source: "project" | "global"): LoadedSkill[] {
  if (!exists(baseRegistryDir)) {
    return [];
  }

  const dirs = fs.readdirSync(baseRegistryDir, { withFileTypes: true });
  const skills: LoadedSkill[] = [];

  for (const dirent of dirs) {
    if (!dirent.isDirectory()) {
      continue;
    }
    const skillId = dirent.name;
    const manifestFile = skillManifestPath(baseRegistryDir, skillId);
    const promptFile = skillPromptPath(baseRegistryDir, skillId);
    if (!exists(manifestFile) || !exists(promptFile)) {
      continue;
    }

    const manifest = JSON.parse(readText(manifestFile)) as SkillManifest;
    const prompt = readText(promptFile);
    skills.push({ source, manifest, prompt });
  }

  return skills;
}

export function loadMergedSkills(projectRoot: string): LoadedSkill[] {
  const globalSkills = loadFromRegistry(getGlobalRegistryDir(), "global");
  const projectSkills = loadFromRegistry(getProjectRegistryDir(projectRoot), "project");

  const byId = new Map<string, LoadedSkill>();
  for (const skill of globalSkills) {
    byId.set(skill.manifest.skill_id, skill);
  }
  for (const skill of projectSkills) {
    byId.set(skill.manifest.skill_id, skill);
  }

  return Array.from(byId.values());
}

export type { LoadedSkill };
