export type AgentType = "senior_developer" | "senior_architect" | "youtuber";

export interface SkillManifest {
  skill_id: string;
  version: string;
  title: string;
  description: string;
  agent_affinity: AgentType[];
  capabilities: string[];
  trigger_patterns: string[];
  when_to_use: string;
  required_context: string[];
  disallowed_context: string[];
  historical_success: number;
}

export interface RankedSkill {
  manifest: SkillManifest;
  score: number;
  reasons: string[];
}

export interface ResolveResult {
  selected: RankedSkill[];
  skipped: RankedSkill[];
  intent: string;
}
