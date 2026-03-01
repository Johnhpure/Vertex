---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-02-28'
inputDocuments: [prd.md, product-brief-yaml-2026-02-28.md, vertex-ai-api-reference.md]
workflowType: 'architecture'
project_name: 'Vertex AI API 网关'
user_name: '邦哥'
date: '2026-02-28'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
- 25 条功能需求，分为 6 大能力域
  - 图片生成（5）：协议转换代理，OpenAI 请求 → Vertex AI Gemini API 调用
  - 认证安全（3）：API Key Bearer Token 认证
  - 服务账号管理（4）：Google 服务账号 JSON 上传/验证/状态/删除
  - API 调用日志（5）：记录、展示、筛选、重试详情
  - 费用统计（5）：估算费用、月度统计、赠金消耗进度
  - 服务监控（3）：健康检查、Vertex AI 连接验证、模型列表

**Non-Functional Requirements:**
- 14 条非功能需求，覆盖 4 个维度
  - Performance（4）：API <30s，管理 API <500ms，前端 <2s，日志查询 <2s
  - Security（4）：服务账号加密、API Key 脱敏、Prompt 截断、局域网隔离
  - Reliability（3）：可用性 ≥99%、指数退避重试、崩溃恢复
  - Integration（3）：OpenAI 完全兼容、服务账号 JSON 标准、Vertex AI 协议

**Scale & Complexity:**
- Primary domain: API Backend + 轻量 Web App
- Complexity level: Low
- 用户规模: ≤ 5 人内部团队
- 数据规模: 日志万级记录（SQLite 可胜任）
- Estimated architectural components: 6-8 个

### Technical Constraints & Dependencies

- **目标模型**：`gemini-3-pro-image-preview`（Gemini 3 Pro Image，公开预览版）
- **SDK 选择**：`@google/genai`（`vertexai: true` 模式）— 封装了 OAuth2/JWT 认证流程，无需手动实现
- **模型限制**（来自官方文档）：
  - ❌ 不支持 OpenAI 兼容的聊天补全接口 → 必须自行实现格式转换层
  - ❌ 不支持函数调用、上下文缓存
  - ✅ 必须配置 `responseModalities: ['TEXT', 'IMAGE']` 才能生成图片
  - ✅ 支持 10 种宽高比：1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
- **认证**：Google 服务账号 JSON + `googleAuthOptions`
- **部署环境**：局域网服务器（Windows/Linux/macOS），Node.js ≥ 18.x
- **存储**：SQLite（日志 + 配置持久化），需开启 WAL 模式支持并发写入

### Cross-Cutting Concerns Identified

1. **认证双层架构**：外部 API Key 认证（OpenAI 兼容 Bearer Token）+ 内部 Vertex AI 服务账号认证（OAuth2/JWT）
2. **协议格式转换层（核心组件）**：
   - 请求转换：OpenAI `prompt`/`size`/`n` → Gemini `contents.parts[].text` + `imageConfig.aspectRatio`
   - 响应转换：Gemini `parts[].inlineData` → OpenAI `data[].b64_json`
   - 响应解析需处理不确定结构：`parts[]` 数组中 text 和 image 的顺序和数量不固定
3. **错误处理链**：Vertex AI 错误（429/500/503）→ 指数退避重试（最多 2 次）→ OpenAI 格式错误响应
4. **日志与隐私**：记录每次调用但需截断 Prompt、脱敏 API Key、不记录图片数据
5. **费用估算（近似值）**：基于 Vertex AI token 定价自行估算，输入/输出 token 分开计价，与 Google Cloud Console 可能有偏差，需标注"估算值"

### Size-to-AspectRatio Mapping（架构层定义）

| OpenAI `size` | Vertex AI `aspectRatio` | 说明 |
|---|---|---|
| `1024x1024` | `1:1` | 正方形（默认） |
| `1024x1792` | `9:16` | 竖版 |
| `1792x1024` | `16:9` | 横版 |
| `512x512` | `1:1` | 小尺寸正方形 |
| 其他/未指定 | `1:1` | 默认回退 |

## Starter Template Evaluation

### Primary Technology Domain

API Backend（Express）+ 轻量 Web App（React），基于项目需求分析。

### Starter Options Considered

