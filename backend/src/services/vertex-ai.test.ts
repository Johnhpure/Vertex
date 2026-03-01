/**
 * Vertex AI 服务模块单元测试
 * 包括 SDK 初始化、图片生成、重试逻辑的全面测试
 *
 * 参考文档: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/image-generation?hl=zh-cn
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VertexAIConfig, RetryDetail } from './vertex-ai.js';

// 创建持久化的 mock 函数
const mockGenerateContent = vi.fn();

// Mock @google/genai SDK — 使用 class 语法确保 new 调用正常工作
vi.mock('@google/genai', () => {
    return {
        GoogleGenAI: class MockGoogleGenAI {
            models = {
                generateContent: mockGenerateContent,
            };
            constructor(public options: Record<string, unknown>) { }
        },
    };
});

import { GoogleGenAI } from '@google/genai';
import {
    initVertexAI,
    generateImage,
    DEFAULT_MODEL,
    withRetry,
    VertexAIError,
    extractStatusCode,
    isSafetyFilterError,
    RETRYABLE_STATUS_CODES,
    RETRY_DELAYS,
} from './vertex-ai.js';

/** 测试用的服务账号凭证 */
const testConfig: VertexAIConfig = {
    projectId: 'test-project',
    location: 'us-central1',
    credentials: {
        type: 'service_account',
        project_id: 'test-project',
        private_key: 'test-key',
        client_email: 'test@test.iam.gserviceaccount.com',
    },
};

