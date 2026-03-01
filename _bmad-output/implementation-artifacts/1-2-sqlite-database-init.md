# Story 1.2: SQLite 数据库初始化与配置管理

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 系统,
I want 数据库在服务启动时自动初始化并创建必要的表,
so that 日志和配置数据有持久化存储。

## Acceptance Criteria

1. **AC1**: 后端服务启动时，若 `data/gateway.db` 不存在，自动创建数据库文件和 `data/` 目录
2. **AC2**: 创建 `logs` 表，包含完整字段（id, request_id, timestamp, prompt, model, size, aspect_ratio, status, status_code, error_message, response_time_ms, retry_count, retry_details, estimated_cost, created_at）
3. **AC3**: 创建 `config` 表，包含字段（key, value, updated_at）
4. **AC4**: 创建索引 `idx_logs_timestamp` 和 `idx_logs_status`
5. **AC5**: 启用 WAL 模式（`PRAGMA journal_mode = WAL`）和 busy_timeout=5000
6. **AC6**: config-dao 提供 `get(key)`, `set(key, value)`, `delete(key)` 方法，操作 config 表
7. **AC7**: logs-dao 提供 `insert(logEntry)`, `query(filters)`, `cleanup(retentionDays)` 方法
8. **AC8**: `cleanup(90)` 在服务启动时自动调用，删除 90 天前的日志
9. **AC9**: 所有 DAO 方法有对应的单元测试
10. **AC10**: 数据库初始化模块导出 `getDatabase()` 函数供其他模块使用

## Tasks / Subtasks

