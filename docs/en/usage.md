# DECK Usage

## Configuration

DECK reads data from your OpenClaw installation. Configure the backend via environment variables (e.g. in `backend/.env` in the install directory).

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENCLAW_ROOT` | Yes | OpenClaw project root (e.g. `~/.openclaw`) |
| `OPENCLAW_SKILLS_PATH` | No | Relative path to skills (default: `workspace/skills`) |
| `OPENCLAW_SKILL_EXECUTION_PATH` | No | Relative path to execution log (default: `workspace/tracker-result/skill-execution.jsonl`) |
| `PORT` | No | Backend port (default: 19520) |

Copy `backend/.env.example` to `backend/.env` and set `OPENCLAW_ROOT` before running `./scripts/install.sh -y`.

## UI overview

- **Skills** — Lists skills from `OPENCLAW_ROOT/OPENCLAW_SKILLS_PATH`. Click a skill to view its SKILL.md and metadata.
- **File management** — Files referenced in skill execution records; browse by directory, search, filter by type, preview content.
- **Task history** — Past skill executions; filter by time range and view details.

## API

With the backend running, Swagger is available at:

- http://localhost:19520/api/docs

Main endpoints:

- `GET /api/skills` — List skills  
- `GET /api/skills/:slug` — Skill detail (including doc)  
- `GET /api/files`, `GET /api/files/tree`, `GET /api/files/stats`, `GET /api/files/content` — File APIs  
- `GET /api/tasks`, `GET /api/tasks/stats` — Task APIs  

## Troubleshooting

- **Backend fails to start** — Ensure `OPENCLAW_ROOT` is set and points to a valid OpenClaw root. Check `backend/.env`.
- **Skills list empty** — Verify `OPENCLAW_SKILLS_PATH` and that the skills directory exists under `OPENCLAW_ROOT`.
- **No tasks or files** — Execution data comes from `workspace/tracker-result/skill-execution.jsonl`. Ensure OpenClaw (and skill-tracker if used) writes to that path.
- **Service not ready after install** — Check PM2 logs with `pm2 logs deck-backend` and verify `backend/.env` values.
