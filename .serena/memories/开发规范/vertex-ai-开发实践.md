# Vertex AI 开发实践与文档参考规范

## 🚨 强制要求
**每次开发 Vertex AI 相关功能时，必须先从官方文档获取最新代码示例和最佳实践。**

### 必须参考的文档地址
1. **Gemini 3 Pro Image 模型页**：https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image?hl=zh-cn
2. **使用 Gemini 生成和修改图片**：https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/image-generation?hl=zh-cn
3. **REST API 参考**：https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest?hl=zh-cn

### 获取文档的方式
- 使用 `read_url_content` 工具直接抓取以上 URL
- 注意：Vertex AI 文档（cloud.google.com）与 GenAI SDK 文档（ai.google.dev）是**不同的项目**，不可混淆
- context7 MCP 的 `/googleapis/js-genai` 库 ID 是 SDK 级文档，可作为辅助参考

## 从官方文档提取的关键代码示例

### Node.js SDK 初始化（Vertex AI 模式）
```typescript
const { GoogleGenAI, Modality } = require('@google/genai');

const client = new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location: location, // 可使用 'global'
});
```

### Node.js 图片生成调用
```typescript
const response = await client.models.generateContentStream({
    model: 'gemini-3-pro-image-preview',
    contents: 'Generate an image...',
    config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
});
```

### REST API 完整请求（包含 imageConfig）
```json
{
    "contents": {
        "role": "USER",
        "parts": [{ "text": "prompt text" }]
    },
    "generationConfig": {
        "responseModalities": ["TEXT", "IMAGE"],
        "imageConfig": {
            "aspectRatio": "16:9"
        }
    }
}
```

### 响应处理
```typescript
for await (const chunk of response) {
    const text = chunk.text;
    const data = chunk.data;
    if (text) {
        console.debug(text);
    } else if (data) {
        // data 是 base64 编码的图片
        fs.writeFileSync(fileName, data);
    }
}
```

## 关键配置信息

### 模型信息
- 模型名称：`gemini-3-pro-image-preview`
- 输入：文本、图片
- 输出：文本和图片
- 输入 token 上限：65,536
- 输出 token 上限：32,768

### 支持的宽高比
`1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9`

### SDK 类型声明 vs REST API 差异（重要！）
- `@google/genai` SDK 的 TypeScript 类型定义中，`GenerateContentConfig` **不包含** `imageConfig` 属性
- 但 REST API 和 GenAI SDK 实际运行时支持 `config.imageConfig`
- **解决方案**：使用类型断言 `as any` 或构建 `Record<string, unknown>` 传入 imageConfig

### 安全过滤
- 模型可能拒绝生成不安全图片，返回文本回答 + FinishReason: STOP
- 安全过滤可能返回 FinishReason: IMAGE_SAFETY 或 IMAGE_PROHIBITED_CONTENT
- 代码中需要处理这些特殊 FinishReason

## 认证方式
- 使用服务账号凭证通过 `googleAuthOptions.credentials` 传入
- 或使用环境变量 `GOOGLE_GENAI_USE_VERTEXAI=True` + ADC (Application Default Credentials)
