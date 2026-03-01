# Story 1.5: 错误重试与请求日志记录

Status: review

## Story

As a 用户,
I want 系统在 Vertex AI 临时故障时自动重试，并记录每次调用的详细信息,
so that 我有更高的成功率，并且可以事后排查问题。

## Acceptance Criteria

1. **AC1**: Vertex AI 返回 429/500/503 时触发重试，最多 2 次（共 3 次尝试） ✅
2. **AC2**: 第 1 次重试等待 1 秒，第 2 次等待 3 秒（指数退避） ✅
3. **AC3**: 每次重试的状态码和耗时记录到 `retry_details` JSON 字段 ✅
4. **AC4**: Vertex AI 返回 400 或安全过滤错误时不触发重试 ✅
5. **AC5**: 任意图片生成请求完成后写入 `logs` 表（成功和失败都记录） ✅
6. **AC6**: 日志包含 request_id, timestamp, prompt（截断 200 字符）, model, size, aspect_ratio, status, status_code, error_message, response_time_ms, retry_count ✅
7. **AC7**: 全局错误处理中间件捕获未预期异常，返回 OpenAI 格式 `{ error: { type: "server_error" } }` ✅

## Tasks / Subtasks

- [x] Task 1: 实现重试逻辑 (AC: #1, #2, #3, #4)
  - [x] 1.1: 修改 `backend/src/services/vertex-ai.ts` — 添加 `withRetry(fn, maxRetries)` 包装函数
  - [x] 1.2: 定义可重试错误码集合: `[429, 500, 503]`
  - [x] 1.3: 实现指数退避等待逻辑（1s, 3s）
  - [x] 1.4: 每次重试记录 `{ attempt, status_code, duration_ms }` 到 retry_details 数组
  - [x] 1.5: 400/安全过滤错误直接抛出，不重试

- [x] Task 2: 实现请求日志中间件 (AC: #5, #6)
  - [x] 2.1: 创建 `backend/src/middleware/request-logger.ts`
  - [x] 2.2: 记录请求开始时间（`Date.now()`）
  - [x] 2.3: 在响应完成后调用 logs-dao.insertLog() 写入日志
  - [x] 2.4: prompt 截断至 200 字符
  - [x] 2.5: 使用 `uuid.v4()` 生成 request_id 并附到 `req` 对象

- [x] Task 3: 实现全局错误处理中间件 (AC: #7)
  - [x] 3.1: 创建 `backend/src/middleware/error-handler.ts`
  - [x] 3.2: 作为 Express 4 参数错误中间件（err, req, res, next）
  - [x] 3.3: 将 Vertex AI 错误码映射为 OpenAI 错误格式
  - [x] 3.4: 未知错误返回 500 `{ error: { type: "server_error", message: "Internal server error" } }`
  - [x] 3.5: 不向客户端暴露内部错误堆栈

- [x] Task 4: 集成到应用 (AC: 全部)
  - [x] 4.1: 修改 `backend/src/index.ts` — 注册 error-handler 中间件
  - [x] 4.2: 修改 `backend/src/routes/images.ts` — 使用 withRetry 包装 Vertex AI 调用
  - [x] 4.3: 在路由中传递 retry_details 到日志记录

- [x] Task 5: 编写测试 (AC: 全部)
  - [x] 5.1: 测试重试逻辑 — mock 429/500/503 后成功的场景
  - [x] 5.2: 测试不重试 — mock 400 直接失败
  - [x] 5.3: 测试退避时间正确
  - [x] 5.4: 测试日志记录完整性（所有字段）
  - [x] 5.5: 测试全局错误处理格式

## Dev Notes

### 错误映射表 (from architecture.md)
| Vertex AI 错误 | OpenAI 映射 | 是否重试 |
|---|---|---|
| 429 Rate Limit | `429 { error: { type: "rate_limit_error" } }` | ✅ |
| 500 Internal | `500 { error: { type: "server_error" } }` | ✅ |
| 503 Unavailable | `503 { error: { type: "server_error" } }` | ✅ |
| 400 Bad Request | `400 { error: { type: "invalid_request_error" } }` | ❌ |
| Safety Filter | `400 { error: { type: "content_filter" } }` | ❌ |

### 重试策略
- 最多 2 次重试（共 3 次尝试）
- 退避: 第 1 次等 1000ms, 第 2 次等 3000ms
- retry_details JSON 格式: `[{ attempt: 1, status_code: 429, duration_ms: 1200 }, ...]`

### 日志记录规范
- prompt 截断至 200 字符
- API Key 仅记录后 4 位
- 不记录图片 base64 数据

### Previous Story Intelligence
- Story 1.2: logs-dao 的 insertLog() 已可用
- Story 1.3: converter 模块已可用
- Story 1.4: vertex-ai 服务和 images 路由已可用

### References
- [Source: architecture.md#API-&-Communication-Patterns] — 错误映射和重试策略
- [Source: architecture.md#Process-Patterns] — 错误处理流程和日志规范
- [Source: Vertex AI 官方文档] — 安全过滤 FinishReason 处理

## Dev Agent Record
### Agent Model Used
Gemini 2.5 Pro (Antigravity)
### Debug Log References
- images.test.ts mock 修复：使用 `importOriginal` 部分 mock vertex-ai.js，保留 VertexAIError 等真实导出
### Completion Notes List
- 全部 5 个 Task 已完成
- 全部 7 个 AC 已满足
- 112 个测试全部通过（新增 40 个测试）
  - vertex-ai.test.ts: 28 个测试（含重试逻辑 12 个）
  - request-logger.test.ts: 12 个测试
  - error-handler.test.ts: 8 个测试
  - images.test.ts: 11 个测试（含日志记录验证 2 个）
### File List
- `backend/src/services/vertex-ai.ts` — 新增 withRetry、VertexAIError、extractStatusCode、isSafetyFilterError（修改）
- `backend/src/middleware/request-logger.ts` — 请求日志记录模块（新增）
- `backend/src/middleware/error-handler.ts` — 全局错误处理中间件（新增）
- `backend/src/routes/images.ts` — 集成 withRetry 和日志记录（修改）
- `backend/src/index.ts` — 注册 errorHandler 中间件（修改）
- `backend/src/services/converter.ts` — OpenAIImageRequest 新增 model 字段（修改）
- `backend/src/services/vertex-ai.test.ts` — 重写，含重试逻辑测试（修改）
- `backend/src/middleware/request-logger.test.ts` — 日志模块测试（新增）
- `backend/src/middleware/error-handler.test.ts` — 错误处理测试（新增）
- `backend/src/routes/images.test.ts` — 更新 mock 策略，新增日志验证（修改）
### Change Log
- 2026-02-28: 完成所有 5 个 Task，112 个测试全部通过
