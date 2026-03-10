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

On first `deck start`, DECK will automatically install dependencies and build both backend and frontend inside the install directory. This may take some time depending on your network and machine.

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

## Environment

After install, the `deck` command is added to your PATH:

- **With sudo:** Symlink to `/usr/local/bin/deck`
- **Without sudo:** Script is appended to `~/.zshrc`, `~/.bashrc`, etc.; run `source ~/.zshrc` or reopen the terminal

Run `deck remove` to remove the install directory and PATH changes.

## Management commands

| Command | Description |
|---------|-------------|
| `deck start` | Start backend and frontend |
| `deck stop` | Stop both |
| `deck restart` | Restart both |
| `deck status` | Show PM2 status |
| `deck help` | Show help |
| `deck remove` | Stop services, remove install dir and installed skills |

## Dependencies

- **PM2** — Process manager; installed automatically on first `deck start` if missing.
- **serve** — Frontend static hosting via `npx serve`.

## Access

- **App (frontend + API):** http://localhost:19520  

## Package manager (pnpm / npm)

The install script prefers **pnpm**; if not found, it uses **npm**. The choice is stored in `.deck_pkg` in the install directory so `deck start` / `deck restart` use the same manager.

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
ENV PATH="/app/deck:$PATH"
CMD ["deck", "start"]
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

Use `deck.cmd` the same way as `deck.ps1` (e.g. `deck start`, `deck status`) after the install directory is on PATH.
