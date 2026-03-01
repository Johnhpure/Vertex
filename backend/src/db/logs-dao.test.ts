/**
 * logs-dao.ts 单元测试
 * 验证日志的插入、查询（筛选/分页）、清理操作
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { initDatabase, closeDatabase, getDatabase, _resetDatabaseInstance } from './database.js';
import { insertLog, queryLogs, cleanupOldLogs } from './logs-dao.js';
import type { InsertLogParams } from '../types/index.js';

/** 构造测试用日志参数 */
function createTestLogParams(overrides: Partial<InsertLogParams> = {}): InsertLogParams {
    return {
        request_id: `req-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: new Date().toISOString(),
        model: 'gemini-2.0-flash',
        status: 'success',
        ...overrides,
    };
}

describe('logs-dao 模块', () => {
    let dbPath: string;

    beforeEach(() => {
        _resetDatabaseInstance();
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logs-dao-test-'));
        dbPath = path.join(tmpDir, 'test.db');
        initDatabase(dbPath);
    });

    afterEach(() => {
        closeDatabase();
        try {
            const dir = path.dirname(dbPath);
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        } catch {
            // 忽略清理错误
        }
    });

    describe('insertLog', () => {
        it('应成功插入一条日志记录', () => {
            const params = createTestLogParams();
            insertLog(params);

            const result = queryLogs();
            expect(result.total).toBe(1);
            expect(result.items[0].request_id).toBe(params.request_id);
            expect(result.items[0].model).toBe('gemini-2.0-flash');
            expect(result.items[0].status).toBe('success');
        });

        it('应正确存储所有可选字段', () => {
            const params = createTestLogParams({
                prompt: '生成一张猫的图片',
                size: '1024x1024',
                aspect_ratio: '1:1',
                status_code: 200,
                response_time_ms: 1500,
                retry_count: 2,
                retry_details: '{"attempts": [{"error": "timeout"}, {"error": "timeout"}]}',
                estimated_cost: 0.05,
            });
            insertLog(params);

            const result = queryLogs();
            const log = result.items[0];
            expect(log.prompt).toBe('生成一张猫的图片');
            expect(log.size).toBe('1024x1024');
            expect(log.aspect_ratio).toBe('1:1');
            expect(log.status_code).toBe(200);
            expect(log.response_time_ms).toBe(1500);
            expect(log.retry_count).toBe(2);
            expect(log.retry_details).toBe('{"attempts": [{"error": "timeout"}, {"error": "timeout"}]}');
            expect(log.estimated_cost).toBe(0.05);
        });

        it('应为 retry_count 使用默认值 0', () => {
            const params = createTestLogParams();
            insertLog(params);

            const result = queryLogs();
            expect(result.items[0].retry_count).toBe(0);
        });

        it('插入重复 request_id 应抛出错误', () => {
            const params = createTestLogParams({ request_id: 'duplicate-id' });
            insertLog(params);

            expect(() => {
                insertLog({ ...params, timestamp: new Date().toISOString() });
            }).toThrow();
        });
    });

    describe('queryLogs', () => {
        it('空数据库应返回空结果', () => {
            const result = queryLogs();
            expect(result.items).toHaveLength(0);
            expect(result.total).toBe(0);
        });

        it('应按 timestamp 倒序排列', () => {
            insertLog(createTestLogParams({ request_id: 'req-1', timestamp: '2026-01-01T00:00:00Z' }));
            insertLog(createTestLogParams({ request_id: 'req-2', timestamp: '2026-01-03T00:00:00Z' }));
            insertLog(createTestLogParams({ request_id: 'req-3', timestamp: '2026-01-02T00:00:00Z' }));

            const result = queryLogs();
            expect(result.items[0].request_id).toBe('req-2');
            expect(result.items[1].request_id).toBe('req-3');
            expect(result.items[2].request_id).toBe('req-1');
        });

        it('应支持按状态筛选', () => {
            insertLog(createTestLogParams({ request_id: 'req-ok', status: 'success' }));
            insertLog(createTestLogParams({ request_id: 'req-err', status: 'error' }));

            const result = queryLogs({ status: 'error' });
            expect(result.total).toBe(1);
            expect(result.items[0].request_id).toBe('req-err');
        });

        it('应支持按时间范围筛选', () => {
            insertLog(createTestLogParams({ request_id: 'req-old', timestamp: '2025-12-01T00:00:00Z' }));
            insertLog(createTestLogParams({ request_id: 'req-mid', timestamp: '2026-01-15T00:00:00Z' }));
            insertLog(createTestLogParams({ request_id: 'req-new', timestamp: '2026-02-28T00:00:00Z' }));

            const result = queryLogs({
                start_date: '2026-01-01T00:00:00Z',
                end_date: '2026-02-01T00:00:00Z',
            });
            expect(result.total).toBe(1);
            expect(result.items[0].request_id).toBe('req-mid');
        });

        it('应支持分页（默认每页 20 条）', () => {
            // 插入 25 条记录
            for (let i = 0; i < 25; i++) {
                insertLog(createTestLogParams({
                    request_id: `req-page-${i}`,
                    timestamp: `2026-01-01T${String(i).padStart(2, '0')}:00:00Z`,
                }));
            }

            // 第一页（默认 20 条）
            const page1 = queryLogs({ page: 1 });
            expect(page1.items).toHaveLength(20);
            expect(page1.total).toBe(25);

            // 第二页
            const page2 = queryLogs({ page: 2 });
            expect(page2.items).toHaveLength(5);
            expect(page2.total).toBe(25);
        });

        it('应支持自定义 page_size', () => {
            for (let i = 0; i < 10; i++) {
                insertLog(createTestLogParams({
                    request_id: `req-ps-${i}`,
                    timestamp: `2026-01-01T${String(i).padStart(2, '0')}:00:00Z`,
                }));
            }

            const result = queryLogs({ page: 1, page_size: 5 });
            expect(result.items).toHaveLength(5);
            expect(result.total).toBe(10);
        });

        it('应支持组合筛选条件', () => {
            insertLog(createTestLogParams({ request_id: 'req-c1', timestamp: '2026-01-15T00:00:00Z', status: 'success' }));
            insertLog(createTestLogParams({ request_id: 'req-c2', timestamp: '2026-01-15T00:00:00Z', status: 'error' }));
            insertLog(createTestLogParams({ request_id: 'req-c3', timestamp: '2025-12-01T00:00:00Z', status: 'error' }));

            const result = queryLogs({
                start_date: '2026-01-01T00:00:00Z',
                status: 'error',
            });
            expect(result.total).toBe(1);
            expect(result.items[0].request_id).toBe('req-c2');
        });
    });

    describe('cleanupOldLogs', () => {
        it('应删除超过指定天数的日志', () => {
            const db = getDatabase();
            // 手动插入一条 120 天前的日志（直接操作 DB 以控制时间戳）
            db.prepare(`
                INSERT INTO logs (request_id, timestamp, model, status)
                VALUES (?, datetime('now', '-120 days'), ?, ?)
            `).run('req-old-120', 'test-model', 'success');

            // 插入一条当前时间的日志
            db.prepare(`
                INSERT INTO logs (request_id, timestamp, model, status)
                VALUES (?, datetime('now'), ?, ?)
            `).run('req-current', 'test-model', 'success');

            const deleted = cleanupOldLogs(90);
            expect(deleted).toBe(1);

            const remaining = queryLogs();
            expect(remaining.total).toBe(1);
            expect(remaining.items[0].request_id).toBe('req-current');
        });

        it('没有过期日志时应返回 0', () => {
            insertLog(createTestLogParams());
            const deleted = cleanupOldLogs(90);
            expect(deleted).toBe(0);
        });

        it('应保留未过期的日志', () => {
            const db = getDatabase();
            // 插入 30 天前的日志（未过期）
            db.prepare(`
                INSERT INTO logs (request_id, timestamp, model, status)
                VALUES (?, datetime('now', '-30 days'), ?, ?)
            `).run('req-30days', 'test-model', 'success');

            const deleted = cleanupOldLogs(90);
            expect(deleted).toBe(0);

            const remaining = queryLogs();
            expect(remaining.total).toBe(1);
        });
    });
});
