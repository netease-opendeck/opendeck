[English](../README.md) | [中文](README.zh-CN.md)

# DECK — OpenClaw 助手管理界面

**DECK** 是用于管理 [OpenClaw](https://github.com/openclaw/openclaw) 助手的 Web 界面。你可以在一个地方浏览技能、查看技能执行产生的文件，以及查看任务历史。

若你已运行 OpenClaw 并希望有一个本地的技能、文件与任务管理面板，DECK 适合你。

[文档](zh/installation.md) · [安装](zh/installation.md) · [参与贡献](../CONTRIBUTING.md)

## 前置条件

- 已安装并配置 [OpenClaw](https://docs.openclaw.ai/)
- Node.js ≥18，以及 pnpm 或 npm（Linux/macOS 一键安装需 curl）

## 安装（推荐）

一键安装（将 `YOUR_ORG` 替换为你的 GitHub 组织或用户名）：

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/open-deck/main/scripts/install.sh | bash
```

或指定 release 压缩包地址：

```bash
DECK_RELEASE_URL=https://github.com/YOUR_ORG/open-deck/releases/latest/download/deck.tar.gz curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/open-deck/main/scripts/install.sh | bash
```

## 快速开始

安装完成后，`deck` 命令会加入 PATH：

```bash
deck start
```

- **前端：** http://localhost:5174  
- **后端 API：** http://localhost:3000  

可使用 `deck stop`、`deck restart`、`deck status`、`deck help`。

## 从源码安装

```bash
git clone https://github.com/YOUR_ORG/open-deck.git
cd open-deck

pnpm install
pnpm run build

./scripts/install.sh --from-local
```

然后从安装目录执行 `deck start`，或按安装脚本提示将安装目录加入 PATH。

## OpenClaw 中需手动添加的提示词

在 OpenClaw 对话中请至少添加一次以下提示词，以便助手加载并遵守 tracker 规范：

- **中文：** 读取 AGENTS.MD 和 skill-tracker/SKILL.MD，严格遵守执行。

## 功能概览

- **技能** — 浏览与查看 OpenClaw 工作区中的技能（SKILL.md、元数据）。
- **文件管理** — 基于技能执行记录浏览文件，支持搜索、筛选与内容预览。
- **任务历史** — 查看过往技能执行记录，支持时间筛选与分组。

## 工作原理

```
OpenClaw（workspace/skills、workspace/tracker-result/skill-execution.jsonl）
                    │
                    ▼
┌─────────────────────────────────────┐
│           DECK 后端                  │
│         (NestJS，端口 3000)          │
└──────────────────┬──────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│           DECK 前端                  │
│         (Vue 3，端口 5174)           │
└─────────────────────────────────────┘
```

DECK 从你的 OpenClaw 根目录读取数据：技能来自 `workspace/skills`，执行记录来自 `workspace/tracker-result/skill-execution.jsonl`。无需数据库，基于文件。

## 配置

在安装目录或从源码运行时的后端目录中配置 OpenClaw 根路径：

- 将 `backend/.env.example` 复制为 `backend/.env`。
- 设置 `OPENCLAW_ROOT` 为你的 OpenClaw 项目根目录（如 `~/.openclaw`）。

可选：`OPENCLAW_SKILLS_PATH`、`OPENCLAW_SKILL_EXECUTION_PATH`、`PORT`。详见 [后端 README](../backend/README.md)。

## 管理命令

| 命令          | 说明                           |
|---------------|--------------------------------|
| `deck start`  | 启动后端与前端                 |
| `deck stop`   | 停止两者                       |
| `deck restart`| 重启两者                       |
| `deck status` | 查看 PM2 状态                  |
| `deck help`   | 显示帮助                       |
| `deck remove` | 停止服务并删除安装目录及 skills |

## 文档

- [安装说明（英文）](en/installation.md)
- [使用说明（英文）](en/usage.md)
- [安装说明（中文）](zh/installation.md)
- [使用说明（中文）](zh/usage.md)

## 许可证

Apache-2.0。见 [LICENSE](../LICENSE)。

## 社区

参与贡献请见 [CONTRIBUTING.md](../CONTRIBUTING.md)。
