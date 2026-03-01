---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-02-28'
inputDocuments: [prd.md, architecture.md, vertex-ai-api-reference.md]
---

# Vertex AI API 网关 - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Vertex AI API 网关, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: 用户可以通过 OpenAI 兼容的 API 端点发送图片生成请求
- FR2: 系统可以将 OpenAI 格式的请求参数转换为 Gemini API 参数
- FR3: 系统可以通过服务账号认证调用 Vertex AI 的 Gemini 3 Pro Image 模型
- FR4: 系统可以将 Gemini 生成的图片转换为 OpenAI 兼容的响应格式返回
- FR5: 系统可以在 Vertex AI 返回错误时自动重试（最多 2 次）
- FR6: 用户可以使用 API Key 认证访问图片生成 API
- FR7: 系统可以拒绝未携带有效 API Key 的请求
- FR8: 管理员可以配置和更新 API Key
- FR9: 管理员可以通过前端页面上传 Google 服务账号 JSON 文件
- FR10: 系统可以验证上传的服务账号文件格式是否正确
- FR11: 管理员可以查看当前服务账号的配置状态（已配置/未配置/异常）
- FR12: 管理员可以删除已配置的服务账号并重新上传
- FR13: 系统可以记录每次 API 调用的详细信息（时间、prompt、状态、耗时、错误信息）
- FR14: 用户可以通过前端页面查看 API 调用日志列表
- FR15: 用户可以按时间范围筛选日志记录
- FR16: 用户可以按状态（成功/失败）筛选日志记录
- FR17: 日志可以展示重试次数和每次重试的状态
- FR18: 系统可以估算每次 API 调用的费用（基于 Gemini 定价）
- FR19: 用户可以查看月度调用次数和总费用
- FR20: 用户可以查看月度 API 成功率
- FR21: 系统可以展示赠金消耗进度（已用/剩余/上限）
- FR22: 用户可以设置月度赠金上限（默认 $100）
- FR23: 系统可以通过健康检查端点报告服务状态
- FR24: 健康检查可以验证 Vertex AI 连接状态
- FR25: 系统可以返回可用模型列表（OpenAI 兼容格式）

### NonFunctional Requirements

- NFR1: 图片生成 API 端到端响应时间 < 30s（含 Vertex AI 生成时间）
- NFR2: 管理 API 响应时间 < 500ms
- NFR3: 前端页面加载时间 < 2s
- NFR4: 日志查询响应时间 < 2s（万级记录）
- NFR5: 服务账号 JSON 文件存储时进行加密
- NFR6: API Key 不以明文形式存储或记录在日志中
- NFR7: Prompt 内容在日志中可以截断展示（保护隐私）
- NFR8: 仅局域网内可访问，不暴露到公网
- NFR9: 网关服务可用性 ≥ 99%（仅计算网关本身）
- NFR10: 错误重试机制使用指数退避策略（避免雪崩）
- NFR11: 服务崩溃后可通过简单命令恢复
- NFR12: 完全兼容 OpenAI Images API v1 请求/响应格式
- NFR13: 支持 Google Cloud 服务账号 JSON 标准格式
- NFR14: 支持 Vertex AI Gemini API 的认证和调用协议

### Additional Requirements

**来自 Architecture 文档：**

- AR1: 项目采用手动搭建（No Starter Template），Monorepo 结构（backend/ + frontend/）
- AR2: 后端使用 TypeScript + Express，前端使用 Vite + React + TypeScript
- AR3: 数据库使用 SQLite (better-sqlite3)，必须开启 WAL 模式
- AR4: 使用 `@google/genai` SDK（`vertexai: true` 模式）调用 Vertex AI
- AR5: 加密方案为 AES-256-GCM，密钥从环境变量 `ENCRYPTION_KEY` 读取
- AR6: 必须配置 `responseModalities: ['TEXT', 'IMAGE']` 才能生成图片
- AR7: OpenAI 的 `size` 参数需映射为 Vertex AI 的 `aspectRatio`（定义了映射表）
- AR8: Gemini 响应的 `parts[]` 数组中 text 和 image 顺序不固定，需遍历处理
- AR9: 费用估算为近似值（基于 token 定价），需标注"估算值"
- AR10: 生产模式下 Express 静态托管 `frontend/dist/` 目录
- AR11: 日志保留 90 天，服务启动时自动清理过期记录
- AR12: 测试文件与源文件同目录（co-located），后缀 `.test.ts`
- AR13: 所有新代码必须包含中文注释

**来自 Vertex AI API 参考文档：**

