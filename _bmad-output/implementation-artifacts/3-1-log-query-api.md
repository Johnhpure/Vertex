# Story 3.1: 日志查询 API

Status: review

## Story

As a 用户,
I want 通过 API 查询历史调用日志,
so that 我可以了解 API 使用情况和排查问题。

## Acceptance Criteria

1. **AC1**: `GET /api/logs` 返回分页日志列表，默认每页 20 条，按时间倒序
2. **AC2**: 响应格式 `{ success: true, data: { items: [...], total, page, page_size } }`
3. **AC3**: 支持 `start_date` 和 `end_date` 查询参数筛选时间范围
4. **AC4**: 支持 `status=success|failed` 查询参数筛选状态
5. **AC5**: 有重试记录的日志包含 `retry_details` JSON

## Tasks / Subtasks

- [x] Task 1: 创建日志路由 (AC: #1-#5)
  - [x] 1.1: 创建 `backend/src/routes/logs.ts`
  - [x] 1.2: 实现 `GET /api/logs` — 解析 query params（page, page_size, start_date, end_date, status）
  - [x] 1.3: 调用 logs-dao.queryLogs() 查询数据
  - [x] 1.4: 返回标准分页响应格式

- [x] Task 2: 集成与测试
  - [x] 2.1: 注册 logs 路由到 Express（需 auth 中间件）
  - [x] 2.2: 编写测试覆盖分页、筛选、空结果场景

## Dev Notes
### Previous Story Intelligence
- Story 1.2: logs-dao.queryLogs() 已实现分页和筛选
- Story 1.5: 日志记录中间件已将数据写入 logs 表

### References
- [Source: architecture.md#Project-Structure] — routes/logs.ts

## Dev Agent Record
### Agent Model Used
Gemini 2.5 Pro (Antigravity)
### Debug Log References
无调试问题，一次通过
### Completion Notes List
- ✅ Task 1: 实现 `logs.ts` 路由 — GET /api/logs 解析分页和筛选参数，调用 queryLogs()，返回 { items, total, page, page_size }
- ✅ Task 2: 注册到 Express（受 /api auth 中间件保护），编写 7 个测试用例（分页、时间筛选、状态筛选、重试详情、空结果、无效参数）
- ✅ 全部回归测试通过：12 文件 149 用例 0 失败
### File List
- `backend/src/routes/logs.ts` — 新增：日志查询路由
- `backend/src/routes/logs.test.ts` — 新增：日志路由测试（7 用例）
- `backend/src/index.ts` — 修改：注册 logsRouter
### Change Log
- 2026-02-28: 实现 Story 3.1 — 日志查询 API，支持分页/时间/状态筛选
