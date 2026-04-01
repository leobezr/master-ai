import { loadMergedSkills } from "./registry";
import { resolveSkills } from "./resolver";
import { AgentType, RuntimeResolveResult, SelectedSkill } from "./types";

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

  return {
    intent: ranked.intent,
    selected,
    skipped: ranked.skipped,
    injectedPrompt
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
