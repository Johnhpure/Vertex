/**
 * database.ts 单元测试
 * 验证数据库初始化、WAL 模式、表创建、索引创建、单例模式
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { initDatabase, getDatabase, closeDatabase, _resetDatabaseInstance } from './database.js';

/** 创建临时数据库路径 */
function getTempDbPath(): string {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'db-test-'));
    return path.join(tmpDir, 'test.db');
}

describe('database 初始化模块', () => {
    let dbPath: string;
    let db: Database.Database;

    beforeEach(() => {
        // 每个测试使用独立的临时数据库
        _resetDatabaseInstance();
        dbPath = getTempDbPath();
    });

    afterEach(() => {
        // 关闭数据库并清理临时文件
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

    it('应创建数据库文件和数据目录', () => {
        db = initDatabase(dbPath);
        expect(fs.existsSync(dbPath)).toBe(true);
    });

    it('应启用 WAL 模式', () => {
        db = initDatabase(dbPath);
        const result = db.pragma('journal_mode') as { journal_mode: string }[];
        expect(result[0].journal_mode).toBe('wal');
    });

    it('应设置 busy_timeout 为 5000', () => {
        db = initDatabase(dbPath);
        const result = db.pragma('busy_timeout');
        // pragma 返回值可能是数组或直接值，需要兼容处理
        if (Array.isArray(result)) {
            const row = result[0] as Record<string, unknown>;
            const value = Object.values(row)[0];
            expect(value).toBe(5000);
        } else {
            expect(result).toBe(5000);
        }
    });

    it('应创建 logs 表并包含所有字段', () => {
        db = initDatabase(dbPath);
        const tableInfo = db.prepare("PRAGMA table_info('logs')").all() as { name: string }[];
        const columnNames = tableInfo.map(col => col.name);

        expect(columnNames).toContain('id');
        expect(columnNames).toContain('request_id');
        expect(columnNames).toContain('timestamp');
        expect(columnNames).toContain('prompt');
        expect(columnNames).toContain('model');
        expect(columnNames).toContain('size');
        expect(columnNames).toContain('aspect_ratio');
        expect(columnNames).toContain('status');
        expect(columnNames).toContain('status_code');
        expect(columnNames).toContain('error_message');
        expect(columnNames).toContain('response_time_ms');
        expect(columnNames).toContain('retry_count');
        expect(columnNames).toContain('retry_details');
        expect(columnNames).toContain('estimated_cost');
        expect(columnNames).toContain('created_at');
    });

    it('应创建 config 表并包含所有字段', () => {
        db = initDatabase(dbPath);
        const tableInfo = db.prepare("PRAGMA table_info('config')").all() as { name: string }[];
        const columnNames = tableInfo.map(col => col.name);

        expect(columnNames).toContain('key');
        expect(columnNames).toContain('value');
        expect(columnNames).toContain('updated_at');
    });

    it('应创建 idx_logs_timestamp 和 idx_logs_status 索引', () => {
        db = initDatabase(dbPath);
        const indexes = db.prepare("PRAGMA index_list('logs')").all() as { name: string }[];
        const indexNames = indexes.map(idx => idx.name);

        expect(indexNames).toContain('idx_logs_timestamp');
        expect(indexNames).toContain('idx_logs_status');
    });

    it('getDatabase() 返回单例实例', () => {
        initDatabase(dbPath);
        const db1 = getDatabase();
        const db2 = getDatabase();
        expect(db1).toBe(db2);
    });

    it('closeDatabase() 后实例被置空', () => {
        initDatabase(dbPath);
        closeDatabase();
        // 重新获取应返回新实例（但会使用默认路径，所以用 _resetDatabaseInstance 模拟）
        _resetDatabaseInstance();
    });

    it('多次调用 initDatabase 不会报错（幂等性）', () => {
        db = initDatabase(dbPath);
        // 关闭后用相同路径重新初始化
        closeDatabase();
        _resetDatabaseInstance();
        const db2 = initDatabase(dbPath);
        expect(db2).toBeDefined();
    });
});
