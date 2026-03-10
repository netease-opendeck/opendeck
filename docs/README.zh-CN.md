[English](../README.md) | [中文](README.zh-CN.md)

# OpenDeck — OpenClaw 助手管理界面

[![version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/openclaw/open-deck)
[![openclaw](https://img.shields.io/badge/openclaw-ready-brightgreen)](https://github.com/openclaw/openclaw)
[![opendeck](https://img.shields.io/badge/opendeck-manage-orange)](https://github.com/openclaw/open-deck)

**OpenDeck** OpenDeck 是一个用于可视化管理 OpenClaw 任务、文件和技能的轻量级 AI 工作看板。
它帮助用户更清晰地观察 Agent 的执行过程，并更高效地管理 AI 生成的任务和文件。

[文档](zh/installation.md) · [安装](zh/installation.md) · [参与贡献](../CONTRIBUTING.md)

## 为什么需要 OpenDeck？
在使用 OpenClaw 运行任务时，经常会遇到一些实际的问题：
1. 任务过多，人脑容易丢失上下文

   当连续运行多个任务、或一个任务运行了很久时，用户容易忘记：
    - 之前让 openclaw 执行过哪些任务
    - 当前这个任务是做什么的
    - openclaw 为什么需要补充新的信息
    - 当 openclaw 执行完成或请求新的输入时，用户容易忘记之前的任务背景。

2. OpenClaw生成的交付物文件越来越多，查找和关联困难
很多 AI 工作都会产生大量交付物文件，例如生成的文档、上传的参考资料等。
虽然文件路径本身是清晰的，但当文件数量变多后，**快速定位和查找就会变得困难。**

3. 用户想了解一个任务背后到底执行了哪些步骤，为什么消耗这么多Token
OpenClaw不会在对话中说明任务的全部步骤，用户不容易进行检查，从而不容易对任务进行优化。

因此，我们开发了 OpenDeck。

OpenDeck 通过 **可视化看板** 的方式，将 OpenClaw 的 **任务、生成文件和技能能力** 统一展示，让原本分散在日志和本地目录中的信息变得清晰可见。

## 核心功能
OpenDeck 通过三个核心模块，帮助用户更清晰地理解和管理 OpenClaw 的任务执行过程。
### 任务
任务模块用于可视化展示 OpenClaw 的任务执行情况，让用户能够清晰了解 Agent 当前在执行什么。
在任务列表中，用户可以查看：
- 当前任务列表
- 任务执行状态
- 创建时间
- 任务详细信息

通过任务看板，可以快速掌握 Agent 的任务执行情况和整体运行状态。

![Tasks](../assets/tasks.png)

### 文件
文件模块用于集中展示 OpenClaw 在任务执行过程中生成的文件。
当任务数量增多时，生成的文件往往会分散在本地不同目录中，不方便统一查看。OpenDeck 会自动收集这些文件，并通过界面进行集中展示。
用户可以：
- 查看文件列表
- 快速预览文件
- 下载生成的文件

同时，OpenDeck 会建立 任务与文件之间的关联关系，帮助用户快速找到某个任务对应的输出文件。

![Files](../assets/files.png)

### 技能
技能模块用于展示用户在 OpenClaw 中使用的技能（Skills），帮助用户了解当前 Agent 所具备的能力。
用户可以查看：
- 当前可用技能列表
- 技能基本信息
- 技能调用情况

通过技能模块，用户可以更清晰地理解 Agent 的能力结构，并逐步沉淀常用技能。

![Skills](../assets/skills.png)

### 最后
通过任务、文件和技能三个模块，OpenDeck 让 OpenClaw 的运行过程不再是“黑盒”，帮助用户更直观地理解 Agent 的执行过程，并更高效地管理 AI 生成的结果。
AI喜欢CLI，作为AI的Boss的人类还是更偏好GUI。
Boss需要管理看板。

**注意：**
> OpenDeck 只能展示安装之后创建的任务及其相关文件。安装前已执行的任务和生成文件不会显示。

## 快速开始

### 前置条件

- 已安装并配置 [OpenClaw](https://docs.openclaw.ai/)
- Node.js ≥18，以及 pnpm 或 npm

### 方式一
你可以将以下提示词发送给你的 OpenClaw，即可自动完成安装与启动。
访问 https://github.com/netease-opendeck/opendeck 下载并安装 OpenDeck，然后启动服务。

### 方式二

```bash
git clone https://github.com/netease-opendeck/opendeck.git
cd opendeck

./scripts/install.sh
```

然后从安装目录执行 `deck start`，或按安装脚本提示将安装目录加入 PATH。
首次执行 `deck start` 时，会在安装目录下自动安装依赖并构建前端与后端（首次启动时间会稍长）。

## OpenClaw 中需手动添加的提示词

在 OpenClaw 对话中请至少添加一次以下提示词，以便助手加载并遵守 tracker 规范：

- **中文：** 读取 AGENTS.MD 和 skill-tracker/SKILL.MD，严格遵守执行。

## 推荐模型

OpenDeck 可以配合 OpenClaw 支持的任意大模型使用。为了获得更稳定的任务跟踪效果和回复质量，当前**推荐使用**：

- **Opus 4.6**：推理能力较强，适合复杂多步骤任务。
- **GLM-5**：通用能力优秀，对中文支持更友好。

## 工作原理

```
OpenClaw（workspace/skills、workspace/tracker-result/skill-execution.jsonl）
                    │
                    ▼
┌─────────────────────────────────────┐
│           OpenDeck 后端             │
│   (NestJS，托管前端，端口 19520)      │
└─────────────────────────────────────┘
```

OpenDeck 从你的 OpenClaw 根目录读取数据：技能来自 `workspace/skills`，执行记录来自 `workspace/tracker-result/skill-execution.jsonl`。无需数据库，基于文件。

## 配置

在安装目录或从源码运行时的后端目录中配置 OpenClaw 根路径：

- 将 `backend/.env.example` 复制为 `backend/.env`。
- 设置 `OPENCLAW_ROOT` 为你的 OpenClaw 项目根目录（如 `~/.openclaw`）。

可选：`OPENCLAW_SKILLS_PATH`、`OPENCLAW_SKILL_EXECUTION_PATH`、`PORT`。详见 [后端 README](../backend/README.md)。

## 管理命令

| 命令          | 说明                           |
|---------------|--------------------------------|
| `deck start`  | 启动后端（同时托管前端）       |
| `deck stop`   | 停止后端                       |
| `deck restart`| 重启后端                       |
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
