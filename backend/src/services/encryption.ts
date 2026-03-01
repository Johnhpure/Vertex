/**
 * AES-256-GCM 加密模块
 * 提供对称加密/解密功能，用于保护敏感配置数据（如 API Key）
 *
 * 加密输出格式：iv:authTag:ciphertext（均为 base64 编码）
 * 每次加密使用随机 IV，确保相同明文产生不同密文
 */

import crypto from 'crypto';

/** 加密算法 */
const ALGORITHM = 'aes-256-gcm';

/** 初始化向量长度（字节） */
const IV_LENGTH = 16;

/**
 * 从环境变量获取加密密钥
 * ENCRYPTION_KEY 应为 64 个十六进制字符（= 32 字节）
 *
 * @returns 32 字节的密钥 Buffer
 * @throws 环境变量未设置或格式错误时抛出异常
 */
function getEncryptionKey(): Buffer {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) {
        throw new Error('ENCRYPTION_KEY 环境变量未设置');
    }
    if (keyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(keyHex)) {
        throw new Error('ENCRYPTION_KEY 必须是 64 个十六进制字符（32 字节）');
    }
    return Buffer.from(keyHex, 'hex');
}

/**
 * 加密明文字符串
 *
 * @param plaintext - 待加密的明文
 * @returns 格式为 `iv:authTag:ciphertext` 的 base64 编码字符串
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * 解密密文字符串
 *
 * @param encrypted - 格式为 `iv:authTag:ciphertext` 的加密数据
 * @returns 解密后的明文字符串
 * @throws 格式不正确或密文被篡改时抛出异常
 */
export function decrypt(encrypted: string): string {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
        throw new Error('加密数据格式无效：应为 iv:authTag:ciphertext');
    }

    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const ciphertext = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
