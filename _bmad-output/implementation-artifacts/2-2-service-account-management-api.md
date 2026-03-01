# Story 2.2: 服务账号上传与管理 API

Status: review

## Story

As a 管理员,
I want 通过 API 上传、查看状态和删除服务账号,
so that 我可以管理 Vertex AI 的访问凭证。

## Acceptance Criteria

1. **AC1**: `POST /api/service-account` 接收 JSON 内容，验证必要字段（type, project_id, private_key, client_email）
2. **AC2**: 验证通过后 AES 加密并存入 config 表（key = `service_account`）
3. **AC3**: 返回 `{ success: true, data: { project_id, client_email, status: "configured" } }`
4. **AC4**: 缺少必要字段时返回 HTTP 400
5. **AC5**: `GET /api/service-account` 返回服务账号状态（不返回 private_key）
6. **AC6**: `DELETE /api/service-account` 删除记录并返回 `{ success: true }`

## Tasks / Subtasks

- [x] Task 1: 创建管理路由 (AC: #1-#6)
  - [x] 1.1: 创建 `backend/src/routes/admin.ts`
  - [x] 1.2: 实现 `POST /api/service-account` — 验证、加密、存储
  - [x] 1.3: 实现 `GET /api/service-account` — 解密后返回非敏感字段
  - [x] 1.4: 实现 `DELETE /api/service-account` — 删除 config 记录
  - [x] 1.5: 实现 `GET /api/config` — 返回 monthly_budget 等配置
  - [x] 1.6: 实现 `PUT /api/config` — 更新配置项

- [x] Task 2: 集成与测试
  - [x] 2.1: 注册 admin 路由到 Express（需 auth 中间件保护）
  - [x] 2.2: 编写集成测试覆盖 CRUD + 验证失败场景

## Dev Notes

### 服务账号验证必要字段
`type`, `project_id`, `private_key`, `client_email`

### Previous Story Intelligence
- Story 2.1: encryption 模块和 auth 中间件已可用
- Story 1.2: config-dao 已可用

### References
- [Source: architecture.md#Authentication-&-Security] — 服务账号处理流程

## Dev Agent Record
### Agent Model Used
Gemini 2.5 Pro (Antigravity)
### Debug Log References
无调试问题，所有任务一次通过
### Completion Notes List
- ✅ Task 1: 实现 `admin.ts` 路由 — 包含 POST/GET/DELETE /api/service-account 和 GET/PUT /api/config
  - POST 验证 type/project_id/private_key/client_email 四个必要字段
  - GET 返回 project_id/client_email/status，不返回 private_key
  - DELETE 删除 config 表中的 service_account 记录
  - GET /api/config 返回 monthly_budget 等配置
  - PUT /api/config 仅允许更新白名单配置项
- ✅ Task 2: 注册到 Express 应用，受 /api/* auth 中间件保护；编写 13 个集成测试用例
- ✅ 全部回归测试通过：11 文件 142 用例 0 失败
### File List
- `backend/src/routes/admin.ts` — 新增：Admin 管理路由（服务账号 CRUD + 配置管理）
- `backend/src/routes/admin.test.ts` — 新增：Admin 路由集成测试（13 用例）
- `backend/src/index.ts` — 修改：注册 adminRouter
### Change Log
- 2026-02-28: 实现 Story 2.2 — 服务账号上传/查看/删除 API、系统配置管理 API、完整测试覆盖
