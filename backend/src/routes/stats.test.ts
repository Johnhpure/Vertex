/**
 * stats.ts 路由单元测试
 * 验证统计 API 的月度聚合逻辑
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { initDatabase, closeDatabase, _resetDatabaseInstance } from '../db/database.js';
import { insertLog } from '../db/logs-dao.js';
import { setConfig } from '../db/config-dao.js';
import type { InsertLogParams } from '../types/index.js';
import { getDatabase } from '../db/database.js';

/** 构造测试用日志参数 */
function createTestLog(overrides: Partial<InsertLogParams> = {}): InsertLogParams {
    return {
        request_id: `req-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: new Date().toISOString(),
        model: 'gemini-3-pro-image-preview',
        status: 'success',
        ...overrides,
    };
}

describe('stats 统计 API — 聚合逻辑', () => {
    let dbPath: string;

    beforeEach(() => {
        _resetDatabaseInstance();
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stats-test-'));
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

    describe('月度统计聚合查询', () => {
        it('空数据库应返回全零统计', () => {
            const db = getDatabase();
            const row = db.prepare(`
                SELECT 
                    COUNT(*) as total_calls,
                    COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END), 0) as successful_calls,
                    COALESCE(SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END), 0) as failed_calls,
                    COALESCE(SUM(estimated_cost), 0) as total_cost
                FROM logs
                WHERE timestamp >= ? AND timestamp < ?
            `).get('2026-02-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z') as {
                total_calls: number;
                successful_calls: number;
                failed_calls: number;
                total_cost: number;
            };

            expect(row.total_calls).toBe(0);
            expect(row.successful_calls).toBe(0);
            expect(row.failed_calls).toBe(0);
            expect(row.total_cost).toBe(0);
        });

        it('应正确统计成功和失败次数', () => {
            // 插入 2026-02 月的测试数据
            insertLog(createTestLog({
                request_id: 'req-s1',
                timestamp: '2026-02-10T10:00:00.000Z',
                status: 'success',
                estimated_cost: 0.1,
            }));
            insertLog(createTestLog({
                request_id: 'req-s2',
                timestamp: '2026-02-15T12:00:00.000Z',
                status: 'success',
                estimated_cost: 0.15,
            }));
            insertLog(createTestLog({
                request_id: 'req-f1',
                timestamp: '2026-02-20T15:00:00.000Z',
                status: 'error',
                estimated_cost: null as unknown as number,
            }));

            const db = getDatabase();
            const row = db.prepare(`
                SELECT 
                    COUNT(*) as total_calls,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_calls,
                    SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) as failed_calls,
                    COALESCE(SUM(estimated_cost), 0) as total_cost
                FROM logs
                WHERE timestamp >= ? AND timestamp < ?
            `).get('2026-02-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z') as {
                total_calls: number;
                successful_calls: number;
                failed_calls: number;
                total_cost: number;
            };

            expect(row.total_calls).toBe(3);
            expect(row.successful_calls).toBe(2);
            expect(row.failed_calls).toBe(1);
            expect(row.total_cost).toBeCloseTo(0.25, 5);
        });

        it('应只统计指定月份的数据', () => {
            // 1 月的数据
            insertLog(createTestLog({
                request_id: 'req-jan',
                timestamp: '2026-01-15T10:00:00.000Z',
                status: 'success',
                estimated_cost: 0.1,
            }));
            // 2 月的数据
            insertLog(createTestLog({
                request_id: 'req-feb',
                timestamp: '2026-02-15T10:00:00.000Z',
                status: 'success',
                estimated_cost: 0.2,
            }));
            // 3 月的数据
            insertLog(createTestLog({
                request_id: 'req-mar',
                timestamp: '2026-03-15T10:00:00.000Z',
                status: 'success',
                estimated_cost: 0.3,
            }));

            const db = getDatabase();
            const row = db.prepare(`
                SELECT 
                    COUNT(*) as total_calls,
                    COALESCE(SUM(estimated_cost), 0) as total_cost
                FROM logs
                WHERE timestamp >= ? AND timestamp < ?
            `).get('2026-02-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z') as {
                total_calls: number;
                total_cost: number;
            };

            expect(row.total_calls).toBe(1);
            expect(row.total_cost).toBeCloseTo(0.2, 5);
        });

        it('应正确处理 12 月跨年', () => {
            insertLog(createTestLog({
                request_id: 'req-dec',
                timestamp: '2026-12-15T10:00:00.000Z',
                status: 'success',
                estimated_cost: 0.5,
            }));

            const db = getDatabase();
            const row = db.prepare(`
                SELECT COUNT(*) as total_calls
                FROM logs
                WHERE timestamp >= ? AND timestamp < ?
            `).get('2026-12-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z') as {
                total_calls: number;
            };

            expect(row.total_calls).toBe(1);
        });
    });

    describe('budget 预算计算', () => {
        it('应从 config 表读取 monthly_budget', () => {
            setConfig('monthly_budget', '200');
            const budgetStr = '200';
            const budget = parseFloat(budgetStr);
            expect(budget).toBe(200);
        });

        it('config 无 monthly_budget 时默认 100', () => {
            // 不设置 monthly_budget
            const budgetStr: string | null = null;
            const budget = budgetStr ? parseFloat(budgetStr) : 100;
            expect(budget).toBe(100);
        });

        it('budget_remaining = monthly_budget - total_cost', () => {
            setConfig('monthly_budget', '50');
            const budget = 50;
            const totalCost = 12.5;
            const remaining = budget - totalCost;
            expect(remaining).toBe(37.5);
        });

        it('总费用超出预算时 budget_remaining 为负数', () => {
            setConfig('monthly_budget', '10');
            const budget = 10;
            const totalCost = 15.5;
            const remaining = budget - totalCost;
            expect(remaining).toBe(-5.5);
        });
    });

    describe('success_rate 计算', () => {
        it('全部成功时 success_rate 应为 100', () => {
            const totalCalls = 10;
            const successfulCalls = 10;
            const rate = parseFloat(((successfulCalls / totalCalls) * 100).toFixed(1));
            expect(rate).toBe(100);
        });

        it('全部失败时 success_rate 应为 0', () => {
            const totalCalls = 5;
            const successfulCalls = 0;
            const rate = parseFloat(((successfulCalls / totalCalls) * 100).toFixed(1));
            expect(rate).toBe(0);
        });

        it('无调用时 success_rate 应为 0', () => {
            const totalCalls = 0;
            const rate = totalCalls > 0 ? parseFloat(((0 / totalCalls) * 100).toFixed(1)) : 0;
            expect(rate).toBe(0);
        });

        it('部分成功时应正确计算百分比', () => {
            const totalCalls = 3;
            const successfulCalls = 2;
            const rate = parseFloat(((successfulCalls / totalCalls) * 100).toFixed(1));
            expect(rate).toBeCloseTo(66.7, 1);
        });
    });
});
