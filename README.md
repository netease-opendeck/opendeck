[English](README.md) | [中文](docs/README.zh-CN.md)

# DECK — Assistant Management UI for OpenClaw

[![version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/openclaw/open-deck)
[![openclaw](https://img.shields.io/badge/openclaw-ready-brightgreen)](https://github.com/openclaw/openclaw)
[![opendeck](https://img.shields.io/badge/opendeck-manage-orange)](https://github.com/openclaw/open-deck)
[![manage](https://img.shields.io/badge/manage-dashboard-9cf)](https://github.com/openclaw/open-deck)

**DECK** is a web UI for managing your [OpenClaw](https://github.com/openclaw/openclaw) assistant. It lets you browse skills, inspect files from skill execution records, and view task history—all from one place.

If you run OpenClaw and want a local dashboard for skills, files, and tasks, DECK is for you.

[Documentation](docs/en/installation.md) · [Installation](docs/en/installation.md) · [Contributing](CONTRIBUTING.md)

## Prerequisites

- [OpenClaw](https://docs.openclaw.ai/) installed and configured
- Node.js ≥18, and pnpm or npm (curl for one-line install on Linux/macOS)

## Install (recommended)

One-line install (replace `YOUR_ORG` with your GitHub org or username):

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/open-deck/main/scripts/install.sh | bash
```

Or with a specific release tarball:

```bash
DECK_RELEASE_URL=https://github.com/YOUR_ORG/open-deck/releases/latest/download/deck.tar.gz curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/open-deck/main/scripts/install.sh | bash
```

## Quick start

After install, the `deck` command is on your PATH:

```bash
deck start
```

- **Frontend:** http://localhost:5174  
- **Backend API:** http://localhost:3000  

Use `deck stop`, `deck restart`, `deck status`, and `deck help` as needed.

## From source

```bash
git clone https://github.com/YOUR_ORG/open-deck.git
cd open-deck

pnpm install
pnpm run build

./scripts/install.sh --from-local
```

Then run `deck start` from the install directory, or add it to PATH as the install script does.

## Required prompt in OpenClaw

In your OpenClaw chat, add this prompt once so the assistant loads and follows the tracker:

- **English:** Read AGENTS.MD and skill-tracker/SKILL.MD, and follow them strictly.

## Recommended language models

DECK works with any model that your OpenClaw setup supports, but for better task tracking quality and response consistency we currently **recommend**:

- **Opus 4.6** (high reasoning capability, good for complex multi-step tasks)
- **GLM-5** (strong general-purpose model with good Chinese support)

## Highlights

- **Skills** — Browse and inspect OpenClaw workspace skills (SKILL.md, metadata).
- **File management** — Browse files from skill execution records with search, filters, and preview.
- **Task history** — View past skill executions with time filters and grouping.

## How it works

```
OpenClaw (workspace/skills, workspace/tracker-result/skill-execution.jsonl)
                    │
                    ▼
┌─────────────────────────────────────┐
│           DECK Backend              │
│         (NestJS, port 3000)         │
└──────────────────┬──────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│           DECK Frontend             │
│         (Vue 3, port 5174)           │
└─────────────────────────────────────┘
```

DECK reads from your OpenClaw root: skills from `workspace/skills` and execution data from `workspace/tracker-result/skill-execution.jsonl`. No database—file-based.

## Configuration

Set the OpenClaw root in the backend (in the install directory, or when running from source):

- Copy `backend/.env.example` to `backend/.env`.
- Set `OPENCLAW_ROOT` to your OpenClaw project root (e.g. `~/.openclaw`).

Optional: `OPENCLAW_SKILLS_PATH`, `OPENCLAW_SKILL_EXECUTION_PATH`, `PORT`. See [backend README](backend/README.md).

## Management commands

| Command       | Description                          |
|---------------|--------------------------------------|
| `deck start`  | Start backend and frontend           |
| `deck stop`   | Stop both                            |
| `deck restart`| Restart both                         |
| `deck status` | Show PM2 status                      |
| `deck help`   | Show help                            |
| `deck remove` | Stop, remove install dir and skills  |

## Docs

- [Installation (EN)](docs/en/installation.md)
- [Usage (EN)](docs/en/usage.md)
- [安装说明（中文）](docs/zh/installation.md)
- [使用说明（中文）](docs/zh/usage.md)

## License

Apache-2.0. See [LICENSE](LICENSE).

## Community

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to submit issues and pull requests.