- VR1: 目标模型为 `gemini-3-pro-image-preview`（公开预览版）
- VR2: 输入 token 上限 65,536，输出 token 上限 32,768
- VR3: 支持 10 种宽高比：1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
- VR4: 不支持 OpenAI 兼容的聊天补全接口，必须自行实现格式转换
- VR5: 图片在响应的 `parts[].inlineData.data` 中，base64 编码 PNG

### FR Coverage Map

| FR | Epic | 描述 |
|---|---|---|
| FR1 | Epic 1 | OpenAI 兼容 API 端点 |
| FR2 | Epic 1 | 参数格式转换（OpenAI → Gemini） |
| FR3 | Epic 1 | 服务账号认证调用 Vertex AI |
| FR4 | Epic 1 | 响应格式转换（Gemini → OpenAI） |
| FR5 | Epic 1 | 错误自动重试 |
| FR6 | Epic 2 | API Key 认证 |
| FR7 | Epic 2 | 拒绝无效请求 |
| FR8 | Epic 2 | 配置更新 API Key |
| FR9 | Epic 2 | 前端上传服务账号 |
| FR10 | Epic 2 | 验证服务账号格式 |
| FR11 | Epic 2 | 查看服务账号状态 |
| FR12 | Epic 2 | 删除服务账号 |
| FR13 | Epic 3 | 记录 API 调用信息 |
| FR14 | Epic 3 | 前端查看日志列表 |
| FR15 | Epic 3 | 按时间筛选日志 |
| FR16 | Epic 3 | 按状态筛选日志 |
| FR17 | Epic 3 | 展示重试详情 |
| FR18 | Epic 4 | 估算调用费用 |
| FR19 | Epic 4 | 月度调用统计 |
| FR20 | Epic 4 | 月度成功率 |
| FR21 | Epic 4 | 赠金消耗进度 |
| FR22 | Epic 4 | 设置月度上限 |
| FR23 | Epic 5 | 健康检查端点 |
| FR24 | Epic 5 | Vertex AI 连接验证 |
| FR25 | Epic 5 | 可用模型列表 |

**覆盖率：25/25 FR（100%）**

## Epic List

### Epic 1: 项目基础与核心图片生成
用户可以通过 OpenAI 兼容的 API 端点生成图片，系统自动完成参数转换、Vertex AI 调用并返回兼容格式的结果。
**FRs covered:** FR1, FR2, FR3, FR4, FR5
**NFRs addressed:** NFR1, NFR10, NFR12, NFR14
**Additional:** AR1-AR8, VR1-VR5

### Epic 2: 认证与服务账号管理
管理员可以通过前端上传服务账号、配置 API Key，系统安全存储凭证并对所有请求进行认证。
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR12
**NFRs addressed:** NFR5, NFR6, NFR8, NFR13
**Additional:** AR5

### Epic 3: API 调用日志与问题排查
用户可以通过前端查看所有 API 调用日志，按时间和状态筛选，查看重试详情，快速定位问题。
**FRs covered:** FR13, FR14, FR15, FR16, FR17
**NFRs addressed:** NFR4, NFR7
**Additional:** AR11

### Epic 4: 费用统计与赠金管控
用户可以查看月度调用统计、费用估算和赠金消耗进度，设置月度上限防止超支。
**FRs covered:** FR18, FR19, FR20, FR21, FR22
**NFRs addressed:** NFR2, NFR3
**Additional:** AR9

### Epic 5: 服务监控与健康检查
系统可以通过健康检查端点报告自身和 Vertex AI 连接状态，返回可用模型列表。
**FRs covered:** FR23, FR24, FR25
**NFRs addressed:** NFR9, NFR11

---

## Epic 1: 项目基础与核心图片生成

用户可以通过 OpenAI 兼容的 API 端点生成图片，系统自动完成参数转换、Vertex AI 调用并返回兼容格式的结果。

### Story 1.1: 项目初始化与基础框架搭建

As a 开发者,
I want 项目目录结构和基础依赖已正确初始化,
So that 后续所有 Story 都有一致的开发基础可以依赖。

**Acceptance Criteria:**

**Given** 一个空的项目目录
**When** 执行初始化脚本
**Then** 创建 `backend/` 和 `frontend/` 目录结构（符合 architecture.md 定义）
**And** `backend/package.json` 包含 express, @google/genai, better-sqlite3, cors, dotenv, uuid 依赖
**And** `backend/tsconfig.json` 正确配置 TypeScript 编译选项
**And** `frontend/` 通过 Vite + React + TypeScript 模板初始化
**And** 根目录 `package.json` 配置 npm workspaces
**And** `.env.example` 包含所有必需环境变量
**And** `.gitignore` 排除 `node_modules/`, `data/`, `.env`, `dist/`
**And** `npm run dev` 可以同时启动后端和前端开发服务器

