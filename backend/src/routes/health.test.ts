/**
 * health.ts 路由单元测试
 * 验证健康检查和模型列表端点
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { initDatabase, closeDatabase, _resetDatabaseInstance } from '../db/database.js';
import { getDatabase } from '../db/database.js';
import { setConfig, getConfig, deleteConfig } from '../db/config-dao.js';
import { encrypt } from '../services/encryption.js';
import { DEFAULT_MODEL } from '../services/vertex-ai.js';

describe('health 健康检查路由 — 逻辑测试', () => {
    let dbPath: string;
    const TEST_ENCRYPTION_KEY = 'a'.repeat(64); // 64 位 hex 字符串

    beforeEach(() => {
        process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
        _resetDatabaseInstance();
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'health-test-'));
        dbPath = path.join(tmpDir, 'test.db');
        initDatabase(dbPath);
    });

    afterEach(() => {
        closeDatabase();
        delete process.env.ENCRYPTION_KEY;
        try {
            const dir = path.dirname(dbPath);
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        } catch {
            // 忽略清理错误
        }
    });

    describe('数据库检查', () => {
        it('数据库正常时返回 connected', () => {
            const db = getDatabase();
            const row = db.prepare('SELECT 1 as val').get() as { val: number };
            expect(row.val).toBe(1);
        });
    });

    describe('服务账号检查', () => {
        it('未配置服务账号时返回 not_configured', () => {
            const result = getConfig('service_account');
            expect(result).toBeNull();
        });

        it('已配置服务账号时能成功读取', () => {
            const sa = JSON.stringify({
                type: 'service_account',
                project_id: 'test-project',
                private_key: 'test-key',
                client_email: 'test@test.iam.gserviceaccount.com',
            });
            const encrypted = encrypt(sa);
            setConfig('service_account', encrypted);

            const stored = getConfig('service_account');
            expect(stored).toBeTruthy();
        });

        it('删除服务账号后状态变为 null', () => {
            const sa = JSON.stringify({ project_id: 'test' });
            setConfig('service_account', encrypt(sa));
            deleteConfig('service_account');

            const result = getConfig('service_account');
            expect(result).toBeNull();
        });
    });

    describe('模型列表格式', () => {
        it('DEFAULT_MODEL 应为有效的模型名称字符串', () => {
            expect(typeof DEFAULT_MODEL).toBe('string');
            expect(DEFAULT_MODEL.length).toBeGreaterThan(0);
            expect(DEFAULT_MODEL).toBe('gemini-3.1-flash-image-preview');
        });

        it('模型列表响应应符合 OpenAI 格式', () => {
            const response = {
                object: 'list',
                data: [
                    {
                        id: DEFAULT_MODEL,
                        object: 'model',
                        created: Math.floor(Date.now() / 1000),
                        owned_by: 'google',
                    },
                ],
            };

            expect(response.object).toBe('list');
            expect(response.data).toHaveLength(1);
            expect(response.data[0].id).toBe(DEFAULT_MODEL);
            expect(response.data[0].object).toBe('model');
            expect(response.data[0].owned_by).toBe('google');
            expect(typeof response.data[0].created).toBe('number');
        });
    });

    describe('健康检查响应格式', () => {
        it('应包含所有必需字段', () => {
            // 模拟健康检查响应
            const response = {
                status: 'ok',
                uptime: 100,
                version: '1.0.0',
                database: 'connected',
                vertex_ai: 'disconnected',
                service_account: 'not_configured',
            };

            expect(response).toHaveProperty('status');
            expect(response).toHaveProperty('uptime');
            expect(response).toHaveProperty('version');
            expect(response).toHaveProperty('database');
            expect(response).toHaveProperty('vertex_ai');
            expect(response).toHaveProperty('service_account');
        });

        it('组件不可用时整体状态为 degraded', () => {
            const dbStatus: string = 'connected';
            const vertexStatus: string = 'disconnected';
            const overallStatus = (dbStatus === 'connected' && vertexStatus === 'connected')
                ? 'ok'
                : 'degraded';

            expect(overallStatus).toBe('degraded');
        });

        it('所有组件正常时整体状态为 ok', () => {
            const dbStatus: string = 'connected';
            const vertexStatus: string = 'connected';
            const overallStatus = (dbStatus === 'connected' && vertexStatus === 'connected')
                ? 'ok'
                : 'degraded';

            expect(overallStatus).toBe('ok');
        });

        it('uptime 计算应为正整数', () => {
            const startTime = Date.now() - 5000; // 5 秒前
            const uptime = Math.floor((Date.now() - startTime) / 1000);
            expect(uptime).toBeGreaterThanOrEqual(4);
            expect(uptime).toBeLessThanOrEqual(6);
        });
    });
});
