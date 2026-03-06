# DECK Frontend

Vue 3 + TSX 实现的 DECK 前端，包含技能、文件管理、任务管理三个模块。项目根文档见 [README](../README.md)，安装与使用见 [docs](../docs/en/installation.md)。

## 技术栈

- Vue 3 (Composition API) + TypeScript + TSX
- Vite + @vitejs/plugin-vue-jsx
- Vue Router
- Tailwind CSS
- lucide-vue-next

## 启动

```bash
pnpm install
pnpm run dev
```

开发环境访问前端：http://localhost:5174
生产环境通过后端托管前端，访问：http://localhost:19520

## 构建

```bash
pnpm run build
```

## 模块说明

- **技能**：从后端加载可用技能列表与技能详情（含 Markdown 文档渲染）
- **文件管理**：基于后端文件执行记录的文件列表与目录视图，支持搜索、类型筛选与内容预览
- **任务管理**：基于后端任务执行记录的历史任务视图，支持时间筛选与分组展示

技能模块数据已通过 `/api/skills` 与 `/api/skills/:slug` 对接 backend REST API，文件模块已通过 `/api/files` 系列接口对接，任务管理模块已通过 `/api/tasks` 与 `/api/tasks/stats` 对接。

### 技能模块与后端依赖

- 前端通过相对路径访问技能接口（统一带 `/api` 前缀）：
  - `GET /api/skills`：返回启用状态的技能列表。
  - `GET /api/skills/:slug`：返回单个技能详情（含 `doc` Markdown）。
- 开发环境下，Vite 通过 `server.proxy` 将 `/api` 转发到后端，并由后端继续处理 `/skills` 路由：

```ts
// app/vite.config.ts
server: {
  port: 5174,
  host: true,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
},
```

- 运行技能模块需要后端服务已启动并配置：
  - 正确的 `OPENCLAW_ROOT` 环境变量。
  - skills 目录下存在对应技能的 `SKILL.md` 等元数据文件。

### 文件模块与后端依赖

- 前端通过相对路径访问文件接口（统一带 `/api` 前缀）：
  - `GET /api/files`：返回所有可见文件列表（含 `fileName`、`filePath`、`createdAt`、`skillName`）。
  - `GET /api/files/tree`：按目录分组的文件树，用于「管理」视图。
  - `GET /api/files/stats`：返回 `today`、`thisWeek`、`total`，用于顶部统计卡片。
  - `GET /api/files/content?path=xxx`：返回指定文件内容 `{ content }`，用于详情预览。
- 开发环境下，Vite 通过 `server.proxy` 将 `/api` 转发到后端。
- 运行文件模块需要后端服务已启动并配置：
  - 正确的 `OPENCLAW_ROOT` 环境变量。
  - `OPENCLAW_SKILL_EXECUTION_PATH`（或默认 `workspace/tracker-result/skill-execution.jsonl`）指向有效的执行记录 JSONL 文件。

### 任务管理模块与后端依赖

- 前端通过相对路径访问任务接口（统一带 `/api` 前缀）：
  - `GET /api/tasks`：返回任务执行历史列表，字段包括 `taskName`、`skillName`、`startedAt`、`endedAt`、`error`、`detail`、`artifacts` 等。
  - `GET /api/tasks/stats`：返回任务统计数据 `{ today, thisWeek, total }`，用于顶部统计卡片。
- 开发环境下，Vite 通过 `server.proxy` 将 `/api` 转发到后端。
- 运行任务管理模块需要后端服务已启动并配置：
  - 正确的 `OPENCLAW_ROOT` 环境变量。
  - `OPENCLAW_SKILL_EXECUTION_PATH`（或默认 `workspace/tracker-result/skill-execution.jsonl`）指向有效的执行记录 JSONL 文件，作为任务与文件数据的来源。
