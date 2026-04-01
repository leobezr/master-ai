# Local Skill Marketplace (Machine-Global)

This project sets up a machine-global skill marketplace so multiple projects can reuse the same agent skills.
Packaged skills are decoupled into the repo `skills/` directory.

## What it does

- Creates a machine-global registry at `~/.agent-skills/registry`
- Seeds three starter skills
- Seeds starter skills from `skills/*` (including Story Architect Brutal)
- Supports three agents:
  - `senior_developer`
  - `senior_architect`
  - `youtuber`
- Resolves skills automatically from task text using weighted scoring
- Applies merge precedence: project-local overrides global

## Precedence

Resolution order:

1. Project-local skill: `<project>/.agent-skills/registry/<skill-id>`
2. Machine-global skill: `~/.agent-skills/registry/<skill-id>`
3. Built-in fallback in your runtime (outside this package)

## Install

```bash
npm install
npm run build
```

Install CLI globally on this machine:

```bash
npm run install:global
```

Then run from anywhere:

```bash
skill-marketplace init
skill-marketplace list --project C:/path/to/project
skill-marketplace resolve --agent youtuber --task "high retention youtube script with audit"
skill-marketplace runtime --agent youtuber --task "high retention youtube script with audit" --json
skill-marketplace diary-set --key frontend.styling --value "no-inline-styles"
skill-marketplace diary-list
```

## Initialize global registry

```bash
npm run init:skills
```

This command copies skill manifests/prompts from `skills/` into `~/.agent-skills/registry`.

## List merged skills for a project

```bash
npm run list:skills -- --project C:/path/to/project
```

If `--project` is omitted, current working directory is used.

## Resolve skills automatically

```bash
npm run resolve -- --agent senior_developer --task "debug this failing API test"
```

Optional flags:

- `--project <path>`
- `--top-k <number>`
- `--threshold <0..1>`
- `--json`

Example:

```bash
npm run resolve -- --agent youtuber --task "make a hook and title for a short about local ai agents" --top-k 2 --threshold 0.6
```

## Runtime auto-injection

Use the runtime command for machine-consumable selected skills and injected prompt:

```bash
skill-marketplace runtime --agent youtuber --task "write a high retention script" --json
```

Programmatic hook for any project:

```ts
import { buildMessagesWithSkills } from "agent-skill-marketplace-local/dist/runtime-hook";

const { messages, resolve } = buildMessagesWithSkills({
  agent: "youtuber",
  userPrompt: "write a high-retention youtube script with strong hook",
  baseSystemPrompt: "You are a helpful assistant.",
  options: { projectRoot: process.cwd(), threshold: 0.72, topK: 2 }
});

// pass `messages` to your LLM client
// inspect `resolve.selected` for telemetry
```

## Diary bridge across sessions

Use `.diary/` to persist user preferences and runtime events so future sessions do not ask for the same defaults.

Stored files:

- `.diary/preferences.json` (normalized preference store)
- `.diary/events.jsonl` (runtime resolve + preference update events)

Commands:

```bash
skill-marketplace diary-set --category preferences --key frontend.framework --value react
skill-marketplace diary-set --category preferences --key frontend.styling --value no-inline-styles
skill-marketplace diary-set --category archetype --key working_mode --value brutal-enforcement
skill-marketplace diary-list --json
```

Runtime behavior:

- `runtime` auto-loads `.diary/preferences.json`
- Auto-infers preference statements from user requests and persists them
- Injects a concise `User Session Prep (Diary)` block into the system prompt
- Appends resolve events to `.diary/events.jsonl` for continuous tuning

Diary categories:

- `personal-knowledge`
- `professional-knowledge`
- `hobbies`
- `interests`
- `preferences`
- `archetype`

Diary compactness rules:

- Keep values normalized and short (`kebab-case`)
- Prefer explicit user preferences over inferred ones
- Inject only most recent/high-priority items (default max 12)
- Enforce character budget (default max 600 chars)

## Skill format

Each skill directory contains:

- `skill.json` (manifest)
- `prompt.md` (instruction payload to inject)

Manifest fields:

- `skill_id`, `version`, `title`, `description`
- `agent_affinity`
- `capabilities`
- `trigger_patterns`
- `when_to_use`
- `required_context`
- `disallowed_context`
- `historical_success`
- `model_strategy` (optional)

`model_strategy` supports:

- `primary_model`
- `secondary_model`
- `phase_model_overrides` (phase -> model)
- `switch_policy`

## Registered skills (default seed)

- `investigate`
- `plan-eng-review`
- `youtuber-script-hook`
- `youtuber-story-architect-brutal` (from `drafts/writer.md`, normalized into a trigger-driven usable skill)

## Next steps

- Add telemetry persistence for confidence and outcome feedback
- Add semantic matching (embeddings) for better trigger detection
- Add registry signing/version channels for team distribution
