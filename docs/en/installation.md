# DECK Installation

DECK is an assistant management service for OpenClaw, with a NestJS backend and Vue 3 frontend.

## Prerequisites

- [OpenClaw](https://docs.openclaw.ai/) installed
- Node.js, pnpm or npm (curl required for one-line install on Linux/macOS)

## Install

### Option 1: One-line install

Replace `YOUR_ORG` with your GitHub org or username:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/open-deck/main/scripts/install.sh | bash
```

Or specify a release tarball URL:

```bash
DECK_RELEASE_URL=https://github.com/YOUR_ORG/open-deck/releases/latest/download/deck.tar.gz curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/open-deck/main/scripts/install.sh | bash
```

### Option 2: From source (after git clone)

```bash
cd open-deck
./scripts/install.sh --from-local
```

On first `deck start`, DECK will automatically install dependencies and build both backend and frontend inside the install directory. This may take some time depending on your network and machine.

### Install options

| Option | Description |
|--------|-------------|
| `-d, --dir PATH` | Install directory (default: `/opt/deck` with sudo, else `~/deck`) |
| `-s, --skills PATH` | Skills target path (default: `~/.openclaw/workspace/skills/`) |
| `-y, --yes` | Non-interactive; skip overwriting existing skills |
| `--from-local` | Copy from current directory (for local install after clone) |

Example:

```bash
./scripts/install.sh --from-local -d ~/my-deck -s ~/.openclaw/workspace/skills
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
./scripts/install.sh --from-local -y -d /opt/deck -s /path/to/skills
```

## Docker

Example Dockerfile (Node with bash):

```dockerfile
FROM node:20-bookworm
RUN npm install -g openclaw
WORKDIR /app
COPY . .
RUN bash ./scripts/install.sh -y -d /app/deck -s /root/.openclaw/workspace/skills --from-local
ENV PATH="/app/deck:$PATH"
CMD ["deck", "start"]
```

For Alpine, add `RUN apk add --no-cache bash` before running the install script.

## Windows

### PowerShell

```powershell
cd open-deck
.\scripts\install.ps1 -FromLocal -Dir $env:USERPROFILE\deck -Yes
```

Options: `-Dir`, `-Skills`, `-Yes`, `-FromLocal` (same meaning as `-d`, `-s`, `-y`, `--from-local`).

### CMD

```cmd
scripts\install.cmd -FromLocal -Yes
```

Use `deck.cmd` the same way as `deck.ps1` (e.g. `deck start`, `deck status`) after the install directory is on PATH.
