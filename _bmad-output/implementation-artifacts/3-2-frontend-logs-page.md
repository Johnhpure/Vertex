# Story 3.2: 前端日志查看页面

Status: review

## Story

As a 用户,
I want 通过 Web 界面查看和筛选 API 调用日志,
so that 我可以直观地监控服务使用情况。

## Acceptance Criteria

1. **AC1**: `/logs` 页面显示日志表格（时间、Prompt 截断、状态、耗时、重试次数、费用）
2. **AC2**: 表格支持分页导航
3. **AC3**: 支持日期范围筛选
4. **AC4**: 支持状态筛选（全部/成功/失败）
5. **AC5**: 有重试记录的行可展开查看详情

## Tasks / Subtasks

- [x] Task 1: 创建日志页面 (AC: #1-#5)
  - [x] 1.1: 在 `frontend/src/api/client.ts` 添加 logs API 调用
  - [x] 1.2: 实现 `frontend/src/pages/Logs.tsx` — 筛选条件 + 表格展示
  - [x] 1.3: 创建 `frontend/src/components/LogTable.tsx` — 可展开行的日志表格
  - [x] 1.4: 实现分页组件
  - [x] 1.5: 实现日期选择和状态筛选 UI
  - [x] 1.6: 编写纯 CSS 样式

## Dev Notes
### Previous Story Intelligence
- Story 3.1: 后端日志查询 API 已就绪
- Story 1.1: 基础路由框架已搭建

### References
- [Source: architecture.md#Frontend-Architecture] — useState/useEffect 模式

## Dev Agent Record
### Agent Model Used
Gemini 2.5 Pro (Antigravity)
### Debug Log References
无调试问题
### Completion Notes List
- ✅ Task 1.1: 在 `client.ts` 添加 getLogs() API 调用、LogEntry/LogsPageData/LogQueryParams 类型定义
- ✅ Task 1.2: 实现完整 Logs 页面 — 筛选栏（开始/结束日期 + 状态下拉）+ 统计栏 + 表格 + 分页
- ✅ Task 1.3: 创建 LogTable 组件 — 6 列（时间/Prompt/状态/耗时/重试/费用），支持点击展开重试详情
- ✅ Task 1.4: 分页导航 — 首页/上一页/下一页/末页按钮，禁用状态处理
- ✅ Task 1.5: 筛选 UI — date input + select + 筛选/重置按钮
- ✅ Task 1.6: 完整 CSS 样式 — 深色/浅色主题、表格悬停、展开行、响应式、状态标签着色
- ✅ TypeScript 编译通过，后端 149 测试通过，零回归
### File List
- `frontend/src/api/client.ts` — 修改：添加 logs API 调用和类型
- `frontend/src/pages/Logs.tsx` — 重写：完整日志查看页面
- `frontend/src/pages/Logs.css` — 新增：日志页面样式
- `frontend/src/components/LogTable.tsx` — 新增：可展开行的日志表格组件
### Change Log
- 2026-02-28: 实现 Story 3.2 — 前端日志查看页面，含筛选、分页、可展开重试详情
