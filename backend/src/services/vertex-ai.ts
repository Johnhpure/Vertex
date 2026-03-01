/**
 * Vertex AI 服务模块
 * 封装 @google/genai SDK 调用，提供图片生成和重试功能
 *
 * 参考文档: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/image-generation?hl=zh-cn
 */

import { GoogleGenAI } from '@google/genai';
import type { GeminiResponse } from './converter.js';

/** 服务账号 JSON 凭证的最小字段定义 */
export interface ServiceAccountCredentials {
    /** 凭证类型 */
    type?: string;
    /** 项目 ID */
    project_id?: string;
    /** 私钥 ID */
    private_key_id?: string;
    /** 私钥 */
    private_key?: string;
    /** 客户端邮箱 */
    client_email?: string;
    [key: string]: unknown;
}

/** Vertex AI 服务配置 */
export interface VertexAIConfig {
    /** Google Cloud 项目 ID */
    projectId: string;
    /** Vertex AI 区域 */
    location: string;
    /** 服务账号凭证 JSON 对象 */
    credentials: ServiceAccountCredentials;
}

/** 单次重试的详细记录 */
export interface RetryDetail {
    /** 尝试序号（从 1 开始） */
    attempt: number;
    /** HTTP 状态码 */
    status_code: number;
    /** 本次尝试耗时（毫秒） */
    duration_ms: number;
}

/** 带有重试信息的 Vertex AI 错误 */
export class VertexAIError extends Error {
    /** HTTP 状态码 */
    statusCode: number;
    /** 是否为安全过滤错误 */
    isSafetyFilter: boolean;

    constructor(message: string, statusCode: number, isSafetyFilter = false) {
        super(message);
        this.name = 'VertexAIError';
        this.statusCode = statusCode;
        this.isSafetyFilter = isSafetyFilter;
    }
}

/** 默认使用的模型名称 */
export const DEFAULT_MODEL = 'gemini-3.1-flash-image-preview';

/** 可重试的 HTTP 状态码集合 */
export const RETRYABLE_STATUS_CODES = new Set([429, 500, 503]);

/** 重试退避等待时间（毫秒），索引 0 = 第 1 次重试，索引 1 = 第 2 次重试 */
export const RETRY_DELAYS = [1000, 3000];

/**
 * 初始化 Vertex AI SDK 客户端
 *
 * @param config - Vertex AI 配置参数
 * @returns GoogleGenAI 实例
 * @throws Error 当初始化失败时抛出错误
 */
