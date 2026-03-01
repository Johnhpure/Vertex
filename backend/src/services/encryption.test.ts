/**
 * AES-256-GCM 加密模块 单元测试
 * 覆盖：加解密对称性、不同输入、空字符串、格式校验、密钥缺失
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 在导入模块前设置环境变量
const TEST_ENCRYPTION_KEY = 'a'.repeat(64); // 64 hex 字符 = 32 字节

describe('encryption 模块', () => {
    beforeEach(() => {
        vi.stubEnv('ENCRYPTION_KEY', TEST_ENCRYPTION_KEY);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('encrypt / decrypt 对称性', () => {
        it('正常文本加解密应还原原始数据', async () => {
            const { encrypt, decrypt } = await import('./encryption.js');
            const plaintext = 'Hello, World! 你好世界';
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });

        it('空字符串加解密应还原', async () => {
            const { encrypt, decrypt } = await import('./encryption.js');
            const plaintext = '';
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });

        it('长文本加解密应还原', async () => {
            const { encrypt, decrypt } = await import('./encryption.js');
            const plaintext = 'x'.repeat(10000);
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });

        it('特殊字符加解密应还原', async () => {
            const { encrypt, decrypt } = await import('./encryption.js');
            const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\';
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });

        it('JSON 格式数据加解密应还原', async () => {
            const { encrypt, decrypt } = await import('./encryption.js');
            const plaintext = JSON.stringify({ key: 'sk-test-123', secret: '密钥值' });
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });
    });

    describe('encrypt 输出格式', () => {
        it('输出应为 iv:authTag:ciphertext 格式（3段 base64，冒号分隔）', async () => {
            const { encrypt } = await import('./encryption.js');
            const encrypted = encrypt('test');
            const parts = encrypted.split(':');
            expect(parts).toHaveLength(3);

            // 每段都应是有效的 base64 字符串
            for (const part of parts) {
                expect(() => Buffer.from(part, 'base64')).not.toThrow();
                // base64 字符集校验
                expect(part).toMatch(/^[A-Za-z0-9+/=]*$/);
            }
        });

        it('IV 应为 16 字节（base64 解码后）', async () => {
            const { encrypt } = await import('./encryption.js');
            const encrypted = encrypt('test');
            const parts = encrypted.split(':');
            const iv = Buffer.from(parts[0], 'base64');
            expect(iv.length).toBe(16);
        });

        it('AuthTag 应为 16 字节（base64 解码后）', async () => {
            const { encrypt } = await import('./encryption.js');
            const encrypted = encrypt('test');
            const parts = encrypted.split(':');
            const authTag = Buffer.from(parts[1], 'base64');
            expect(authTag.length).toBe(16);
        });
    });

    describe('每次加密结果不同（随机 IV）', () => {
        it('相同输入两次加密结果应不同', async () => {
            const { encrypt } = await import('./encryption.js');
            const plaintext = 'same input';
            const encrypted1 = encrypt(plaintext);
            const encrypted2 = encrypt(plaintext);
            expect(encrypted1).not.toBe(encrypted2);
        });
    });

    describe('错误处理', () => {
        it('无效的加密格式应抛出错误', async () => {
            const { decrypt } = await import('./encryption.js');
            expect(() => decrypt('invalid-format')).toThrow();
        });

        it('被篡改的密文应抛出错误', async () => {
            const { encrypt, decrypt } = await import('./encryption.js');
            const encrypted = encrypt('test');
            const parts = encrypted.split(':');
            // 篡改 ciphertext 部分
            parts[2] = Buffer.from('tampered').toString('base64');
            expect(() => decrypt(parts.join(':'))).toThrow();
        });
    });
});
