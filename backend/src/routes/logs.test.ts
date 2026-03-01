/**
 * 日志查询路由 集成测试
 * 覆盖：分页、筛选、空结果、默认参数
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock logs-dao
vi.mock('../db/logs-dao.js', () => ({
    queryLogs: vi.fn(),
    insertLog: vi.fn(),
    cleanupOldLogs: vi.fn(),
}));

import { queryLogs } from '../db/logs-dao.js';
import logsRouter from './logs.js';

const mockedQueryLogs = vi.mocked(queryLogs);

/** 模拟日志条目 */
const mockLogEntry = {
    id: 1,
    request_id: 'req-001',
    timestamp: '2026-02-28T10:00:00Z',
    prompt: 'a cat',
    model: 'gemini-3-pro-image-preview',
    status: 'success',
    status_code: 200,
    response_time_ms: 1500,
    retry_count: 0,
    created_at: '2026-02-28T10:00:00Z',
};

function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use(logsRouter);
    return app;
}

describe('GET /api/logs', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('默认返回第 1 页、每页 20 条、倒序排列 (AC1, AC2)', async () => {
        mockedQueryLogs.mockReturnValue({
            items: [mockLogEntry],
            total: 1,
        });

        const app = createTestApp();
        const res = await request(app).get('/api/logs');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.items).toHaveLength(1);
        expect(res.body.data.total).toBe(1);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.page_size).toBe(20);
        expect(mockedQueryLogs).toHaveBeenCalledWith({
            page: 1,
            page_size: 20,
            start_date: undefined,
            end_date: undefined,
            status: undefined,
        });
    });

    it('支持分页参数 page 和 page_size', async () => {
        mockedQueryLogs.mockReturnValue({ items: [], total: 0 });

        const app = createTestApp();
        const res = await request(app).get('/api/logs?page=3&page_size=10');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(3);
        expect(res.body.data.page_size).toBe(10);
        expect(mockedQueryLogs).toHaveBeenCalledWith(
            expect.objectContaining({ page: 3, page_size: 10 })
        );
    });

    it('支持 start_date 和 end_date 时间范围筛选 (AC3)', async () => {
        mockedQueryLogs.mockReturnValue({ items: [], total: 0 });

        const app = createTestApp();
        const res = await request(app).get(
            '/api/logs?start_date=2026-02-01&end_date=2026-02-28'
        );

        expect(res.status).toBe(200);
        expect(mockedQueryLogs).toHaveBeenCalledWith(
            expect.objectContaining({
                start_date: '2026-02-01',
                end_date: '2026-02-28',
            })
        );
    });

    it('支持 status 状态筛选 (AC4)', async () => {
        mockedQueryLogs.mockReturnValue({ items: [], total: 0 });

        const app = createTestApp();
        const res = await request(app).get('/api/logs?status=error');

        expect(res.status).toBe(200);
        expect(mockedQueryLogs).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'error' })
        );
    });

    it('包含 retry_details 字段的日志正确返回 (AC5)', async () => {
        const logWithRetry = {
            ...mockLogEntry,
            retry_count: 2,
            retry_details: JSON.stringify([
                { attempt: 1, error: 'timeout', delay_ms: 1000 },
                { attempt: 2, error: 'timeout', delay_ms: 2000 },
            ]),
        };
        mockedQueryLogs.mockReturnValue({ items: [logWithRetry], total: 1 });

        const app = createTestApp();
        const res = await request(app).get('/api/logs');

        expect(res.status).toBe(200);
        expect(res.body.data.items[0].retry_count).toBe(2);
        expect(res.body.data.items[0].retry_details).toBeDefined();
    });

    it('空结果应返回空数组', async () => {
        mockedQueryLogs.mockReturnValue({ items: [], total: 0 });

        const app = createTestApp();
        const res = await request(app).get('/api/logs');

        expect(res.status).toBe(200);
        expect(res.body.data.items).toEqual([]);
        expect(res.body.data.total).toBe(0);
    });

    it('无效的 page 参数应使用默认值 1', async () => {
        mockedQueryLogs.mockReturnValue({ items: [], total: 0 });

        const app = createTestApp();
        const res = await request(app).get('/api/logs?page=abc');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(1);
    });
});
