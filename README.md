# YAML Proxy — Vertex AI API 代理网关

将 OpenAI 兼容格式的 API 请求转换为 Google Vertex AI 调用的代理网关服务。

## 功能特性

- 🔄 OpenAI → Gemini 请求/响应格式自动转换
- 🔐 AES-256 加密存储服务账号凭证
- 📊 请求日志与成本统计
- 🌐 前端管理面板（React + TypeScript）

## 技术栈

- **后端**: TypeScript + Express + better-sqlite3
- **前端**: Vite + React + TypeScript
- **AI SDK**: @google/genai (Vertex AI)
- **项目结构**: Monorepo (npm workspaces)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填写必要配置
```

### 3. 启动开发服务器

```bash
npm run dev
```

- 后端: http://localhost:3000
- 前端: http://localhost:5173

### 4. 构建生产版本

```bash
npm run build
npm start
```

## Docker 部署

该项目支持通过 Docker 进行容器化部署。

### 1. 构建镜像

在项目根目录下执行：

```bash
docker build -t vertex-proxy .
```

### 2. 使用 Docker Compose 启动

编辑 `docker-compose.yml` 中的环境变量和卷路径，然后启动：

```bash
docker-compose up -d
```

> **注意：** 请确保将 `service-account.json` 放在 `backend/config/` 目录下，并正确映射到容器内。

## 项目结构

```
yaml/
├── backend/           # 后端服务
│   ├── src/
│   │   ├── config/    # 配置模块
│   │   ├── db/        # 数据库操作
│   │   ├── middleware/ # 中间件
│   │   ├── routes/    # 路由
│   │   ├── services/  # 业务逻辑
│   │   ├── types/     # 类型定义
│   │   └── index.ts   # 入口文件
│   └── package.json
├── frontend/          # 前端应用
│   ├── src/
│   │   ├── pages/     # 页面组件
│   │   ├── api/       # API 客户端
│   │   └── App.tsx    # 路由配置
│   └── package.json
├── .env.example       # 环境变量模板
└── package.json       # 根配置
```

## 许可证

MIT