### Story 1.2: SQLite 数据库初始化与配置管理

As a 系统,
I want 数据库在服务启动时自动初始化并创建必要的表,
So that 日志和配置数据有持久化存储。

**Acceptance Criteria:**

**Given** 后端服务启动
**When** 数据库文件不存在
**Then** 自动在 `data/gateway.db` 创建 SQLite 数据库
**And** 创建 `logs` 表（包含 id, request_id, timestamp, prompt, model, size, aspect_ratio, status, status_code, error_message, response_time_ms, retry_count, retry_details, estimated_cost, created_at）
**And** 创建 `config` 表（包含 key, value, updated_at）
**And** 创建索引 `idx_logs_timestamp` 和 `idx_logs_status`
**And** 启用 WAL 模式和 busy_timeout=5000
**And** config-dao 提供 get/set/delete 方法
**And** logs-dao 提供 insert/query/cleanup 方法

### Story 1.3: OpenAI 到 Gemini 格式转换层

As a 系统,
I want 将 OpenAI 图片生成请求参数转换为 Gemini API 参数，并将 Gemini 响应转换回 OpenAI 格式,
So that 外部客户端无需感知底层模型差异。

**Acceptance Criteria:**

**Given** 收到 OpenAI 格式的请求 `{ prompt, n, size, response_format }`
**When** 调用请求转换函数
**Then** 输出 Gemini 参数，包含：`contents` 数组（含 prompt 文本）、`generationConfig`（含 `responseModalities: ['TEXT', 'IMAGE']`）
**And** `size` 参数按映射表转换为 `aspectRatio`（1024x1024→1:1, 1024x1792→9:16, 1792x1024→16:9 等）
**And** 未指定或未知 size 默认映射为 `1:1`

**Given** Gemini 返回包含 `parts[]` 数组的响应
**When** 调用响应转换函数
**Then** 遍历 `parts[]`，提取 `inlineData.mimeType` 为 `image/png` 的部分作为 `b64_json`
**And** 提取 `text` 部分作为 `revised_prompt`
**And** 输出 OpenAI 格式 `{ created, data: [{ b64_json, revised_prompt }] }`
**And** 转换函数有对应的单元测试覆盖所有映射场景

### Story 1.4: Vertex AI SDK 集成与图片生成调用

As a 用户,
I want 发送一个 prompt 到 API 端点就能收到 AI 生成的图片,
So that 我可以通过 OpenAI 兼容的接口获取 Vertex AI 生成的图片。

**Acceptance Criteria:**

**Given** 服务账号 JSON 已配置（从 config 表读取并解密），后端已启动
**When** 发送 `POST /v1/images/generations` 请求，body 为 `{ prompt: "a cat", size: "1024x1024" }`
**Then** 系统使用 `@google/genai` SDK（vertexai: true 模式）调用 `gemini-3-pro-image-preview` 模型
**And** 返回 HTTP 200，body 为 OpenAI 格式 `{ created, data: [{ b64_json, revised_prompt }] }`
**And** `b64_json` 包含有效的 base64 编码 PNG 图片数据

**Given** 服务账号未配置
**When** 发送图片生成请求
**Then** 返回 HTTP 500，body 为 `{ error: { type: "server_error", message: "Service account not configured" } }`

### Story 1.5: 错误重试与请求日志记录

As a 用户,
I want 系统在 Vertex AI 临时故障时自动重试，并记录每次调用的详细信息,
So that 我有更高的成功率，并且可以事后排查问题。

**Acceptance Criteria:**

**Given** Vertex AI 返回 429/500/503 错误
**When** 图片生成请求触发重试
**Then** 最多重试 2 次（共 3 次尝试）
**And** 第 1 次重试等待 1 秒，第 2 次重试等待 3 秒（指数退避）
**And** 每次重试的状态码和耗时记录到 `retry_details` JSON 字段

**Given** Vertex AI 返回 400 或安全过滤错误
**When** 图片生成请求失败
**Then** 不触发重试，直接返回对应的 OpenAI 格式错误

**Given** 任意图片生成请求完成（成功或失败）
**When** 请求处理结束
**Then** 写入 `logs` 表，包含 request_id, timestamp, prompt（截断 200 字符）, model, size, aspect_ratio, status, status_code, error_message, response_time_ms, retry_count
**And** 全局错误处理中间件捕获未预期异常，返回 `{ error: { type: "server_error" } }`

