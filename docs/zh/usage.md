# DECK 使用说明

## 配置

DECK 从 OpenClaw 安装目录读取数据。通过环境变量配置后端（例如在安装目录下的 `backend/.env` 中）。

| 变量 | 必填 | 说明 |
|------|------|------|
| `OPENCLAW_ROOT` | 是 | OpenClaw 项目根目录（如 `~/.openclaw`） |
| `OPENCLAW_SKILLS_PATH` | 否 | skills 相对路径（默认：`workspace/skills`） |
| `OPENCLAW_SKILL_EXECUTION_PATH` | 否 | 执行记录文件相对路径（默认：`workspace/tracker-result/skill-execution.jsonl`） |
| `PORT` | 否 | 后端端口（默认：3000） |

在运行 `deck start` 前，将 `backend/.env.example` 复制为 `backend/.env` 并设置 `OPENCLAW_ROOT`。

## 界面概览

- **技能** — 列出 `OPENCLAW_ROOT/OPENCLAW_SKILLS_PATH` 下的技能，点击可查看 SKILL.md 与元数据。
- **文件管理** — 基于技能执行记录中的文件；按目录浏览、搜索、按类型筛选、预览内容。
- **任务历史** — 过往技能执行记录；按时间筛选并查看详情。

## API

后端启动后，Swagger 文档地址：

- http://localhost:3000/api/docs

主要接口：

- `GET /api/skills` — 技能列表  
- `GET /api/skills/:slug` — 技能详情（含文档）  
- `GET /api/files`、`GET /api/files/tree`、`GET /api/files/stats`、`GET /api/files/content` — 文件相关  
- `GET /api/tasks`、`GET /api/tasks/stats` — 任务相关  

## 常见问题

- **后端启动失败** — 确认已设置 `OPENCLAW_ROOT` 且指向有效的 OpenClaw 根目录，检查 `backend/.env`。
- **技能列表为空** — 确认 `OPENCLAW_SKILLS_PATH` 正确，且该目录在 `OPENCLAW_ROOT` 下存在。
- **没有任务或文件** — 执行数据来自 `workspace/tracker-result/skill-execution.jsonl`，需确保 OpenClaw（及若使用 skill-tracker）会写入该路径。
- **找不到 deck 命令** — 无 sudo 安装后需执行 `source ~/.zshrc`（或对应 shell 配置），或手动将安装目录加入 PATH。
