---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
inputDocuments: [product-brief-yaml-2026-02-28.md]
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: api_backend + web_app
  domain: general
  complexity: low
  projectContext: greenfield
---

# Product Requirements Document - Vertex AI API 网关

**Author:** 邦哥
**Date:** 2026-02-28

## Executive Summary

Vertex AI API 网关是一个轻量级的内部 API 代理服务，旨在将 Google Ultra 订阅每月赠送的 100 美金 Vertex AI 赠金转化为团队可用的图片生成能力。该服务通过 Google 服务账号直连 Vertex AI 的 Gemini 3 Pro Image 模型（gemini-3-pro-image-preview），提供 OpenAI 兼容格式的 `/v1/images/generations` API 端点，使团队现有的 Skill 和 Coding 工具无需修改即可切换接入。

目标用户为 5 人以内的内部团队（运营 + 开发），部署在局域网内。前端管理面板提供服务账号上传、API 调用日志查看和费用统计功能。核心目标：API 成功率 ≥ 95%，月度赠金利用率 ≥ 90% 且零超支。

### What Makes This Special

- **赠金驱动模式**：不是购买新服务，而是激活已有的 Google Ultra 赠金，将浪费转化为生产力
- **零中间商**：直连 Vertex AI，跳过第三方 API 中转站，消除不稳定和加价问题
- **极致轻量**：专注图片生成单一场景，拒绝功能臃肿，一个「薄转换层」解决核心问题
- **即插即用**：OpenAI 兼容格式，现有 Skill 零修改成本切换

## Project Classification

| 维度 | 值 |
|---|---|
| **Project Type** | API Backend + Web App（后端 API 网关 + 前端管理面板） |
| **Domain** | General / Internal Tooling（内部工具） |
| **Complexity** | Low（低复杂度：小团队、局域网、单模型、无合规需求） |
| **Project Context** | Greenfield（全新项目，从零构建） |

## Success Criteria

### User Success

- **运营人员**：通过 Skill 发送 prompt 后，稳定获得生成的图片，成功率 ≥ 95%，无需感知底层 API 切换
- **开发人员**：OpenAI 兼容接口即插即用，现有 Skill 零修改切换完成；问题发生时通过日志 3 分钟内定位原因
- **成功标志**：团队不再使用第三方 API 中转站，全部流量走本地网关

### Business Success

- **3 个月目标**：
  - 团队全员完成迁移，中转站费用降为 0
  - 月度赠金利用率 ≥ 90%（$90+），零超支
- **持续目标**：
  - 每月赠金 100% 有效利用，不浪费
  - 零额外 API 费用支出

### Technical Success

- API 端到端响应时间 < 30s（含 Vertex AI 图片生成时间）
- 服务可用性 ≥ 99%（仅计算网关本身，不含 Vertex AI 上游故障）
- 错误重试机制有效降低瞬时失败率
- 前端管理面板正常渲染，日志查询响应 < 2s

### Measurable Outcomes

| 指标 | MVP 目标 | 衡量方式 |
|---|---|---|
| API 成功率 | ≥ 95% | 成功请求 / 总请求 |
| 平均响应时间 | < 30s | 端到端计时 |
| 月度赠金消耗 | $90 - $100 | Vertex AI 用量日志 |
| 中转站依赖 | 0 | 团队确认 |
| 前端日志查询速度 | < 2s | 页面加载计时 |

## Product Scope

### MVP - Minimum Viable Product

1. `POST /v1/images/generations` — OpenAI 兼容图片生成端点
2. Vertex AI 直连（Gemini 3 Pro Image，含错误重试）
3. API Key 认证
4. `GET /health` 健康检查
5. 前端：服务账号 JSON 上传/管理
6. 前端：API 调用日志（按时间筛选）
7. 前端：费用统计 / 用量报表

### Growth Features (Post-MVP)

- 费用统计仪表盘增强（图表化、趋势分析）
- 多模型支持（Imagen、其他 Gemini 变体）
- Docker 容器化一键部署

### Vision (Future)

- 图片历史记录、搜索和收藏
- 支持更多 AI 能力（文本生成、音频等）通过同一网关暴露
- 多团队/多项目隔离使用

## User Journeys

### Journey 1: 运营小李 — 日常图片生成（核心路径）

**小李**是团队运营，每天需要为社交媒体和营销素材生成配图。

**开场**：小李正在用 Skill 工具准备一篇推文的配图。以前用中转站 API，经常超时或报错，她已经习惯了“试三次才能成功一次”的节奏。

**行动**：这次，开发同事通知她 API 已切换到本地网关。小李在 Skill 中什么都没改，只是端点地址换了。她输入 prompt：“一只穿着宇航服的柴犬，在月球上喝咖啡，皮克斯风格”，点击生成。

