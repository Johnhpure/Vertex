# Story 5.2: 前端导航与布局集成

Status: review

## Story

As a 用户,
I want 所有前端页面有统一的导航和布局,
so that 我可以方便地在各功能之间切换。

## Acceptance Criteria

1. **AC1**: 所有页面显示统一导航栏（日志、统计、设置）
2. **AC2**: 当前页面对应的导航项高亮
3. **AC3**: 页面标题正确显示
4. **AC4**: 生产环境 `npm run build` 构建到 `frontend/dist/`
5. **AC5**: Express 静态托管前端，所有前端路由回退到 `index.html`
6. **AC6**: 开发模式下 Vite proxy 正确转发 API 请求

## Tasks / Subtasks

- [x] Task 1: 创建 Layout 组件 (AC: #1-#3)
  - [x] 1.1: 实现 `frontend/src/components/Layout.tsx` — 导航栏 + 内容区
  - [x] 1.2: 使用 react-router-dom 的 `NavLink` 实现高亮
  - [x] 1.3: 在 App.tsx 中包裹 Layout 组件

- [x] Task 2: 生产构建验证 (AC: #4-#6)
  - [x] 2.1: 验证 `npm run build` 前后端构建成功
  - [x] 2.2: 验证 Express 静态托管和路由回退（已在 index.ts 中配置）
  - [x] 2.3: 验证 Vite proxy 开发模式转发（/api, /v1, /health 均已配置）

- [x] Task 3: 全局样式完善
  - [x] 3.1: 统一页面样式（间距、字体、配色）
  - [x] 3.2: 编写响应式布局基础样式

## Dev Notes
### 导航路由
- `/logs` — 日志查看
- `/stats` — 费用统计
- `/settings` — 设置

### 生产模式前端托管
已在 index.ts 第 63-64 行和第 101-104 行配置：
- `express.static` 托管 `frontend/dist/`
- catch-all `app.get('*')` 回退到 `index.html`

### References
- [Source: architecture.md#Infrastructure-&-Deployment]
- [Source: architecture.md#Frontend-Architecture]

## Dev Agent Record
### Agent Model Used
Gemini (Antigravity)
### Debug Log References
无
### Completion Notes List
- ✅ Task 1.1: 创建 Layout.tsx，使用 NavLink + Outlet 实现统一导航栏和内容区
- ✅ Task 1.2: NavLink 的 isActive 回调动态添加 nav-link-active 类名实现高亮
- ✅ Task 1.3: 重构 App.tsx，Layout 作为父 <Route element={<Layout />}> 包裹所有子路由
- ✅ Task 2.1: `npm run build` 生产构建成功（53 modules → dist/）
- ✅ Task 2.2: Express 静态托管和 SPA 路由回退已在 Story 1.1 中配置
- ✅ Task 2.3: Vite proxy 配置已包含 /api、/v1、/health
- ✅ Task 3.1: 重写 index.css — 引入 Inter 字体、修复 body 布局、添加 box-sizing 重置
- ✅ Task 3.2: Layout.css 包含完整响应式和浅色模式适配
- ✅ 前后端 TypeScript 编译通过
- ✅ 后端全量回归测试通过：15 个文件，179 个测试用例
### File List
- `frontend/src/components/Layout.tsx` — 新增：统一导航布局组件
- `frontend/src/components/Layout.css` — 新增：导航栏样式
- `frontend/src/App.tsx` — 重写：用 Layout 组件包裹路由
- `frontend/src/index.css` — 重写：全局样式完善
### Change Log
- 2026-03-01: 实现 Story 5.2 全部功能 — 前端导航与布局集成
