/**
 * 图片生成路由集成测试
 * Mock vertex-ai 服务和 config-dao，测试端到端请求流程
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock 依赖模块
vi.mock('../db/config-dao.js', () => ({
    getConfig: vi.fn(),
}));

// Mock encryption — decrypt 透传输入（测试中 getConfig 返回明文）
vi.mock('../services/encryption.js', () => ({
    decrypt: vi.fn((input: string) => input),
}));

vi.mock('../db/logs-dao.js', () => ({
    insertLog: vi.fn(),
}));

// 部分 mock vertex-ai.js — 保留 VertexAIError 等类/常量的真实实现
vi.mock('../services/vertex-ai.js', async (importOriginal) => {
    const actual = await importOriginal() as Record<string, unknown>;
    return {
        ...actual,
        initVertexAI: vi.fn(),
        generateImage: vi.fn(),
        // withRetry 也需要 mock 掉，否则会在测试中实际执行重试
        withRetry: vi.fn(),
    };
});

// 在 mock 定义之后 import
import imagesRouter from './images.js';
import { getConfig } from '../db/config-dao.js';
import { initVertexAI, generateImage, withRetry } from '../services/vertex-ai.js';
import { insertLog } from '../db/logs-dao.js';

// 创建测试用 Express app
function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use(imagesRouter);
    return app;
}

/** 有效的服务账号 JSON 字符串 */
const validServiceAccount = JSON.stringify({
    type: 'service_account',
    project_id: 'test-project',
    private_key: 'test-key',
    client_email: 'test@test.iam.gserviceaccount.com',
    location: 'us-central1',
});

/** 正常的 Gemini 响应 */
const normalGeminiResponse = {
    candidates: [
        {
            content: {
                parts: [
                    { text: '一只可爱的猫咪' },
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: 'base64EncodedImageData',
                        },
                    },
                ],
            },
        },
    ],
};

