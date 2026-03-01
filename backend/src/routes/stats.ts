/**
 * 统计 API 路由
 * 提供月度调用统计和费用汇总
 *
 * 路由列表：
 * - GET /api/stats?month=YYYY-MM — 查询月度统计
 */

import { Router, type Request, type Response } from 'express';
import { getDatabase } from '../db/database.js';
import { getConfig } from '../db/config-dao.js';

const router = Router();

/** 月度统计数据结构 */
interface MonthlyStats {
    /** 总调用次数 */
    total_calls: number;
    /** 成功调用次数 */
    successful_calls: number;
    /** 失败调用次数 */
    failed_calls: number;
    /** 成功率（百分比，0-100） */
    success_rate: number;
    /** 总费用估算（USD，标注为"估算值"） */
    total_cost: number;
    /** 月度预算（USD） */
    monthly_budget: number;
    /** 预算剩余（USD） */
    budget_remaining: number;
    /** 查询的月份 */
    month: string;
    /** 是否为估算值（始终 true） */
    is_estimate: boolean;
}

/**
 * GET /api/stats
 * 返回月度统计信息
 *
 * 查询参数：
 * - month: YYYY-MM 格式（可选，默认当前月）
 */
router.get('/api/stats', (req: Request, res: Response): void => {
    try {
        const db = getDatabase();

        // 解析月份参数，默认当前月
        let month = req.query.month as string | undefined;
        if (!month) {
            const now = new Date();
            month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }

        // 验证月份格式
        if (!/^\d{4}-\d{2}$/.test(month)) {
            res.status(400).json({
                error: {
                    type: 'invalid_request_error',
                    message: 'month 参数格式错误，应为 YYYY-MM',
                },
            });
            return;
        }

        // 构造月份的起止时间范围
        const startDate = `${month}-01T00:00:00.000Z`;
        const [yearStr, monthStr] = month.split('-');
        const year = parseInt(yearStr, 10);
        const monthNum = parseInt(monthStr, 10);
        // 计算下个月的第一天
        const nextMonth = monthNum === 12
            ? `${year + 1}-01-01T00:00:00.000Z`
            : `${year}-${String(monthNum + 1).padStart(2, '0')}-01T00:00:00.000Z`;

        // 聚合查询月度统计
        const statsRow = db.prepare(`
            SELECT 
                COUNT(*) as total_calls,
                COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END), 0) as successful_calls,
                COALESCE(SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END), 0) as failed_calls,
                COALESCE(SUM(estimated_cost), 0) as total_cost
            FROM logs
            WHERE timestamp >= ? AND timestamp < ?
        `).get(startDate, nextMonth) as {
            total_calls: number;
            successful_calls: number;
            failed_calls: number;
            total_cost: number;
        };

        // 计算成功率
        const successRate = statsRow.total_calls > 0
            ? parseFloat(((statsRow.successful_calls / statsRow.total_calls) * 100).toFixed(1))
            : 0;

        // 读取月度预算配置
        const budgetStr = getConfig('monthly_budget');
        const monthlyBudget = budgetStr ? parseFloat(budgetStr) : 100;

        // 构造统计响应
        const stats: MonthlyStats = {
            total_calls: statsRow.total_calls,
            successful_calls: statsRow.successful_calls,
            failed_calls: statsRow.failed_calls,
            success_rate: successRate,
            total_cost: parseFloat(statsRow.total_cost.toFixed(6)),
            monthly_budget: monthlyBudget,
            budget_remaining: parseFloat((monthlyBudget - statsRow.total_cost).toFixed(6)),
            month,
            is_estimate: true,
        };

        res.status(200).json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('[Stats] 统计查询失败:', error instanceof Error ? error.message : error);
        res.status(500).json({
            error: {
                type: 'server_error',
                message: '统计查询失败',
            },
        });
    }
});

export default router;
