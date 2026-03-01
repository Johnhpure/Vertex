# Story 1.1: 项目初始化与基础框架搭建

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 开发者,
I want 项目目录结构和基础依赖已正确初始化,
so that 后续所有 Story 都有一致的开发基础可以依赖。

## Acceptance Criteria

1. **AC1**: 项目根目录包含 `package.json`，配置 npm workspaces 指向 `backend` 和 `frontend`
2. **AC2**: `backend/package.json` 包含所有必需的 production 和 dev dependencies
3. **AC3**: `backend/tsconfig.json` 正确配置 TypeScript 编译选项（target: ES2020, module: NodeNext）
4. **AC4**: `backend/src/` 目录结构完整（routes/, services/, middleware/, db/, config/, types/）
5. **AC5**: `frontend/` 通过 Vite + React + TypeScript 模板初始化，安装 `react-router-dom`
6. **AC6**: `.env.example` 包含所有必需环境变量（PORT, ENCRYPTION_KEY, VERTEX_PROJECT_ID, VERTEX_LOCATION, API_KEY, MONTHLY_BUDGET）
7. **AC7**: `.gitignore` 排除 `node_modules/`, `data/`, `.env`, `dist/`, `*.db`
8. **AC8**: `npm run dev` 可以同时启动后端（tsx watch）和前端（vite dev）开发服务器
9. **AC9**: `npm run build` 可以编译后端 TypeScript 并构建前端
10. **AC10**: 后端入口文件 `backend/src/index.ts` 可以正常启动一个基础 Express 服务器（带 cors、json body parsing、静态文件托管占位）
11. **AC11**: 前端 `vite.config.ts` 配置开发代理，将 `/api/*` 和 `/v1/*` 转发到后端
12. **AC12**: 前端 `App.tsx` 配置 react-router-dom 基础路由（/logs, /stats, /settings）

## Tasks / Subtasks

