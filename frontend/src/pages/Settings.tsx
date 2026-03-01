/**
 * 设置页面 — 服务账号与 API Key 管理
 * 显示当前服务账号状态，支持上传/删除操作
 * 使用 SVG 图标，暗黑科技风设计
 */

import { useState, useEffect, useCallback } from 'react'
import FileUpload from '../components/FileUpload'
import {
    getServiceAccount,
    uploadServiceAccount,
    deleteServiceAccount,
    type ServiceAccountStatus,
} from '../api/client'
import './Settings.css'

/** 提示消息类型 */
interface Toast {
    type: 'success' | 'error'
    message: string
}

/* ========== SVG 图标组件 ========== */

function IconKey() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
    )
}

function IconTrash() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    )
}

function IconCheckCircle() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}

function IconXCircle() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    )
}

function IconAlertTriangle() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    )
}

function Settings() {
    const [accountStatus, setAccountStatus] = useState<ServiceAccountStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [toast, setToast] = useState<Toast | null>(null)

    /** 自动隐藏提示 */
    const showToast = useCallback((type: Toast['type'], message: string) => {
        setToast({ type, message })
        setTimeout(() => setToast(null), 4000)
    }, [])

    /** 加载服务账号状态 */
    const fetchStatus = useCallback(async () => {
        try {
            setLoading(true)
            const res = await getServiceAccount()
            if (res.data) {
                setAccountStatus(res.data)
            }
        } catch (err) {
            showToast('error', '获取服务账号状态失败')
            console.error('获取状态失败:', err)
        } finally {
            setLoading(false)
        }
    }, [showToast])

    useEffect(() => {
        fetchStatus()
    }, [fetchStatus])

    /** 处理文件上传 */
    const handleUpload = async (content: Record<string, unknown>) => {
        try {
            setUploading(true)
            const res = await uploadServiceAccount(content)
            if (res.success && res.data) {
                setAccountStatus(res.data)
                showToast('success', '服务账号上传成功！')
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : '上传失败'
            showToast('error', message)
        } finally {
            setUploading(false)
        }
    }

    /** 处理删除操作 */
    const handleDelete = async () => {
        try {
            await deleteServiceAccount()
            setAccountStatus({ status: 'not_configured' })
            setShowDeleteConfirm(false)
            showToast('success', '服务账号已删除')
        } catch (err) {
            const message = err instanceof Error ? err.message : '删除失败'
            showToast('error', message)
        }
    }

    const isConfigured = accountStatus?.status === 'configured'

    return (
        <div className="settings-page">
            <div className="page-header">
                <h1 className="page-title">系统设置</h1>
                <p className="page-desc">管理 Google Cloud 服务账号和 API 配置</p>
            </div>

            {/* 提示消息 */}
            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    <span className="toast-icon">
                        {toast.type === 'success' ? <IconCheckCircle /> : <IconXCircle />}
                    </span>
                    {toast.message}
                </div>
            )}

            {/* 服务账号状态卡片 */}
            <section className="settings-card">
                <h2 className="card-title">
                    <span className="card-title-icon"><IconKey /></span>
                    Google Cloud 服务账号
                </h2>

                {loading ? (
                    <div className="card-loading">
                        <div className="loading-spinner-sm" />
                        <span>加载中...</span>
                    </div>
                ) : isConfigured ? (
                    <div className="account-info">
                        <div className="status-badge status-configured">
                            <span className="status-dot status-dot-green" />
                            已配置
                        </div>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">项目 ID</span>
                                <span className="info-value">{accountStatus?.project_id}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">服务邮箱</span>
                                <span className="info-value">{accountStatus?.client_email}</span>
                            </div>
                        </div>

                        <div className="card-actions">
                            <button
                                className="btn btn-danger"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                <IconTrash /> 删除服务账号
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="account-not-configured">
                        <div className="status-badge status-not-configured">
                            <span className="status-dot status-dot-yellow" />
                            未配置
                        </div>
                        <p className="not-configured-hint">
                            请上传 Google Cloud 服务账号 JSON 密钥文件以启用 Vertex AI 功能
                        </p>
                    </div>
                )}

                {/* 文件上传区域 */}
                <div className="upload-section">
                    <h3 className="upload-title">
                        {isConfigured ? '更新服务账号' : '上传服务账号'}
                    </h3>
                    <FileUpload
                        onUpload={handleUpload}
                        disabled={uploading}
                    />
                    {uploading && (
                        <p className="uploading-text">
                            <span className="loading-spinner-xs" />
                            正在上传并验证...
                        </p>
                    )}
                </div>
            </section>

            {/* 删除确认弹窗 */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-icon">
                            <IconAlertTriangle />
                        </div>
                        <h3 className="modal-title">确认删除</h3>
                        <p className="modal-text">
                            确定要删除当前服务账号吗？删除后 Vertex AI 功能将不可用。
                        </p>
                        <div className="modal-actions">
                            <button
                                className="btn btn-ghost"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                取消
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDelete}
                            >
                                <IconTrash /> 确认删除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Settings
