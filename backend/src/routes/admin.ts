/**
 * Admin 管理路由
 * 提供服务账号管理和系统配置的 CRUD API
 *
 * 路由列表：
 * - POST   /api/service-account — 上传服务账号 JSON
 * - GET    /api/service-account — 查看服务账号状态
 * - DELETE /api/service-account — 删除服务账号
 * - GET    /api/config — 获取系统配置
 * - PUT    /api/config — 更新系统配置
 */

import { Router, type Request, type Response } from 'express';
import { getConfig, setConfig, deleteConfig } from '../db/config-dao.js';
import { encrypt, decrypt } from '../services/encryption.js';

const router = Router();

/** 服务账号 JSON 必须包含的字段 */
const REQUIRED_SA_FIELDS = ['type', 'project_id', 'private_key', 'client_email'] as const;

/** 允许更新的配置项白名单 */
const ALLOWED_CONFIG_KEYS = ['monthly_budget'] as const;

/**
 * POST /api/service-account
 * 接收服务账号 JSON，验证必要字段后加密存入 config 表
 */
router.post('/api/service-account', (req: Request, res: Response): void => {
    const body = req.body as Record<string, unknown>;

    // 验证必要字段
    const missingFields = REQUIRED_SA_FIELDS.filter(
        (field) => !body[field] || typeof body[field] !== 'string'
    );

    if (missingFields.length > 0) {
        res.status(400).json({
            error: {
                type: 'invalid_request_error',
                message: `缺少必要字段: ${missingFields.join(', ')}`,
            },
        });
        return;
    }

    // 加密全部 JSON 后存储
    const jsonStr = JSON.stringify(body);
    const encryptedData = encrypt(jsonStr);
    setConfig('service_account', encryptedData);

    // 返回非敏感字段
    res.status(200).json({
        success: true,
        data: {
            project_id: body.project_id,
            client_email: body.client_email,
            status: 'configured',
        },
    });
});

/**
 * GET /api/service-account
 * 返回服务账号状态和非敏感字段（不返回 private_key）
 */
router.get('/api/service-account', (req: Request, res: Response): void => {
    const encryptedData = getConfig('service_account');

    if (!encryptedData) {
        res.status(200).json({
            success: true,
            data: {
                status: 'not_configured',
            },
        });
        return;
    }

    try {
        const jsonStr = decrypt(encryptedData);
        const serviceAccount = JSON.parse(jsonStr) as Record<string, unknown>;

        // 只返回非敏感字段
        res.status(200).json({
            success: true,
            data: {
                project_id: serviceAccount.project_id,
                client_email: serviceAccount.client_email,
                type: serviceAccount.type,
                status: 'configured',
            },
        });
    } catch {
        // 解密失败或 JSON 解析失败
        res.status(500).json({
            error: {
                type: 'server_error',
                message: '服务账号数据读取失败',
            },
        });
    }
});

/**
 * DELETE /api/service-account
 * 从 config 表中删除服务账号记录
 */
router.delete('/api/service-account', (_req: Request, res: Response): void => {
    deleteConfig('service_account');

    res.status(200).json({
        success: true,
    });
});

/**
 * GET /api/config
 * 返回当前系统配置信息
 */
router.get('/api/config', (_req: Request, res: Response): void => {
    const monthlyBudget = getConfig('monthly_budget');

    res.status(200).json({
        success: true,
        data: {
            monthly_budget: monthlyBudget ? parseFloat(monthlyBudget) : 100,
        },
    });
});

/**
 * PUT /api/config
 * 更新系统配置项（仅允许白名单中的 key）
 */
router.put('/api/config', (req: Request, res: Response): void => {
    const body = req.body as Record<string, unknown>;

    // 过滤出允许更新的字段
    const updates: Record<string, string> = {};
    for (const key of ALLOWED_CONFIG_KEYS) {
        if (body[key] !== undefined) {
            updates[key] = String(body[key]);
        }
    }

    if (Object.keys(updates).length === 0) {
        res.status(400).json({
            error: {
                type: 'invalid_request_error',
                message: `无有效配置项，允许的 key: ${ALLOWED_CONFIG_KEYS.join(', ')}`,
            },
        });
        return;
    }

    // 逐个更新配置
    for (const [key, value] of Object.entries(updates)) {
        setConfig(key, value);
    }

    res.status(200).json({
        success: true,
        data: updates,
    });
});

export default router;
