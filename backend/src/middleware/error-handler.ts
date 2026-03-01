/**
 * 全局错误处理中间件
 * 捕获未预期的异常，返回 OpenAI 格式的错误响应
 */

import type { Request, Response, NextFunction } from 'express';
import { VertexAIError } from '../services/vertex-ai.js';

/** Vertex AI 错误码到 OpenAI 错误类型的映射 */
const ERROR_TYPE_MAP: Record<number, string> = {
    400: 'invalid_request_error',
    401: 'authentication_error',
    403: 'permission_error',
    404: 'not_found_error',
    429: 'rate_limit_error',
    500: 'server_error',
    503: 'server_error',
};

/**
 * 根据 HTTP 状态码获取 OpenAI 错误类型
 */
function getErrorType(statusCode: number): string {
    return ERROR_TYPE_MAP[statusCode] ?? 'server_error';
}

/**
 * Express 全局错误处理中间件
 * 必须有 4 个参数（err, req, res, next）才能被 Express 识别为错误处理中间件
 */
export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    // 已经发送过响应头的情况下不再处理
    if (res.headersSent) {
        return;
    }

    let statusCode = 500;
    let errorType = 'server_error';
    let message = 'Internal server error';

    if (err instanceof VertexAIError) {
        // Vertex AI 特定错误：使用映射表确定错误类型
        statusCode = err.statusCode;
        errorType = err.isSafetyFilter ? 'content_filter' : getErrorType(statusCode);
        message = err.message;
    } else if (err instanceof Error) {
        // 普通错误：不向客户端暴露内部错误堆栈
        message = err.message || 'Internal server error';
    }

    // 日志记录（仅服务端）
    console.error(`[ErrorHandler] ${statusCode} ${errorType}: ${err.message}`);

    // 返回 OpenAI 格式的错误响应
    res.status(statusCode).json({
        error: {
            type: errorType,
            message,
        },
    });
}
