import { LoadedSkill } from "./registry";
import { AgentType, RankedSkill, ResolveResult } from "./types";

function classifyIntent(task: string): string {
  const t = task.toLowerCase();
  if (/(youtube|video|thumbnail|hook|title|script|shorts)/.test(t)) {
    return "content_video";
  }
  if (/(react|vue|frontend|ui|component|design system|token|bem|css|layout|prop drilling)/.test(t)) {
    return "frontend_ui";
  }
  if (/(architecture|system design|scaling|tradeoff|data model|api design)/.test(t)) {
    return "architecture";
  }
  if (/(bug|debug|error|fix|failing|exception|issue)/.test(t)) {
    return "debugging";
  }
  return "general";
}

function intentScore(intent: string, skillId: string): number {
  if (intent === "content_video" && skillId.includes("youtuber")) {
    return 1;
  }
  if (intent === "architecture" && (skillId.includes("plan-eng-review") || skillId.includes("architect"))) {
    return 1;
  }
  if (intent === "frontend_ui" && skillId.includes("frontend")) {
    return 1;
  }
  if (intent === "debugging" && skillId.includes("investigate")) {
    return 1;
  }
  return 0.35;
}

function baseBoostForSkill(skillId: string): number {
  if (skillId === "youtuber-story-architect-brutal") {
    return 0.2;
  }
  if (skillId === "senior-software-architect-brutal") {
    return 0.2;
  }
  if (skillId === "senior-frontend-architect-brutal") {
    return 0.2;
  }
  return 0;
}

function triggerScore(task: string, patterns: string[]): number {
  const t = task.toLowerCase();
  if (patterns.length === 0) {
    return 0;
  }
  let hits = 0;
  for (const p of patterns) {
    const pattern = p.toLowerCase().trim();
    const tokens = pattern.split(/\s+/).filter(Boolean);
    const phraseMatch = t.includes(pattern);
    const tokenMatch = tokens.length > 1 && tokens.every((token) => t.includes(token));
    if (phraseMatch || tokenMatch) {
      hits += 1;
    }
  }
  return Math.min(1, hits / 4);
}

export function resolveSkills(input: {
  task: string;
  agent: AgentType;
  skills: LoadedSkill[];
  topK?: number;
  confidenceThreshold?: number;
}): ResolveResult {
  const topK = input.topK ?? 3;
  const threshold = input.confidenceThreshold ?? 0.72;
  const intent = classifyIntent(input.task);

  const ranked: RankedSkill[] = input.skills
    .filter((s) => s.manifest.agent_affinity.includes(input.agent))
    .map((s) => {
      const iScore = intentScore(intent, s.manifest.skill_id);
      const tScore = triggerScore(input.task, s.manifest.trigger_patterns);
      const hScore = s.manifest.historical_success;
      const pScore = baseBoostForSkill(s.manifest.skill_id);
      const total = iScore * 0.45 + tScore * 0.3 + hScore * 0.2 + pScore * 0.05;

      const reasons: string[] = [];
      reasons.push(`intent=${iScore.toFixed(2)}`);
      reasons.push(`trigger=${tScore.toFixed(2)}`);
      reasons.push(`history=${hScore.toFixed(2)}`);
      reasons.push(`priority=${pScore.toFixed(2)}`);

      return {
        manifest: s.manifest,
        score: Number(total.toFixed(4)),
        reasons
      };
    })
    .sort((a, b) => b.score - a.score);

  const selected = ranked.filter((s) => s.score >= threshold).slice(0, topK);
  const skipped = ranked.filter((s) => !selected.some((x) => x.manifest.skill_id === s.manifest.skill_id));

  return { selected, skipped, intent };
}
