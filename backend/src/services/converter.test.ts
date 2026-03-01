/**
 * converter.ts 单元测试
 * 覆盖所有 size→aspectRatio 映射、请求转换结构、响应转换场景
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    convertRequestToGemini,
    convertResponseToOpenAI,
    SIZE_TO_ASPECT_RATIO,
    DEFAULT_ASPECT_RATIO,
    type OpenAIImageRequest,
    type GeminiResponse,
} from './converter.js';

describe('converter', () => {
    // ============================================================
    // SIZE_TO_ASPECT_RATIO 映射常量
    // ============================================================
    describe('SIZE_TO_ASPECT_RATIO 常量', () => {
        it('应包含 1024x1024 → 1:1 映射', () => {
            expect(SIZE_TO_ASPECT_RATIO['1024x1024']).toBe('1:1');
        });

        it('应包含 1024x1792 → 9:16 映射', () => {
            expect(SIZE_TO_ASPECT_RATIO['1024x1792']).toBe('9:16');
        });

        it('应包含 1792x1024 → 16:9 映射', () => {
            expect(SIZE_TO_ASPECT_RATIO['1792x1024']).toBe('16:9');
        });

        it('应包含 512x512 → 1:1 映射', () => {
            expect(SIZE_TO_ASPECT_RATIO['512x512']).toBe('1:1');
        });

        it('默认宽高比应为 1:1', () => {
            expect(DEFAULT_ASPECT_RATIO).toBe('1:1');
        });
    });

    // ============================================================
    // convertRequestToGemini — 请求转换测试
    // ============================================================
    describe('convertRequestToGemini', () => {
        it('应正确转换基本请求，含 contents 和 generationConfig', () => {
            const req: OpenAIImageRequest = {
                prompt: '一只可爱的猫咪',
            };
            const result = convertRequestToGemini(req);

            // 验证 contents 结构
            expect(result.contents).toHaveLength(1);
            expect(result.contents[0].role).toBe('user');
            expect(result.contents[0].parts).toHaveLength(1);
            expect(result.contents[0].parts[0].text).toBe('一只可爱的猫咪');

            // 验证 generationConfig 存在
            expect(result.generationConfig).toBeDefined();
        });

        it('generationConfig 必须包含 responseModalities: ["TEXT", "IMAGE"]', () => {
            const req: OpenAIImageRequest = { prompt: 'test' };
            const result = convertRequestToGemini(req);

            expect(result.generationConfig.responseModalities).toEqual(['TEXT', 'IMAGE']);
        });

        it('size=1024x1024 映射为 aspectRatio=1:1', () => {
            const req: OpenAIImageRequest = { prompt: 'test', size: '1024x1024' };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.aspectRatio).toBe('1:1');
        });

        it('size=1024x1792 映射为 aspectRatio=9:16', () => {
            const req: OpenAIImageRequest = { prompt: 'test', size: '1024x1792' };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.aspectRatio).toBe('9:16');
        });

        it('size=1792x1024 映射为 aspectRatio=16:9', () => {
            const req: OpenAIImageRequest = { prompt: 'test', size: '1792x1024' };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.aspectRatio).toBe('16:9');
        });

        it('size=512x512 映射为 aspectRatio=1:1', () => {
            const req: OpenAIImageRequest = { prompt: 'test', size: '512x512' };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.aspectRatio).toBe('1:1');
        });

        it('未知 size 值默认映射为 1:1', () => {
            const req: OpenAIImageRequest = { prompt: 'test', size: '999x999' };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.aspectRatio).toBe('1:1');
        });

        it('未指定 size（undefined）默认映射为 1:1', () => {
            const req: OpenAIImageRequest = { prompt: 'test' };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.aspectRatio).toBe('1:1');
        });

        it('应忽略 n 和 response_format 参数（不影响 Gemini 请求）', () => {
            const req: OpenAIImageRequest = {
                prompt: 'test',
                n: 2,
                response_format: 'b64_json',
                size: '1024x1024',
            };
            const result = convertRequestToGemini(req);

            // 仍然只有一个 contents 和正确的 generationConfig
            expect(result.contents).toHaveLength(1);
            expect(result.generationConfig.responseModalities).toEqual(['TEXT', 'IMAGE']);
            expect(result.generationConfig.aspectRatio).toBe('1:1');
        });

        // === 新增参数测试 ===

        it('aspect_ratio 直接传入应优先于 size 映射', () => {
            const req: OpenAIImageRequest = {
                prompt: 'test',
                size: '1024x1024',     // 映射为 1:1
                aspect_ratio: '16:9',   // 直接传入，应优先
            };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.aspectRatio).toBe('16:9');
        });

        it('无效的 aspect_ratio 应回退到 size 映射', () => {
            const req: OpenAIImageRequest = {
                prompt: 'test',
                size: '1024x1792',
                aspect_ratio: '99:99',  // 无效值
            };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.aspectRatio).toBe('9:16');
        });

        it('image_size=2K 应正确传递', () => {
            const req: OpenAIImageRequest = {
                prompt: 'test',
                image_size: '2K',
            };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.imageSize).toBe('2K');
        });

        it('image_size=4K 应正确传递', () => {
            const req: OpenAIImageRequest = {
                prompt: 'test',
                image_size: '4K',
            };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.imageSize).toBe('4K');
        });

        it('image_size 应自动修正大小写（2k → 2K）', () => {
            const req: OpenAIImageRequest = {
                prompt: 'test',
                image_size: '2k',
            };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.imageSize).toBe('2K');
        });

        it('无效 image_size 应使用默认值 1K', () => {
            const req: OpenAIImageRequest = {
                prompt: 'test',
                image_size: '8K',
            };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.imageSize).toBe('1K');
        });

        it('未指定 image_size 时不应在 generationConfig 中出现', () => {
            const req: OpenAIImageRequest = { prompt: 'test' };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.imageSize).toBeUndefined();
        });

        it('output_mime_type=image/jpeg 应正确传递', () => {
            const req: OpenAIImageRequest = {
                prompt: 'test',
                output_mime_type: 'image/jpeg',
            };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.outputMimeType).toBe('image/jpeg');
        });

        it('无效的 output_mime_type 不应传递', () => {
            const req: OpenAIImageRequest = {
                prompt: 'test',
                output_mime_type: 'text/plain',
            };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.outputMimeType).toBeUndefined();
        });

        it('person_generation=ALLOW_ADULT 应正确传递', () => {
            const req: OpenAIImageRequest = {
                prompt: 'test',
                person_generation: 'ALLOW_ADULT',
            };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.personGeneration).toBe('ALLOW_ADULT');
        });

        it('无效的 person_generation 不应传递', () => {
            const req: OpenAIImageRequest = {
                prompt: 'test',
                person_generation: 'INVALID',
            };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.personGeneration).toBeUndefined();
        });

        it('所有新参数组合应正确传递', () => {
            const req: OpenAIImageRequest = {
                prompt: 'test',
                aspect_ratio: '16:9',
                image_size: '4K',
                output_mime_type: 'image/webp',
                person_generation: 'ALLOW_ALL',
            };
            const result = convertRequestToGemini(req);
            expect(result.generationConfig.aspectRatio).toBe('16:9');
            expect(result.generationConfig.imageSize).toBe('4K');
            expect(result.generationConfig.outputMimeType).toBe('image/webp');
            expect(result.generationConfig.personGeneration).toBe('ALLOW_ALL');
        });

        it('新增 size 映射：768x1024 → 3:4', () => {
            const req: OpenAIImageRequest = { prompt: 'test', size: '768x1024' };
            expect(convertRequestToGemini(req).generationConfig.aspectRatio).toBe('3:4');
        });

        it('新增 size 映射：1024x683 → 3:2', () => {
            const req: OpenAIImageRequest = { prompt: 'test', size: '1024x683' };
            expect(convertRequestToGemini(req).generationConfig.aspectRatio).toBe('3:2');
        });
    });

    // ============================================================
    // convertResponseToOpenAI — 响应转换测试
    // ============================================================
    describe('convertResponseToOpenAI', () => {
        // 模拟 Date.now 以确保 created 时间戳一致
        let dateNowSpy: ReturnType<typeof vi.spyOn>;
        const fixedTimestamp = 1700000000000; // 固定时间戳

        beforeEach(() => {
            dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedTimestamp);
        });

        afterEach(() => {
            dateNowSpy.mockRestore();
        });

        it('正常情况 — text + image parts，应正确提取 b64_json 和 revised_prompt', () => {
            const geminiResponse: GeminiResponse = {
                candidates: [
                    {
                        content: {
                            parts: [
                                { text: '这是一只可爱的猫咪' },
                                {
                                    inlineData: {
                                        mimeType: 'image/png',
                                        data: 'base64EncodedImageData',
                                    },
                                },
                            ],
                        },
                    },
                ],
            };

            const result = convertResponseToOpenAI(geminiResponse);

            expect(result.created).toBe(Math.floor(fixedTimestamp / 1000));
            expect(result.data).toHaveLength(1);
            expect(result.data[0].b64_json).toBe('base64EncodedImageData');
            expect(result.data[0].revised_prompt).toBe('这是一只可爱的猫咪');
        });

        it('parts 顺序反转 — image 在 text 前，应仍正确提取', () => {
            const geminiResponse: GeminiResponse = {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    inlineData: {
                                        mimeType: 'image/png',
                                        data: 'imageFirst',
                                    },
                                },
                                { text: '文本在后面' },
                            ],
                        },
                    },
                ],
            };

            const result = convertResponseToOpenAI(geminiResponse);

            expect(result.data[0].b64_json).toBe('imageFirst');
            expect(result.data[0].revised_prompt).toBe('文本在后面');
        });

        it('无图片返回时应抛出明确错误', () => {
            const geminiResponse: GeminiResponse = {
                candidates: [
                    {
                        content: {
                            parts: [{ text: '没有图片' }],
                        },
                    },
                ],
            };

            expect(() => convertResponseToOpenAI(geminiResponse)).toThrow(
                'Gemini 响应中未找到图片数据（image/png）'
            );
        });

        it('仅图片无文本时 revised_prompt 应为空字符串', () => {
            const geminiResponse: GeminiResponse = {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    inlineData: {
                                        mimeType: 'image/png',
                                        data: 'onlyImage',
                                    },
                                },
                            ],
                        },
                    },
                ],
            };

            const result = convertResponseToOpenAI(geminiResponse);

            expect(result.data[0].b64_json).toBe('onlyImage');
            expect(result.data[0].revised_prompt).toBe('');
        });

        it('空 candidates 数组应抛出无图片错误', () => {
            const geminiResponse: GeminiResponse = {
                candidates: [],
            };

            expect(() => convertResponseToOpenAI(geminiResponse)).toThrow(
                'Gemini 响应中未找到图片数据（image/png）'
            );
        });

        it('非 image/png 的 inlineData 不应被识别为图片', () => {
            const geminiResponse: GeminiResponse = {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    inlineData: {
                                        mimeType: 'image/jpeg',
                                        data: 'jpegData',
                                    },
                                },
                            ],
                        },
                    },
                ],
            };

            // 只识别 image/png，其他 mimeType 应被忽略
            expect(() => convertResponseToOpenAI(geminiResponse)).toThrow(
                'Gemini 响应中未找到图片数据（image/png）'
            );
        });

        it('输出格式应完整匹配 OpenAI 规范', () => {
            const geminiResponse: GeminiResponse = {
                candidates: [
                    {
                        content: {
                            parts: [
                                { text: 'prompt' },
                                {
                                    inlineData: {
                                        mimeType: 'image/png',
                                        data: 'imgData',
                                    },
                                },
                            ],
                        },
                    },
                ],
            };

            const result = convertResponseToOpenAI(geminiResponse);

            // 验证顶层结构
            expect(result).toHaveProperty('created');
            expect(result).toHaveProperty('data');
            expect(typeof result.created).toBe('number');
            expect(Array.isArray(result.data)).toBe(true);

            // 验证 data 项结构
            expect(result.data[0]).toHaveProperty('b64_json');
            expect(result.data[0]).toHaveProperty('revised_prompt');
        });
    });
});
