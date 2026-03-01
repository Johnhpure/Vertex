# Story 2.3: 前端设置页面（服务账号与 API Key 管理）

Status: review

## Story

As a 管理员,
I want 通过 Web 界面管理服务账号和 API Key,
so that 无需直接操作 API 或命令行即可完成配置。

## Acceptance Criteria

1. **AC1**: `/settings` 页面显示当前服务账号状态（已配置/未配置）
2. **AC2**: 已配置时显示 project_id 和 client_email
3. **AC3**: 提供文件上传区域（拖拽或选择 JSON 文件）
4. **AC4**: 上传成功后刷新状态并显示成功提示
5. **AC5**: 上传失败时显示错误信息
6. **AC6**: 提供"删除服务账号"按钮，确认后调用 DELETE API

## Tasks / Subtasks

- [x] Task 1: 创建 API 调用封装 (AC: 全部)
  - [x] 1.1: 在 `frontend/src/api/client.ts` 中添加 service-account 相关 API 调用函数
  - [x] 1.2: 添加 config API 调用函数

- [x] Task 2: 创建设置页面 (AC: #1-#6)
  - [x] 2.1: 实现 `frontend/src/pages/Settings.tsx` — 服务账号状态卡片
  - [x] 2.2: 创建 `frontend/src/components/FileUpload.tsx` — 拖拽/选择 JSON 文件上传组件
  - [x] 2.3: 实现上传逻辑 — 读取文件内容 → 调用 POST API
  - [x] 2.4: 实现删除确认弹窗 → 调用 DELETE API
  - [x] 2.5: 添加成功/失败提示消息

- [x] Task 3: 样式 (AC: 全部)
  - [x] 3.1: 使用纯 CSS 编写设置页面样式（简洁功能为主）

## Dev Notes

### 前端架构
- 状态管理: useState + useEffect + fetch（无状态管理库）
- UI: 纯 CSS，内部工具简洁风格
- API 调用示例: `fetch('/api/service-account')`（开发模式通过 Vite proxy 转发）

### Previous Story Intelligence
- Story 1.1: 页面路由和 API client 基础框架已搭建
- Story 2.2: 后端 API 端点已就绪

### References
- [Source: architecture.md#Frontend-Architecture] — 前端技术选型
- [Source: architecture.md#Project-Structure] — 前端文件位置

## Dev Agent Record
### Agent Model Used
Gemini 2.5 Pro (Antigravity)
### Debug Log References
无调试问题，TypeScript 编译和后端测试均一次通过
### Completion Notes List
- ✅ Task 1: 在 `client.ts` 中添加 service-account 和 config 的 API 调用函数（getServiceAccount, uploadServiceAccount, deleteServiceAccount, getSystemConfig, updateSystemConfig），含类型定义
- ✅ Task 2: 实现完整 Settings 页面（服务账号状态卡片 + FileUpload 拖拽/选择组件 + 删除确认弹窗 + Toast 提示）
  - FileUpload 组件支持拖拽和点击选择 JSON 文件，含文件格式验证和 JSON 解析
  - Settings 页面根据状态显示已配置（project_id/client_email）或未配置界面
  - 删除操作有确认弹窗，防止误操作
  - 上传成功/失败都有 Toast 提示，4 秒自动消失
- ✅ Task 3: 编写完整 CSS 样式 — 深色/浅色主题、卡片布局、拖拽上传区域动画、弹窗 backdrop blur、Toast 动画、响应式适配
- ✅ TypeScript 编译通过，后端全部 142 测试通过，零回归
### File List
- `frontend/src/api/client.ts` — 修改：添加 service-account 和 config API 调用函数及类型定义
- `frontend/src/pages/Settings.tsx` — 重写：完整的服务账号管理页面
- `frontend/src/pages/Settings.css` — 新增：设置页面样式（深色/浅色主题 + 响应式）
- `frontend/src/components/FileUpload.tsx` — 新增：拖拽/选择文件上传组件
### Change Log
- 2026-02-28: 实现 Story 2.3 — 前端设置页面，包含服务账号状态展示/上传/删除、文件拖拽上传、确认弹窗、Toast 提示