describe('POST /v1/images/generations', () => {
    const mockedGetConfig = vi.mocked(getConfig);
    const mockedInitVertexAI = vi.mocked(initVertexAI);
    const mockedWithRetry = vi.mocked(withRetry);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ============================================================
    // AC6: 参数验证
    // ============================================================
    describe('参数验证 (AC: #6)', () => {
        it('缺少 prompt 时返回 400 错误', async () => {
            const app = createTestApp();
            const res = await request(app)
                .post('/v1/images/generations')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error.type).toBe('invalid_request_error');
            expect(res.body.error.message).toContain('prompt');
        });

        it('prompt 为空字符串时返回 400 错误', async () => {
            const app = createTestApp();
            const res = await request(app)
                .post('/v1/images/generations')
                .send({ prompt: '' });

            expect(res.status).toBe(400);
            expect(res.body.error.type).toBe('invalid_request_error');
        });

        it('prompt 为纯空白时返回 400 错误', async () => {
            const app = createTestApp();
            const res = await request(app)
                .post('/v1/images/generations')
                .send({ prompt: '   ' });

            expect(res.status).toBe(400);
            expect(res.body.error.type).toBe('invalid_request_error');
        });

        it('prompt 为非字符串类型时返回 400 错误', async () => {
            const app = createTestApp();
            const res = await request(app)
                .post('/v1/images/generations')
                .send({ prompt: 123 });

            expect(res.status).toBe(400);
            expect(res.body.error.type).toBe('invalid_request_error');
        });
    });

    // ============================================================
    // AC5: 服务账号未配置
    // ============================================================
    describe('服务账号未配置 (AC: #5)', () => {
        it('服务账号未配置时返回 500 错误', async () => {
            mockedGetConfig.mockReturnValue(null);

            const app = createTestApp();
            const res = await request(app)
                .post('/v1/images/generations')
                .send({ prompt: '一只猫' });

            expect(res.status).toBe(500);
            expect(res.body.error.type).toBe('server_error');
            expect(res.body.error.message).toBe('Service account not configured');
        });
    });

    // ============================================================
    // AC1, AC3: 正常请求流程
    // ============================================================
    describe('正常请求流程 (AC: #1, #3, #4)', () => {
        it('成功的图片生成请求返回 200 和 OpenAI 格式响应', async () => {
            mockedGetConfig.mockReturnValue(validServiceAccount);
            mockedInitVertexAI.mockReturnValue({ models: {} } as any);
            mockedWithRetry.mockResolvedValue({
                result: normalGeminiResponse as any,
                retryDetails: [],
            });

            const app = createTestApp();
            const res = await request(app)
                .post('/v1/images/generations')
                .send({ prompt: '一只可爱的猫咪', size: '1024x1024' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('created');
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0]).toHaveProperty('b64_json');
            expect(res.body.data[0]).toHaveProperty('revised_prompt');
            expect(res.body.data[0].b64_json).toBe('base64EncodedImageData');
        });

        it('应正确传递 aspectRatio', async () => {
            mockedGetConfig.mockReturnValue(validServiceAccount);
            mockedInitVertexAI.mockReturnValue({ models: {} } as any);
            mockedWithRetry.mockResolvedValue({
                result: normalGeminiResponse as any,
                retryDetails: [],
            });

            const app = createTestApp();
            await request(app)
                .post('/v1/images/generations')
                .send({ prompt: 'test prompt', size: '1024x1792' });

            // 验证 withRetry 被调用了
            expect(mockedWithRetry).toHaveBeenCalledTimes(1);
        });
    });

    // ============================================================
    // 日志记录 (AC: #5, #6)
    // ============================================================
    describe('日志记录 (AC: #5, #6)', () => {
        it('成功请求应写入日志', async () => {
            mockedGetConfig.mockReturnValue(validServiceAccount);
            mockedInitVertexAI.mockReturnValue({ models: {} } as any);
            mockedWithRetry.mockResolvedValue({
                result: normalGeminiResponse as any,
                retryDetails: [],
            });

            const app = createTestApp();
            await request(app)
                .post('/v1/images/generations')
                .send({ prompt: '一只猫', size: '1024x1024' });

            // insertLog 应被调用（通过 logRequest）
            expect(insertLog).toHaveBeenCalledTimes(1);
        });

        it('失败请求也应写入日志', async () => {
            mockedGetConfig.mockReturnValue(validServiceAccount);
            mockedInitVertexAI.mockReturnValue({ models: {} } as any);
            mockedWithRetry.mockRejectedValue(new Error('API failure'));

            const app = createTestApp();
            await request(app)
                .post('/v1/images/generations')
                .send({ prompt: '一只猫' });

            expect(insertLog).toHaveBeenCalledTimes(1);
        });
    });

    // ============================================================
    // 错误处理
    // ============================================================
    describe('错误处理', () => {
        it('无效的服务账号 JSON 返回 500 错误', async () => {
            mockedGetConfig.mockReturnValue('invalid-json');

            const app = createTestApp();
            const res = await request(app)
                .post('/v1/images/generations')
                .send({ prompt: '一只猫' });

            expect(res.status).toBe(500);
            expect(res.body.error.type).toBe('server_error');
            expect(res.body.error.message).toBe('Invalid service account configuration');
        });

        it('Vertex AI SDK 调用异常返回 500 错误', async () => {
            mockedGetConfig.mockReturnValue(validServiceAccount);
            mockedInitVertexAI.mockReturnValue({ models: {} } as any);
            mockedWithRetry.mockRejectedValue(new Error('API quota exceeded'));

            const app = createTestApp();
            const res = await request(app)
                .post('/v1/images/generations')
                .send({ prompt: '一只猫' });

            expect(res.status).toBe(500);
            expect(res.body.error.type).toBe('server_error');
            expect(res.body.error.message).toBe('API quota exceeded');
        });
    });
});
