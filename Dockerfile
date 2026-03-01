# 使用 Node.js 20 镜像作为构建阶段
FROM node:20-slim AS builder

# 设置工作目录
WORKDIR /app

# 复制 root 级别的 package 文件
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# 安装所有依赖
RUN npm install

# 复制源代码
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# 构建前端
WORKDIR /app/frontend
RUN npm run build

# 构建后端
WORKDIR /app/backend
RUN npm run build

# 使用 Node.js 20 镜像作为运行阶段
FROM node:20-slim

# 安装运行 better-sqlite3 所需的系统库（如果需要重新编译）
# 并设置生产环境
ENV NODE_ENV=production
WORKDIR /app

# 复制 package.json
COPY package*.json ./
COPY backend/package*.json ./backend/

# 只安装后端生产环境依赖
WORKDIR /app/backend
RUN npm install --omit=dev

# 复制构建产物
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/frontend/dist ../frontend/dist

# 创建数据目录用于持久化 SQLite 数据库
RUN mkdir -p /app/backend/data
VOLUME /app/backend/data

# 暴露后端端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
