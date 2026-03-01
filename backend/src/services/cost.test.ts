/**
 * cost.ts 单元测试
 * 验证费用估算逻辑的正确性
 */

import { describe, it, expect } from 'vitest';
import {
    estimateCost,
    GEMINI_PRICING,
    DEFAULT_TOKEN_ESTIMATES,
} from './cost.js';

describe('cost 费用估算模块', () => {
    describe('estimateCost', () => {
        it('使用默认 token 数进行估算', () => {
            const result = estimateCost();

            expect(result.is_estimate).toBe(true);
            expect(result.input_tokens).toBe(DEFAULT_TOKEN_ESTIMATES.INPUT_TOKENS);
            expect(result.output_tokens).toBe(
                DEFAULT_TOKEN_ESTIMATES.OUTPUT_TEXT_TOKENS + DEFAULT_TOKEN_ESTIMATES.OUTPUT_IMAGE_TOKENS
            );
            expect(result.estimated_cost).toBeGreaterThan(0);
        });

        it('使用自定义 token 数进行估算', () => {
            const inputTokens = 500;
            const outputTokens = 3000;
            const result = estimateCost(inputTokens, outputTokens);

            expect(result.input_tokens).toBe(500);
            expect(result.output_tokens).toBe(3000);
            expect(result.is_estimate).toBe(true);

            // 手工验证费用计算
            const expectedInputCost = (500 / 1_000_000) * GEMINI_PRICING.INPUT_PRICE_PER_MILLION;
            const expectedOutputCost = (3000 / 1_000_000) * GEMINI_PRICING.OUTPUT_IMAGE_PRICE_PER_MILLION;
            const expectedTotal = parseFloat((expectedInputCost + expectedOutputCost).toFixed(6));

            expect(result.estimated_cost).toBe(expectedTotal);
        });

        it('仅传 inputTokens 时 outputTokens 使用默认值', () => {
            const result = estimateCost(1000);

            expect(result.input_tokens).toBe(1000);
            expect(result.output_tokens).toBe(
                DEFAULT_TOKEN_ESTIMATES.OUTPUT_TEXT_TOKENS + DEFAULT_TOKEN_ESTIMATES.OUTPUT_IMAGE_TOKENS
            );
        });

        it('仅传 outputTokens 时 inputTokens 使用默认值', () => {
            const result = estimateCost(undefined, 5000);

            expect(result.input_tokens).toBe(DEFAULT_TOKEN_ESTIMATES.INPUT_TOKENS);
            expect(result.output_tokens).toBe(5000);
        });

        it('token 数为 0 时费用应为 0', () => {
            const result = estimateCost(0, 0);

            expect(result.estimated_cost).toBe(0);
            expect(result.input_tokens).toBe(0);
            expect(result.output_tokens).toBe(0);
        });

        it('费用应保留合理的小数位数', () => {
            const result = estimateCost(100, 100);

            // 费用应是一个有限小数（最多 6 位）
            const costStr = result.estimated_cost.toString();
            const decimalPart = costStr.split('.')[1] || '';
            expect(decimalPart.length).toBeLessThanOrEqual(6);
        });

        it('is_estimate 始终为 true', () => {
            const result1 = estimateCost();
            const result2 = estimateCost(100, 200);
            const result3 = estimateCost(0, 0);

            expect(result1.is_estimate).toBe(true);
            expect(result2.is_estimate).toBe(true);
            expect(result3.is_estimate).toBe(true);
        });

        it('默认估算费用应在合理范围内', () => {
            const result = estimateCost();

            // 一次图片生成的费用应该在 $0.001 ~ $1.0 之间
            expect(result.estimated_cost).toBeGreaterThan(0.0001);
            expect(result.estimated_cost).toBeLessThan(1.0);
        });
    });
});
