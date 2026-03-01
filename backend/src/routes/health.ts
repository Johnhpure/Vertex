/**
 * 健康检查与模型列表路由
 * 提供服务状态检查和 OpenAI 兼容的模型列表端点
 *
 * 路由列表（均为公开端点，无需 auth）：
 * - GET /health — 服务健康状态
 * - GET /v1/models — OpenAI 兼容模型列表
 */

import { Router, type Request, type Response } from 'express';
import { getDatabase } from '../db/database.js';
import { getConfig } from '../db/config-dao.js';
import { decrypt } from '../services/encryption.js';
import { DEFAULT_MODEL } from '../services/vertex-ai.js';

const router = Router();

/** 服务启动时间戳（用于计算 uptime） */
const startTime = Date.now();

/** 应用版本号 */
const APP_VERSION = '1.0.0';

/**
 * 检查数据库连接状态
 * @returns 'connected' | 'disconnected'
 */
function checkDatabase(): string {
    try {
        const db = getDatabase();
        // 执行简单查询验证 DB 可用
        db.prepare('SELECT 1').get();
        return 'connected';
    } catch {
        return 'disconnected';
    }
}

/**
 * 检查服务账号配置状态
 * @returns 'configured' | 'not_configured'
 */
function checkServiceAccount(): string {
    try {
        const encrypted = getConfig('service_account');
        if (!encrypted) return 'not_configured';

        // 尝试解密验证数据完整性
        const json = decrypt(encrypted);
        const parsed = JSON.parse(json);
        if (parsed.project_id && parsed.client_email) {
            return 'configured';
        }
        return 'not_configured';
    } catch {
        return 'not_configured';
    }
}

/**
 * 检查 Vertex AI 连通性
 * 通过验证服务账号的关键字段来模拟 SDK 初始化检查
 * @returns 'connected' | 'disconnected'
 */
function checkVertexAI(): string {
    try {
        const encrypted = getConfig('service_account');
        if (!encrypted) return 'disconnected';

        const json = decrypt(encrypted);
        const credentials = JSON.parse(json);

        // 检查 SDK 初始化所需的关键字段
        if (
            credentials.project_id &&
            credentials.private_key &&
            credentials.client_email
        ) {
            return 'connected';
        }
        return 'disconnected';
    } catch {
        return 'disconnected';
    }
}

/**
 * GET /health
 * 返回服务健康状态（公开端点，不需要认证）
 *
 * 即使某些组件不可用，仍返回 HTTP 200
 * 用于监控系统判断服务进程是否存活
 */
router.get('/health', (_req: Request, res: Response): void => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const dbStatus = checkDatabase();
    const saStatus = checkServiceAccount();
    const vertexStatus = checkVertexAI();

    // 整体状态：所有组件正常 = ok，否则 = degraded
    const overallStatus = (dbStatus === 'connected' && vertexStatus === 'connected')
        ? 'ok'
        : 'degraded';

    res.status(200).json({
        status: overallStatus,
        uptime,
        version: APP_VERSION,
        database: dbStatus,
        vertex_ai: vertexStatus,
        service_account: saStatus,
    });
});

/**
 * GET /v1/models
 * 返回 OpenAI 兼容格式的模型列表（公开端点）
 */
router.get('/v1/models', (_req: Request, res: Response): void => {
    res.status(200).json({
        object: 'list',
        data: [
            {
                id: DEFAULT_MODEL,
                object: 'model',
                created: Math.floor(Date.now() / 1000),
                owned_by: 'google',
            },
        ],
    });
});

export default router;
