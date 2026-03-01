/**
 * API Key 认证中间件
 * 从 Authorization: Bearer <key> header 中提取 API Key，
 * 与 config 表中加密存储的 api_key 比较，验证请求合法性
 */

import type { Request, Response, NextFunction } from 'express';
import { getConfig } from '../db/config-dao.js';
import { decrypt } from '../services/encryption.js';

/**
 * 返回 OpenAI 格式的 401 认证错误
 */
function sendAuthError(res: Response, message: string): void {
    res.status(401).json({
        error: {
            type: 'authentication_error',
            message,
        },
    });
}

/**
 * API Key 认证中间件
 *
 * 验证流程：
 * 1. 从请求头提取 Authorization: Bearer <token>
 * 2. 从 config 表读取加密的 api_key → 解密
 * 3. 比对 token 与解密后的 api_key
 * 4. 不匹配或缺失时返回 401
 */
export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // 提取 Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        sendAuthError(res, 'Missing or invalid Authorization header');
        return;
    }

    // 提取 token（Bearer 后面的部分）
    const token = authHeader.slice(7).trim();
    if (!token) {
        sendAuthError(res, 'Missing API key in Authorization header');
        return;
    }

    // 从 config 表读取加密的 api_key
    const encryptedApiKey = getConfig('api_key');
    if (!encryptedApiKey) {
        sendAuthError(res, 'API key not configured on server');
        return;
    }

    try {
        // 解密并比较
        const storedApiKey = decrypt(encryptedApiKey);
        if (token !== storedApiKey) {
            sendAuthError(res, 'Invalid API key');
            return;
        }
    } catch {
        // 解密失败（密钥不匹配或数据损坏）
        sendAuthError(res, 'API key verification failed');
        return;
    }

    // 验证通过
    next();
}