| 选项 | 评估结果 |
|---|---|
| express-typescript-boilerplate | ❌ 过重（含 Docker, CI/CD, ORM）对内部工具冗余 |
| create-t3-app | ❌ 全栈框架，引入 tRPC/Prisma 等不需要的依赖 |
| NestJS | ❌ 企业级框架，过度设计 |
| **手动搭建** | ✅ 最适合：项目简单，最小依赖，完全可控 |

### Selected Starter: 手动搭建（No Starter Template）

**Rationale for Selection:**
- 项目复杂度为 Low，后端仅 6-7 个路由 + 一个代理层
- 前端仅 3 个页面（日志、统计、设置）
- 手动搭建可确保最小依赖，符合"极致轻量"设计理念
- 避免 starter 带来的不必要配置（Docker, CI/CD, ORM 等）

**Initialization Commands:**

```bash
# 后端
mkdir -p backend && cd backend
npm init -y
npm install express cors better-sqlite3 @google/genai
npm install -D typescript @types/node @types/express @types/cors @types/better-sqlite3 tsx
npx tsc --init

# 前端
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install react-router-dom
```

### Architectural Decisions Provided by Setup

**Language & Runtime:**
- TypeScript（后端 + 前端统一）
- Node.js ≥ 18.x
- tsx 用于开发热重载

**Project Structure:**
```
vertex-ai-gateway/
├── backend/              # Express API 服务
│   ├── src/
│   │   ├── index.ts             # 入口
│   │   ├── routes/              # 路由层
│   │   │   ├── images.ts        # POST /v1/images/generations
│   │   │   ├── health.ts        # GET /health, GET /v1/models
│   │   │   ├── admin.ts         # 服务账号 CRUD, 配置管理
│   │   │   ├── logs.ts          # GET /api/logs
│   │   │   └── stats.ts         # GET /api/stats
│   │   ├── services/            # 业务逻辑层
│   │   │   ├── vertex-ai.ts     # Vertex AI SDK 调用 + 重试
│   │   │   ├── converter.ts     # OpenAI ↔ Gemini 格式转换
│   │   │   └── cost.ts          # 费用估算
│   │   ├── middleware/          # 中间件
│   │   │   ├── auth.ts          # API Key 认证
│   │   │   └── logger.ts        # 请求日志记录
│   │   ├── db/                  # 数据层
│   │   │   └── database.ts      # SQLite 初始化 + DAO
│   │   └── config/
│   │       └── index.ts         # 环境变量 + 配置
│   ├── package.json
│   └── tsconfig.json
├── frontend/             # Vite + React 管理面板
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Logs.tsx         # 日志查看
│   │   │   ├── Stats.tsx        # 费用统计
│   │   │   └── Settings.tsx     # 服务账号 + 配置
│   │   ├── components/
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── package.json          # 根 workspace
└── README.md
```

**Key Dependencies:**

| 包名 | 用途 | 层级 |
|---|---|---|
| `express` | Web 框架 | 后端 |
| `@google/genai` | Vertex AI 统一 SDK | 后端 |
| `better-sqlite3` | SQLite 驱动（同步 API，高性能） | 后端 |
| `cors` | CORS（前后端分离） | 后端 |
| `tsx` | TypeScript 开发服务器 | 后端 Dev |
| `vite` + `react` | 前端框架 | 前端 |
| `react-router-dom` | 客户端路由（3 页面） | 前端 |

**Note:** 项目初始化应作为第一个实施 Story。

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (阻塞实施):**
1. SQLite 表结构设计
2. 服务账号加密存储方案
3. 错误处理与重试策略
4. 环境配置方案
5. 前端部署方式

**Important Decisions (塑造架构):**
1. 前端状态管理方案
2. UI 框架选择
3. 数据保留策略

**Deferred Decisions (Post-MVP):**
1. Docker 容器化
2. CI/CD 流水线
3. 监控报警

### Data Architecture

**Database:** SQLite via `better-sqlite3`（同步 API，高性能，Node.js 原生绑定）

**WAL Mode:** 必须开启，支持并发读写
```sql
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
```

**表结构:**

