/**
 * Tasks DAO 模块
 * 提供图片生成任务记录的插入、查询操作
 */

import { getDatabase } from './database.js';
import type { TaskEntry, InsertTaskParams, TaskQueryFilters, PaginatedResult } from '../types/index.js';

/**
 * 插入一条任务记录
 *
 * @param params - 任务条目参数
 */
export function insertTask(params: InsertTaskParams): void {
    const db = getDatabase();
    const stmt = db.prepare(`
        INSERT INTO tasks (
            request_id, prompt, model, aspect_ratio,
            image_size, image_filename, file_size
        ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?
        )
    `);
    stmt.run(
        params.request_id,
        params.prompt,
        params.model,
        params.aspect_ratio ?? null,
        params.image_size ?? null,
        params.image_filename,
        params.file_size ?? null
    );
}

/**
 * 查询任务列表（支持分页）
 *
 * @param filters - 查询过滤条件
 * @returns 分页结果：当前页数据 + 总记录数
 */
export function queryTasks(filters: TaskQueryFilters = {}): PaginatedResult<TaskEntry> {
    const db = getDatabase();

    const pageSize = filters.page_size || 20;
    const page = filters.page || 1;
    const offset = (page - 1) * pageSize;

    // 查询总数
    const countRow = db.prepare('SELECT COUNT(*) as total FROM tasks').get() as { total: number };
    const total = countRow.total;

    // 查询分页数据（按 created_at 倒序，最新任务在前）
    const items = db.prepare(
        'SELECT * FROM tasks ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(pageSize, offset) as TaskEntry[];

    return { items, total };
}

/**
 * 根据 ID 查询单条任务
 *
 * @param id - 任务 ID
 * @returns 任务记录或 undefined
 */
export function getTaskById(id: number): TaskEntry | undefined {
    const db = getDatabase();
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskEntry | undefined;
}
