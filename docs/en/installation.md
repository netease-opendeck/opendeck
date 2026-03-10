# DECK Installation

DECK is an assistant management service for OpenClaw, with a NestJS backend and Vue 3 frontend.

## Prerequisites

- [OpenClaw](https://docs.openclaw.ai/) installed
- Node.js, pnpm or npm

## Install

### Local install (after git clone)

```bash
cd open-deck
./scripts/install.sh
```

The install script automatically installs dependencies, builds backend/frontend, and starts the service. This may take some time depending on your network and machine.

### Install options

| Option | Description |
|--------|-------------|
| `-d, --dir PATH` | Install directory (default: `~/deck`) |
| `-s, --skills PATH` | Skills target path (default: `~/.openclaw/workspace/skills/`) |
| `-y, --yes` | Non-interactive; use defaults and overwrite existing skills |

Example:

```bash
./scripts/install.sh -d ~/my-deck -s ~/.openclaw/workspace/skills
```

## Uninstall

Use uninstall script:

```bash
./scripts/uninstall.sh
```

## Dependencies

- **PM2** — Process manager; installed automatically by `install.sh` if missing.
- **serve** — Frontend static hosting via `npx serve`.

## Access

- **App (frontend + API):** http://localhost:19520  

## Package manager (pnpm / npm)

The install script prefers **pnpm**; if not found, it uses **npm**. The choice is stored in `.deck_pkg` in the install directory.

## Non-interactive / CI

Use `-y` (or `--yes`) for non-interactive install:

```bash
./scripts/install.sh -y -d /opt/deck -s /path/to/skills
```

## Docker

Example Dockerfile (Node with bash):

```dockerfile
FROM node:20-bookworm
RUN npm install -g openclaw
WORKDIR /app
COPY . .
RUN bash ./scripts/install.sh -y -d /app/deck -s /root/.openclaw/workspace/skills
CMD ["bash", "./scripts/install.sh", "-y", "-d", "/app/deck", "-s", "/root/.openclaw/workspace/skills"]
```

For Alpine, add `RUN apk add --no-cache bash` before running the install script.

## Windows

### PowerShell

```powershell
cd open-deck
.\scripts\install.ps1 -Dir $env:USERPROFILE\deck -Yes
```

Options: `-Dir`, `-Skills`, `-Yes` (same meaning as `-d`, `-s`, `-y`).

### CMD

```cmd
scripts\install.cmd -Yes
```

To uninstall on Windows:

```powershell
.\scripts\uninstall.ps1 -Dir $env:USERPROFILE\deck
```