```sql
-- API 调用日志
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT UNIQUE NOT NULL,       -- UUID
  timestamp TEXT NOT NULL,               -- ISO 8601
  prompt TEXT,                           -- 截断存储（前 200 字符）
  model TEXT NOT NULL,
  size TEXT,                             -- 原始 OpenAI size 参数
  aspect_ratio TEXT,                     -- 转换后的 Vertex AI aspectRatio
  status TEXT NOT NULL,                  -- 'success' | 'failed'
  status_code INTEGER,
  error_message TEXT,
  response_time_ms INTEGER,             -- 端到端耗时
  retry_count INTEGER DEFAULT 0,
  retry_details TEXT,                    -- JSON: 每次重试的状态
  estimated_cost REAL,                  -- 估算费用 (USD)
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_logs_timestamp ON logs(timestamp);
CREATE INDEX idx_logs_status ON logs(status);

-- 系统配置（KV 存储）
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,                   -- 敏感数据 AES-256-GCM 加密
  updated_at TEXT DEFAULT (datetime('now'))
);
-- 存储项：api_key（加密）, service_account（加密 JSON）,
-- monthly_budget, vertex_project_id, vertex_location
```

**数据保留策略:** 日志保留 90 天，服务启动时自动清理过期记录。

### Authentication & Security

**加密方案:** AES-256-GCM
- 对称加密，密钥从环境变量 `ENCRYPTION_KEY` 读取
- API Key 和服务账号 JSON 均加密后存入 SQLite `config` 表
- 每次加密生成随机 IV，与密文一并存储

**服务账号处理流程:**
1. 前端上传 JSON 文件 → 后端接收
2. 验证 JSON 格式（检查必要字段：`type`, `project_id`, `private_key`, `client_email`）
3. AES-256-GCM 加密 → 存入 SQLite config 表
4. 使用时：从 DB 读取 → 解密 → 传入 `@google/genai` 的 `googleAuthOptions`

**API Key 认证中间件:**
- 校验 `Authorization: Bearer <key>`
- 管理 API 和图片生成 API 使用同一 Key（局域网简化）
- 未认证请求返回 `401 { error: { type: "authentication_error", message: "Invalid API key" } }`

### API & Communication Patterns

**错误映射表（Vertex AI → OpenAI 兼容格式）:**

| Vertex AI 错误 | OpenAI 映射 | 是否重试 |
|---|---|---|
| 429 Rate Limit | `429 { error: { type: "rate_limit_error" } }` | ✅ 重试 |
| 500 Internal Error | `500 { error: { type: "server_error" } }` | ✅ 重试 |
| 503 Unavailable | `503 { error: { type: "server_error" } }` | ✅ 重试 |
| 400 Bad Request | `400 { error: { type: "invalid_request_error" } }` | ❌ |
| Safety Filter | `400 { error: { type: "content_filter" } }` | ❌ |
| 认证失败 | `401 { error: { type: "authentication_error" } }` | ❌ |

**重试策略:**
- 最多 2 次重试（共 3 次尝试）
- 指数退避：第 1 次等 1s，第 2 次等 3s
- 仅对 429/500/503 重试
- 每次重试状态记录到日志的 `retry_details` 字段

**OpenAI 响应格式标准:**
```json
{
  "created": 1709136000,
  "data": [
    {
      "b64_json": "<base64_image>",
      "revised_prompt": "描述文字..."
    }
  ]
}
```

### Frontend Architecture

**状态管理:** 不使用状态管理库
- `useState` + `useEffect` + `fetch` 已足够
- 3 个页面均为简单数据展示，无复杂状态交互

**UI 框架:** 纯 CSS
- 内部工具，不需要花哨 UI
- 简洁功能为主

**路由:** `react-router-dom`
- `/logs` — 日志查看
- `/stats` — 费用统计
- `/settings` — 服务账号 + API Key 配置

### Infrastructure & Deployment

**启动方式:**
- 开发环境：`npm run dev`（后端 `tsx watch` + 前端 `vite dev`）
- 生产环境：`npm run build && npm start`（`tsc` 编译 + `node` 运行，Express 托管 `frontend/dist/`）

**前端部署:**
- 生产模式：Express 静态托管 `frontend/dist/` 目录
- 开发模式：前后端独立运行，vite dev server proxy 转发后端 API

**环境配置:**
```bash
# .env
PORT=3000                           # 服务端口
ENCRYPTION_KEY=your-32-byte-key     # AES-256 加密密钥
VERTEX_PROJECT_ID=your-project-id   # Google Cloud 项目 ID
VERTEX_LOCATION=us-central1         # Vertex AI 区域
API_KEY=your-api-key                # 初始 API Key（可选）
MONTHLY_BUDGET=100                  # 月度赠金上限 USD
```

### Decision Impact Analysis