- [x] Task 1: 创建根目录和根 package.json (AC: #1, #8, #9)
  - [x] 1.1: 在项目根目录创建 `package.json`，配置 `workspaces: ["backend", "frontend"]`
  - [x] 1.2: 添加根级 scripts: `dev` (并行启动后端+前端), `build` (串行编译)
  - [x] 1.3: 创建 `.gitignore` 排除 `node_modules/`, `data/`, `.env`, `dist/`, `*.db`
  - [x] 1.4: 创建 `.env.example` 包含所有环境变量及说明注释
  - [x] 1.5: 创建 `README.md` 基础说明文档

- [x] Task 2: 初始化后端项目 (AC: #2, #3, #4)
  - [x] 2.1: 创建 `backend/package.json`，声明 dependencies: express, cors, better-sqlite3, @google/genai, dotenv, uuid
  - [x] 2.2: 声明 devDependencies: typescript, @types/node, @types/express, @types/cors, @types/better-sqlite3, @types/uuid, tsx
  - [x] 2.3: 创建 `backend/tsconfig.json`，配置 `target: "ES2020"`, `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `outDir: "./dist"`, `rootDir: "./src"`, `strict: true`
  - [x] 2.4: 创建后端目录结构: `backend/src/{routes, services, middleware, db, config, types}/`
  - [x] 2.5: 添加后端 scripts: `dev` (tsx watch src/index.ts), `build` (tsc), `start` (node dist/index.js)

- [x] Task 3: 创建后端入口文件和配置模块 (AC: #10)
  - [x] 3.1: 创建 `backend/src/config/index.ts` — 读取环境变量，设置默认值（PORT=3000 等）
  - [x] 3.2: 创建 `backend/src/types/index.ts` — 定义基础类型接口（ApiResponse, ApiError, LogEntry, ConfigEntry 等）
  - [x] 3.3: 创建 `backend/src/index.ts` — Express 应用入口（加载 dotenv、配置 cors、json body parser、静态文件托管、基础健康检查路由 `GET /` 返回 `{ status: "ok" }`、错误处理中间件占位、启动监听）

- [x] Task 4: 初始化前端项目 (AC: #5, #11, #12)
  - [x] 4.1: 使用 `npm create vite@latest frontend -- --template react-ts` 初始化前端
  - [x] 4.2: 安装 `react-router-dom` 到 frontend
  - [x] 4.3: 配置 `frontend/vite.config.ts` 开发代理: `/api` 和 `/v1` 转发到 `http://localhost:3000`
  - [x] 4.4: 创建 `frontend/src/App.tsx` 基础路由配置（BrowserRouter + Routes: /logs, /stats, /settings）
  - [x] 4.5: 创建 3 个占位页面组件 `frontend/src/pages/{Logs,Stats,Settings}.tsx`
  - [x] 4.6: 创建 `frontend/src/api/client.ts` — API 调用基础封装（fetch wrapper with base URL + error handling + JSON parsing）

- [x] Task 5: 安装依赖并验证启动 (AC: #8, #9, #10)
  - [x] 5.1: 从根目录执行 `npm install`，确保所有 workspace 依赖安装成功
  - [x] 5.2: 执行 `npm run dev`，验证后端 Express 启动并监听 3000 端口
  - [x] 5.3: 验证前端 Vite dev server 启动（默认 5173 端口）
  - [x] 5.4: 验证 `curl http://localhost:3000/` 返回 `{ "status": "ok" }`
  - [x] 5.5: 验证 `npm run build` 成功编译后端（输出到 `backend/dist/`）和前端（输出到 `frontend/dist/`）

## Dev Notes

### Architecture Requirements
- **项目结构**: Monorepo（npm workspaces），根目录管理 backend + frontend
- **后端技术栈**: TypeScript + Express，using `tsx` for dev hot reload
- **前端技术栈**: Vite + React + TypeScript
- **命名规范**:
  - 后端文件名: `kebab-case` (e.g., `vertex-ai.ts`)
  - React 组件文件: `PascalCase` (e.g., `Logs.tsx`)
  - 函数/变量: `camelCase`
  - 常量: `UPPER_SNAKE_CASE`
- **注释**: 所有新代码必须包含中文注释
- **导入顺序**: 1) Node.js 内置 → 2) 第三方库 → 3) 本地模块

### Key Dependencies (Exact)
| 包名 | 用途 | 类型 |
|---|---|---|
| `express` | Web 框架 | production |
| `@google/genai` | Vertex AI 统一 SDK | production |
| `better-sqlite3` | SQLite 驱动 | production |
| `cors` | CORS 中间件 | production |
| `dotenv` | 环境变量加载 | production |
| `uuid` | 生成 request_id | production |
| `typescript` | TypeScript 编译器 | dev |
| `tsx` | TypeScript 开发运行时 | dev |
| `@types/node` | Node.js 类型 | dev |
| `@types/express` | Express 类型 | dev |
| `@types/cors` | CORS 类型 | dev |
| `@types/better-sqlite3` | SQLite 类型 | dev |
| `@types/uuid` | UUID 类型 | dev |
| `react-router-dom` | 前端路由 | frontend production |

### Environment Variables (.env.example)
```bash
# 服务端口
PORT=3000

# AES-256 加密密钥（32 字节 hex 字符串）
ENCRYPTION_KEY=

# Google Cloud 项目 ID（用于 Vertex AI）
VERTEX_PROJECT_ID=

# Vertex AI 区域
VERTEX_LOCATION=us-central1

# API 访问密钥（可选，首次启动时写入数据库）
API_KEY=

# 月度赠金上限（USD）
MONTHLY_BUDGET=100
```

### TypeScript Configuration Specifics
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Vite Proxy Configuration
```typescript
// frontend/vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/v1': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    }
  }
})
```