- [x] Task 1: 创建数据库初始化模块 (AC: #1, #2, #3, #4, #5, #10)
  - [x] 1.1: 创建 `backend/src/db/database.ts` — 导入 `better-sqlite3`，实现 `initDatabase()` 函数
  - [x] 1.2: 在 `initDatabase()` 中，检查 `data/` 目录是否存在，不存在则用 `fs.mkdirSync` 创建
  - [x] 1.3: 使用 `better-sqlite3` 打开/创建 `data/gateway.db`
  - [x] 1.4: 执行 `PRAGMA journal_mode = WAL` 和 `PRAGMA busy_timeout = 5000`
  - [x] 1.5: 使用 `db.exec()` 执行 `CREATE TABLE IF NOT EXISTS logs (...)` — 包含所有字段和正确的数据类型
  - [x] 1.6: 使用 `db.exec()` 执行 `CREATE TABLE IF NOT EXISTS config (...)` — 包含 key(PRIMARY KEY), value, updated_at
  - [x] 1.7: 使用 `db.exec()` 执行 `CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)` 和 `idx_logs_status ON logs(status)`
  - [x] 1.8: 导出 `getDatabase()` 函数（单例模式，返回已初始化的 db 实例）
  - [x] 1.9: 导出 `closeDatabase()` 函数用于优雅关闭

- [x] Task 2: 创建 config-dao 模块 (AC: #6)
  - [x] 2.1: 创建 `backend/src/db/config-dao.ts`
  - [x] 2.2: 实现 `getConfig(key: string): string | null` — 从 config 表读取 value
  - [x] 2.3: 实现 `setConfig(key: string, value: string): void` — INSERT OR REPLACE 并更新 `updated_at`
  - [x] 2.4: 实现 `deleteConfig(key: string): boolean` — 删除指定 key，返回是否成功
  - [x] 2.5: 使用 `db.prepare().get()` 和 `db.prepare().run()` prepared statements 提升性能

- [x] Task 3: 创建 logs-dao 模块 (AC: #7, #8)
  - [x] 3.1: 创建 `backend/src/db/logs-dao.ts`
  - [x] 3.2: 定义 `InsertLogParams` 接口（与 logs 表字段对应）
  - [x] 3.3: 实现 `insertLog(params: InsertLogParams): void` — 插入一条日志记录
  - [x] 3.4: 定义 `LogQueryFilters` 接口（start_date?, end_date?, status?, page?, page_size?）
  - [x] 3.5: 实现 `queryLogs(filters: LogQueryFilters): { items: LogEntry[], total: number }` — 支持时间范围、状态筛选、分页（默认每页 20 条，按 timestamp 倒序）
  - [x] 3.6: 实现 `cleanupOldLogs(retentionDays: number): number` — 删除超过 retentionDays 天的日志，返回删除条数
  - [x] 3.7: 使用动态 SQL 构建查询条件（避免 SQL 注入，使用 prepared statements 的 `?` 占位符）

- [x] Task 4: 集成数据库初始化到应用启动 (AC: #1, #8)
  - [x] 4.1: 修改 `backend/src/index.ts` — 在 Express 启动前调用 `initDatabase()`
  - [x] 4.2: 在 `initDatabase()` 成功后调用 `cleanupOldLogs(90)` 清理过期日志
  - [x] 4.3: 添加进程退出钩子（`process.on('SIGINT')`），调用 `closeDatabase()` 优雅关闭
  - [x] 4.4: 添加启动日志：`[DB] 数据库初始化完成，清理了 N 条过期日志`

- [x] Task 5: 编写单元测试 (AC: #9)
  - [x] 5.1: 创建 `backend/src/db/database.test.ts` — 测试数据库初始化（WAL 模式、表创建、索引创建）
  - [x] 5.2: 创建 `backend/src/db/config-dao.test.ts` — 测试 get/set/delete 操作（包含不存在的 key、覆盖更新、删除不存在的 key）
  - [x] 5.3: 创建 `backend/src/db/logs-dao.test.ts` — 测试 insert/query/cleanup（包含分页、筛选、过期清理）
  - [x] 5.4: 所有测试使用内存数据库（`:memory:`）或临时文件数据库运行，确保测试隔离
  - [x] 5.5: 安装并配置测试框架（vitest 推荐，因与 Vite 生态一致）

## Dev Notes

### Architecture Requirements
- **数据库**: SQLite via `better-sqlite3`（同步 API，高性能，Node.js 原生绑定）
- **WAL 模式**: 必填，支持并发读写
- **数据保留策略**: 日志保留 90 天，服务启动时自动清理
- **加密**: config 表中的敏感数据（api_key, service_account）将在 Story 2.1 中通过 AES-256-GCM 加密后存储。本 Story 存储的是纯文本或预加密的 value

### SQL Schema (from architecture.md)
```sql
-- API 调用日志
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
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status);

-- 系统配置（KV 存储）
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### better-sqlite3 使用要点
```typescript
import Database from 'better-sqlite3';

// 初始化
const db = new Database('data/gateway.db');
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// prepared statements（推荐）
const getStmt = db.prepare('SELECT value FROM config WHERE key = ?');
const setStmt = db.prepare('INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, datetime("now"))');

// 查询
const row = getStmt.get('api_key'); // 返回 { value: '...' } | undefined
setStmt.run('api_key', 'encrypted_value'); // 执行写入
```

### logs-dao 查询逻辑参考
```typescript
// 动态构建 WHERE 子句
const conditions: string[] = [];
const params: any[] = [];

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
const offset = ((filters.page || 1) - 1) * (filters.page_size || 20);

// 查询总数
const countSql = `SELECT COUNT(*) as total FROM logs ${whereClause}`;
const total = db.prepare(countSql).get(...params).total;

// 查询分页数据
const dataSql = `SELECT * FROM logs ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
const items = db.prepare(dataSql).all(...params, filters.page_size || 20, offset);
```

### Testing Strategy
- **测试框架**: vitest（与 Vite 生态一致，开箱即用 TypeScript 支持）
- **测试数据库**: 使用 `:memory:` 模式或 `os.tmpdir()` 临时文件
- **每个测试文件**: `beforeEach` 创建新 DB 实例，`afterEach` 关闭
- **覆盖场景**:
  - config-dao: CRUD 操作、不存在的 key、覆盖更新
  - logs-dao: 插入、基本查询、时间筛选、状态筛选、分页、cleanup

### Naming Conventions (from architecture.md)
- 表名: 小写复数 (`logs`, `config`)
- 列名: `snake_case` (`request_id`, `response_time_ms`)
- 索引名: `idx_表名_列名` (`idx_logs_timestamp`)
- 文件名: `kebab-case` (`config-dao.ts`, `logs-dao.ts`)

### Previous Story Intelligence (Story 1.1)
- Story 1.1 创建了项目结构和 `backend/src/index.ts` 入口文件
- `backend/src/types/index.ts` 中已定义基础类型接口
- Story 1.2 需要修改 `backend/src/index.ts` 添加 DB 初始化调用
- 需要在 `backend/src/types/index.ts` 中添加 `LogEntry`、`ConfigEntry`、`InsertLogParams`、`LogQueryFilters` 类型

### Project Structure Notes

- 数据库文件存储在 `data/gateway.db`（已在 .gitignore 中排除）
- DAO 文件位于 `backend/src/db/` 目录
- 测试文件与源文件同目录放置（`database.test.ts`, `config-dao.test.ts`, `logs-dao.test.ts`）

### References

- [Source: architecture.md#Data-Architecture] — SQLite 表结构定义、WAL 模式、数据保留策略
- [Source: architecture.md#Implementation-Patterns-&-Consistency-Rules] — 命名规范
- [Source: architecture.md#Project-Structure-&-Boundaries] — 文件位置和目录结构
- [Source: epics.md#Story-1.2] — 原始验收标准
- [Source: 1-1-project-init.md] — 前序 Story 建立的项目结构和基础设施

## Dev Agent Record

### Agent Model Used

Google Gemini (Antigravity)

### Debug Log References

- 修复了 `config-dao.ts` 中 `datetime("now")` 的引号问题：SQLite 将双引号内的 `now` 解析为列标识符而非字符串字面量，改用模板字符串 + 单引号 `datetime('now')` 解决
- 修复了 `database.test.ts` 中 `busy_timeout` pragma 返回值属性名不匹配的问题：改用 `Object.values()` 获取第一个值来兼容处理

### Completion Notes List

- ✅ Task 1: 创建了 `database.ts` 数据库初始化模块，实现 initDatabase/getDatabase/closeDatabase 单例模式，启用 WAL 模式和 busy_timeout=5000
- ✅ Task 2: 创建了 `config-dao.ts`，实现 getConfig/setConfig/deleteConfig 三个 CRUD 方法，全部使用 prepared statements
- ✅ Task 3: 创建了 `logs-dao.ts`，实现 insertLog/queryLogs/cleanupOldLogs，queryLogs 支持动态 WHERE 构建、时间范围、状态筛选、分页
- ✅ Task 4: 修改 `index.ts` 入口文件，在 Express 启动前初始化 DB 并清理过期日志，注册 SIGINT/SIGTERM 优雅关闭
- ✅ Task 5: 安装 vitest，编写 3 个测试文件共 32 个测试用例全部通过
- ✅ 更新了 `types/index.ts`，重构 LogEntry 接口并新增 InsertLogParams/LogQueryFilters/PaginatedResult 类型

### File List

- `backend/src/db/database.ts` — 新建：数据库初始化模块
- `backend/src/db/config-dao.ts` — 新建：配置 DAO 模块
- `backend/src/db/logs-dao.ts` — 新建：日志 DAO 模块
- `backend/src/db/database.test.ts` — 新建：数据库初始化测试（9 tests）
- `backend/src/db/config-dao.test.ts` — 新建：配置 DAO 测试（9 tests）
- `backend/src/db/logs-dao.test.ts` — 新建：日志 DAO 测试（14 tests）
- `backend/src/index.ts` — 修改：集成 DB 初始化、过期日志清理、进程退出钩子
- `backend/src/types/index.ts` — 修改：更新 LogEntry，新增 InsertLogParams/LogQueryFilters/PaginatedResult
- `backend/package.json` — 修改：添加 vitest 依赖和 test/test:watch 脚本

### Change Log

- 2026-02-28: Story 1.2 完整实现 — SQLite 数据库初始化与配置管理。包含数据库初始化（WAL 模式）、config/logs 两个 DAO 模块、应用启动集成、32 个单元测试全部通过

