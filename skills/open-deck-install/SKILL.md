---
name: open-deck-install
description: OpenDeck 对话式安装 Skill（中文主导 + English hints），优先自动安装，失败自动回退到终端安装，并提供验收清单与常见故障自愈指引。
---

# OpenDeck Install Skill

本 Skill 面向「首次安装 OpenDeck」场景，目标是：少提问、快跑通、结果可验证。

## 0) 一句话介绍

给您快速安装OpenDeck。

## 1) 执行原则（必须遵守）

1. 默认自动执行，尽量不让用户做多余决策。
2. 如果步骤失败，先自动重试 1-2 次（可更换镜像/重试网络命令）。
3. 连续失败后，再向用户提最小必要问题（一次只问 1-2 个关键问题）。
4. 不暴露用户隐私路径、内网地址、密钥信息。
5. 仅聚焦安装与可用性，不展开深入架构说明。

## 2) 首选安装路径（对话触发）

先向用户发送并执行以下意图（中文主句 + English fallback）：

> 我将自动为你安装并启动 OpenDeck。  
> I will auto-install and start OpenDeck for you.

优先让 OpenClaw 执行这句安装指令：

> 访问 `https://github.com/netease-opendeck/opendeck` 下载并安装 OpenDeck，然后启动服务。

### 若安装成功，立即给用户反馈

- 已完成安装并启动。
- 正在进行首次启动构建（first build may take some time）。
- 稍后将给出访问地址与验收结果。

## 3) 自动失败回退（终端命令）

若对话触发安装失败，自动回退到命令安装：

```bash
git clone https://github.com/netease-opendeck/opendeck.git
cd opendeck
./scripts/install.sh --from-local
deck start
```

### 回退安装时的行为要求

- 若 `deck` 命令未生效，提示并执行 `source ~/.zshrc`（或提示重开终端后重试）。
- 若首次 `deck start` 较慢，明确说明在安装依赖与构建前后端。
- 默认不让用户手动改安装参数；仅在必要时再询问目录或权限问题。

## 4) 首次启动后必须提示

安装成功后，必须明确告知：

1. 默认访问地址：`http://localhost:19520`
2. 首次启动耗时可能较长（依赖安装 + build）。
3. OpenDeck 仅展示安装后产生的任务与关联文件。

## 5) OpenClaw 必加提示词（必须）

请提醒用户在 OpenClaw 对话中至少添加一次：

- 中文：`读取 AGENTS.MD 和 skill-tracker/SKILL.MD，严格遵守执行。`
- English: `Read AGENTS.MD and skill-tracker/SKILL.MD, and follow them strictly.`

## 6) 可选公网访问（Optional）

默认本机访问即可。仅当用户提出“远程访问/对外分享”时，引导可选方案：

```bash
cloudflared tunnel --url http://127.0.0.1:19520
```

并补充提示：

- 这是临时公网地址（temporary public URL）。
- 若长期使用，建议后续再做稳定域名与安全配置。

## 7) 对话模板（可直接复用）

### 7.1 开场模板

> 我将直接帮你安装 OpenDeck，并尽量自动完成。若遇到错误我会先自动重试，再向你确认关键选项。

### 7.2 进度播报模板

> 正在执行安装步骤（clone/install/start），预计首次启动会稍慢，我完成后会给你访问地址和验收结果。

### 7.3 失败重试模板

> 安装遇到问题，我先自动重试一次并切换为兜底方案（terminal fallback）。如果仍失败，我只会问你 1-2 个必要问题。

### 7.4 最小确认模板（仅在连续失败后）

> 我需要确认两项信息后继续：  
> 1) 是否允许使用默认安装目录？  
> 2) 当前环境是否允许执行网络下载命令（git/curl）？

### 7.5 完成反馈模板

> OpenDeck 已安装并启动完成。请打开 `http://localhost:19520`。  
> 接下来我将带你做 1 分钟验收，确认 Tasks / Files / Skills 都正常显示。

## 8) 安装后人工验收清单（Checklist）

按顺序引导用户确认：

1. 页面是否可打开：`http://localhost:19520`
2. OpenDeck 页面是否正常加载（无长时间白屏/报错）。
3. `Tasks` 模块可见并有数据刷新。
4. `Files` 模块可见并可预览/下载（若当前有文件）。
5. `Skills` 模块可见，并能看到技能列表。
6. 运行状态正常（可用 `deck status` 查看）。

若无历史数据，需提示：

- 当前为空是正常现象；安装后执行的新任务才会进入看板。

## 9) 常见失败与自愈策略（Auto-heal）

### 9.1 `deck: command not found`

- 先执行：`source ~/.zshrc`
- 仍失败：提示用户重开终端后再执行 `deck start`

### 9.2 首次启动卡住或很慢

- 明确说明：首次会自动安装依赖并构建，属于预期行为
- 建议等待并观察日志，不立即判定失败

### 9.3 端口访问失败（19520）

- 检查服务状态：`deck status`
- 若未启动：`deck start`
- 若启动后仍不可达：提示检查本机防火墙或端口占用

### 9.4 安装脚本执行失败

- 自动重试一次 `./scripts/install.sh --from-local`
- 若仍失败，收敛提问：仅确认权限与网络可达性

### 9.5 Tracker 数据不显示

- 提醒用户确认已在 OpenClaw 添加必加提示词：
  `读取 AGENTS.MD 和 skill-tracker/SKILL.MD，严格遵守执行。`
- 提醒仅安装后新任务会显示

## 10) 输出风格约束

1. 默认中文回复，关键命令和关键词可附 English。
2. 一次只做一件事，反馈“正在做什么 + 下一步是什么”。
3. 安装成功后必须给出访问地址与验收引导。
4. 不使用冗长解释，不展开底层实现细节。

