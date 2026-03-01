# Story 4.1: 费用估算服务与统计 API

Status: review

## Story

As a 用户,
I want 系统自动估算每次调用的费用并提供月度汇总,
so that 我可以了解赠金使用情况，避免超支。

## Acceptance Criteria

1. **AC1**: 图片生成完成后基于 Gemini token 定价估算费用（USD），费用标注为"估算值"
2. **AC2**: estimated_cost 写入 logs 表的对应记录
3. **AC3**: `GET /api/stats?month=YYYY-MM` 返回月度统计（total_calls, successful_calls, failed_calls, success_rate, total_cost, monthly_budget, budget_remaining）
4. **AC4**: `PUT /api/config` body `{ monthly_budget: N }` 更新月度预算

## Tasks / Subtasks

- [x] Task 1: 创建费用估算服务 (AC: #1, #2)
  - [x] 1.1: 创建 `backend/src/services/cost.ts`
  - [x] 1.2: 实现 `estimateCost(inputTokens, outputTokens)` — 基于 Gemini 定价估算
  - [x] 1.3: 在图片生成流程中调用并写入 logs 表

- [x] Task 2: 创建统计 API (AC: #3, #4)
  - [x] 2.1: 创建 `backend/src/routes/stats.ts`
  - [x] 2.2: 实现 `GET /api/stats` — 聚合查询月度统计
  - [x] 2.3: 从 config-dao 读取 monthly_budget 计算 budget_remaining
  - [x] 2.4: 注册路由到 Express

- [x] Task 3: 编写测试
  - [x] 3.1: 创建 `backend/src/services/cost.test.ts`
  - [x] 3.2: 测试统计 API 聚合逻辑

## Dev Notes
### 费用估算说明 (from architecture.md)
- 费用为近似值，基于 token 定价
- 输入/输出 token 分开计价
- 必须标注"估算值"

### References
- [Source: architecture.md#Cross-Cutting-Concerns] — 费用估算说明

## Dev Agent Record
### Agent Model Used
Gemini (Antigravity)
### Debug Log References
- 空表 SUM(CASE WHEN) 返回 null 问题：已通过 COALESCE 包裹解决
### Completion Notes List
- ✅ Task 1: 创建了 `cost.ts` 费用估算服务，基于 Gemini token 定价（输入 $1.25/M，输出图片 $40/M）进行估算
- ✅ Task 1.3: 修改 `request-logger.ts` 增加 estimated_cost 字段传递，修改 `images.ts` 在成功生成后调用 estimateCost() 写入日志
- ✅ Task 2: 创建了 `stats.ts` 路由，实现 GET /api/stats?month=YYYY-MM，返回完整月度统计数据
- ✅ Task 2.4: 在 index.ts 中注册 statsRouter，清理已完成的 TODO 注释
- ✅ Task 3: 编写了 cost.test.ts（8 个测试）和 stats.test.ts（12 个测试），全部通过
- ✅ AC4 已由 Story 2.1 实现的 admin.ts 中 PUT /api/config 端点覆盖（monthly_budget 在白名单中）
- ✅ 全量回归测试通过：14 个测试文件，169 个测试用例
### File List
- `backend/src/services/cost.ts` — 新增：费用估算服务
- `backend/src/services/cost.test.ts` — 新增：费用估算单元测试
- `backend/src/routes/stats.ts` — 新增：统计 API 路由
- `backend/src/routes/stats.test.ts` — 新增：统计 API 聚合逻辑测试
- `backend/src/middleware/request-logger.ts` — 修改：增加 estimated_cost 字段
- `backend/src/routes/images.ts` — 修改：集成费用估算调用
- `backend/src/index.ts` — 修改：注册 statsRouter
### Change Log
- 2026-02-28: 实现 Story 4.1 全部功能 — 费用估算服务 + 统计 API + 测试
