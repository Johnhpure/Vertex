/**
 * OpenAI 到 Gemini 格式转换层
 * 将 OpenAI 图片生成请求参数转换为 Gemini API 参数，
 * 并将 Gemini 响应转换回 OpenAI 格式。
 */

// ============================================================
// 接口定义
// ============================================================

/** OpenAI 图片生成请求参数 */
export interface OpenAIImageRequest {
    /** 图片生成提示词 */
    prompt: string;
    /** 使用的模型名称（可选） */
    model?: string;
    /** 生成图片数量（默认 1） */
    n?: number;
    /** 图片尺寸（如 "1024x1024"），用于映射宽高比（兼容 OpenAI） */
    size?: string;
    /** 响应格式（如 "b64_json"、"url"） */
    response_format?: string;
    /** 宽高比（直接指定，优先级高于 size 映射） */
    aspect_ratio?: string;
    /** 分辨率/图片尺寸（如 "1K"、"2K"、"4K"） */
    image_size?: string;
    /** 输出 MIME 类型（如 "image/png"、"image/jpeg"、"image/webp"） */
    output_mime_type?: string;
    /** 人物生成控制（"DONT_ALLOW"、"ALLOW_ADULT"、"ALLOW_ALL"） */
    person_generation?: string;
    /** 随机种子（相同 seed + 相同 prompt = 可复现的生成结果） */
    seed?: number;
    /** 系统指令（设定全局风格、调性等） */
    system_instruction?: string;
    /** 模型思考配置（启用模型“思考”能力，可能提升复杂场景质量） */
    thinking_config?: {
        /** 思考 token 预算（用于控制思考深度） */
        thinking_budget?: number;
        /** 是否在输出中包含思考过程 */
        include_thoughts?: boolean;
    };
}

/** Gemini 请求中的 part 结构 */
export interface GeminiPart {
    /** 文本内容 */
    text?: string;
    /** 内联数据（图片等） */
    inlineData?: {
        /** MIME 类型 */
        mimeType: string;
        /** Base64 编码数据 */
        data: string;
    };
}

/** Gemini 请求体结构 */
export interface GeminiRequestBody {
    /** 对话内容列表 */
    contents: Array<{
        /** 角色 */
        role: string;
        /** 内容部分 */
        parts: GeminiPart[];
    }>;
    /** 生成配置 */
    generationConfig: {
        /** 响应模式列表 */
        responseModalities: string[];
        /** 宽高比（可选） */
        aspectRatio?: string;
        /** 分辨率/图片尺寸（可选，如 "1K"、"2K"、"4K"） */
        imageSize?: string;
        /** 输出 MIME 类型（可选） */
        outputMimeType?: string;
        /** 人物生成控制（可选） */
        personGeneration?: string;
    };
}

/** Gemini 响应体结构 */
export interface GeminiResponse {
    /** 候选结果列表 */
    candidates: Array<{
        /** 内容 */
        content: {
            /** 内容部分列表 */
            parts: GeminiPart[];
        };
    }>;
}

/** OpenAI 图片响应中的单个数据项 */
export interface OpenAIImageDataItem {
    /** Base64 编码的图片数据 */
    b64_json: string;
    /** 修订后的提示词 */
    revised_prompt: string;
}

/** OpenAI 图片生成响应格式 */
export interface OpenAIImageResponse {
    /** 创建时间戳（Unix 秒） */
    created: number;
    /** 图片数据数组 */
    data: OpenAIImageDataItem[];
}

// ============================================================
// 常量定义
// ============================================================

/**
 * OpenAI size → Gemini aspectRatio 映射表
 * 未知或未指定的 size 默认映射为 "1:1"
 */
export const SIZE_TO_ASPECT_RATIO: Record<string, string> = {
    '1024x1024': '1:1',
    '1024x1792': '9:16',
    '1792x1024': '16:9',
    '512x512': '1:1',
    '768x1024': '3:4',
    '1024x768': '4:3',
    '819x1024': '4:5',
    '1024x819': '5:4',
    '683x1024': '2:3',
    '1024x683': '3:2',
    '1024x439': '21:9',
};

/** 默认宽高比 */
export const DEFAULT_ASPECT_RATIO = '1:1';

/** Vertex AI 支持的全部宽高比列表 */
export const VALID_ASPECT_RATIOS = new Set([
    '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9',
]);

