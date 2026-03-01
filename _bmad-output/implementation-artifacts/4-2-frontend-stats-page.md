# Story 4.2: 前端费用统计页面

Status: review

## Story

As a 用户,
I want 通过 Web 界面查看费用统计和赠金消耗,
so that 我可以直观地掌握预算状况。

## Acceptance Criteria

1. **AC1**: `/stats` 页面显示当月统计卡片（总调用数、成功率、总费用估算、赠金剩余）
2. **AC2**: 赠金进度条显示已用/剩余/上限
3. **AC3**: 用户可修改月度预算上限并保存

## Tasks / Subtasks

- [x] Task 1: 创建统计页面 (AC: #1-#3)
  - [x] 1.1: 在 `frontend/src/api/client.ts` 添加 stats 和 config API 调用
  - [x] 1.2: 实现 `frontend/src/pages/Stats.tsx` — 统计卡片布局
  - [x] 1.3: 创建 `frontend/src/components/StatsCard.tsx` — 单个统计卡片组件
  - [x] 1.4: 实现赠金进度条组件
  - [x] 1.5: 实现月度预算编辑和保存功能
  - [x] 1.6: 编写纯 CSS 样式

## Dev Notes
### Previous Story Intelligence
- Story 4.1: 后端统计 API 已就绪

### References
- [Source: architecture.md#Frontend-Architecture]

## Dev Agent Record
### Agent Model Used
Gemini (Antigravity)
### Debug Log References
无
### Completion Notes List
- ✅ Task 1.1: 在 api/client.ts 中添加 StatsData 类型定义和 getStats() 调用函数
- ✅ Task 1.2: 实现完整的 Stats.tsx 页面，包含月份导航、统计卡片、赠金进度条、预算编辑、估算说明
- ✅ Task 1.3: 创建 StatsCard.tsx 通用统计卡片组件（icon + title + value + subtitle）
- ✅ Task 1.4: 进度条直接内嵌在 Stats.tsx 中，包含渐变色彩（绿→黄→红）和超出预算警告
- ✅ Task 1.5: 预算编辑通过内联表单实现，调用 updateSystemConfig API 保存
- ✅ Task 1.6: 创建 Stats.css，深色主题 + 浅色模式 + 响应式，与 Logs/Settings 风格一致
- ✅ 前端 TypeScript 编译通过（tsc --noEmit）
- ✅ 后端全量回归测试通过：14 个文件，169 个用例
### File List
- `frontend/src/api/client.ts` — 修改：添加 StatsData 类型和 getStats() 函数
- `frontend/src/pages/Stats.tsx` — 重写：从占位组件改为完整统计页面
- `frontend/src/pages/Stats.css` — 新增：统计页面样式
- `frontend/src/components/StatsCard.tsx` — 新增：统计卡片组件
### Change Log
- 2026-02-28: 实现 Story 4.2 全部功能 — 前端费用统计页面
