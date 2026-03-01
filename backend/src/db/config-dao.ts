/**
 * Config DAO 模块
 * 提供系统配置的 CRUD 操作（基于 config 表的 KV 存储）
 */

import { getDatabase } from './database.js';

/**
 * 获取配置值
 *
 * @param key - 配置键名
 * @returns 配置值；不存在时返回 null
 */
export function getConfig(key: string): string | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT value FROM config WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row ? row.value : null;
}

/**
 * 设置配置值（不存在则插入，存在则更新）
 *
 * @param key - 配置键名
 * @param value - 配置值
 */
export function setConfig(key: string, value: string): void {
    const db = getDatabase();
    const stmt = db.prepare(
        `INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, datetime('now'))`
    );
    stmt.run(key, value);
}

/**
 * 删除配置项
 *
 * @param key - 配置键名
 * @returns 是否成功删除（key 存在且被删除返回 true）
 */
export function deleteConfig(key: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM config WHERE key = ?');
    const result = stmt.run(key);
    return result.changes > 0;
}
