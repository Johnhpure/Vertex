/**
 * 费用估算服务
 * 基于 Vertex AI Gemini token 定价进行费用估算
 *
 * 注意：费用为"估算值"，与 Google Cloud Console 实际账单可能有偏差
 * 输入/输出 token 分开计价
 */

/**
 * Gemini 3 Pro Image 的 token 定价（USD / 百万 token）
 * 参考 Vertex AI 官方定价页面
 * 注意：价格可能随时变动，需定期校准
 */
export const GEMINI_PRICING = {
    /** 输入 token 单价（USD / 百万 token） */
    INPUT_PRICE_PER_MILLION: 1.25,
    /** 输出 token 单价（USD / 百万 token） */
    OUTPUT_PRICE_PER_MILLION: 5.00,
    /** 输出图片 token 单价（USD / 百万 token） */
    OUTPUT_IMAGE_PRICE_PER_MILLION: 40.00,
} as const;

/**
 * 图片生成的默认 token 估算值
 * 由于图片生成 API 不直接返回 token 用量，使用经验估算值
 */
export const DEFAULT_TOKEN_ESTIMATES = {
    /** 默认输入 token 估算（一次典型的图片生成 prompt） */
    INPUT_TOKENS: 200,
    /** 默认输出文本 token 估算（描述/revised_prompt） */
    OUTPUT_TEXT_TOKENS: 100,
    /** 默认输出图片 token 估算（一张标准图片的 token 数） */
    OUTPUT_IMAGE_TOKENS: 2580,
} as const;

/** 费用估算结果 */
export interface CostEstimate {
    /** 估算费用（USD） */
    estimated_cost: number;
    /** 是否为估算值（始终为 true） */
    is_estimate: boolean;
    /** 输入 token 数 */
    input_tokens: number;
    /** 输出 token 数 */
    output_tokens: number;
}

/**
 * 估算单次图片生成调用的费用
 *
 * @param inputTokens - 输入 token 数（可选，默认使用估算值）
 * @param outputTokens - 输出 token 数（可选，默认使用估算值）
 * @returns 费用估算结果（USD）
 */
export function estimateCost(
    inputTokens?: number,
    outputTokens?: number,
): CostEstimate {
    const actualInputTokens = inputTokens ?? DEFAULT_TOKEN_ESTIMATES.INPUT_TOKENS;
    const actualOutputTokens = outputTokens ?? (
        DEFAULT_TOKEN_ESTIMATES.OUTPUT_TEXT_TOKENS + DEFAULT_TOKEN_ESTIMATES.OUTPUT_IMAGE_TOKENS
    );

    // 计算输入费用：token 数 / 100万 * 单价
    const inputCost = (actualInputTokens / 1_000_000) * GEMINI_PRICING.INPUT_PRICE_PER_MILLION;

    // 计算输出费用：文本和图片合并 token 使用输出图片价格
    // 因为图片生成场景下输出主要为图片 token
    const outputCost = (actualOutputTokens / 1_000_000) * GEMINI_PRICING.OUTPUT_IMAGE_PRICE_PER_MILLION;

    // 总费用保留 6 位小数
    const totalCost = parseFloat((inputCost + outputCost).toFixed(6));

    return {
        estimated_cost: totalCost,
        is_estimate: true,
        input_tokens: actualInputTokens,
        output_tokens: actualOutputTokens,
    };
}
