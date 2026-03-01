/**
 * Admin 管理路由 集成测试
 * 覆盖：服务账号 CRUD、字段验证、配置管理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock config-dao
vi.mock('../db/config-dao.js', () => ({
    getConfig: vi.fn(),
    setConfig: vi.fn(),
    deleteConfig: vi.fn(),
}));

// Mock encryption
vi.mock('../services/encryption.js', () => ({
    encrypt: vi.fn((text: string) => `encrypted:${text}`),
    decrypt: vi.fn((text: string) => text.replace('encrypted:', '')),
}));

import { getConfig, setConfig, deleteConfig } from '../db/config-dao.js';
import { encrypt, decrypt } from '../services/encryption.js';
import adminRouter from './admin.js';

const mockedGetConfig = vi.mocked(getConfig);
const mockedSetConfig = vi.mocked(setConfig);
const mockedDeleteConfig = vi.mocked(deleteConfig);
const mockedEncrypt = vi.mocked(encrypt);
const mockedDecrypt = vi.mocked(decrypt);

/** 有效的服务账号 JSON */
const VALID_SERVICE_ACCOUNT = {
    type: 'service_account',
    project_id: 'my-project-123',
    private_key: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----\n',
    client_email: 'test@my-project-123.iam.gserviceaccount.com',
    client_id: '123456789',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
};

function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use(adminRouter);
    return app;
}

describe('POST /api/service-account', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('有效的服务账号应加密存储并返回 success (AC1, AC2, AC3)', async () => {
        const app = createTestApp();
        const res = await request(app)
            .post('/api/service-account')
            .send(VALID_SERVICE_ACCOUNT);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.project_id).toBe('my-project-123');
        expect(res.body.data.client_email).toBe('test@my-project-123.iam.gserviceaccount.com');
        expect(res.body.data.status).toBe('configured');
        // 不应返回 private_key
        expect(res.body.data.private_key).toBeUndefined();
        // 应调用 encrypt 和 setConfig
        expect(mockedEncrypt).toHaveBeenCalledOnce();
        expect(mockedSetConfig).toHaveBeenCalledWith('service_account', expect.any(String));
    });

    it('缺少 type 字段应返回 400 (AC4)', async () => {
        const app = createTestApp();
        const { type, ...noType } = VALID_SERVICE_ACCOUNT;
        const res = await request(app)
            .post('/api/service-account')
            .send(noType);

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
        expect(res.body.error.type).toBe('invalid_request_error');
    });

    it('缺少 project_id 字段应返回 400 (AC4)', async () => {
        const app = createTestApp();
        const { project_id, ...noProjectId } = VALID_SERVICE_ACCOUNT;
        const res = await request(app)
            .post('/api/service-account')
            .send(noProjectId);

        expect(res.status).toBe(400);
    });

    it('缺少 private_key 字段应返回 400 (AC4)', async () => {
        const app = createTestApp();
        const { private_key, ...noPrivateKey } = VALID_SERVICE_ACCOUNT;
        const res = await request(app)
            .post('/api/service-account')
            .send(noPrivateKey);

        expect(res.status).toBe(400);
    });

    it('缺少 client_email 字段应返回 400 (AC4)', async () => {
        const app = createTestApp();
        const { client_email, ...noClientEmail } = VALID_SERVICE_ACCOUNT;
        const res = await request(app)
            .post('/api/service-account')
            .send(noClientEmail);

        expect(res.status).toBe(400);
    });

    it('空对象应返回 400', async () => {
        const app = createTestApp();
        const res = await request(app)
            .post('/api/service-account')
            .send({});

        expect(res.status).toBe(400);
    });
});

describe('GET /api/service-account', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('已配置时应返回非敏感字段 (AC5)', async () => {
        const storedData = JSON.stringify(VALID_SERVICE_ACCOUNT);
        mockedGetConfig.mockReturnValue('encrypted:' + storedData);
        mockedDecrypt.mockReturnValue(storedData);

        const app = createTestApp();
        const res = await request(app).get('/api/service-account');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.project_id).toBe('my-project-123');
        expect(res.body.data.client_email).toBe('test@my-project-123.iam.gserviceaccount.com');
        expect(res.body.data.status).toBe('configured');
        // 不应返回 private_key
        expect(res.body.data.private_key).toBeUndefined();
    });

    it('未配置时应返回 not_configured 状态', async () => {
        mockedGetConfig.mockReturnValue(null);

        const app = createTestApp();
        const res = await request(app).get('/api/service-account');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('not_configured');
    });
});

describe('DELETE /api/service-account', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('成功删除应返回 success (AC6)', async () => {
        mockedDeleteConfig.mockReturnValue(true);

        const app = createTestApp();
        const res = await request(app).delete('/api/service-account');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(mockedDeleteConfig).toHaveBeenCalledWith('service_account');
    });

    it('不存在的记录删除也应返回 success', async () => {
        mockedDeleteConfig.mockReturnValue(false);

        const app = createTestApp();
        const res = await request(app).delete('/api/service-account');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

describe('GET /api/config', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('应返回当前配置信息', async () => {
        mockedGetConfig.mockImplementation((key: string) => {
            if (key === 'monthly_budget') return '100';
            return null;
        });

        const app = createTestApp();
        const res = await request(app).get('/api/config');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
    });
});

describe('PUT /api/config', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('应更新配置项', async () => {
        const app = createTestApp();
        const res = await request(app)
            .put('/api/config')
            .send({ monthly_budget: '200' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(mockedSetConfig).toHaveBeenCalled();
    });

    it('空 body 应返回 400', async () => {
        const app = createTestApp();
        const res = await request(app)
            .put('/api/config')
            .send({});

        expect(res.status).toBe(400);
    });
});