**Implementation Sequence:**
1. 项目初始化（目录结构 + 依赖安装）
2. SQLite 数据库初始化 + 配置管理
3. 加密模块 + API Key 认证中间件
4. 服务账号管理 API
5. Vertex AI SDK 集成 + 格式转换层
6. 图片生成核心路由（/v1/images/generations）
7. 日志记录 + 查询 API
8. 费用估算 + 统计 API
9. 前端管理面板
10. 集成测试 + 部署

**Cross-Component Dependencies:**
- 加密模块 → 配置管理、服务账号管理、API Key 管理
- SQLite DAO → 日志、配置、统计所有模块
- 格式转换层 → 图片生成路由 + Vertex AI 服务
- 日志中间件 → 所有 API 路由

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**关键冲突点识别：** 5 个领域可能导致 AI Agent 实现不一致

### Naming Patterns

**数据库命名规范:**
- 表名：小写复数（`logs`, `config`）
- 列名：`snake_case`（`request_id`, `response_time_ms`）
- 索引名：`idx_表名_列名`（`idx_logs_timestamp`）

**API 命名规范:**
- REST 端点：小写复数（`/v1/images/generations`）
- 查询参数：`snake_case`（`start_date`, `end_date`）
- 请求/响应 JSON 字段：`snake_case`（与 OpenAI 保持一致）

**代码命名规范:**
- 文件名：`kebab-case`（`vertex-ai.ts`, `admin.ts`）
- React 组件文件：`PascalCase`（`Logs.tsx`, `Settings.tsx`）
- 函数/变量：`camelCase`（`getApiLogs`, `requestId`）
- 类/接口：`PascalCase`（`VertexAIService`, `LogEntry`）
- 常量：`UPPER_SNAKE_CASE`（`MAX_RETRY_COUNT`, `DEFAULT_ASPECT_RATIO`）
- 环境变量：`UPPER_SNAKE_CASE`（`ENCRYPTION_KEY`, `VERTEX_PROJECT_ID`）

### Structure Patterns

**测试组织:**
- 测试文件与源文件同目录（co-located）
- 名称后缀 `.test.ts`（`converter.test.ts`）
- `backend/src/services/converter.ts` → `backend/src/services/converter.test.ts`

**导入顺序（每个文件统一）:**
1. Node.js 内置模块（`crypto`, `path`）
2. 第三方库（`express`, `@google/genai`）
3. 本地模块（相对路径）

### Format Patterns

**API 响应格式:**

成功响应（图片生成，完全兼容 OpenAI）：
```json
{
  "created": 1709136000,
  "data": [{ "b64_json": "...", "revised_prompt": "..." }]
}
```

错误响应（兼容 OpenAI）：
```json
{
  "error": {
    "message": "人类可读的错误描述",
    "type": "invalid_request_error | authentication_error | rate_limit_error | server_error | content_filter",
    "code": null
  }
}
```

管理 API 响应（自定义，但保持一致）：
```json
{
  "success": true,
  "data": { ... }
}
```

**日期格式:** 全局统一使用 ISO 8601（`2026-02-28T20:55:09+08:00`）

### Process Patterns

**错误处理流程:**
1. 路由层捕获异常 → 记录日志 → 返回 OpenAI 格式错误
2. 全局错误处理中间件作为兆底
3. 不向客户端暴露内部错误细节

**日志记录规范:**
- 日志级别：`info`（正常请求）, `warn`（重试）, `error`（失败）
- Prompt 截断至 200 字符
- API Key 仅记录后 4 位（`****xxxx`）
- 不记录图片 base64 数据

### Enforcement Guidelines

**All AI Agents MUST:**
- 遵循上述命名规范，不得自行变更
- 所有 API 响应使用规定的 JSON 结构
- 新代码必须包含中文注释
- 测试文件与源文件同目录放置

## Project Structure & Boundaries

### Complete Project Directory Structure