export function initVertexAI(config: VertexAIConfig): GoogleGenAI {
    try {
        const ai = new GoogleGenAI({
            vertexai: true,
            project: config.projectId,
            location: config.location,
            googleAuthOptions: {
                credentials: config.credentials,
            },
        });
        return ai;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Vertex AI SDK 初始化失败: ${message}`);
    }
}

/** 图片生成配置参数 */
export interface ImageGenerationConfig {
    // === imageConfig 层参数 ===
    /** 宽高比（如 "1:1"、"16:9"） */
    aspectRatio?: string;
    /** 分辨率（如 "1K"、"2K"、"4K"） */
    imageSize?: string;
    /** 输出 MIME 类型（如 "image/png"、"image/jpeg"） */
    outputMimeType?: string;
    /** 人物生成控制 */
    personGeneration?: string;

    // === config 根层参数 ===
    /** 随机种子（相同 seed + 相同 prompt = 可复现的生成结果） */
    seed?: number;
    /** 系统指令（设定全局风格、调性等，如 "你是一位专业摄影师..."） */
    systemInstruction?: string;
    /** 模型思考配置（启用深度思考，可能提升复杂场景质量） */
    thinkingConfig?: {
        /** 思考 token 预算 */
        thinkingBudget?: number;
        /** 是否包含思考过程 */
        includeThoughts?: boolean;
    };
}

/**
 * 使用 Vertex AI 生成图片
 *
 * @param ai - 已初始化的 GoogleGenAI 实例
 * @param prompt - 图片生成提示词
 * @param imageConfig - 图片配置（宽高比、分辨率、输出格式、seed、systemInstruction 等）
 * @param model - 模型名称（默认 DEFAULT_MODEL）
 * @returns Gemini 格式的响应
 * @throws Error 当 API 调用失败时抛出错误
 */
export async function generateImage(
    ai: GoogleGenAI,
    prompt: string,
    imageConfig: ImageGenerationConfig = {},
    model: string = DEFAULT_MODEL
): Promise<GeminiResponse> {
    // 参考 @google/genai SDK 官方文档：
    // - imageConfig（aspectRatio、imageSize 等）放在 config.imageConfig 中
    // - seed、systemInstruction、thinkingConfig 放在 config 根级别
    // https://ai.google.dev/gemini-api/docs/image-generation

    // 构建 imageConfig 对象（aspectRatio、imageSize 等）
    const imageConfigObj: Record<string, unknown> = {};
    if (imageConfig.aspectRatio) {
        imageConfigObj.aspectRatio = imageConfig.aspectRatio;
    }
    if (imageConfig.imageSize) {
        imageConfigObj.imageSize = imageConfig.imageSize;
    }
    if (imageConfig.outputMimeType) {
        imageConfigObj.outputMimeType = imageConfig.outputMimeType;
    }
    if (imageConfig.personGeneration) {
        imageConfigObj.personGeneration = imageConfig.personGeneration;
    }

    // 构建 config 根级别对象
    const configObj: Record<string, unknown> = {};

    // imageConfig 子对象
    if (Object.keys(imageConfigObj).length > 0) {
        configObj.imageConfig = imageConfigObj;
    }

    // seed — 可复现生成
    if (imageConfig.seed !== undefined && imageConfig.seed !== null) {
        configObj.seed = imageConfig.seed;
    }

    // systemInstruction — 全局风格指令
    if (imageConfig.systemInstruction) {
        configObj.systemInstruction = imageConfig.systemInstruction;
    }

    // thinkingConfig — 模型思考控制
    if (imageConfig.thinkingConfig) {
        const tc: Record<string, unknown> = {};
        if (imageConfig.thinkingConfig.thinkingBudget !== undefined) {
            tc.thinkingBudget = imageConfig.thinkingConfig.thinkingBudget;
        }
        if (imageConfig.thinkingConfig.includeThoughts !== undefined) {
            tc.includeThoughts = imageConfig.thinkingConfig.includeThoughts;
        }
        if (Object.keys(tc).length > 0) {
            configObj.thinkingConfig = tc;
        }
    }

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: configObj as Parameters<typeof ai.models.generateContent>[0]['config'],
    });

    // 将 SDK 响应转换为我们定义的 GeminiResponse 接口格式
    return response as unknown as GeminiResponse;
}

/**
 * 从错误中提取 HTTP 状态码
 * Vertex AI SDK 错误通常包含 status 或 code 属性
 */
export function extractStatusCode(error: unknown): number {
    if (error && typeof error === 'object') {
        const e = error as Record<string, unknown>;
        // @google/genai SDK 的错误对象可能包含 status、code 或 statusCode
        if (typeof e.status === 'number') return e.status;
        if (typeof e.code === 'number') return e.code;
        if (typeof e.statusCode === 'number') return e.statusCode;
        // 从 message 中尝试提取 HTTP 状态码
        if (typeof e.message === 'string') {
            const match = e.message.match(/\b(4\d{2}|5\d{2})\b/);
            if (match) return parseInt(match[1], 10);
        }
    }
    return 500; // 默认返回 500
}

/**
 * 判断错误是否为安全过滤错误
 * 参考 Vertex AI 文档：安全过滤返回 FinishReason: IMAGE_SAFETY 或 IMAGE_PROHIBITED_CONTENT
 */
export function isSafetyFilterError(error: unknown): boolean {
    if (error && typeof error === 'object') {
        const msg = (error as Error).message || '';
        return (
            msg.includes('IMAGE_SAFETY') ||
            msg.includes('IMAGE_PROHIBITED_CONTENT') ||
            msg.includes('SAFETY') ||
            msg.includes('content_filter')
        );
    }
    return false;
}

/**
 * 可注入的延迟函数（方便测试时 mock）
 */
export const delay = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

/**
 * 带重试的函数包装器
 *
 * @param fn - 要执行的异步函数
 * @param maxRetries - 最大重试次数（默认 2，即最多 3 次尝试）
 * @param delayFn - 延迟函数（用于测试注入）
 * @returns 包含结果和重试详情的对象
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 2,
    delayFn: (ms: number) => Promise<void> = delay
): Promise<{ result: T; retryDetails: RetryDetail[] }> {
    const retryDetails: RetryDetail[] = [];
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const startTime = Date.now();

        try {
            const result = await fn();
            return { result, retryDetails };
        } catch (error) {
            const durationMs = Date.now() - startTime;
            const statusCode = extractStatusCode(error);

            // 记录本次尝试的详细信息
            retryDetails.push({
                attempt: attempt + 1,
                status_code: statusCode,
                duration_ms: durationMs,
            });

            // 400 或安全过滤错误：直接抛出，不重试
            if (statusCode === 400 || isSafetyFilterError(error)) {
                throw new VertexAIError(
                    error instanceof Error ? error.message : String(error),
                    statusCode,
                    isSafetyFilterError(error)
                );
            }

            // 非可重试状态码：直接抛出
            if (!RETRYABLE_STATUS_CODES.has(statusCode)) {
                throw new VertexAIError(
                    error instanceof Error ? error.message : String(error),
                    statusCode
                );
            }

            // 已达最大重试次数：抛出错误
            if (attempt >= maxRetries) {
                lastError = error;
                break;
            }

            // 指数退避等待
            const waitTime = RETRY_DELAYS[attempt] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
            await delayFn(waitTime);
        }
    }

    // 所有重试都失败了
    const statusCode = extractStatusCode(lastError);
    throw new VertexAIError(
        lastError instanceof Error ? lastError.message : String(lastError),
        statusCode
    );
}
