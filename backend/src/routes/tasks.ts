/**
 * 任务路由
 * 提供图片生成任务的查询和图片下载功能
 * GET /api/tasks — 分页查询任务列表
 * GET /api/tasks/:id/image — 下载/预览指定任务的图片
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router, type Request, type Response } from 'express';
import { queryTasks, getTaskById } from '../db/tasks-dao.js';

// ESM 兼容的路径解析
const __filename_tasks = fileURLToPath(import.meta.url);
const __dirname_tasks = path.dirname(__filename_tasks);

/** 图片存储目录 */
const IMAGES_DIR = path.resolve(__dirname_tasks, '../../../data/images');

const router = Router();

/**
 * GET /api/tasks
 * 查询任务列表（分页）
 */
router.get('/api/tasks', (req: Request, res: Response): void => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.page_size as string) || 20;

        const result = queryTasks({ page, page_size: pageSize });

        res.json({
            success: true,
            data: {
                items: result.items,
                total: result.total,
                page,
                page_size: pageSize,
            },
        });
    } catch (error) {
        console.error('[Tasks] 查询任务失败:', error instanceof Error ? error.message : error);
        res.status(500).json({
            success: false,
            error: '查询任务失败',
        });
    }
});

/**
 * GET /api/tasks/:id/image
 * 获取指定任务的图片文件（支持预览和下载）
 * 查询参数 download=1 时触发下载，否则内联显示（预览）
 */
router.get('/api/tasks/:id/image', (req: Request, res: Response): void => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            res.status(400).json({ success: false, error: '无效的任务 ID' });
            return;
        }

        const task = getTaskById(id);
        if (!task) {
            res.status(404).json({ success: false, error: '任务不存在' });
            return;
        }

        const imagePath = path.join(IMAGES_DIR, task.image_filename);
        if (!fs.existsSync(imagePath)) {
            res.status(404).json({ success: false, error: '图片文件不存在' });
            return;
        }

        // 设置响应头
        const isDownload = req.query.download === '1';
        res.setHeader('Content-Type', 'image/png');

        if (isDownload) {
            // 下载模式：设置 Content-Disposition 为 attachment
            res.setHeader('Content-Disposition', `attachment; filename="${task.image_filename}"`);
        } else {
            // 预览模式：设置 Content-Disposition 为 inline
            res.setHeader('Content-Disposition', `inline; filename="${task.image_filename}"`);
        }

        // 读取并发送图片
        const imageBuffer = fs.readFileSync(imagePath);
        res.send(imageBuffer);
    } catch (error) {
        console.error('[Tasks] 获取图片失败:', error instanceof Error ? error.message : error);
        res.status(500).json({
            success: false,
            error: '获取图片失败',
        });
    }
});

export default router;