```
vertex-ai-gateway/
├── .env.example                    # 环境变量示例
├── .gitignore
├── package.json                    # 根 workspace 配置
├── README.md
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                # 应用入口：启动 Express、初始化 DB
│       ├── routes/
│       │   ├── images.ts           # POST /v1/images/generations
│       │   ├── health.ts           # GET /health, GET /v1/models
│       │   ├── admin.ts            # POST/GET/DELETE /api/service-account
│       │   │                       # GET/PUT /api/config
│       │   ├── logs.ts             # GET /api/logs
│       │   └── stats.ts            # GET /api/stats
│       ├── services/
│       │   ├── vertex-ai.ts        # Vertex AI SDK 初始化 + generateContent 调用
│       │   ├── vertex-ai.test.ts   # 单元测试
│       │   ├── converter.ts        # OpenAI ↔ Gemini 参数/响应格式转换
│       │   ├── converter.test.ts   # 单元测试
│       │   ├── cost.ts             # 费用估算逻辑
│       │   ├── cost.test.ts        # 单元测试
│       │   ├── encryption.ts       # AES-256-GCM 加解密
│       │   └── encryption.test.ts  # 单元测试
│       ├── middleware/
│       │   ├── auth.ts             # API Key 认证
│       │   ├── error-handler.ts    # 全局错误处理
│       │   └── request-logger.ts   # 请求日志记录
│       ├── db/
│       │   ├── database.ts         # SQLite 初始化、建表、WAL 配置
│       │   ├── logs-dao.ts         # 日志 CRUD 操作
│       │   └── config-dao.ts       # 配置 KV 存储 CRUD
│       ├── config/
│       │   └── index.ts            # 环境变量读取 + 默认值
│       └── types/
│           └── index.ts            # TypeScript 类型定义
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts              # Vite 配置 + 开发代理
│   ├── index.html
│   └── src/
│       ├── App.tsx                 # 根组件 + 路由配置
│       ├── App.css                 # 全局样式
│       ├── main.tsx                # 入口
│       ├── pages/
│       │   ├── Logs.tsx            # 日志查看页（时间筛选、状态筛选、分页）
│       │   ├── Stats.tsx           # 费用统计页（月度统计、赠金进度）
│       │   └── Settings.tsx        # 设置页（服务账号上传、API Key 配置）
│       ├── components/
│       │   ├── Layout.tsx          # 布局组件（导航栏 + 内容区）
│       │   ├── LogTable.tsx        # 日志表格组件
│       │   ├── StatsCard.tsx       # 统计卡片组件
│       │   └── FileUpload.tsx      # 文件上传组件
│       └── api/
│           └── client.ts           # 后端 API 调用封装
└── data/                           # SQLite 数据库文件（运行时生成，加入 .gitignore）
    └── gateway.db
```

### Architectural Boundaries

**API Boundaries:**

| 边界 | 入口 | 出口 |
|---|---|---|
| 外部客户端 → 网关 | `POST /v1/images/generations` | OpenAI 格式 JSON |
| 网关 → Vertex AI | `@google/genai` SDK | Gemini API 响应 |
| 前端 → 管理 API | `GET/POST /api/*` | 统一 JSON 格式 |

**数据流:**
```
客户端请求 (OpenAI 格式)
  ↓
[auth 中间件] → 拒绝 or 通过
  ↓
[request-logger 中间件] → 记录请求开始
  ↓
[images 路由] → 解析参数
  ↓
[converter] → OpenAI params → Gemini params
  ↓
[vertex-ai service] → 调用 SDK + 重试逻辑
  ↓
[converter] → Gemini response → OpenAI response
  ↓
[cost service] → 估算费用
  ↓
[logs-dao] → 写入日志
  ↓
返回客户端 (OpenAI 格式)
```

### Requirements to Structure Mapping

| 能力域 (FR) | 对应文件 |
|---|---|
| 图片生成 (FR1-5) | `routes/images.ts`, `services/vertex-ai.ts`, `services/converter.ts` |
| 认证安全 (FR6-8) | `middleware/auth.ts`, `services/encryption.ts`, `db/config-dao.ts` |
| 服务账号 (FR9-12) | `routes/admin.ts`, `services/encryption.ts`, `db/config-dao.ts` |
| API 日志 (FR13-17) | `middleware/request-logger.ts`, `routes/logs.ts`, `db/logs-dao.ts` |
| 费用统计 (FR18-22) | `services/cost.ts`, `routes/stats.ts`, `db/logs-dao.ts` |
| 服务监控 (FR23-25) | `routes/health.ts` |
| 前端日志 (FR14-17) | `frontend/src/pages/Logs.tsx`, `components/LogTable.tsx` |
| 前端统计 (FR19-22) | `frontend/src/pages/Stats.tsx`, `components/StatsCard.tsx` |
| 前端管理 (FR9-12) | `frontend/src/pages/Settings.tsx`, `components/FileUpload.tsx` |

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
- Express + TypeScript + better-sqlite3 + @google/genai — 所有依赖完全兼容
- Vite + React + TypeScript — 前端技术栈无冲突
- SQLite WAL 模式 + better-sqlite3 同步 API — 并发处理方案一致

