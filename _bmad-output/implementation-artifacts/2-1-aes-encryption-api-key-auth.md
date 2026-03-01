# Story 2.1: AES 加密模块与 API Key 认证中间件

Status: review

## Story

As a 管理员,
I want API 端点受到 API Key 保护，敏感数据加密存储,
so that 只有授权用户可以访问服务，凭证安全不泄露。

## Acceptance Criteria

1. **AC1**: 加密函数使用 AES-256-GCM，每次生成随机 IV
2. **AC2**: 输出格式为 `iv:authTag:ciphertext`（base64 编码）
3. **AC3**: 解密函数可正确还原原始数据
4. **AC4**: `ENCRYPTION_KEY` 从环境变量读取
5. **AC5**: 请求携带 `Authorization: Bearer <valid_key>` 时通过认证
6. **AC6**: 未携带或无效 Key 时返回 HTTP 401 `{ error: { type: "authentication_error" } }`
7. **AC7**: 初始启动时若 config 表无 `api_key` 记录但环境变量 `API_KEY` 存在，将其加密后存入
8. **AC8**: 加密模块和 auth 中间件有单元测试

## Tasks / Subtasks

- [x] Task 1: 创建 AES-256-GCM 加密模块 (AC: #1, #2, #3, #4)
  - [x] 1.1: 创建 `backend/src/services/encryption.ts`
  - [x] 1.2: 实现 `encrypt(plaintext: string): string` — 使用 crypto.createCipheriv，随机 16 字节 IV，输出 `iv:authTag:ciphertext` base64
  - [x] 1.3: 实现 `decrypt(encrypted: string): string` — 解析格式并解密
  - [x] 1.4: 从 `process.env.ENCRYPTION_KEY` 读取密钥（32 字节 hex → Buffer）

- [x] Task 2: 创建 API Key 认证中间件 (AC: #5, #6)
  - [x] 2.1: 创建 `backend/src/middleware/auth.ts`
  - [x] 2.2: 解析 `Authorization: Bearer <key>` header
  - [x] 2.3: 从 config-dao 读取加密的 api_key → 解密 → 比较
  - [x] 2.4: 无效或缺失时返回 401 OpenAI 格式错误

- [x] Task 3: API Key 初始化逻辑 (AC: #7)
  - [x] 3.1: 修改 `backend/src/index.ts` — 启动时检查 config 表是否有 `api_key`
  - [x] 3.2: 若无且 `process.env.API_KEY` 存在 → 加密后写入 config 表
  - [x] 3.3: 将 auth 中间件注册到需要认证的路由（/v1/*, /api/*）

- [x] Task 4: 编写测试 (AC: #8)
  - [x] 4.1: 创建 `backend/src/services/encryption.test.ts` — 加解密对称性、不同输入、空字符串
  - [x] 4.2: 测试 auth 中间件 — 有效Key/无效Key/缺失header

## Dev Notes

### AES-256-GCM 实现参考
```typescript
import crypto from 'crypto';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function encrypt(text: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}
```

### References
- [Source: architecture.md#Authentication-&-Security] — 加密方案和认证流程

## Dev Agent Record
### Agent Model Used
Gemini 2.5 Pro (Antigravity)
### Debug Log References
无调试问题，所有任务一次通过
### Completion Notes List
- ✅ Task 1: 实现 `encryption.ts` — AES-256-GCM 加密/解密，随机 IV，输出 iv:authTag:ciphertext 格式，密钥从 ENCRYPTION_KEY 环境变量读取（hex 格式 64 字符 = 32 字节）
- ✅ Task 2: 实现 `auth.ts` — 从 Bearer token 提取 API Key，与 config 表加密存储的 key 解密后比对，未授权返回 401 OpenAI 格式错误
- ✅ Task 3: 修改 `index.ts` — 启动时检查 config 表 api_key，若无则从环境变量加密存入；注册 auth 中间件到 /v1/* 和 /api/* 路由
- ✅ Task 4: 编写完整测试 — encryption.test.ts（11 用例）+ auth.test.ts（6 用例），全部通过
- ✅ 全部回归测试通过：10 文件 129 用例 0 失败
### File List
- `backend/src/services/encryption.ts` — 新增：AES-256-GCM 加密/解密模块
- `backend/src/services/encryption.test.ts` — 新增：加密模块单元测试（11 用例）
- `backend/src/middleware/auth.ts` — 新增：API Key 认证中间件
- `backend/src/middleware/auth.test.ts` — 新增：认证中间件单元测试（6 用例）
- `backend/src/index.ts` — 修改：添加 API Key 初始化逻辑和 auth 中间件注册
### Change Log
- 2026-02-28: 实现 Story 2.1 — AES-256-GCM 加密模块、API Key 认证中间件、启动初始化逻辑、完整测试覆盖