/** Vertex AI 支持的图片分辨率列表（注意必须大写 K） */
export const VALID_IMAGE_SIZES = new Set(['512px', '1K', '2K', '4K']);

/** 默认图片分辨率 */
export const DEFAULT_IMAGE_SIZE = '1K';

/** Vertex AI 支持的输出 MIME 类型 */
export const VALID_OUTPUT_MIME_TYPES = new Set([
    'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
]);

/** 人物生成控制选项 */
export const VALID_PERSON_GENERATIONS = new Set([
    'DONT_ALLOW', 'ALLOW_ADULT', 'ALLOW_ALL',
]);

// ============================================================
// 请求转换函数
// ============================================================

/**
 * 将 OpenAI 图片生成请求转换为 Gemini API 请求参数
 *
 * 参数优先级：
 * - aspect_ratio（直接传入）> size（映射转换）> 默认值 "1:1"
 * - image_size 直接传递（需校验合法性）
 *
 * @param req - OpenAI 格式的图片生成请求
 * @returns Gemini 格式的请求体
 */
export function convertRequestToGemini(req: OpenAIImageRequest): GeminiRequestBody {
    // 确定宽高比：aspect_ratio（直传）优先于 size（映射），最后使用默认值
    let aspectRatio: string;
    if (req.aspect_ratio && VALID_ASPECT_RATIOS.has(req.aspect_ratio)) {
        // 用户直接传入了合法的宽高比
        aspectRatio = req.aspect_ratio;
    } else if (req.size) {
        // 从 OpenAI 风格的 size 映射
        aspectRatio = SIZE_TO_ASPECT_RATIO[req.size] ?? DEFAULT_ASPECT_RATIO;
    } else {
        aspectRatio = DEFAULT_ASPECT_RATIO;
    }

    // 确定图片分辨率：校验合法性，不合法则使用默认值
    let imageSize: string | undefined;
    if (req.image_size) {
        // 自动修正大小写：2k → 2K, 4k → 4K
        const normalized = req.image_size.replace(/k$/i, 'K').replace(/px$/i, 'px');
        imageSize = VALID_IMAGE_SIZES.has(normalized) ? normalized : DEFAULT_IMAGE_SIZE;
    }

    // 确定输出 MIME 类型
    const outputMimeType = req.output_mime_type && VALID_OUTPUT_MIME_TYPES.has(req.output_mime_type)
        ? req.output_mime_type
        : undefined;

    // 确定人物生成控制
    const personGeneration = req.person_generation && VALID_PERSON_GENERATIONS.has(req.person_generation)
        ? req.person_generation
        : undefined;

    return {
        contents: [
            {
                role: 'user',
                parts: [{ text: req.prompt }],
            },
        ],
        generationConfig: {
            // 强制设置 responseModalities，确保返回文本和图片
            responseModalities: ['TEXT', 'IMAGE'],
            aspectRatio,
            ...(imageSize && { imageSize }),
            ...(outputMimeType && { outputMimeType }),
            ...(personGeneration && { personGeneration }),
        },
    };
}

// ============================================================
// 响应转换函数
// ============================================================

/**
 * 将 Gemini 响应转换为 OpenAI 图片生成响应格式
 *
 * 遍历 Gemini parts[] 数组：
 * - 提取 inlineData.mimeType 为 "image/png" 的部分作为 b64_json
 * - 提取 text 部分作为 revised_prompt
 *
 * @param geminiResponse - Gemini API 响应
 * @returns OpenAI 格式的图片生成响应
 * @throws Error 当响应中无图片数据时抛出错误
 */
export function convertResponseToOpenAI(geminiResponse: GeminiResponse): OpenAIImageResponse {
    const parts = geminiResponse.candidates?.[0]?.content?.parts ?? [];

    let imageData = '';
    let revisedPrompt = '';

    // 遍历 parts，处理顺序不固定的情况
    for (const part of parts) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            imageData = part.inlineData.data;
        }
        if (part.text) {
            revisedPrompt = part.text;
        }
    }

    // 无图片返回时抛出明确错误
    if (!imageData) {
        throw new Error('Gemini 响应中未找到图片数据（image/png）');
    }

    return {
        created: Math.floor(Date.now() / 1000),
        data: [
            {
                b64_json: imageData,
                revised_prompt: revisedPrompt,
            },
        ],
    };
}
