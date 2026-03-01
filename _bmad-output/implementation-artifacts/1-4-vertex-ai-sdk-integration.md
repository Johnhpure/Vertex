# Story 1.4: Vertex AI SDK 集成与图片生成调用

Status: review

## Story

As a 用户,
I want 发送一个 prompt 到 API 端点就能收到 AI 生成的图片,
so that 我可以通过 OpenAI 兼容的接口获取 Vertex AI 生成的图片。

## Acceptance Criteria

1. **AC1**: `POST /v1/images/generations` 端点可接收 OpenAI 格式请求 ✅
2. **AC2**: 系统使用 `@google/genai` SDK（vertexai: true 模式）调用 `gemini-3-pro-image-preview` 模型 ✅
3. **AC3**: 返回 HTTP 200，body 为 OpenAI 格式 `{ created, data: [{ b64_json, revised_prompt }] }` ✅
4. **AC4**: `b64_json` 包含有效的 base64 编码 PNG 图片数据 ✅
5. **AC5**: 服务账号未配置时返回 HTTP 500 `{ error: { type: "server_error", message: "Service account not configured" } }` ✅
6. **AC6**: 请求参数验证（prompt 必填，缺少时返回 400） ✅

## Tasks / Subtasks

- [x] Task 1: 创建 Vertex AI 服务模块 (AC: #2)
  - [x] 1.1: 创建 `backend/src/services/vertex-ai.ts`
  - [x] 1.2: 实现 `initVertexAI(serviceAccountJson: object)` — 使用 `@google/genai` SDK 的 `GoogleGenAI` 构造函数，传入 `vertexai: true` 和 `googleAuthOptions`
  - [x] 1.3: 实现 `generateImage(prompt, aspectRatio)` — 调用 `models.generateContent()` 方法
  - [x] 1.4: 处理 SDK 初始化失败（无效凭证）的异常

- [x] Task 2: 创建图片生成路由 (AC: #1, #3, #4, #5, #6)
  - [x] 2.1: 创建 `backend/src/routes/images.ts`
  - [x] 2.2: 实现 `POST /v1/images/generations` 路由处理函数
  - [x] 2.3: 验证请求参数（prompt 必填）
  - [x] 2.4: 从 config-dao 读取服务账号（解密逻辑在 Story 2.1 实现，此处先用明文存储占位）
  - [x] 2.5: 调用 converter 转换请求 → 调用 vertex-ai 服务 → 调用 converter 转换响应
  - [x] 2.6: 服务账号未配置时返回 500 错误
  - [x] 2.7: 处理 Vertex AI SDK 异常，返回 OpenAI 格式错误

- [x] Task 3: 集成路由到 Express 应用 (AC: #1)
  - [x] 3.1: 修改 `backend/src/index.ts` — 注册 images 路由

- [x] Task 4: 编写测试 (AC: 全部)
  - [x] 4.1: 创建 `backend/src/services/vertex-ai.test.ts` — mock SDK 调用，测试正常/异常场景
  - [x] 4.2: 创建 `backend/src/routes/images.test.ts` — 集成测试（mock vertex-ai service）

## Dev Notes

### @google/genai SDK 使用方式 (from Vertex AI 官方文档)

参考文档: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/image-generation?hl=zh-cn

```typescript
import { GoogleGenAI } from '@google/genai';

// 使用服务账号初始化（Vertex AI 模式）
const ai = new GoogleGenAI({
  vertexai: true,
  project: projectId,
  location: location,
  googleAuthOptions: {
    credentials: serviceAccountJson  // 解密后的 JSON 对象
  }
});

// 生成图片
const response = await ai.models.generateContent({
  model: 'gemini-3-pro-image-preview',
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
    // imageConfig 在 SDK TypeScript 类型中未定义，但 REST API 支持
    // 使用类型断言绕过
    imageConfig: { aspectRatio: '16:9' },
  }
});
```

### SDK 类型声明 vs REST API 差异（重要）
- `@google/genai` SDK 的 TypeScript 类型 `GenerateContentConfig` 不包含 `imageConfig` 属性
- 但 REST API 和 GenAI SDK 实际运行时支持 `config.imageConfig`
- 解决方案：使用 `Record<string, unknown>` + 类型断言传入 imageConfig

### 错误处理
- Vertex AI 错误码映射在 Story 1.5 实现重试逻辑
- 本 Story 只做基本异常捕获和格式化返回

### Previous Story Intelligence
- Story 1.2: 数据库和 config-dao 已可用
- Story 1.3: converter 模块已可用
- 服务账号加密存储在 Story 2.1 实现，本 Story 先从 config-dao 读取明文或预加密值

### References
- [Source: Vertex AI 官方文档] — https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/image-generation?hl=zh-cn
- [Source: vertex-ai-api-reference.md] — SDK 调用方式、模型参数、响应格式
- [Source: architecture.md#API-&-Communication-Patterns] — 响应格式和错误映射
- [Source: architecture.md#Project-Structure] — routes/images.ts 位置

## Dev Agent Record
### Agent Model Used
Gemini 2.5 Pro (Antigravity)
### Debug Log References
- Mock 策略修复：使用 class 语法 mock `GoogleGenAI` 替代 `vi.fn().mockImplementation()`，解决 "is not a constructor" 错误
- SDK 类型适配：`imageConfig` 不在 TypeScript 类型定义中，使用 `Record<string, unknown>` + 类型断言绕过
### Completion Notes List
- 全部 4 个 Task 已完成
- 全部 6 个 AC 已满足
- 72 个测试全部通过（含 8 个 vertex-ai 单元测试 + 9 个 images 路由集成测试）
- TypeScript 编译零错误
### File List
- `backend/src/services/vertex-ai.ts` — Vertex AI 服务模块（SDK 初始化 + 图片生成）
- `backend/src/services/vertex-ai.test.ts` — 服务模块单元测试（8 个测试用例）
- `backend/src/routes/images.ts` — OpenAI 兼容图片生成路由
- `backend/src/routes/images.test.ts` — 路由集成测试（9 个测试用例）
- `backend/src/index.ts` — 注册 images 路由（修改）
### Change Log
- 2026-02-28: 完成所有 4 个 Task，全部测试通过
