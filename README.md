# Local Skill Marketplace (Machine-Global)

This project sets up a machine-global skill marketplace so multiple projects can reuse the same agent skills.

## What it does

- Creates a machine-global registry at `~/.agent-skills/registry`
- Seeds three starter skills
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

## Initialize global registry

```bash
npm run init:skills
```

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

Example:

```bash
npm run resolve -- --agent youtuber --task "make a hook and title for a short about local ai agents" --top-k 2 --threshold 0.6
```

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

## Next steps

- Add telemetry persistence for confidence and outcome feedback
- Add semantic matching (embeddings) for better trigger detection
- Add registry signing/version channels for team distribution
