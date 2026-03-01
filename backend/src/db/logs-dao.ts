/**
 * Logs DAO 模块
 * 提供 API 调用日志的插入、查询、清理操作
 */

import { getDatabase } from './database.js';
import type { LogEntry, InsertLogParams, LogQueryFilters, PaginatedResult } from '../types/index.js';

/**
 * 插入一条日志记录
 *
 * @param params - 日志条目参数
 */
export function insertLog(params: InsertLogParams): void {
    const db = getDatabase();
    const stmt = db.prepare(`
        INSERT INTO logs (
            request_id, timestamp, prompt, model, size, aspect_ratio,
            status, status_code, error_message, response_time_ms,
            retry_count, retry_details, estimated_cost
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?
        )
    `);
    stmt.run(
        params.request_id,
        params.timestamp,
        params.prompt ?? null,
        params.model,
        params.size ?? null,
        params.aspect_ratio ?? null,
        params.status,
        params.status_code ?? null,
        params.error_message ?? null,
        params.response_time_ms ?? null,
        params.retry_count ?? 0,
        params.retry_details ?? null,
        params.estimated_cost ?? null
    );
}

/**
 * 查询日志（支持筛选和分页）
 *
 * @param filters - 查询过滤条件
 * @returns 分页结果：当前页数据 + 总记录数
 */
export function queryLogs(filters: LogQueryFilters = {}): PaginatedResult<LogEntry> {
    const db = getDatabase();

    // 动态构建 WHERE 子句（使用 prepared statements 防止 SQL 注入）
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.start_date) {
        conditions.push('timestamp >= ?');
        params.push(filters.start_date);
    }
    if (filters.end_date) {
        conditions.push('timestamp <= ?');
        params.push(filters.end_date);
    }
    if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const pageSize = filters.page_size || 20;
    const page = filters.page || 1;
    const offset = (page - 1) * pageSize;

    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM logs ${whereClause}`;
    const countRow = db.prepare(countSql).get(...params) as { total: number };
    const total = countRow.total;

    // 查询分页数据（按 timestamp 倒序）
    const dataSql = `SELECT * FROM logs ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    const items = db.prepare(dataSql).all(...params, pageSize, offset) as LogEntry[];

    return { items, total };
}

/**
 * 清理过期日志
 *
 * @param retentionDays - 保留天数，超过此天数的日志将被删除
 * @returns 被删除的日志条数
 */
export function cleanupOldLogs(retentionDays: number): number {
    const db = getDatabase();
    const stmt = db.prepare(
        `DELETE FROM logs WHERE timestamp < datetime('now', '-' || ? || ' days')`
    );
    const result = stmt.run(retentionDays);
    return result.changes;
}
