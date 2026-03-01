/**
 * 应用配置模块
 * 从环境变量读取配置，并提供默认值
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径（ESM 兼容）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载 .env 文件（位于项目根目录）
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/** 应用全局配置 */
export const config = {
    /** 服务端口 */
    PORT: parseInt(process.env.PORT || '3000', 10),

    /** AES-256 加密密钥 */
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',

    /** Google Cloud 项目 ID */
    VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID || '',

    /** Vertex AI 区域 */
    VERTEX_LOCATION: process.env.VERTEX_LOCATION || 'us-central1',

    /** API 访问密钥 */
    API_KEY: process.env.API_KEY || '',

    /** 月度赠金上限（USD） */
    MONTHLY_BUDGET: parseFloat(process.env.MONTHLY_BUDGET || '100'),

    /** 运行环境 */
    NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

export default config;