---

## Epic 2: 认证与服务账号管理

管理员可以通过前端上传服务账号、配置 API Key，系统安全存储凭证并对所有请求进行认证。

### Story 2.1: AES 加密模块与 API Key 认证中间件

As a 管理员,
I want API 端点受到 API Key 保护，敏感数据加密存储,
So that 只有授权用户可以访问服务，凭证安全不泄露。

**Acceptance Criteria:**

**Given** `ENCRYPTION_KEY` 环境变量已设置
**When** 调用加密函数
**Then** 使用 AES-256-GCM 加密数据，每次生成随机 IV
**And** 输出格式为 `iv:authTag:ciphertext`（base64 编码）
**And** 解密函数可以正确还原原始数据
**And** 加密模块有单元测试

**Given** 请求携带 `Authorization: Bearer <valid_key>` header
**When** 经过 auth 中间件
**Then** 请求通过，继续后续处理

**Given** 请求未携带 Authorization header 或 Key 无效
**When** 经过 auth 中间件
**Then** 返回 HTTP 401 `{ error: { type: "authentication_error", message: "Invalid API key" } }`

**Given** 初始启动且 config 表无 `api_key` 记录
**When** 环境变量 `API_KEY` 已设置
**Then** 将其加密后存入 config 表作为初始 API Key

### Story 2.2: 服务账号上传与管理 API

As a 管理员,
I want 通过 API 上传、查看状态和删除服务账号,
So that 我可以管理 Vertex AI 的访问凭证。

**Acceptance Criteria:**

**Given** 管理员上传一个 JSON 文件
**When** 发送 `POST /api/service-account` 请求，body 包含 JSON 内容
**Then** 系统验证 JSON 包含 `type`, `project_id`, `private_key`, `client_email` 字段
**And** 验证通过后，AES 加密并存入 config 表（key = `service_account`）
**And** 返回 `{ success: true, data: { project_id, client_email, status: "configured" } }`

**Given** JSON 文件缺少必要字段
**When** 上传服务账号
**Then** 返回 HTTP 400 `{ error: { type: "invalid_request_error", message: "Missing required fields: ..." } }`

**Given** 管理员查询服务账号状态
**When** 发送 `GET /api/service-account`
**Then** 返回 `{ success: true, data: { status: "configured|not_configured", project_id, client_email } }`
**And** 不返回 private_key 或完整 JSON

**Given** 管理员删除服务账号
**When** 发送 `DELETE /api/service-account`
**Then** 从 config 表删除 `service_account` 记录
**And** 返回 `{ success: true }`

### Story 2.3: 前端设置页面（服务账号与 API Key 管理）

As a 管理员,
I want 通过 Web 界面管理服务账号和 API Key,
So that 无需直接操作 API 或命令行即可完成配置。

**Acceptance Criteria:**

**Given** 管理员访问 `/settings` 页面
**When** 页面加载
**Then** 显示当前服务账号状态（已配置 / 未配置）
**And** 已配置时显示 project_id 和 client_email
**And** 显示文件上传区域（拖拽或选择 JSON 文件）
**And** 显示当前 API Key 配置状态

**Given** 管理员选择一个 JSON 文件并点击上传
**When** 上传成功
**Then** 页面显示成功提示，刷新服务账号状态
**And** 上传失败时显示错误信息

**Given** 管理员点击"删除服务账号"
**When** 确认删除
**Then** 调用 DELETE API，页面更新为"未配置"状态

---

## Epic 3: API 调用日志与问题排查

用户可以通过前端查看所有 API 调用日志，按时间和状态筛选，查看重试详情，快速定位问题。

### Story 3.1: 日志查询 API

As a 用户,
I want 通过 API 查询历史调用日志,
So that 我可以了解 API 使用情况和排查问题。

**Acceptance Criteria:**

**Given** logs 表中有历史记录
**When** 发送 `GET /api/logs` 请求
**Then** 返回分页日志列表，默认每页 20 条，按时间倒序
**And** 响应格式 `{ success: true, data: { items: [...], total, page, page_size } }`

**Given** 查询参数包含 `start_date` 和 `end_date`
**When** 发送带时间范围的请求
**Then** 仅返回该时间范围内的日志

**Given** 查询参数包含 `status=success` 或 `status=failed`
**When** 发送带状态筛选的请求
**Then** 仅返回匹配状态的日志

**Given** 日志记录包含 `retry_count > 0`
**When** 返回该日志
**Then** 包含 `retry_details` JSON，展示每次重试的状态码和耗时

