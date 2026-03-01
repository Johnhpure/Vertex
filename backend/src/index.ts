/**
 * Express 应用入口文件
 * 初始化服务器，配置中间件，启动监听
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { initDatabase, closeDatabase } from './db/database.js';
import { cleanupOldLogs } from './db/logs-dao.js';
import { getConfig, setConfig } from './db/config-dao.js';
import { encrypt } from './services/encryption.js';
import { authMiddleware } from './middleware/auth.js';
import imagesRouter from './routes/images.js';
import adminRouter from './routes/admin.js';
import logsRouter from './routes/logs.js';
import statsRouter from './routes/stats.js';
import healthRouter from './routes/health.js';
import tasksRouter from './routes/tasks.js';
import { errorHandler } from './middleware/error-handler.js';

// 获取当前文件的目录路径（ESM 兼容）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== 数据库初始化 ==========

// 初始化 SQLite 数据库（创建目录、建表、建索引、WAL 模式）
initDatabase();

// 启动时清理 90 天前的过期日志
const cleanedCount = cleanupOldLogs(90);
console.log(`[DB] 数据库初始化完成，清理了 ${cleanedCount} 条过期日志`);

// ========== API Key 初始化 ==========

// 若 config 表无 api_key 且环境变量 API_KEY 存在，加密后存入
const existingApiKey = getConfig('api_key');
if (!existingApiKey && config.API_KEY) {
    const encryptedKey = encrypt(config.API_KEY);
    setConfig('api_key', encryptedKey);
    console.log('[Auth] API Key 已加密并存入 config 表');
} else if (existingApiKey) {
    console.log('[Auth] API Key 已存在于 config 表中');
} else {
    console.warn('[Auth] 警告：未设置 API_KEY 环境变量，API 端点无认证保护');
}

// 创建 Express 应用实例
const app = express();

// ========== 中间件配置 ==========

// 启用 CORS 支持
app.use(cors());

// JSON 请求体解析（限制 50MB，支持图片 base64 编码）
app.use(express.json({ limit: '50mb' }));

// ========== 静态文件托管 ==========

// 生产模式：托管前端构建产物
if (config.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, '../../frontend/dist')));
}

// ========== 路由 ==========

// 健康检查和模型列表（公开端点，不需要认证，必须在 authMiddleware 之前注册）
app.use(healthRouter);

// 需要认证的 API 路由注册 auth 中间件
// 仅 /v1（OpenAI 兼容对外接口）需要 Bearer Token 认证
// /api（管理面板内部接口）在局域网内使用，无需认证
app.use('/v1', authMiddleware);

// 图片生成 API 路由（OpenAI 兼容）
app.use(imagesRouter);

// 管理 API 路由（服务账号、配置管理）
app.use(adminRouter);

// 日志查询 API 路由
app.use(logsRouter);

// 统计 API 路由
app.use(statsRouter);

// 任务 API 路由（图片生成任务查询和下载）
app.use(tasksRouter);

// ========== 错误处理 ==========

// 全局错误处理中间件（VertexAIError 映射 + OpenAI 格式错误响应）
app.use(errorHandler);

// ========== 前端路由回退 ==========

// 生产模式：所有未匹配路由返回前端 index.html（SPA 路由支持）
if (config.NODE_ENV === 'production') {
    app.get('*', (_req, res) => {
        res.sendFile(path.resolve(__dirname, '../../frontend/dist/index.html'));
    });
}

// ========== 进程退出钩子 ==========

// 优雅关闭数据库连接
const gracefulShutdown = () => {
    console.log('[Server] 正在关闭数据库连接...');
    closeDatabase();
    process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// ========== 启动服务器 ==========

app.listen(config.PORT, () => {
    console.log(`[Server] 服务已启动，端口: ${config.PORT}`);
});

export default app;