**Pattern Consistency:**
- 命名规范在 DB、API、代码三层保持一致（`snake_case` 用于 DB 和 API，`camelCase` 用于代码）
- 错误处理模式从 Vertex AI 到客户端全链路统一

**Structure Alignment:**
- 项目结构与架构决策完全对齐
- 每个 FR 都有明确的文件映射

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**
- FR1-FR25：全部 25 条功能需求均有架构支撑 ✅
- 每条 FR 均可追溯到具体文件

**Non-Functional Requirements Coverage:**
- NFR1（API <30s）：网关层极轻量，瓶颈在 Vertex AI 上游 ✅
- NFR2（管理 API <500ms）：SQLite 内存查询 + WAL 模式 ✅
- NFR3（前端 <2s）：Vite 构建优化 ✅
- NFR4（日志查询 <2s）：索引 + 分页 ✅
- NFR5（服务账号加密）：AES-256-GCM ✅
- NFR6（API Key 不明文）：加密存储 + 日志脱敏 ✅
- NFR7（Prompt 截断）：200 字符截断 ✅
- NFR8（局域网）：无公网暴露 ✅
- NFR9（可用性 ≥99%）：简单架构可靠性高 ✅
- NFR10（指数退避）：重试策略已定义 ✅
- NFR11（崩溃恢复）：`npm start` 即可 ✅
- NFR12-14（集成）：协议转换层 + SDK 已涵盖 ✅

### Implementation Readiness ✅

- 所有关键决策已记录，含具体版本
- 实现模式涵盖命名、结构、格式、流程
- 项目结构完整且具体，无占位符
- 实施顺序已明确，依赖关系已梳理

### Gap Analysis Results

**无关键缺口。**

以下为 Post-MVP 待完善项：
- Docker 容器化部署（Growth Phase）
- 多模型支持（Growth Phase）
- 图片缓存层（Growth Phase）
- 监控报警系统（Growth Phase）

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] 项目上下文已分析，复杂度为 Low
- [x] 技术约束已识别（Vertex AI 模型限制、SDK 选择）
- [x] 跨领域关注点已映射（5 个）

**✅ Architectural Decisions**
- [x] 关键决策已记录（数据架构、认证安全、API 通信、前端、部署）
- [x] 技术栈完全确定
- [x] 集成模式已定义

**✅ Implementation Patterns**
- [x] 命名规范已建立（DB/API/代码）
- [x] 结构模式已定义（测试、导入）
- [x] 格式模式已规范（响应、日期）
- [x] 流程模式已文档化（错误处理、日志）

**✅ Project Structure**
- [x] 完整目录结构已定义（所有文件）
- [x] 组件边界已建立
- [x] 集成点已映射
- [x] FR 到文件的映射完整

### Architecture Readiness Assessment

**Overall Status:** ✅ READY FOR IMPLEMENTATION

**Confidence Level:** **High** — 项目复杂度低，技术栈成熟，所有决策已明确

**Key Strengths:**
- 极轻量架构，最小依赖
- 协议转换层作为独立组件，可测试性强
- OpenAI 完全兼容，现有 Skill 零修改切换
- 安全设计合理（AES 加密 + 日志脱敏）

**Areas for Future Enhancement:**
- Docker 化部署（简化环境搭建）
- 多模型支持（Imagen 等）
- 监控告警（赠金即将耗尽时自动通知）

### Implementation Handoff

**AI Agent Guidelines:**
- 严格遵循本文档的所有架构决策
- 使用规定的实现模式和命名规范
- 尊重项目结构和组件边界
- 新代码必须包含中文注释
- 所有 API 响应使用规定的 JSON 结构

**First Implementation Priority:**
```bash
# Step 1: 项目初始化
mkdir vertex-ai-gateway && cd vertex-ai-gateway
npm init -y

# Step 2: 后端初始化
mkdir -p backend/src/{routes,services,middleware,db,config,types}
cd backend && npm init -y
npm install express cors better-sqlite3 @google/genai dotenv uuid
npm install -D typescript @types/node @types/express @types/cors @types/better-sqlite3 @types/uuid tsx
npx tsc --init

# Step 3: 前端初始化
cd .. && npm create vite@latest frontend -- --template react-ts
cd frontend && npm install react-router-dom
```
