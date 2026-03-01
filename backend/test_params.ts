/**
 * 图片生成参数真实测试脚本
 * 逐个测试新增的参数是否能正确传递给 Vertex AI API
 */

import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === 解密相关（完全复用后端 encryption.ts 逻辑） ===
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) {
        throw new Error('ENCRYPTION_KEY 环境变量未设置，请确保后端启动时设置了该变量');
    }
    return Buffer.from(keyHex, 'hex');
}

function decrypt(encrypted: string): string {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
        throw new Error('加密数据格式无效');
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

// === 获取 API Key ===
const dbPath = path.resolve(__dirname, '../data/gateway.db');
const db = new Database(dbPath, { readonly: true });
const row = db.prepare("SELECT value FROM config WHERE key = 'api_key'").get() as { value: string } | undefined;
db.close();

if (!row) {
    console.error('❌ 数据库中没有 api_key 配置');
    process.exit(1);
}

const apiKey = decrypt(row.value);
console.log(`✅ 获取到 API Key: ${apiKey.slice(0, 8)}...`);

// === 测试配置 ===
const BASE_URL = 'http://localhost:3000';
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
};

interface TestCase {
    name: string;
    body: Record<string, unknown>;
}

// === 测试用例（精简，节省 token 消耗）===
const tests: TestCase[] = [
    // 测试 1：基础请求 — 确认基线
    {
        name: '① 基础请求（默认参数）',
        body: {
            prompt: 'A cute cat sitting on a windowsill, simple watercolor style',
        },
    },
    // 测试 2：aspect_ratio + image_size — imageConfig 层参数
    {
        name: '② aspect_ratio=16:9 + image_size=2K',
        body: {
            prompt: 'A cyberpunk city skyline at night, neon lights',
            aspect_ratio: '16:9',
            image_size: '2K',
        },
    },
    // 测试 3：seed — config 根层参数
    {
        name: '③ seed=42（可复现生成）',
        body: {
            prompt: 'A red apple on a white table, studio lighting',
            seed: 42,
        },
    },
    // 测试 4：system_instruction — config 根层参数
    {
        name: '④ system_instruction（印象派风格指令）',
        body: {
            prompt: 'A mountain landscape at sunset',
            system_instruction: 'You are an impressionist painter. Generate all images in the style of Claude Monet with visible brushstrokes and warm colors.',
            aspect_ratio: '16:9',
        },
    },
    // 测试 5：thinking_config — config 根层参数
    {
        name: '⑤ thinking_config（模型思考）',
        body: {
            prompt: 'A detailed medieval marketplace with merchants, a blacksmith, and children playing',
            aspect_ratio: '16:9',
            thinking_config: {
                thinking_budget: 5000,
            },
        },
    },
    // 测试 6：全参数组合 — 终极测试
    {
        name: '⑥ 全参数组合（终极测试）',
        body: {
            prompt: 'A violinist performing on stage under dramatic spotlight',
            aspect_ratio: '3:2',
            image_size: '2K',
            person_generation: 'ALLOW_ADULT',
            seed: 12345,
            system_instruction: 'You are an award-winning concert photographer. Use dramatic lighting and shallow depth of field.',
            thinking_config: {
                thinking_budget: 3000,
            },
        },
    },
];

// === 测试执行 ===
async function runTest(test: TestCase, index: number): Promise<string> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 测试 ${index + 1}/${tests.length}: ${test.name}`);
    console.log(`📝 Prompt: ${(test.body.prompt as string).slice(0, 80)}...`);

    const params = Object.entries(test.body)
        .filter(([k]) => k !== 'prompt')
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(', ');
    if (params) console.log(`📎 参数: ${params}`);

    const startTime = Date.now();

    try {
        const response = await fetch(`${BASE_URL}/v1/images/generations`, {
            method: 'POST',
            headers,
            body: JSON.stringify(test.body),
        });

        const elapsed = Date.now() - startTime;

        if (!response.ok) {
            const errorText = await response.text();
            console.log(`❌ 失败 (HTTP ${response.status}) [${elapsed}ms]`);
            console.log(`   错误: ${errorText.slice(0, 300)}`);
            return `❌ ${test.name} → HTTP ${response.status}`;
        }

        const data = await response.json() as {
            created?: number;
            data?: Array<{ b64_json?: string; revised_prompt?: string }>;
        };

        console.log(`✅ 成功 (HTTP ${response.status}) [${elapsed}ms]`);
        console.log(`   created: ${data.created}`);

        if (data.data?.[0]) {
            const item = data.data[0];
            const imgSize = item.b64_json ? Math.round(item.b64_json.length * 3 / 4 / 1024) : 0;
            console.log(`   图片大小: ~${imgSize} KB`);
            console.log(`   revised_prompt: ${(item.revised_prompt || '(空)').slice(0, 120)}`);
        }
        return `✅ ${test.name} → 成功 [${elapsed}ms]`;
    } catch (error) {
        const elapsed = Date.now() - startTime;
        console.log(`❌ 异常 [${elapsed}ms]: ${error instanceof Error ? error.message : String(error)}`);
        return `❌ ${test.name} → 异常`;
    }
}

async function main() {
    console.log('🚀 开始图片生成参数真实测试...');
    console.log(`📡 服务地址: ${BASE_URL}`);
    console.log(`📋 共 ${tests.length} 个测试用例`);

    const results: string[] = [];

    for (let i = 0; i < tests.length; i++) {
        const result = await runTest(tests[i], i);
        results.push(result);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 测试结果汇总：');
    results.forEach(r => console.log(`   ${r}`));
    console.log(`${'='.repeat(60)}`);
    console.log('🏁 所有测试完成！');
}

main().catch(console.error);
