/**
 * 图片生成路由
 * 提供 OpenAI 兼容的 /v1/images/generations 端点
 * 集成重试逻辑和请求日志记录
 * 成功生成后保存图片到本地 data/images/ 目录
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router, type Request, type Response } from 'express';
import { getConfig } from '../db/config-dao.js';
import { config } from '../config/index.js';
import { decrypt } from '../services/encryption.js';
import { convertRequestToGemini, convertResponseToOpenAI } from '../services/converter.js';
import { initVertexAI, generateImage, withRetry, VertexAIError } from '../services/vertex-ai.js';
import { generateRequestId, logRequest } from '../middleware/request-logger.js';
import { estimateCost } from '../services/cost.js';
import { insertTask } from '../db/tasks-dao.js';
import { truncatePrompt } from '../middleware/request-logger.js';
import type { OpenAIImageRequest } from '../services/converter.js';

// ESM 兼容的路径解析
const __filename_images = fileURLToPath(import.meta.url);
const __dirname_images = path.dirname(__filename_images);

/** 图片保存目录 */
const IMAGES_DIR = path.resolve(__dirname_images, '../../../data/images');

// 确保图片目录存在
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

const router = Router();

/**
 * POST /v1/images/generations
 * 接收 OpenAI 格式的图片生成请求，调用 Vertex AI（带重试），返回 OpenAI 格式响应
 */
router.post('/v1/images/generations', async (req: Request, res: Response): Promise<void> => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    const body = req.body as OpenAIImageRequest;

    try {
        // 1. 参数验证 — prompt 必填
        if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim() === '') {
            // 记录验证失败的日志
            logRequest(requestId, {
                prompt: typeof body.prompt === 'string' ? body.prompt : undefined,
                status: 'error',
                status_code: 400,
                error_message: 'prompt is required',
                response_time_ms: Date.now() - startTime,
            });

            res.status(400).json({
                error: {
                    type: 'invalid_request_error',
                    message: 'prompt is required and must be a non-empty string',
                },
            });
            return;
        }

        // 2. 读取服务账号配置
        const serviceAccountJson = getConfig('service_account');
        if (!serviceAccountJson) {
            logRequest(requestId, {
                prompt: body.prompt,
                status: 'error',
                status_code: 500,
                error_message: 'Service account not configured',
                response_time_ms: Date.now() - startTime,
            });

            res.status(500).json({
                error: {
                    type: 'server_error',
                    message: 'Service account not configured',
                },
            });
            return;
        }

        // 3. 解密并解析服务账号 JSON
        let credentials: Record<string, unknown>;
        try {
            const decryptedJson = decrypt(serviceAccountJson);
            credentials = JSON.parse(decryptedJson);
        } catch {
            logRequest(requestId, {
                prompt: body.prompt,
                status: 'error',
                status_code: 500,
                error_message: 'Invalid service account configuration',
                response_time_ms: Date.now() - startTime,
            });

            res.status(500).json({
                error: {
                    type: 'server_error',
                    message: 'Invalid service account configuration',
                },
            });
            return;
        }

        // 4. 请求转换：OpenAI → Gemini 格式
        const geminiRequest = convertRequestToGemini(body);
        const aspectRatio = geminiRequest.generationConfig.aspectRatio ?? '1:1';
        const imageSize = geminiRequest.generationConfig.imageSize;

        // 5. 初始化 Vertex AI SDK
        const ai = initVertexAI({
            projectId: credentials.project_id as string || config.VERTEX_PROJECT_ID,
            location: credentials.location as string || config.VERTEX_LOCATION,
            credentials,
        });

        // 6. 调用 Vertex AI 生成图片（带重试）
        // 构建完整的 imageConfig，包含 imageConfig 层和 config 根层参数
        const requestModel = body.model || undefined;
        const imageConfig = {
            // imageConfig 层参数
            aspectRatio,
            imageSize: geminiRequest.generationConfig.imageSize,
            outputMimeType: geminiRequest.generationConfig.outputMimeType,
            personGeneration: geminiRequest.generationConfig.personGeneration,
            // config 根层参数
            seed: body.seed,
            systemInstruction: body.system_instruction,
            // thinking_config (下划线) → thinkingConfig (驼峰)
            ...(body.thinking_config && {
                thinkingConfig: {
                    thinkingBudget: body.thinking_config.thinking_budget,
                    includeThoughts: body.thinking_config.include_thoughts,
                },
            }),
        };
        const { result: geminiResponse, retryDetails } = await withRetry(
            () => generateImage(ai, body.prompt, imageConfig, requestModel)
        );

        // 7. 响应转换：Gemini → OpenAI 格式
        const openaiResponse = convertResponseToOpenAI(geminiResponse);

        // 8. 费用估算（使用默认 token 估算值，因为图片生成 API 不返回 token 用量）
        const costResult = estimateCost();

        // 9. 保存生成的图片到本地文件系统
        try {
            const imageData = openaiResponse.data?.[0]?.b64_json;
            if (imageData) {
                const imageFilename = `${requestId}.png`;
                const imagePath = path.join(IMAGES_DIR, imageFilename);
                const imageBuffer = Buffer.from(imageData, 'base64');
                fs.writeFileSync(imagePath, imageBuffer);

                // 记录任务到 tasks 表
                insertTask({
                    request_id: requestId,
                    prompt: truncatePrompt(body.prompt, 500) ?? body.prompt,
                    model: body.model ?? 'gemini-3.1-flash-image-preview',
                    aspect_ratio: aspectRatio,
                    image_size: imageSize,
                    image_filename: imageFilename,
                    file_size: imageBuffer.length,
                });

                console.log(`[Images] 图片已保存: ${imageFilename} (${imageBuffer.length} bytes)`);
            }
        } catch (saveError) {
            // 图片保存失败不应影响 API 响应
            console.error('[Images] 图片保存失败:', saveError instanceof Error ? saveError.message : saveError);
        }

        // 10. 记录成功日志
        logRequest(requestId, {
            prompt: body.prompt,
            model: body.model,
            size: body.size,
            aspect_ratio: aspectRatio,
            status: 'success',
            status_code: 200,
            response_time_ms: Date.now() - startTime,
            retry_count: retryDetails.length > 0 ? retryDetails.length : 0,
            retry_details: retryDetails.length > 0 ? JSON.stringify(retryDetails) : undefined,
            estimated_cost: costResult.estimated_cost,
        });

        // 11. 返回成功响应
        res.status(200).json(openaiResponse);
    } catch (error) {
        // 处理 Vertex AI SDK 异常，返回 OpenAI 格式错误
        const isVertexError = error instanceof VertexAIError;
        const statusCode = isVertexError ? error.statusCode : 500;
        const errorType = isVertexError && error.isSafetyFilter
            ? 'content_filter'
            : statusCode === 429
                ? 'rate_limit_error'
                : 'server_error';
        const message = error instanceof Error ? error.message : '未知错误';

        console.error('[Images] 图片生成失败:', message);

        // 记录失败日志
        logRequest(requestId, {
            prompt: body.prompt,
            model: body.model,
            size: body.size,
            status: 'error',
            status_code: statusCode,
            error_message: message,
            response_time_ms: Date.now() - startTime,
        });

        res.status(statusCode).json({
            error: {
                type: errorType,
                message,
            },
        });
    }
});

export default router;
