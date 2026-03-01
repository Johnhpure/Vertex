/**
 * 全局错误处理中间件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from './error-handler.js';
import { VertexAIError } from '../services/vertex-ai.js';

/**
 * 创建一个测试用的 Express 应用
 * 包含一个可以触发不同错误的路由
 */
function createTestApp() {
    const app = express();
    app.use(express.json());

    // 测试路由：根据请求参数抛出不同类型的错误
    app.post('/test-error', (req, res, next) => {
        const { errorType, statusCode, message, isSafetyFilter } = req.body;

        if (errorType === 'vertex') {
            next(new VertexAIError(message || 'Vertex error', statusCode || 500, isSafetyFilter || false));
        } else if (errorType === 'generic') {
            next(new Error(message || 'Something went wrong'));
        } else {
            res.json({ ok: true });
        }
    });

    // 注册全局错误处理中间件
    app.use(errorHandler);

    return app;
}

describe('errorHandler', () => {
    let app: express.Express;

    beforeEach(() => {
        app = createTestApp();
    });

    // ============================================================
    // VertexAIError 处理 (AC: #7)
    // ============================================================
    describe('VertexAIError 映射', () => {
        it('429 错误映射为 rate_limit_error', async () => {
            const res = await request(app)
                .post('/test-error')
                .send({ errorType: 'vertex', statusCode: 429, message: 'Rate limit exceeded' });

            expect(res.status).toBe(429);
            expect(res.body.error.type).toBe('rate_limit_error');
            expect(res.body.error.message).toBe('Rate limit exceeded');
        });

        it('500 错误映射为 server_error', async () => {
            const res = await request(app)
                .post('/test-error')
                .send({ errorType: 'vertex', statusCode: 500, message: 'Internal error' });

            expect(res.status).toBe(500);
            expect(res.body.error.type).toBe('server_error');
        });

        it('503 错误映射为 server_error', async () => {
            const res = await request(app)
                .post('/test-error')
                .send({ errorType: 'vertex', statusCode: 503, message: 'Unavailable' });

            expect(res.status).toBe(503);
            expect(res.body.error.type).toBe('server_error');
        });

        it('400 错误映射为 invalid_request_error', async () => {
            const res = await request(app)
                .post('/test-error')
                .send({ errorType: 'vertex', statusCode: 400, message: 'Bad request' });

            expect(res.status).toBe(400);
            expect(res.body.error.type).toBe('invalid_request_error');
        });

        it('安全过滤错误映射为 content_filter', async () => {
            const res = await request(app)
                .post('/test-error')
                .send({ errorType: 'vertex', statusCode: 400, message: 'Content blocked', isSafetyFilter: true });

            expect(res.status).toBe(400);
            expect(res.body.error.type).toBe('content_filter');
        });
    });

    // ============================================================
    // 通用错误处理 (AC: #7)
    // ============================================================
    describe('通用 Error 处理', () => {
        it('普通 Error 返回 500 server_error', async () => {
            const res = await request(app)
                .post('/test-error')
                .send({ errorType: 'generic', message: 'Unexpected failure' });

            expect(res.status).toBe(500);
            expect(res.body.error.type).toBe('server_error');
            expect(res.body.error.message).toBe('Unexpected failure');
        });

        it('不应暴露内部错误堆栈 (AC: #7)', async () => {
            const res = await request(app)
                .post('/test-error')
                .send({ errorType: 'generic', message: 'DB connection failed' });

            // 响应中不应包含 stack 属性
            expect(res.body.error.stack).toBeUndefined();
            // 响应中应只有 type 和 message
            expect(Object.keys(res.body.error)).toEqual(['type', 'message']);
        });
    });

    // ============================================================
    // 无错误时不拦截
    // ============================================================
    describe('正常请求', () => {
        it('无错误时不应拦截', async () => {
            const res = await request(app)
                .post('/test-error')
                .send({});

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
        });
    });
});
