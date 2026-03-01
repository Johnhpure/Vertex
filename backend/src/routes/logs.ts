/**
 * 日志查询路由
 * 提供 /api/logs 端点，支持分页和条件筛选
 */

import { Router, type Request, type Response } from 'express';
import { queryLogs } from '../db/logs-dao.js';

const router = Router();

/**
 * GET /api/logs
 * 查询历史调用日志，支持分页和条件筛选
 *
 * Query Params:
 * - page: 页码（默认 1）
 * - page_size: 每页条数（默认 20）
 * - start_date: 起始日期
 * - end_date: 结束日期
 * - status: 状态筛选（success / error）
 */
router.get('/api/logs', (req: Request, res: Response): void => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.page_size as string, 10) || 20));
    const startDate = req.query.start_date as string | undefined;
    const endDate = req.query.end_date as string | undefined;
    const status = req.query.status as string | undefined;

    const result = queryLogs({
        page,
        page_size: pageSize,
        start_date: startDate,
        end_date: endDate,
        status,
    });

    res.status(200).json({
        success: true,
        data: {
            items: result.items,
            total: result.total,
            page,
            page_size: pageSize,
        },
    });
});

export default router;