**高潮**：不到 20 秒，图片就生成了。质量很好，而且是一次成功——没有超时，没有重试。

**结局**：小李的新常态是“一次成功”。她再也不担心 API 报错打断工作节奏。月底她看了前端面板的用量统计，发现团队这个月用了 $87 的赠金，全部免费。

### Journey 2: 运营小李 — 生成失败的异常场景

**开场**：某天下午，小李像往常一样通过 Skill 生成图片，但这次返回了错误。

**行动**：她打开前端管理面板的日志页面，找到刚才的请求记录。日志显示状态为“Failed”，错误信息是“Vertex AI quota exceeded”。

**高潮**：小李在费用统计页面看到本月赠金已消耗 $98，接近 $100 上限。她立刻在群里通知大家：本月额度即将用完，控制使用量。

**结局**：团队根据前端的费用监控，合理安排了剩余额度的使用，避免了超支。

### Journey 3: 开发老王 — 系统部署与配置（管理路径）

**老王**是团队开发，负责搭建和维护这个 API 网关。

**开场**：老王拿到项目代码，在局域网内的服务器上用 `npm install && npm start` 启动了后端和前端服务。

**行动**：他打开浏览器访问前端管理面板，点击“上传服务账号”，选择从 Google Cloud Console 下载的服务账号 JSON 文件，上传成功。面板显示“服务账号已配置，状态：正常”。然后他在配置中设置好 API Key。

**高潮**：老王用 curl 测试了 API 端点：`curl -X POST http://localhost:3000/v1/images/generations -H "Authorization: Bearer sk-xxx" -d '{"prompt":"test","model":"gemini-3-pro-image-preview"}'`，收到了成功的图片响应。

**结局**：老王把 Skill 中的 API 端点从中转站地址改为本地地址，通知团队切换完成。整个过程不到 30 分钟。

### Journey 4: 开发老王 — 问题排查（运维路径）

**开场**：运营反馈说最近图片生成变慢了。

**行动**：老王打开前端日志页面，按时间范围筛选最近 3 天的请求。发现近两天的平均响应时间从 15s 涨到了 40s，且部分请求触发了重试。

**高潮**：通过日志中的错误详情，老王发现 Vertex AI 返回了 429（Rate Limit）错误。日志清晰地展示了每次请求的时间、状态码和重试次数，3 分钟内他就定位了问题——团队最近用量激增，触发了配额限制。

**结局**：老王在群里通知团队合理分配使用频率，并计划下个版本添加请求队列。

### Journey Requirements Summary

| 旅程 | 揭示的能力需求 |
|---|---|
| 小李-日常生成 | OpenAI 兼容 API、快速响应、高成功率 |
| 小李-异常场景 | 日志查看、费用统计、错误信息展示 |
| 老王-系统部署 | 服务账号上传、健康检查、API Key 配置 |
| 老王-问题排查 | 日志筛选、响应时间统计、错误详情、重试记录 |

## API Backend + Web App 技术规格

### 项目类型概述

本项目是一个前后端分离的应用，后端提供 RESTful API 服务，前端提供管理面板。后端同时作为 API 网关，接收 OpenAI 格式请求并转发到 Google Vertex AI。

### API 端点规格

#### 核心 API 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/v1/images/generations` | OpenAI 兼容的图片生成端点 |
| `GET` | `/health` | 服务健康检查 |
| `GET` | `/v1/models` | 返回可用模型列表（兼容 OpenAI） |

#### 管理 API 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/service-account` | 上传服务账号 JSON 文件 |
| `GET` | `/api/service-account/status` | 获取服务账号配置状态 |
| `DELETE` | `/api/service-account` | 删除服务账号配置 |
| `GET` | `/api/logs` | 获取 API 调用日志（支持分页和时间筛选） |
| `GET` | `/api/stats` | 获取费用统计和用量报表 |
| `GET` | `/api/config` | 获取当前配置（API Key 等） |
| `PUT` | `/api/config` | 更新配置 |

### 认证方式

- **图片生成 API**：Bearer Token 认证（`Authorization: Bearer <API_KEY>`），兼容 OpenAI 标准
- **管理 API**：同一 API Key 认证（局域网内部使用，简化认证）
- **Vertex AI 上游认证**：Google 服务账号 JSON 文件（OAuth2 + JWT）

### 数据格式

**请求格式（OpenAI 兼容）：**
```json
{
  "model": "gemini-3-pro-image-preview",
  "prompt": "一只穿着宇航服的柴犬",
  "n": 1,
  "size": "1024x1024",
  "response_format": "b64_json"
}
```

