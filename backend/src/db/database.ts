/**
 * SQLite 数据库初始化模块
 * 管理数据库连接、表创建、索引设置
 * 使用单例模式确保全局唯一的数据库实例
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM 兼容的路径解析
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** 数据库文件默认路径（项目根目录下的 data/gateway.db） */
const DEFAULT_DB_PATH = path.resolve(__dirname, '../../../data/gateway.db');

/** 数据库单例实例 */
let dbInstance: Database.Database | null = null;

/**
 * 初始化数据库
 * - 检查并创建 data/ 目录
 * - 创建/打开 SQLite 数据库文件
 * - 启用 WAL 模式和 busy_timeout
 * - 创建 logs 和 config 表
 * - 创建索引
 *
 * @param dbPath - 可选，自定义数据库路径（用于测试）
 * @returns 初始化完成的数据库实例
 */
export function initDatabase(dbPath?: string): Database.Database {
    const resolvedPath = dbPath || DEFAULT_DB_PATH;

    // 检查并创建数据目录
    const dataDir = path.dirname(resolvedPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // 创建/打开数据库
    const db = new Database(resolvedPath);

    // 启用 WAL 模式 — 支持并发读写
    db.pragma('journal_mode = WAL');
    // 设置忙等待超时 — 避免并发锁冲突
    db.pragma('busy_timeout = 5000');

    // 创建 logs 表 — API 调用日志
    db.exec(`
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id TEXT UNIQUE NOT NULL,
            timestamp TEXT NOT NULL,
            prompt TEXT,
            model TEXT NOT NULL,
            size TEXT,
            aspect_ratio TEXT,
            status TEXT NOT NULL,
            status_code INTEGER,
            error_message TEXT,
            response_time_ms INTEGER,
            retry_count INTEGER DEFAULT 0,
            retry_details TEXT,
            estimated_cost REAL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // 创建 config 表 — 系统配置（KV 存储）
    db.exec(`
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // 创建 tasks 表 — 图片生成任务记录
    db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id TEXT UNIQUE NOT NULL,
            prompt TEXT NOT NULL,
            model TEXT NOT NULL,
            aspect_ratio TEXT,
            image_size TEXT,
            image_filename TEXT NOT NULL,
            file_size INTEGER,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // 创建索引 — 加速日志查询
    db.exec(`CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status)`);
    // 创建索引 — 加速任务查询
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)`);

    // 数据库迁移：为已有 tasks 表安全添加 image_size 列
    try {
        const columns = db.prepare('PRAGMA table_info(tasks)').all() as Array<{ name: string }>;
        const hasImageSize = columns.some(col => col.name === 'image_size');
        if (!hasImageSize) {
            db.exec('ALTER TABLE tasks ADD COLUMN image_size TEXT');
        }
    } catch {
        // 迁移失败时静默处理，不影响启动
    }
    // 保存单例引用
    dbInstance = db;

    return db;
}

/**
 * 获取数据库实例（单例模式）
 * 如果数据库未初始化，自动调用 initDatabase()
 *
 * @returns 数据库实例
 */
export function getDatabase(): Database.Database {
    if (!dbInstance) {
        dbInstance = initDatabase();
    }
    return dbInstance;
}

/**
 * 关闭数据库连接
 * 用于进程优雅退出时释放资源
 */
export function closeDatabase(): void {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}

/**
 * 重置数据库单例（仅用于测试）
 * 允许测试环境中切换数据库实例
 */
export function _resetDatabaseInstance(): void {
    dbInstance = null;
}