### Express 入口文件关键结构
```typescript
// backend/src/index.ts - 关键结构参考
import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 图片 base64 可能较大

// 生产模式：托管前端静态文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, '../../frontend/dist')));
}

// 基础健康检查（占位，后续 Story 会扩展）
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

// 生产模式：前端路由回退
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../frontend/dist/index.html'));
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] 服务已启动，端口: ${PORT}`);
});
```

### Project Structure Notes

- 文件夹结构严格遵循 architecture.md 定义的完整目录树
- `data/` 目录为运行时数据（SQLite 数据库），不提交到 Git
- Production build 时 Express 静态托管 `frontend/dist/`
- 开发模式下前后端通过 Vite proxy 连接

### References

- [Source: architecture.md#Starter-Template-Evaluation] — 初始化命令和依赖列表
- [Source: architecture.md#Project-Structure-&-Boundaries] — 完整目录结构
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — 命名规范和编码标准
- [Source: architecture.md#Infrastructure-&-Deployment] — 启动方式和环境配置
- [Source: architecture.md#Frontend-Architecture] — 前端路由和状态管理策略

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

- 修复了 TypeScript 5.9 `erasableSyntaxOnly` 兼容性问题：前端 `ApiError` 类中的 `public` 参数属性改为显式属性声明

### Completion Notes List

- ✅ Task 1: 根 package.json + .gitignore + .env.example + README.md 全部创建完成，npm workspaces 配置正确，使用 concurrently 实现并行启动
- ✅ Task 2: 后端 package.json 包含所有必需依赖，tsconfig.json 严格按规范配置，目录结构完整
- ✅ Task 3: 配置模块正确读取环境变量（ESM 兼容），类型定义覆盖 ApiResponse/ApiError/LogEntry/ConfigEntry/ServiceAccount，Express 入口包含 CORS/JSON/静态托管/健康检查/错误中间件
- ✅ Task 4: 前端通过 Vite react-ts 模板初始化，react-router-dom 安装配置完成，代理转发 /api /v1 /health，3 个占位页面和 API client 封装全部就位
- ✅ Task 5: 依赖安装成功（0 漏洞），后端 3000 端口启动正常，前端 5173 端口启动正常，健康检查返回 {"status":"ok"}，build 编译后端+前端全部通过

### File List

- `package.json` (新增) — 根 package.json，npm workspaces 配置
- `.gitignore` (新增) — Git 忽略规则
- `.env.example` (新增) — 环境变量模板
- `README.md` (新增) — 项目说明文档
- `backend/package.json` (新增) — 后端依赖配置
- `backend/tsconfig.json` (新增) — TypeScript 编译配置
- `backend/src/index.ts` (新增) — Express 服务入口
- `backend/src/config/index.ts` (新增) — 应用配置模块
- `backend/src/types/index.ts` (新增) — 基础类型定义
- `backend/src/routes/.gitkeep` (新增) — 路由目录占位
- `backend/src/services/.gitkeep` (新增) — 服务目录占位
- `backend/src/middleware/.gitkeep` (新增) — 中间件目录占位
- `backend/src/db/.gitkeep` (新增) — 数据库目录占位
- `frontend/package.json` (修改) — 添加 react-router-dom
- `frontend/vite.config.ts` (修改) — 添加开发代理配置
- `frontend/src/App.tsx` (修改) — 路由配置
- `frontend/src/pages/Logs.tsx` (新增) — 日志页面占位
- `frontend/src/pages/Stats.tsx` (新增) — 统计页面占位
- `frontend/src/pages/Settings.tsx` (新增) — 设置页面占位
- `frontend/src/api/client.ts` (新增) — API 客户端封装
- `frontend/src/App.css` (删除) — Vite 模板默认样式

### Change Log

- 2026-02-28: Story 1.1 完成 — 项目初始化与基础框架搭建，Monorepo 结构建立，后端 Express + 前端 Vite React 开发环境搭建完成