**响应格式（OpenAI 兼容）：**
```json
{
  "created": 1709136000,
  "data": [
    {
      "b64_json": "<base64_encoded_image>",
      "revised_prompt": "一只穿着宇航服的柴犬..."
    }
  ]
}
```

### 实现考虑

- **参数映射**：将 OpenAI 格式的 `size`、`n`、`response_format` 映射为 Gemini API 的对应参数
- **错误重试**：Vertex AI 返回 429/500/503 时自动重试，最多 2 次，指数退避
- **流式响应**：MVP 不支持，等待图片生成完成后一次性返回
- **技术栈**：Node.js + Express（后端），React/Vue（前端），SQLite（日志存储）

## Functional Requirements

### 图片生成能力

- FR1: 用户可以通过 OpenAI 兼容的 API 端点发送图片生成请求
- FR2: 系统可以将 OpenAI 格式的请求参数转换为 Gemini API 参数
- FR3: 系统可以通过服务账号认证调用 Vertex AI 的 Gemini 3 Pro Image 模型
- FR4: 系统可以将 Gemini 生成的图片转换为 OpenAI 兼容的响应格式返回
- FR5: 系统可以在 Vertex AI 返回错误时自动重试（最多 2 次）

### 认证与安全

- FR6: 用户可以使用 API Key 认证访问图片生成 API
- FR7: 系统可以拒绝未携带有效 API Key 的请求
- FR8: 管理员可以配置和更新 API Key

### 服务账号管理

- FR9: 管理员可以通过前端页面上传 Google 服务账号 JSON 文件
- FR10: 系统可以验证上传的服务账号文件格式是否正确
- FR11: 管理员可以查看当前服务账号的配置状态（已配置/未配置/异常）
- FR12: 管理员可以删除已配置的服务账号并重新上传

### API 调用日志

- FR13: 系统可以记录每次 API 调用的详细信息（时间、prompt、状态、耗时、错误信息）
- FR14: 用户可以通过前端页面查看 API 调用日志列表
- FR15: 用户可以按时间范围筛选日志记录
- FR16: 用户可以按状态（成功/失败）筛选日志记录
- FR17: 日志可以展示重试次数和每次重试的状态

### 费用统计与用量报表

- FR18: 系统可以估算每次 API 调用的费用（基于 Gemini 定价）
- FR19: 用户可以查看月度调用次数和总费用
- FR20: 用户可以查看月度 API 成功率
- FR21: 系统可以展示赠金消耗进度（已用/剩余/上限）
- FR22: 用户可以设置月度赠金上限（默认 $100）

### 服务监控

- FR23: 系统可以通过健康检查端点报告服务状态
- FR24: 健康检查可以验证 Vertex AI 连接状态
- FR25: 系统可以返回可用模型列表（OpenAI 兼容格式）

## Non-Functional Requirements

### Performance

- NFR1: 图片生成 API 端到端响应时间 < 30s（含 Vertex AI 生成时间）
- NFR2: 管理 API 响应时间 < 500ms
- NFR3: 前端页面加载时间 < 2s
- NFR4: 日志查询响应时间 < 2s（万级记录）

### Security

- NFR5: 服务账号 JSON 文件存储时进行加密
- NFR6: API Key 不以明文形式存储或记录在日志中
- NFR7: Prompt 内容在日志中可以截断展示（保护隐私）
- NFR8: 仅局域网内可访问，不暴露到公网

### Reliability

- NFR9: 网关服务可用性 ≥ 99%（仅计算网关本身）
- NFR10: 错误重试机制使用指数退避策略（避免雪崩）
- NFR11: 服务崩溃后可通过简单命令恢复

### Integration

- NFR12: 完全兼容 OpenAI Images API v1 请求/响应格式
- NFR13: 支持 Google Cloud 服务账号 JSON 标准格式
- NFR14: 支持 Vertex AI Gemini API 的认证和调用协议

## 技术约束与假设

### 技术约束

- 部署环境为局域网内的 Windows/Linux/macOS 服务器
- 需要稳定的互联网连接（用于访问 Vertex AI）
- Node.js 运行环境（≥ 18.x）
- 仅支持单个服务账号（MVP）

### 假设

- Google Ultra 订阅保持有效，每月赠金持续发放
- Vertex AI Gemini 3 Pro Image 模型 API 保持稳定可用
- 团队成员具备基本的 API 调用知识
- 局域网环境足够安全，不需要复杂的访问控制

### 依赖

- Google Cloud Vertex AI API
- Google 服务账号（具备 Vertex AI 访问权限）
- Node.js 生态系统（npm 包管理）
