/**
 * API Key 认证中间件 单元测试
 * 覆盖：有效 Key、无效 Key、缺失 header、格式错误
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// 测试用加密密钥（64 hex = 32 bytes）
const TEST_ENCRYPTION_KEY = 'a'.repeat(64);
const TEST_API_KEY = 'sk-test-valid-key-12345';

// Mock config-dao 和 encryption 模块
vi.mock('../db/config-dao.js', () => ({
    getConfig: vi.fn(),
}));

vi.mock('../services/encryption.js', () => ({
    encrypt: vi.fn(),
    decrypt: vi.fn(),
}));

import { getConfig } from '../db/config-dao.js';
import { decrypt } from '../services/encryption.js';
import { authMiddleware } from './auth.js';

const mockedGetConfig = vi.mocked(getConfig);
const mockedDecrypt = vi.mocked(decrypt);

/**
 * 创建一个带 auth 中间件的测试 app
 */
function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use(authMiddleware);
    app.get('/test', (_req, res) => {
        res.json({ status: 'ok' });
    });
    return app;
}

describe('authMiddleware 认证中间件', () => {
    beforeEach(() => {
        vi.stubEnv('ENCRYPTION_KEY', TEST_ENCRYPTION_KEY);
        vi.clearAllMocks();
        // 默认配置：config 表中有加密的 api_key
        mockedGetConfig.mockReturnValue('encrypted-api-key-value');
        mockedDecrypt.mockReturnValue(TEST_API_KEY);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('有效的 API Key', () => {
        it('携带正确的 Bearer Token 应返回 200', async () => {
            const app = createTestApp();
            const res = await request(app)
                .get('/test')
                .set('Authorization', `Bearer ${TEST_API_KEY}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ status: 'ok' });
        });
    });

    describe('无效的 API Key', () => {
        it('携带错误的 Bearer Token 应返回 401', async () => {
            const app = createTestApp();
            const res = await request(app)
                .get('/test')
                .set('Authorization', 'Bearer wrong-key');

            expect(res.status).toBe(401);
            expect(res.body.error).toBeDefined();
            expect(res.body.error.type).toBe('authentication_error');
        });
    });

    describe('缺失 Authorization header', () => {
        it('不带 Authorization header 应返回 401', async () => {
            const app = createTestApp();
            const res = await request(app).get('/test');

            expect(res.status).toBe(401);
            expect(res.body.error).toBeDefined();
            expect(res.body.error.type).toBe('authentication_error');
        });
    });

    describe('格式错误的 Authorization header', () => {
        it('不使用 Bearer 前缀应返回 401', async () => {
            const app = createTestApp();
            const res = await request(app)
                .get('/test')
                .set('Authorization', TEST_API_KEY);

            expect(res.status).toBe(401);
            expect(res.body.error.type).toBe('authentication_error');
        });

        it('Bearer 后无 token 应返回 401', async () => {
            const app = createTestApp();
            const res = await request(app)
                .get('/test')
                .set('Authorization', 'Bearer ');

            expect(res.status).toBe(401);
            expect(res.body.error.type).toBe('authentication_error');
        });
    });

    describe('config 表中无 api_key', () => {
        it('config 表无 api_key 记录时应返回 401', async () => {
            mockedGetConfig.mockReturnValue(null);
            const app = createTestApp();
            const res = await request(app)
                .get('/test')
                .set('Authorization', `Bearer ${TEST_API_KEY}`);

            expect(res.status).toBe(401);
            expect(res.body.error.type).toBe('authentication_error');
        });
    });
});
