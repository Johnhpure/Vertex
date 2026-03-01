/**
 * 请求日志记录模块测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { truncatePrompt, generateRequestId, logRequest } from './request-logger.js';

// Mock logs-dao
vi.mock('../db/logs-dao.js', () => ({
    insertLog: vi.fn(),
}));

import { insertLog } from '../db/logs-dao.js';
const mockedInsertLog = vi.mocked(insertLog);

describe('request-logger', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ============================================================
    // truncatePrompt 测试
    // ============================================================
    describe('truncatePrompt', () => {
        it('短于限制的 prompt 不截断', () => {
            expect(truncatePrompt('hello', 200)).toBe('hello');
        });

        it('超过限制的 prompt 应截断并加省略号', () => {
            const long = 'a'.repeat(250);
            const result = truncatePrompt(long, 200);
            expect(result).toHaveLength(203); // 200 + '...'
            expect(result!.endsWith('...')).toBe(true);
        });

        it('undefined 返回 undefined', () => {
            expect(truncatePrompt(undefined)).toBeUndefined();
        });

        it('空字符串返回空字符串', () => {
            expect(truncatePrompt('')).toBeUndefined();
        });

        it('刚好等于限制长度的不截断', () => {
            const exact = 'a'.repeat(200);
            expect(truncatePrompt(exact, 200)).toBe(exact);
        });
    });

    // ============================================================
    // generateRequestId 测试
    // ============================================================
    describe('generateRequestId', () => {
        it('应返回非空的 UUID 字符串', () => {
            const id = generateRequestId();
            expect(id).toBeTruthy();
            expect(typeof id).toBe('string');
            // UUID v4 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
            expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });

        it('每次调用应返回不同的 ID', () => {
            const id1 = generateRequestId();
            const id2 = generateRequestId();
            expect(id1).not.toBe(id2);
        });
    });

    // ============================================================
    // logRequest 测试
    // ============================================================
    describe('logRequest', () => {
        it('成功日志应写入所有字段 (AC: #6)', () => {
            logRequest('test-request-id', {
                prompt: '生成一只猫的图片',
                model: 'gemini-3-pro-image-preview',
                size: '1024x1024',
                aspect_ratio: '1:1',
                status: 'success',
                status_code: 200,
                response_time_ms: 1234,
                retry_count: 0,
            });

            expect(mockedInsertLog).toHaveBeenCalledTimes(1);
            const params = mockedInsertLog.mock.calls[0][0];
            expect(params.request_id).toBe('test-request-id');
            expect(params.prompt).toBe('生成一只猫的图片');
            expect(params.model).toBe('gemini-3-pro-image-preview');
            expect(params.size).toBe('1024x1024');
            expect(params.aspect_ratio).toBe('1:1');
            expect(params.status).toBe('success');
            expect(params.status_code).toBe(200);
            expect(params.response_time_ms).toBe(1234);
            expect(params.retry_count).toBe(0);
            expect(params.timestamp).toBeTruthy();
        });

        it('失败日志应包含错误信息', () => {
            logRequest('test-id', {
                prompt: 'test',
                status: 'error',
                status_code: 500,
                error_message: 'API quota exceeded',
                response_time_ms: 500,
                retry_count: 2,
                retry_details: '[{"attempt":1,"status_code":500,"duration_ms":100}]',
            });

            const params = mockedInsertLog.mock.calls[0][0];
            expect(params.status).toBe('error');
            expect(params.error_message).toBe('API quota exceeded');
            expect(params.retry_count).toBe(2);
            expect(params.retry_details).toBeTruthy();
        });

        it('prompt 应被截断到 200 字符', () => {
            const longPrompt = 'x'.repeat(300);
            logRequest('test-id', {
                prompt: longPrompt,
                status: 'success',
                status_code: 200,
            });

            const params = mockedInsertLog.mock.calls[0][0];
            expect(params.prompt!.length).toBeLessThanOrEqual(203); // 200 + '...'
        });

        it('insertLog 异常不应向上抛出', () => {
            mockedInsertLog.mockImplementationOnce(() => {
                throw new Error('DB error');
            });

            // 不应抛出异常
            expect(() => {
                logRequest('test-id', { status: 'success', status_code: 200 });
            }).not.toThrow();
        });
    });
});
