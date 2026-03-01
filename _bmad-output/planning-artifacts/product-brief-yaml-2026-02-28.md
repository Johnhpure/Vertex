---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
date: 2026-02-28
author: 邦哥
---

# Product Brief: Vertex AI API 网关

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

Vertex AI API 网关是一个轻量级的内部 API 服务，旨在帮助团队充分利用 Google Ultra 订阅每月赠送的 100 美金 Vertex AI 赠金。该网关直接对接 Google Vertex AI 的 Gemini 3 Pro Image 模型（gemini-3-pro-image-preview），利用其原生图片生成能力，提供 OpenAI 兼容格式的 API 接口，使团队现有的 Skill 和 Coding 工具能够无缝调用。项目采用前后端分离架构，后端提供稳定的 API 代理服务，前端提供日志查看和服务账号管理界面。

---

## Core Vision

### Problem Statement

团队在使用 AI 图片生成能力时，依赖第三方 API 中转站，存在以下核心问题：
- **不稳定**：中转站服务质量无法保证，影响团队工作效率
- **费用高**：中转站加价转售，图片生成成本远高于直连价格
- **资源浪费**：Google Ultra 订阅每月赠送的 100 美金赠金未被充分利用

### Problem Impact

- 团队在 Skill 开发和 Coding 工具中调用图片生成时，频繁遭遇失败或超时
- 每月浪费 Google 赠金，同时额外支付中转站费用，造成双重成本
- 缺乏对图片生成请求的可视化管理和日志追踪

### Why Existing Solutions Fall Short

- **第三方 API 中转站**：不稳定、费用高、数据经过第三方存在安全隐患
- **现成 API 网关方案（如 one-api、new-api）**：功能臃肿、配置复杂，不匹配团队轻量级需求，且可能存在安全和维护风险
- **手动调用 Vertex AI Console**：无法被 Skill 和自动化工具程序化调用

### Proposed Solution

开发一个**自研轻量级 API 网关**，核心特性：
1. **直连 Vertex AI**：使用 Google 服务账号直接调用 Gemini 3 Pro Image（gemini-3-pro-image-preview）的原生图片生成能力，跳过中转站
2. **OpenAI 兼容接口**：提供 `/v1/images/generations` 标准端点，Skill 无需修改即可对接
3. **前端管理面板**：提供 API 调用日志查看、服务账号 JSON 文件上传管理界面
4. **局域网部署**：仅在内网运行，安全可控
5. **高成功率**：减少中间环节，直连 Google 提高生成稳定性

### Key Differentiators

- **零中转成本**：直连 Vertex AI，仅消耗 Google 赠金，无额外费用
- **自主可控**：代码完全自研，无第三方依赖风险
- **极致轻量**：专注图片生成这一个场景，没有多余功能
- **即插即用**：OpenAI 兼容格式，现有 Skill 零修改即可切换
- **Gemini 原生能力**：利用 Gemini 3 Pro Image 的原生图片生成，而非独立的图片生成模型，支持更灵活的 prompt 理解

## Target Users

### Primary Users

#### 运营人员（核心用户）
- **角色**：团队运营，日常工作中最频繁使用图片生成能力
- **使用场景**：通过 Skill 工具调用 API 生成营销素材、社交媒体配图、产品展示图等
- **核心需求**：快速、稳定地生成高质量图片，不关心底层技术实现
- **痛点**：之前通过 API 中转站调用，频繁失败，影响工作效率
- **成功标准**：发送 prompt → 稳定返回图片，成功率 > 95%

#### 开发人员
- **角色**：团队开发者，负责 Skill 开发和工具链维护
- **使用场景**：
  - 在 Coding 工具和 AI Agent 中集成图片生成能力
  - 管理 API 网关配置（上传服务账号、查看日志、排查问题）
- **核心需求**：OpenAI 兼容的标准 API 接口，方便对接现有 Skill
- **痛点**：中转站不稳定导致 Skill 报错，需要频繁排查是 Skill 还是 API 的问题
- **成功标准**：API 接口标准化，日志清晰可查，问题快速定位

