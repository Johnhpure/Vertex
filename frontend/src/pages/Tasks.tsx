/**
 * 任务页面组件
 * 展示图片生成任务列表，支持预览和下载
 * 采用卡片网格布局，配合 lightbox Modal 预览大图
 */

import { useState, useEffect, useCallback } from 'react'
import { getTasks, getTaskImageUrl, getTaskImageDownloadUrl } from '../api/client'
import type { TaskEntry } from '../api/client'
import './Tasks.css'

/** 格式化文件大小 */
function formatFileSize(bytes: number | undefined): string {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/** 格式化时间 */
function formatTime(isoString: string): string {
    try {
        const d = new Date(isoString)
        return d.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return isoString
    }
}

/** SVG 图标 - 预览（眼睛） */
function IconEye() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    )
}

/** SVG 图标 - 下载 */
function IconDownload() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    )
}

/** SVG 图标 - 图片（空状态） */
function IconImage() {
    return (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
        </svg>
    )
}

function Tasks() {
    // 任务列表数据
    const [tasks, setTasks] = useState<TaskEntry[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const pageSize = 12

    // 预览 Modal 状态
    const [previewTask, setPreviewTask] = useState<TaskEntry | null>(null)

    // 加载任务列表
    const fetchTasks = useCallback(async () => {
        setLoading(true)
        try {
            const resp = await getTasks({ page, page_size: pageSize })
            if (resp.data) {
                setTasks(resp.data.items)
                setTotal(resp.data.total)
            }
        } catch (err) {
            console.error('获取任务列表失败:', err)
        } finally {
            setLoading(false)
        }
    }, [page])

    useEffect(() => {
        fetchTasks()
    }, [fetchTasks])

    // 键盘关闭 Modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setPreviewTask(null)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const totalPages = Math.ceil(total / pageSize)

    return (
        <div className="tasks-page">
            {/* 页面标题 */}
            <div className="page-header">
                <h1 className="page-title">生成任务</h1>
                <p className="page-desc">浏览已成功生成的图片，支持预览和下载</p>
            </div>

            {/* 统计栏 */}
            {!loading && (
                <div className="tasks-stats">
                    共 <strong>{total}</strong> 条生成记录
                </div>
            )}

            {/* 加载中 */}
            {loading && (
                <div className="tasks-loading">加载中...</div>
            )}

            {/* 空状态 */}
            {!loading && tasks.length === 0 && (
                <div className="tasks-empty">
                    <div className="tasks-empty-icon">
                        <IconImage />
                    </div>
                    <div className="tasks-empty-text">暂无生成记录</div>
                    <div className="tasks-empty-sub">调用图片生成 API 后，成功的任务将在此展示</div>
                </div>
            )}

            {/* 卡片网格 */}
            {!loading && tasks.length > 0 && (
                <>
                    <div className="tasks-grid">
                        {tasks.map((task) => (
                            <div key={task.id} className="task-card">
                                {/* 图片区域 */}
                                <div className="task-image-wrapper">
                                    <img
                                        className="task-image"
                                        src={getTaskImageUrl(task.id)}
                                        alt={task.prompt}
                                        loading="lazy"
                                    />
                                    {/* 悬浮操作遮罩 */}
                                    <div className="task-image-overlay">
                                        <button
                                            className="overlay-btn overlay-btn-preview"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setPreviewTask(task)
                                            }}
                                        >
                                            <IconEye /> 预览
                                        </button>
                                        <a
                                            className="overlay-btn overlay-btn-download"
                                            href={getTaskImageDownloadUrl(task.id)}
                                            download
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <IconDownload /> 下载
                                        </a>
                                    </div>
                                </div>

                                {/* 信息区域 */}
                                <div className="task-info">
                                    <div className="task-prompt">{task.prompt}</div>
                                    <div className="task-meta">
                                        <span className="task-time">{formatTime(task.created_at)}</span>
                                        <span className="task-size">{formatFileSize(task.file_size)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 分页 */}
                    {totalPages > 1 && (
                        <div className="tasks-pagination">
                            <button
                                className="btn-page"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                ← 上一页
                            </button>
                            <span className="page-info">
                                {page} / {totalPages}
                            </span>
                            <button
                                className="btn-page"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            >
                                下一页 →
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* 预览 Modal */}
            {previewTask && (
                <div
                    className="modal-backdrop"
                    onClick={() => setPreviewTask(null)}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="modal-close-x"
                            onClick={() => setPreviewTask(null)}
                            title="关闭"
                        >
                            ✕
                        </button>
                        <img
                            className="modal-image"
                            src={getTaskImageUrl(previewTask.id)}
                            alt={previewTask.prompt}
                        />
                        <div className="modal-info">
                            <p className="modal-prompt">{previewTask.prompt}</p>
                        </div>
                        <div className="modal-actions">
                            <a
                                className="modal-btn modal-btn-download"
                                href={getTaskImageDownloadUrl(previewTask.id)}
                                download
                            >
                                <IconDownload /> 下载图片
                            </a>
                            <button
                                className="modal-btn modal-btn-close"
                                onClick={() => setPreviewTask(null)}
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Tasks
