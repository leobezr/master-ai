import { SkillManifest } from "./types";

interface SeedSkill {
  manifest: SkillManifest;
  prompt: string;
}

export const seedSkills: SeedSkill[] = [
  {
    manifest: {
      skill_id: "investigate",
      version: "1.0.0",
      title: "Root Cause Investigation",
      description: "Systematic debugging to find and fix root causes.",
      agent_affinity: ["senior_developer", "senior_architect"],
      capabilities: ["debugging", "incident-analysis", "hypothesis-testing"],
      trigger_patterns: ["bug", "broken", "error", "debug", "root cause", "failing"],
      when_to_use: "Use when behavior is incorrect and a root cause needs to be found.",
      required_context: ["repro steps or logs"],
      disallowed_context: ["pure brainstorming", "marketing copy"],
      historical_success: 0.88
    },
    prompt: [
      "You are in investigate mode.",
      "1) Reproduce issue",
      "2) Gather evidence",
      "3) Form hypotheses",
      "4) Prove root cause",
      "5) Implement minimal fix",
      "6) Verify with tests"
    ].join("\n")
  },
  {
    manifest: {
      skill_id: "plan-eng-review",
      version: "1.0.0",
      title: "Engineering Plan Review",
      description: "Architecture-focused planning and risk review.",
      agent_affinity: ["senior_architect"],
      capabilities: ["architecture", "data-flow", "risk-assessment", "test-strategy"],
      trigger_patterns: ["architecture", "design", "scaling", "data model", "plan", "tradeoff"],
      when_to_use: "Use before implementation to validate architecture and execution plans.",
      required_context: ["requirements", "constraints"],
      disallowed_context: ["quick one-line code edits"],
      historical_success: 0.84
    },
    prompt: [
      "You are in engineering review mode.",
      "Assess architecture, edge cases, tests, and operations readiness.",
      "Return concrete recommendations and decision rationale."
    ].join("\n")
  },
  {
    manifest: {
      skill_id: "youtuber-script-hook",
      version: "1.0.0",
      title: "YouTube Hook and Script Packager",
      description: "Generate hooks, titles, outline, and CTA for videos.",
      agent_affinity: ["youtuber"],
      capabilities: ["content-strategy", "hook-writing", "title-optimization", "audience-retention"],
      trigger_patterns: ["youtube", "video", "hook", "thumbnail", "title", "script", "shorts"],
      when_to_use: "Use for video ideation and script packaging for YouTube.",
      required_context: ["topic", "target audience"],
      disallowed_context: ["backend debugging", "database migration"],
      historical_success: 0.9
    },
    prompt: [
      "You are in YouTube creator mode.",
      "Produce 3 hook options, 5 title options, a tight outline, and CTA lines.",
      "Optimize for retention in first 30 seconds."
    ].join("\n")
  }
];
