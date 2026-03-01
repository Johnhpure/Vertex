/**
 * 请求日志记录中间件
 * 在图片生成路由中记录每次 API 调用的详细信息
 */

import { v4 as uuidv4 } from 'uuid';
import { insertLog } from '../db/logs-dao.js';
import { DEFAULT_MODEL } from '../services/vertex-ai.js';
import type { InsertLogParams } from '../types/index.js';

/** 请求日志参数（从路由中传入） */
export interface RequestLogData {
    /** 请求的 prompt */
    prompt?: string;
    /** 请求的模型名称 */
    model?: string;
    /** 请求的图片尺寸 */
    size?: string;
    /** 请求的宽高比 */
    aspect_ratio?: string;
    /** 请求状态 */
    status: 'success' | 'error';
    /** HTTP 状态码 */
    status_code?: number;
    /** 错误信息 */
    error_message?: string;
    /** 响应耗时（毫秒） */
    response_time_ms?: number;
    /** 重试次数 */
    retry_count?: number;
    /** 重试详情 JSON */
    retry_details?: string;
    /** 预估成本（USD，估算值） */
    estimated_cost?: number;
}

/** prompt 最大记录长度 */
const MAX_PROMPT_LENGTH = 200;

/**
 * 截断 prompt 到指定长度
 */
export function truncatePrompt(prompt: string | undefined, maxLength: number = MAX_PROMPT_LENGTH): string | undefined {
    if (!prompt) return undefined;
    if (prompt.length <= maxLength) return prompt;
    return prompt.substring(0, maxLength) + '...';
}

/**
 * 生成唯一的请求 ID
 */
export function generateRequestId(): string {
    return uuidv4();
}

/**
 * 记录 API 请求日志
 * 将请求和响应信息写入 logs 表
 *
 * @param requestId - 请求唯一 ID
 * @param data - 日志数据
 */
export function logRequest(requestId: string, data: RequestLogData): void {
    try {
        const params: InsertLogParams = {
            request_id: requestId,
            timestamp: new Date().toISOString(),
            prompt: truncatePrompt(data.prompt),
            model: data.model ?? DEFAULT_MODEL,
            size: data.size,
            aspect_ratio: data.aspect_ratio,
            status: data.status,
            status_code: data.status_code,
            error_message: data.error_message,
            response_time_ms: data.response_time_ms,
            retry_count: data.retry_count ?? 0,
            retry_details: data.retry_details,
            estimated_cost: data.estimated_cost,
        };

        insertLog(params);
    } catch (error) {
        // 日志记录失败不应影响主流程
        console.error('[RequestLogger] 日志记录失败:', error instanceof Error ? error.message : error);
    }
}
