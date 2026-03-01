# Story 1.3: OpenAI 到 Gemini 格式转换层

Status: review

## Story

As a 系统,
I want 将 OpenAI 图片生成请求参数转换为 Gemini API 参数，并将 Gemini 响应转换回 OpenAI 格式,
so that 外部客户端无需感知底层模型差异。

## Acceptance Criteria

1. **AC1**: 请求转换函数接收 OpenAI 格式 `{ prompt, n, size, response_format }`，输出 Gemini 参数（含 `contents` 数组和 `generationConfig`）
2. **AC2**: `generationConfig` 必须包含 `responseModalities: ['TEXT', 'IMAGE']`
3. **AC3**: `size` 参数按映射表转换为 `aspectRatio`（1024x1024→1:1, 1024x1792→9:16, 1792x1024→16:9, 512x512→1:1）
4. **AC4**: 未指定或未知 size 默认映射为 `1:1`
5. **AC5**: 响应转换函数遍历 Gemini `parts[]` 数组，提取 `inlineData.mimeType` 为 `image/png` 的部分作为 `b64_json`
6. **AC6**: 提取 `text` 部分作为 `revised_prompt`
7. **AC7**: 输出 OpenAI 格式 `{ created, data: [{ b64_json, revised_prompt }] }`
8. **AC8**: 转换函数有完整的单元测试覆盖所有映射场景（含边界情况）

## Tasks / Subtasks

- [x] Task 1: 创建请求转换模块 (AC: #1, #2, #3, #4)
  - [x] 1.1: 创建 `backend/src/services/converter.ts`
  - [x] 1.2: 定义 `OpenAIImageRequest` 接口（prompt, n?, size?, response_format?）
  - [x] 1.3: 定义 `SIZE_TO_ASPECT_RATIO` 常量映射表
  - [x] 1.4: 实现 `convertRequestToGemini(req: OpenAIImageRequest)` 函数 — 构造 Gemini `contents` 和 `generationConfig`
  - [x] 1.5: 在 `generationConfig` 中强制设置 `responseModalities: ['TEXT', 'IMAGE']`

- [x] Task 2: 创建响应转换模块 (AC: #5, #6, #7)
  - [x] 2.1: 定义 `GeminiResponse` 接口（candidates[].content.parts[]）
  - [x] 2.2: 定义 `OpenAIImageResponse` 接口（created, data[]）
  - [x] 2.3: 实现 `convertResponseToOpenAI(geminiResponse)` 函数 — 遍历 parts[] 提取图片和文本
  - [x] 2.4: 处理 parts[] 顺序不固定的情况（text 和 image 可能以任意顺序出现）
  - [x] 2.5: 处理无图片返回的异常情况（抛出明确错误）

- [x] Task 3: 编写单元测试 (AC: #8)
  - [x] 3.1: 创建 `backend/src/services/converter.test.ts`
  - [x] 3.2: 测试所有 size → aspectRatio 映射（1024x1024, 1024x1792, 1792x1024, 512x512, 未知, undefined）
  - [x] 3.3: 测试请求转换输出结构正确性（contents, generationConfig）
  - [x] 3.4: 测试响应转换 — 正常情况（text + image parts）
  - [x] 3.5: 测试响应转换 — parts 顺序反转（image 在 text 前）
  - [x] 3.6: 测试响应转换 — 无图片返回时抛错
  - [x] 3.7: 测试响应转换 — 仅图片无文本时 revised_prompt 为空

## Dev Notes

### Architecture Requirements
- 文件位置: `backend/src/services/converter.ts`
- 测试位置: `backend/src/services/converter.test.ts`
- 此模块为纯函数模块，无副作用，易于测试

### Size-to-AspectRatio 映射表 (from architecture.md)
| OpenAI `size` | Vertex AI `aspectRatio` |
|---|---|
| `1024x1024` | `1:1` |
| `1024x1792` | `9:16` |
| `1792x1024` | `16:9` |
| `512x512` | `1:1` |
| 其他/未指定 | `1:1`（默认） |

### Vertex AI 支持的完整宽高比
`1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9`

### Gemini 请求结构参考
```typescript
{
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: {
    responseModalities: ['TEXT', 'IMAGE'],
    // aspectRatio 通过 imageConfig 传递
  }
}
```

### Gemini 响应结构参考 (from vertex-ai-api-reference.md)
```typescript
{
  candidates: [{
    content: {
      parts: [
        { text: "描述文字..." },           // 可能在任意位置
        { inlineData: { mimeType: "image/png", data: "<base64>" } }  // 可能在任意位置
      ]
    }
  }]
}
```

### Previous Story Intelligence
- Story 1.1 创建了项目结构
- Story 1.2 创建了数据库和类型定义
- 需要在 `backend/src/types/index.ts` 中添加 converter 相关类型

### References
- [Source: architecture.md#Cross-Cutting-Concerns] — 协议格式转换层说明
- [Source: architecture.md#Size-to-AspectRatio-Mapping] — 映射表
- [Source: vertex-ai-api-reference.md] — Gemini API 请求/响应格式
- [Source: architecture.md#Format-Patterns] — OpenAI 响应格式标准

## Dev Agent Record
### Agent Model Used
Gemini 2.5 Pro (Antigravity)
### Debug Log References
- 无调试问题，所有测试一次通过
### Completion Notes List
- ✅ 创建 `converter.ts`，包含完整的接口定义（OpenAIImageRequest, GeminiRequestBody, GeminiResponse, OpenAIImageResponse）
- ✅ 实现 `convertRequestToGemini()` — 构造 Gemini `contents` + `generationConfig`，强制 `responseModalities: ['TEXT', 'IMAGE']`
- ✅ 实现 `convertResponseToOpenAI()` — 遍历 parts[] 提取 image/png 和 text，处理任意顺序
- ✅ 实现 `SIZE_TO_ASPECT_RATIO` 映射常量和 `DEFAULT_ASPECT_RATIO`（兜底 "1:1"）
- ✅ 无图片返回时抛出明确中文错误信息
- ✅ 创建 21 个单元测试，100% 覆盖所有映射、结构、边界和异常场景
- ✅ 全量回归测试通过（53 个测试 / 4 个文件）
### File List
- `backend/src/services/converter.ts` (新增) — OpenAI↔Gemini 格式转换核心模块
- `backend/src/services/converter.test.ts` (新增) — 21 个单元测试
### Change Log
- 2026-02-28: 实现 OpenAI 到 Gemini 请求/响应转换层，含完整单元测试（21 tests, 0 failures）