### Story 3.2: 前端日志查看页面

As a 用户,
I want 通过 Web 界面查看和筛选 API 调用日志,
So that 我可以直观地监控服务使用情况。

**Acceptance Criteria:**

**Given** 用户访问 `/logs` 页面
**When** 页面加载
**Then** 显示日志表格，列包含：时间、Prompt（截断）、状态、耗时、重试次数、费用
**And** 表格支持分页

**Given** 用户选择日期范围
**When** 应用筛选
**Then** 表格仅显示该范围内的日志

**Given** 用户选择状态筛选（全部/成功/失败）
**When** 应用筛选
**Then** 表格仅显示匹配状态的日志

**Given** 某条日志有重试记录
**When** 用户点击该行展开
**Then** 显示每次重试的详细信息（状态码、耗时）

---

## Epic 4: 费用统计与赠金管控

用户可以查看月度调用统计、费用估算和赠金消耗进度，设置月度上限防止超支。

### Story 4.1: 费用估算服务与统计 API

As a 用户,
I want 系统自动估算每次调用的费用并提供月度汇总,
So that 我可以了解赠金使用情况，避免超支。

**Acceptance Criteria:**

**Given** 一次图片生成请求完成
**When** 计算费用
**Then** 基于 Gemini token 定价估算费用（单位 USD）
**And** 费用标注为"估算值"
**And** 将 estimated_cost 写入 logs 表

**Given** 用户查询月度统计
**When** 发送 `GET /api/stats?month=2026-02`
**Then** 返回 `{ success: true, data: { total_calls, successful_calls, failed_calls, success_rate, total_cost, monthly_budget, budget_remaining } }`
**And** `success_rate` = successful_calls / total_calls * 100
**And** `budget_remaining` = monthly_budget - total_cost

**Given** 管理员设置月度预算
**When** 发送 `PUT /api/config` body `{ monthly_budget: 150 }`
**Then** 更新 config 表中的 `monthly_budget` 值
**And** 返回 `{ success: true }`

### Story 4.2: 前端费用统计页面

As a 用户,
I want 通过 Web 界面查看费用统计和赠金消耗,
So that 我可以直观地掌握预算状况。

**Acceptance Criteria:**

**Given** 用户访问 `/stats` 页面
**When** 页面加载
**Then** 显示当月统计卡片：总调用数、成功率、总费用（估算）、赠金剩余
**And** 赠金进度条显示已用/剩余/上限

**Given** 用户修改月度预算上限
**When** 输入新值并保存
**Then** 调用 PUT API 更新预算
**And** 页面刷新显示新的预算进度

---

## Epic 5: 服务监控与健康检查

系统可以通过健康检查端点报告自身和 Vertex AI 连接状态，返回可用模型列表。

### Story 5.1: 健康检查与模型列表端点

As a 运维人员,
I want 通过健康检查端点确认服务和上游连接状态,
So that 我可以快速判断服务是否正常运行。

**Acceptance Criteria:**

**Given** 服务正常运行
**When** 发送 `GET /health`
**Then** 返回 HTTP 200 `{ status: "ok", uptime, version, database: "connected", vertex_ai: "connected|disconnected", service_account: "configured|not_configured" }`
**And** `vertex_ai` 状态通过尝试初始化 SDK 来验证

**Given** 数据库或 Vertex AI 不可用
**When** 发送健康检查
**Then** 返回对应组件状态为 `disconnected`，但整体仍返回 HTTP 200（degraded 模式）

**Given** 客户端查询可用模型
**When** 发送 `GET /v1/models`
**Then** 返回 OpenAI 兼容格式的模型列表 `{ data: [{ id: "gemini-3-pro-image-preview", object: "model", owned_by: "google" }] }`

### Story 5.2: 前端导航与布局集成

As a 用户,
I want 所有前端页面有统一的导航和布局,
So that 我可以方便地在各功能之间切换。

**Acceptance Criteria:**

**Given** 用户访问任意前端页面
**When** 页面加载
**Then** 显示顶部或侧边导航栏，包含：日志、统计、设置 三个链接
**And** 当前页面对应的导航项高亮
**And** 页面标题正确显示

**Given** 生产环境构建
**When** 执行 `npm run build`
**Then** 前端代码构建到 `frontend/dist/`
**And** Express 静态托管 `frontend/dist/`，所有前端路由回退到 `index.html`
**And** 开发模式下 Vite proxy 正确转发 `/api/*` 和 `/v1/*` 到后端

