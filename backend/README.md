# DECK Backend

NestJS backend for DECK. Reads from OpenClaw's workspace and memory files (no database).

## Stack

- NestJS 11
- No database — data from `OPENCLAW_ROOT` (skills dir + skill-execution.jsonl)

## Modules

- **SkillModule** — List skills, get skill detail (SKILL.md, metadata)
- **FileModule** — File list, tree, stats, content (from execution records)
- **SkillExecutionModule** — Backing for execution data
- **TaskModule** — Task list and stats (from execution records)

## Quick start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment

Copy `.env.example` to `.env` and set:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENCLAW_ROOT` | Yes | OpenClaw project root (e.g. `~/.openclaw`) |
| `OPENCLAW_SKILLS_PATH` | No | Relative to OPENCLAW_ROOT (default: `workspace/skills`) |
| `OPENCLAW_SKILL_EXECUTION_PATH` | No | Relative to OPENCLAW_ROOT (default: `memory/skill-execution.jsonl`) |
| `PORT` | No | Server port (default: 3000) |

### 3. Build and run

```bash
pnpm run build
pnpm run start
```

Or development (watch):

```bash
pnpm run dev
```

### 4. API docs (Swagger)

After start: http://localhost:3000/api/docs

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/skills | List skills |
| GET | /api/skills/:slug | Skill detail (doc, metadata) |
| GET | /api/files | File list |
| GET | /api/files/tree | File tree |
| GET | /api/files/stats | Stats (today, thisWeek, total) |
| GET | /api/files/by-path | File by path |
| GET | /api/files/content | File content (query: path) |
| GET | /api/tasks | Task list |
| GET | /api/tasks/stats | Task stats |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run start` | Start server |
| `pnpm run dev` | Start with watch |
| `pnpm run build` | Build |
| `pnpm run lint` | Lint |
| `pnpm run test` | Unit tests |

## License

Apache-2.0. See [LICENSE](../LICENSE) in the repo root.