describe('vertex-ai', () => {
    beforeEach(() => {
        mockGenerateContent.mockReset();
    });

    // ============================================================
    // initVertexAI 初始化测试
    // ============================================================
    describe('initVertexAI', () => {
        it('应返回 GoogleGenAI 实例', () => {
            const ai = initVertexAI(testConfig);
            expect(ai).toBeDefined();
            expect(ai.models).toBeDefined();
        });
    });

    // ============================================================
    // generateImage 图片生成测试
    // ============================================================
    describe('generateImage', () => {
        it('应调用 models.generateContent 并使用正确的模型名称', async () => {
            const mockResponse = {
                candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'd' } }] } }],
            };
            mockGenerateContent.mockResolvedValueOnce(mockResponse);

            const ai = initVertexAI(testConfig);
            await generateImage(ai, '一只猫', { aspectRatio: '1:1' });

            const callArgs = mockGenerateContent.mock.calls[0][0] as any;
            expect(callArgs.model).toBe(DEFAULT_MODEL);
        });

        it('应在 contents 中传入用户 prompt', async () => {
            const mockResponse = {
                candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'd' } }] } }],
            };
            mockGenerateContent.mockResolvedValueOnce(mockResponse);

            const ai = initVertexAI(testConfig);
            await generateImage(ai, '夕阳下的海边', { aspectRatio: '16:9' });

            const callArgs = mockGenerateContent.mock.calls[0][0] as any;
            expect(callArgs.contents).toBe('夕阳下的海边');
        });

        it('config 中应包含 imageConfig（仅 aspectRatio）', async () => {
            const mockResponse = {
                candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'd' } }] } }],
            };
            mockGenerateContent.mockResolvedValueOnce(mockResponse);

            const ai = initVertexAI(testConfig);
            await generateImage(ai, 'test');

            const callArgs = mockGenerateContent.mock.calls[0][0] as any;
            // 无参数时 imageConfig 为空对象，不传递给 SDK
            expect(callArgs.config).toEqual({});
        });

        it('应正确传递 aspectRatio（通过 imageConfig）', async () => {
            const mockResponse = {
                candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'd' } }] } }],
            };
            mockGenerateContent.mockResolvedValueOnce(mockResponse);

            const ai = initVertexAI(testConfig);
            await generateImage(ai, 'test', { aspectRatio: '9:16' });

            const callArgs = mockGenerateContent.mock.calls[0][0] as any;
            expect(callArgs.config.imageConfig).toEqual({ aspectRatio: '9:16' });
        });

        it('应正确传递 imageSize 参数（分辨率）', async () => {
            const mockResponse = {
                candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'd' } }] } }],
            };
            mockGenerateContent.mockResolvedValueOnce(mockResponse);

            const ai = initVertexAI(testConfig);
            await generateImage(ai, 'test', { aspectRatio: '16:9', imageSize: '4K' });

            const callArgs = mockGenerateContent.mock.calls[0][0] as any;
            expect(callArgs.config.imageConfig).toEqual({ aspectRatio: '16:9', imageSize: '4K' });
        });

        it('应正确传递完整 imageConfig（含所有参数）', async () => {
            const mockResponse = {
                candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'd' } }] } }],
            };
            mockGenerateContent.mockResolvedValueOnce(mockResponse);

            const ai = initVertexAI(testConfig);
            await generateImage(ai, 'test', {
                aspectRatio: '16:9',
                imageSize: '2K',
                outputMimeType: 'image/jpeg',
                personGeneration: 'ALLOW_ADULT',
            });

            const callArgs = mockGenerateContent.mock.calls[0][0] as any;
            expect(callArgs.config.imageConfig).toEqual({
                aspectRatio: '16:9',
                imageSize: '2K',
                outputMimeType: 'image/jpeg',
                personGeneration: 'ALLOW_ADULT',
            });
        });

        it('空 imageConfig 时不应传递给 SDK', async () => {
            const mockResponse = {
                candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'd' } }] } }],
            };
            mockGenerateContent.mockResolvedValueOnce(mockResponse);

            const ai = initVertexAI(testConfig);
            await generateImage(ai, 'test', {});

            const callArgs = mockGenerateContent.mock.calls[0][0] as any;
            expect(callArgs.config).toEqual({});
        });

        it('seed 应放在 config 根级别（非 imageConfig 内部）', async () => {
            const mockResponse = {
                candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'd' } }] } }],
            };
            mockGenerateContent.mockResolvedValueOnce(mockResponse);

            const ai = initVertexAI(testConfig);
            await generateImage(ai, 'test', { aspectRatio: '1:1', seed: 42 });

            const callArgs = mockGenerateContent.mock.calls[0][0] as any;
            // seed 应在 config 根级别
            expect(callArgs.config.seed).toBe(42);
            // imageConfig 中不应有 seed
            expect(callArgs.config.imageConfig).toEqual({ aspectRatio: '1:1' });
        });

        it('seed=0 应正确传递（不被过滤掉）', async () => {
            const mockResponse = {
                candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'd' } }] } }],
            };
            mockGenerateContent.mockResolvedValueOnce(mockResponse);

            const ai = initVertexAI(testConfig);
            await generateImage(ai, 'test', { seed: 0 });

            const callArgs = mockGenerateContent.mock.calls[0][0] as any;
            expect(callArgs.config.seed).toBe(0);
        });

        it('systemInstruction 应放在 config 根级别', async () => {
            const mockResponse = {
                candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'd' } }] } }],
            };
            mockGenerateContent.mockResolvedValueOnce(mockResponse);

            const ai = initVertexAI(testConfig);
            await generateImage(ai, 'test', {
                aspectRatio: '16:9',
                systemInstruction: '你是一位专业的电影摄影师，使用 cinematic 风格',
            });

            const callArgs = mockGenerateContent.mock.calls[0][0] as any;
            expect(callArgs.config.systemInstruction).toBe('你是一位专业的电影摄影师，使用 cinematic 风格');
            expect(callArgs.config.imageConfig).toEqual({ aspectRatio: '16:9' });
        });

        it('thinkingConfig 应放在 config 根级别', async () => {
            const mockResponse = {
                candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'd' } }] } }],
            };
            mockGenerateContent.mockResolvedValueOnce(mockResponse);

            const ai = initVertexAI(testConfig);
            await generateImage(ai, 'test', {
                thinkingConfig: { thinkingBudget: 10000, includeThoughts: true },
            });

            const callArgs = mockGenerateContent.mock.calls[0][0] as any;
            expect(callArgs.config.thinkingConfig).toEqual({
                thinkingBudget: 10000,
                includeThoughts: true,
            });
        });

        it('seed + systemInstruction + thinkingConfig 组合应全部正确传递', async () => {
            const mockResponse = {
                candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'd' } }] } }],
            };
            mockGenerateContent.mockResolvedValueOnce(mockResponse);

            const ai = initVertexAI(testConfig);
            await generateImage(ai, 'test', {
                aspectRatio: '16:9',
                imageSize: '4K',
                seed: 12345,
                systemInstruction: '使用油画风格',
                thinkingConfig: { thinkingBudget: 5000 },
            });

            const callArgs = mockGenerateContent.mock.calls[0][0] as any;
            expect(callArgs.config.imageConfig).toEqual({ aspectRatio: '16:9', imageSize: '4K' });
            expect(callArgs.config.seed).toBe(12345);
            expect(callArgs.config.systemInstruction).toBe('使用油画风格');
            expect(callArgs.config.thinkingConfig).toEqual({ thinkingBudget: 5000 });
        });
    });

    // ============================================================
    // 常量测试
    // ============================================================
    describe('常量', () => {
        it('DEFAULT_MODEL 应为当前配置的默认模型', () => {
            expect(DEFAULT_MODEL).toBe('gemini-3.1-flash-image-preview');
        });

        it('RETRYABLE_STATUS_CODES 包含 429, 500, 503', () => {
            expect(RETRYABLE_STATUS_CODES.has(429)).toBe(true);
            expect(RETRYABLE_STATUS_CODES.has(500)).toBe(true);
            expect(RETRYABLE_STATUS_CODES.has(503)).toBe(true);
            expect(RETRYABLE_STATUS_CODES.has(400)).toBe(false);
        });

        it('RETRY_DELAYS 应为 [1000, 3000]', () => {
            expect(RETRY_DELAYS).toEqual([1000, 3000]);
        });
    });

    // ============================================================
    // extractStatusCode 测试
    // ============================================================
    describe('extractStatusCode', () => {
        it('应从 error.status 提取状态码', () => {
            expect(extractStatusCode({ status: 429 })).toBe(429);
        });

        it('应从 error.code 提取状态码', () => {
            expect(extractStatusCode({ code: 503 })).toBe(503);
        });

        it('应从 error.message 提取状态码', () => {
            expect(extractStatusCode({ message: 'Request failed with status 429' })).toBe(429);
        });

        it('无法提取时返回 500', () => {
            expect(extractStatusCode({})).toBe(500);
            expect(extractStatusCode(null)).toBe(500);
            expect(extractStatusCode('string error')).toBe(500);
        });
    });

    // ============================================================
    // isSafetyFilterError 测试
    // ============================================================
    describe('isSafetyFilterError', () => {
        it('应识别 IMAGE_SAFETY 错误', () => {
            expect(isSafetyFilterError(new Error('FinishReason: IMAGE_SAFETY'))).toBe(true);
        });

        it('应识别 IMAGE_PROHIBITED_CONTENT 错误', () => {
            expect(isSafetyFilterError(new Error('IMAGE_PROHIBITED_CONTENT'))).toBe(true);
        });

        it('应识别 SAFETY 关键词', () => {
            expect(isSafetyFilterError(new Error('Blocked due to SAFETY reasons'))).toBe(true);
        });

        it('非安全过滤错误应返回 false', () => {
            expect(isSafetyFilterError(new Error('Rate limit exceeded'))).toBe(false);
            expect(isSafetyFilterError(null)).toBe(false);
        });
    });

    // ============================================================
    // withRetry 重试逻辑测试
    // ============================================================
    describe('withRetry', () => {
        // 立即完成的 mock delay
        const mockDelay = vi.fn().mockResolvedValue(undefined);

        beforeEach(() => {
            mockDelay.mockClear();
        });

        it('首次成功时不应重试', async () => {
            const fn = vi.fn().mockResolvedValue('success');
            const { result, retryDetails } = await withRetry(fn, 2, mockDelay);

            expect(result).toBe('success');
            expect(retryDetails).toHaveLength(0);
            expect(fn).toHaveBeenCalledTimes(1);
            expect(mockDelay).not.toHaveBeenCalled();
        });

        it('429 错误后重试应成功 (AC: #1)', async () => {
            const fn = vi.fn()
                .mockRejectedValueOnce({ status: 429, message: 'Rate limit' })
                .mockResolvedValueOnce('success');

            const { result, retryDetails } = await withRetry(fn, 2, mockDelay);

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(2);
            expect(retryDetails).toHaveLength(1);
            expect(retryDetails[0].status_code).toBe(429);
            expect(retryDetails[0].attempt).toBe(1);
        });

        it('500 错误后重试应成功 (AC: #1)', async () => {
            const fn = vi.fn()
                .mockRejectedValueOnce({ status: 500, message: 'Internal error' })
                .mockResolvedValueOnce('success');

            const { result, retryDetails } = await withRetry(fn, 2, mockDelay);

            expect(result).toBe('success');
            expect(retryDetails).toHaveLength(1);
            expect(retryDetails[0].status_code).toBe(500);
        });

        it('503 错误后重试应成功 (AC: #1)', async () => {
            const fn = vi.fn()
                .mockRejectedValueOnce({ status: 503, message: 'Unavailable' })
                .mockResolvedValueOnce('success');

            const { result, retryDetails } = await withRetry(fn, 2, mockDelay);

            expect(result).toBe('success');
            expect(retryDetails).toHaveLength(1);
            expect(retryDetails[0].status_code).toBe(503);
        });

        it('最多重试 2 次（共 3 次尝试）(AC: #1)', async () => {
            const fn = vi.fn()
                .mockRejectedValueOnce({ status: 503, message: 'Unavailable' })
                .mockRejectedValueOnce({ status: 503, message: 'Unavailable' })
                .mockRejectedValueOnce({ status: 503, message: 'Unavailable' });

            await expect(withRetry(fn, 2, mockDelay)).rejects.toThrow();
            expect(fn).toHaveBeenCalledTimes(3); // 1 + 2 重试
        });

        it('重试退避时间正确 (AC: #2)', async () => {
            const fn = vi.fn()
                .mockRejectedValueOnce({ status: 429, message: 'Rate limit' })
                .mockRejectedValueOnce({ status: 429, message: 'Rate limit' })
                .mockRejectedValue({ status: 429, message: 'Rate limit' });

            await expect(withRetry(fn, 2, mockDelay)).rejects.toThrow();

            // 第 1 次重试等待 1000ms
            expect(mockDelay).toHaveBeenNthCalledWith(1, 1000);
            // 第 2 次重试等待 3000ms
            expect(mockDelay).toHaveBeenNthCalledWith(2, 3000);
        });

        it('每次重试应记录到 retryDetails (AC: #3)', async () => {
            const fn = vi.fn()
                .mockRejectedValueOnce({ status: 429, message: 'Rate limit' })
                .mockRejectedValueOnce({ status: 500, message: 'Internal' })
                .mockResolvedValueOnce('success');

            const { retryDetails } = await withRetry(fn, 2, mockDelay);

            expect(retryDetails).toHaveLength(2);
            expect(retryDetails[0]).toMatchObject({ attempt: 1, status_code: 429 });
            expect(retryDetails[1]).toMatchObject({ attempt: 2, status_code: 500 });
            expect(retryDetails[0].duration_ms).toBeGreaterThanOrEqual(0);
            expect(retryDetails[1].duration_ms).toBeGreaterThanOrEqual(0);
        });

        it('400 错误不应重试 (AC: #4)', async () => {
            const fn = vi.fn()
                .mockRejectedValueOnce({ status: 400, message: 'Bad request' });

            await expect(withRetry(fn, 2, mockDelay)).rejects.toThrow(VertexAIError);
            expect(fn).toHaveBeenCalledTimes(1);
            expect(mockDelay).not.toHaveBeenCalled();
        });

        it('安全过滤错误不应重试 (AC: #4)', async () => {
            const fn = vi.fn()
                .mockRejectedValueOnce(new Error('IMAGE_SAFETY filter triggered'));

            try {
                await withRetry(fn, 2, mockDelay);
            } catch (error) {
                expect(error).toBeInstanceOf(VertexAIError);
                expect((error as VertexAIError).isSafetyFilter).toBe(true);
            }
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('全部重试失败后应抛出 VertexAIError', async () => {
            const fn = vi.fn()
                .mockRejectedValue({ status: 503, message: 'Service unavailable' });

            try {
                await withRetry(fn, 2, mockDelay);
                expect.fail('应该抛出错误');
            } catch (error) {
                expect(error).toBeInstanceOf(VertexAIError);
                expect((error as VertexAIError).statusCode).toBe(503);
            }
        });
    });

    // ============================================================
    // VertexAIError 测试
    // ============================================================
    describe('VertexAIError', () => {
        it('应正确设置属性', () => {
            const err = new VertexAIError('test error', 429, false);
            expect(err.message).toBe('test error');
            expect(err.statusCode).toBe(429);
            expect(err.isSafetyFilter).toBe(false);
            expect(err.name).toBe('VertexAIError');
        });

        it('安全过滤错误标记', () => {
            const err = new VertexAIError('blocked', 400, true);
            expect(err.isSafetyFilter).toBe(true);
        });
    });
});
