# Story 5.1: 健康检查与模型列表端点

Status: review

## Story

As a 运维人员,
I want 通过健康检查端点确认服务和上游连接状态,
so that 我可以快速判断服务是否正常运行。

## Acceptance Criteria

1. **AC1**: `GET /health` 返回 HTTP 200 `{ status, uptime, version, database, vertex_ai, service_account }`
2. **AC2**: `vertex_ai` 状态通过尝试初始化 SDK 来验证
3. **AC3**: 组件不可用时返回 `disconnected`，但整体仍返回 HTTP 200
4. **AC4**: `GET /v1/models` 返回 OpenAI 兼容格式 `{ data: [{ id: "gemini-3-pro-image-preview", object: "model", owned_by: "google" }] }`

## Tasks / Subtasks

- [x] Task 1: 创建健康检查路由 (AC: #1-#4)
  - [x] 1.1: 创建 `backend/src/routes/health.ts`
  - [x] 1.2: 实现 `GET /health` — 检查 DB 连接、Vertex AI SDK、服务账号配置
  - [x] 1.3: 实现 `GET /v1/models` — 返回静态模型列表
  - [x] 1.4: 注册路由到 Express（health 不需要 auth）

- [x] Task 2: 编写测试
  - [x] 2.1: 测试健康检查正常和 degraded 模式
  - [x] 2.2: 测试模型列表格式

## Dev Notes
### 健康检查不需要 auth 中间件保护（公开端点）
### /v1/models 也不需要 auth（与 OpenAI 兼容行为一致）
### 关键实现决策
- healthRouter 在 authMiddleware **之前**注册，确保 /health 和 /v1/models 为公开端点
- 替换了原有占位的 app.get('/') 根路由
- 即使组件不可用，/health 仍返回 HTTP 200（status: "degraded"），便于监控系统判断进程存活

### References
- [Source: architecture.md#Project-Structure] — routes/health.ts

## Dev Agent Record
### Agent Model Used
Gemini (Antigravity)
### Debug Log References
- 测试需要设置 ENCRYPTION_KEY 环境变量，在 beforeEach/afterEach 中管理
### Completion Notes List
- ✅ Task 1: 创建了完整的 health.ts 路由，包含 checkDatabase、checkServiceAccount、checkVertexAI 三个状态检查函数
- ✅ Task 1.4: healthRouter 注册在 authMiddleware 之前，移除了占位根路由和 TODO 注释
- ✅ Task 2: 编写 10 个测试用例，覆盖 DB 检查、服务账号检查、模型列表格式、健康检查响应格式、degraded 模式
- ✅ 全量回归测试通过：15 个文件，179 个测试用例
### File List
- `backend/src/routes/health.ts` — 新增：健康检查与模型列表路由
- `backend/src/routes/health.test.ts` — 新增：健康检查单元测试
- `backend/src/index.ts` — 修改：注册 healthRouter，移除占位路由和 TODO
### Change Log
- 2026-03-01: 实现 Story 5.1 全部功能 — 健康检查与模型列表端点