### Secondary Users

无独立的次要用户群体。团队规模在 5 人以内，所有成员既是 API 调用方，也是管理方。

### User Journey

1. **部署上线**：开发人员在局域网内部署 API 网关服务
2. **配置服务账号**：通过前端页面上传 Google Vertex AI 的服务账号 JSON 文件
3. **对接 Skill**：在现有 Skill 中将 API 端点从中转站切换为本地网关地址
4. **日常使用**：运营人员通过 Skill 调用图片生成，体验与之前一致，但更稳定
5. **运维监控**：通过前端日志页面查看 API 调用记录，监控赠金消耗和成功率

## Success Metrics

### User Success Metrics

| 指标 | 目标 | 衡量方式 |
|---|---|---|
| **API 成功率** | ≥ 95% | 成功请求数 / 总请求数 |
| **响应时间** | 图片生成 < 30s | 从请求到返回图片的端到端时间 |
| **服务可用性** | 99%+ | 网关服务正常运行时间占比 |

### Business Objectives

| 目标 | 描述 |
|---|---|
| **赠金利用率最大化** | 每月 100 美金 Google 赠金消耗率 ≥ 90%，充分利用免费额度 |
| **零超支** | 严格控制在赠金范围内，不产生额外费用 |
| **中转站费用归零** | 完全替代第三方中转站，每月节省中转站费用 |

### Key Performance Indicators

| KPI | 目标值 | 频率 |
|---|---|---|
| 图片生成成功率 | ≥ 95% | 实时监控 |
| 月度赠金消耗 | $90 - $100（不超支） | 月度 |
| 月度 API 调用次数 | 持续增长（团队充分使用） | 月度 |
| 平均响应时间 | < 30s | 日均 |
| 中转站依赖 | 0（完全迁移） | 一次性 |

## MVP Scope

### Core Features

#### 后端 API 服务
1. **OpenAI 兼容图片生成 API**
   - `POST /v1/images/generations` 端点
   - 接收 OpenAI 格式请求（prompt、size、n 等参数）
   - 返回 base64 或 url 格式的生成图片
   - 请求参数映射：将 OpenAI 格式参数映射到 Gemini API 对应参数

2. **Vertex AI 直连**
   - 使用 Google 服务账号认证，直接调用 `gemini-3-pro-image-preview`
   - 错误重试机制：Vertex AI 返回错误时自动重试（最多 2 次）

3. **API Key 认证**
   - 简单的 API Key 验证，防止未授权访问

4. **健康检查**
   - `GET /health` 端点，返回服务运行状态

#### 前端管理面板
5. **服务账号管理**
   - 上传 Google Vertex AI 服务账号 JSON 文件
   - 显示当前已配置的服务账号状态

6. **API 调用日志**
   - 展示每次 API 请求的时间、prompt 摘要、状态（成功/失败）、耗时、错误信息
   - 支持按时间范围筛选

7. **费用统计 / 用量报表**
   - 展示月度 API 调用次数、成功率
   - 估算赠金消耗情况，帮助团队监控是否接近 100 美金上限

### Out of Scope for MVP

- 多模型支持（仅支持 gemini-3-pro-image-preview）
- 用户系统 / 多租户管理
- 图片缓存
- 速率限制
- Docker 容器化部署
- 图片历史记录和搜索

### MVP Success Criteria

- API 成功率 ≥ 95%
- 团队全员完成从中转站到本地网关的迁移
- 月度赠金消耗 ≥ 90%，且不超支
- 前端日志和报表可正常查看

### Future Vision

- **V2**：费用统计仪表盘增强（图表化、趋势分析）
- **V2**：多模型支持（Imagen、其他 Gemini 变体）
- **V3**：图片历史记录、搜索和收藏
- **V3**：Docker 一键部署
- **长期**：支持更多 AI 能力（文本生成、音频等）通过同一网关暴露


