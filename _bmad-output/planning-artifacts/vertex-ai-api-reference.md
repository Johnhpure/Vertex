# Vertex AI Gemini 图片生成 API 参考文档

> 来源：Google Cloud Vertex AI 官方文档（2026-02-28 获取）
> 参考链接：https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image?hl=zh-cn

## ⚠️ 重要澄清

本项目基于 **Vertex AI**（Google Cloud 的企业级 AI 平台），**不是** Gemini Developer API。
Vertex AI 通过服务账号认证，使用 Google Cloud 项目和区域进行调用。

## 1. 目标模型

### `gemini-3-pro-image-preview`

- **发布阶段**：公开预览版（Public Preview）
- **发布日期**：2025 年 11 月 20 日
- **定位**：Gemini 3 Pro Image 旨在通过融入先进的推理功能，应对最具挑战性的图片生成任务。它是复杂的多轮图片生成和编辑的最佳模型，具有更高的准确性和更出色的图片质量。
- **输入**：文本、图片
- **输出**：文本和图片
- **输入 token 数量上限**：65,536
- **输出 token 数上限**：32,768
- **每个提示输入图片上限**：14 张
- **支持的宽高比**：`1:1`、`3:2`、`2:3`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9`、`21:9`
- **每个提示输出图片上限**：受限于 32,768 个输出 token
- **支持的输出 MIME 类型**：`image/png`、`image/jpeg`、`image/webp`、`image/heic`、`image/heif`

### 模型参数

| 参数 | 范围 | 默认值 |
|---|---|---|
| temperature | 0.0 - 2.0 | — |
| topP | 0.0 - 1.0 | 0.95 |
| topK | 64（固定） | 64 |
| candidateCount | 1 | 1 |

### 支持的功能

| 功能 | 状态 |
|---|---|
| Google 搜索建立依据 | ✅ 支持 |
| 系统指令 | ✅ 支持 |
| 统计 token 数量 | ✅ 支持 |
| 思考型（Thinking） | ✅ 支持 |
| 预配吞吐量 | ✅ 支持 |
| 动态共享配额 | ✅ 支持 |
| 批量预测 | ✅ 支持 |
| 代码执行 | ❌ 不支持 |
| 调优 | ❌ 不支持 |
| 函数调用 | ❌ 不支持 |
| Gemini Live API | ❌ 不支持 |
| 上下文缓存 | ❌ 不支持 |
| 聊天补全（OpenAI 兼容） | ❌ 不支持 |

### 模型可用性

- 区域：全球（Global）

## 2. SDK 选择：`@google/genai`

Google 提供了统一的 GenAI JavaScript SDK，同时支持 Gemini Developer API 和 **Vertex AI**。

```bash
npm install @google/genai
```

### Vertex AI 初始化（服务账号方式）

```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    vertexai: true,              // 必须设为 true，使用 Vertex AI
    project: 'your-project-id',  // Google Cloud 项目 ID
    location: 'us-central1',     // Vertex AI 区域
    // googleAuthOptions 用于传入服务账号认证
});
```

**GoogleGenAIOptions 关键属性：**

| 属性 | 类型 | 说明 |
|---|---|---|
| `vertexai` | boolean | 设为 `true` 使用 Vertex AI |
| `project` | string | Google Cloud 项目 ID |
| `location` | string | Vertex AI 区域 |
| `googleAuthOptions` | GoogleAuthOptions | 服务账号认证选项（仅 Node.js） |

### 环境变量方式

```bash
export GOOGLE_GENAI_USE_VERTEXAI=true
export GOOGLE_CLOUD_PROJECT='your-project-id'
export GOOGLE_CLOUD_LOCATION='us-central1'
```

## 3. 图片生成调用示例

### Node.js SDK 方式

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    vertexai: true,
    project: 'your-project-id',
    location: 'us-central1',
});

const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: '一只穿着宇航服的柴犬',
    config: {
        responseModalities: ['TEXT', 'IMAGE'],  // 必须包含 IMAGE
        imageConfig: {
            aspectRatio: '1:1',  // 支持的宽高比
        },
    },
});

// 解析响应
for (const part of response.candidates[0].content.parts) {
    if (part.text) {
        console.log(part.text);
    } else if (part.inlineData) {
        // base64 编码的图片数据
        const imageBase64 = part.inlineData.data;
        const mimeType = part.inlineData.mimeType;  // 如 image/png
    }
}
```

### REST API 方式

```
POST https://{LOCATION}-aiplatform.googleapis.com/v1beta/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/gemini-3-pro-image-preview:generateContent
```

请求体：
```json
{
  "contents": {
    "role": "USER",
    "parts": [{ "text": "图片描述" }]
  },
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {
      "aspectRatio": "1:1"
    }
  },
  "safetySettings": {
    "method": "PROBABILITY",
    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
  }
}
```

### 响应结构

```json
{
  "candidates": [{
    "content": {
      "parts": [
        { "text": "描述文字..." },
        {
          "inlineData": {
            "mimeType": "image/png",
            "data": "<base64_encoded_image>"
          }
        }
      ],
      "role": "model"
    },
    "finishReason": "STOP",
    "safetyRatings": [...]
  }]
}
```

## 4. 架构设计关键要点

1. **模型名称**：`gemini-3-pro-image-preview`（不是 gemini-2.5-flash-image，也不是 gemini-3.1-flash）
2. **平台**：Vertex AI（通过服务账号认证），不是 Gemini Developer API
3. **必须配置 `responseModalities: ['TEXT', 'IMAGE']`** 才能生成图片
4. **图片在响应的 `parts[].inlineData` 中**，以 base64 编码返回
5. **OpenAI 兼容的聊天补全接口在此模型上不支持**，需要自行实现格式转换层
6. **SDK**：使用 `@google/genai` 包的 `vertexai: true` 模式
7. **宽高比映射**：将 OpenAI 的 `size` 参数（如 `1024x1024`）映射为 Vertex AI 的 `aspectRatio`（如 `1:1`）
