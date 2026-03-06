# DECK 安装与使用

DECK 是用于管理 OpenClaw 的助手服务，包含 backend（NestJS）和 frontend（Vue 3）两部分。

## 前置条件

- 已安装 [OpenClaw](https://docs.openclaw.ai/)
- Node.js、pnpm 或 npm（未安装 pnpm 时自动使用 npm）、curl（Linux/macOS 在线安装时需要）

## 安装

### 方式一：一键安装（需提供 release 地址）

将 `YOUR_ORG` 替换为你的 GitHub 组织或用户名：

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/open-deck/main/scripts/install.sh | bash
```

可通过环境变量指定 release 地址：

```bash
DECK_RELEASE_URL=https://github.com/YOUR_ORG/open-deck/releases/latest/download/deck.tar.gz curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/open-deck/main/scripts/install.sh | bash
```

### 方式二：本地安装（git clone 后）

```bash
cd open-deck
./scripts/install.sh --from-local
```

### 安装选项

| 选项 | 说明 |
|------|------|
| `-d, --dir PATH` | 安装目录（默认：有 sudo 时 `/opt/deck`，否则 `~/deck`） |
| `-s, --skills PATH` | skills 安装路径（默认：`~/.openclaw/workspace/skills/`） |
| `-y, --yes` | 非交互模式，已存在的 skill 不覆盖 |
| `--from-local` | 从当前目录复制（用于 git clone 后的本地安装） |

示例：

```bash
./scripts/install.sh --from-local -d ~/my-deck -s ~/.openclaw/workspace/skills
```

## 环境变量

安装完成后，`deck` 命令会自动注入 PATH，无需手动配置：

- **有 sudo**：软链接到 `/usr/local/bin/deck`，立即可用
- **无 sudo**：修改 `~/.zshrc`、`~/.bashrc` 等 profile，需执行 `source ~/.zshrc` 或重新打开终端

执行 `deck remove` 时会自动移除软链接或 profile 中的 deck 相关配置。

## 管理命令

安装完成后，使用 `deck` 命令管理服务：

| 命令 | 说明 |
|------|------|
| `deck start` | 启动 backend 和 frontend |
| `deck stop` | 停止 backend 和 frontend |
| `deck restart` | 重启 backend 和 frontend |
| `deck status` | 查看运行状态 |
| `deck help` | 显示帮助 |
| `deck remove` | 停止服务、删除安装目录及已安装的 skills |

## 依赖

- **PM2**：进程管理，首次 `deck start` 时若未安装会自动安装，并给出必要提醒
- **serve**：前端静态托管，由 `npx serve` 自动拉取

## 访问

- 前端：http://localhost:5174
- 后端 API：http://localhost:3000

## 包管理器（pnpm / npm）

安装与运行 deck 时，脚本会优先使用 **pnpm**；若未安装 pnpm，则自动退阶使用 **npm**。安装阶段使用的包管理器会写入安装目录下的 `.deck_pkg`，后续 `deck start` / `deck restart` 等会与之保持一致，无需额外配置。

## 云服务器 / 非交互安装

在云服务器或 CI 等无交互环境中，请使用 `-y`（或 `--yes`）进行非交互安装：

```bash
./scripts/install.sh --from-local -y -d /opt/deck -s /path/to/skills
```

- 已存在的 skill 不会提示覆盖，直接跳过。
- AGENTS.md 的 .openclaw 路径使用默认值，不等待输入。
- 需预装 openclaw，安装脚本会执行 `openclaw gateway restart`（失败不中断安装）。

## Docker 内安装 deck

若在容器内安装并运行 deck（与 openclaw 同容器），建议使用带 bash 的 Node 镜像（如 `node:20-bookworm`），然后执行安装与启动：

```dockerfile
FROM node:20-bookworm
# 若使用 Alpine，需先安装 bash：RUN apk add --no-cache bash
RUN npm install -g openclaw   # 或按 openclaw 官方方式安装
WORKDIR /app
COPY . .
RUN bash ./scripts/install.sh -y -d /app/deck -s /root/.openclaw/workspace/skills --from-local
ENV PATH="/app/deck:$PATH"
CMD ["deck", "start"]
```

- 安装目录与 skills 路径可通过 `-d`、`-s` 指定；非交互务必加 `-y`。
- 使用 Alpine 等仅带 sh 的镜像时，需在 Dockerfile 中 `RUN apk add --no-cache bash`，再执行 install.sh。

## Windows 安装

在 Windows 上可使用 PowerShell 或 CMD 安装与运行 deck。

### PowerShell

```powershell
cd open-deck
.\scripts\install.ps1 -FromLocal -Dir $env:USERPROFILE\deck -Yes
```

安装选项：`-Dir`、`-Skills`、`-Yes`、`-FromLocal`，含义与 Linux/macOS 的 `-d`、`-s`、`-y`、`--from-local` 一致。安装完成后，安装目录会加入用户 PATH，重新打开终端后可直接执行 `deck start` 等。

### CMD

在 CMD 中通过包装脚本调用 PowerShell 即可：

```cmd
scripts\install.cmd -FromLocal -Yes
```

`deck.cmd` 用法与 `deck.ps1` 相同（如 `deck start`、`deck status`），需在安装目录已加入 PATH 后使用。
