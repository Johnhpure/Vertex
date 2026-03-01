/**
 * config-dao.ts 单元测试
 * 验证配置的 CRUD 操作
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { initDatabase, closeDatabase, _resetDatabaseInstance } from './database.js';
import { getConfig, setConfig, deleteConfig } from './config-dao.js';

describe('config-dao 模块', () => {
    let dbPath: string;

    beforeEach(() => {
        _resetDatabaseInstance();
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-dao-test-'));
        dbPath = path.join(tmpDir, 'test.db');
        initDatabase(dbPath);
    });

    afterEach(() => {
        closeDatabase();
        try {
            const dir = path.dirname(dbPath);
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        } catch {
            // 忽略清理错误
        }
    });

    describe('getConfig', () => {
        it('获取不存在的 key 应返回 null', () => {
            const result = getConfig('nonexistent');
            expect(result).toBeNull();
        });

        it('获取已存在的 key 应返回正确的 value', () => {
            setConfig('test_key', 'test_value');
            const result = getConfig('test_key');
            expect(result).toBe('test_value');
        });
    });

    describe('setConfig', () => {
        it('应成功设置新的配置项', () => {
            setConfig('api_key', 'secret123');
            expect(getConfig('api_key')).toBe('secret123');
        });

        it('应覆盖已存在的配置项', () => {
            setConfig('api_key', 'old_value');
            setConfig('api_key', 'new_value');
            expect(getConfig('api_key')).toBe('new_value');
        });

        it('应支持空字符串值', () => {
            setConfig('empty_key', '');
            // empty string is not null, but better-sqlite3 INSERT OR REPLACE with NOT NULL constraint
            // 由于 value 列是 NOT NULL，空字符串是合法值
            expect(getConfig('empty_key')).toBe('');
        });

        it('应支持包含特殊字符的值', () => {
            const specialValue = '{"json": true, "key": "value\'s"}';
            setConfig('json_config', specialValue);
            expect(getConfig('json_config')).toBe(specialValue);
        });
    });

    describe('deleteConfig', () => {
        it('删除存在的 key 应返回 true', () => {
            setConfig('to_delete', 'value');
            const result = deleteConfig('to_delete');
            expect(result).toBe(true);
            expect(getConfig('to_delete')).toBeNull();
        });

        it('删除不存在的 key 应返回 false', () => {
            const result = deleteConfig('nonexistent');
            expect(result).toBe(false);
        });

        it('删除后再次获取应返回 null', () => {
            setConfig('temp_key', 'temp_value');
            deleteConfig('temp_key');
            expect(getConfig('temp_key')).toBeNull();
        });
    });
});
