export type AgentType = "senior_developer" | "senior_architect" | "youtuber";

export interface ModelStrategy {
  primary_model: string;
  secondary_model?: string;
  phase_model_overrides?: Record<string, string>;
  switch_policy?: string;
}

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
  model_strategy?: ModelStrategy;
}

export interface RankedSkill {
  manifest: SkillManifest;
  score: number;
  reasons: string[];
}

export interface SelectedSkill extends RankedSkill {
  prompt: string;
  source: "project" | "global";
}

export interface ResolveResult {
  selected: RankedSkill[];
  skipped: RankedSkill[];
  intent: string;
}

export interface RuntimeResolveResult {
  intent: string;
  selected: SelectedSkill[];
  skipped: RankedSkill[];
  injectedPrompt: string;
}
