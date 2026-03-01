/**
 * 费用统计页面
 * 展示当月统计卡片、赠金进度条、月度预算编辑
 * 使用 SVG 图标，暗黑科技风设计
 */

import { useState, useEffect, useCallback } from 'react'
import StatsCard from '../components/StatsCard'
import { getStats, updateSystemConfig, type StatsData } from '../api/client'
import './Stats.css'

/** 提示消息类型 */
interface Toast {
    type: 'success' | 'error'
    message: string
}

/* ========== SVG 图标组件 ========== */

function IconPhone() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    )
}

function IconCheck() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}

function IconDollar() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    )
}

function IconWallet() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M22 10H2" />
            <circle cx="17" cy="15" r="1" />
        </svg>
    )
}

function IconCreditCard() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
    )
}

function IconEdit() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    )
}

function IconSave() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
        </svg>
    )
}

function IconAlertTriangle() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    )
}

function IconInfo() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
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

function Stats() {
    const [stats, setStats] = useState<StatsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [month, setMonth] = useState(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })
    const [toast, setToast] = useState<Toast | null>(null)

    // 预算编辑状态
    const [editingBudget, setEditingBudget] = useState(false)
    const [budgetInput, setBudgetInput] = useState('')
    const [saving, setSaving] = useState(false)

    /** 显示提示 */
    const showToast = useCallback((type: Toast['type'], message: string) => {
        setToast({ type, message })
        setTimeout(() => setToast(null), 4000)
    }, [])

    /** 加载统计数据 */
    const fetchStats = useCallback(async () => {
        try {
            setLoading(true)
            const res = await getStats(month)
            if (res.data) {
                setStats(res.data)
            }
        } catch (err) {
            console.error('获取统计数据失败:', err)
            showToast('error', '获取统计数据失败')
        } finally {
            setLoading(false)
        }
    }, [month, showToast])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    /** 开始编辑预算 */
    const startEditBudget = () => {
        setBudgetInput(String(stats?.monthly_budget ?? 100))
        setEditingBudget(true)
    }

    /** 保存预算 */
    const saveBudget = async () => {
        const value = parseFloat(budgetInput)
        if (isNaN(value) || value < 0) {
            showToast('error', '请输入有效的预算金额')
            return
        }

        try {
            setSaving(true)
            await updateSystemConfig({ monthly_budget: value })
            showToast('success', '月度预算已更新！')
            setEditingBudget(false)
            await fetchStats()
        } catch (err) {
            console.error('更新预算失败:', err)
            showToast('error', '更新预算失败')
        } finally {
            setSaving(false)
        }
    }

    /** 取消编辑 */
    const cancelEditBudget = () => {
        setEditingBudget(false)
        setBudgetInput('')
    }

    /** 计算进度条百分比 */
    const budgetUsedPercent = stats
        ? Math.min(100, Math.max(0, ((stats.monthly_budget - stats.budget_remaining) / stats.monthly_budget) * 100))
        : 0

    /** 根据使用比例确定进度条颜色 */
    const getProgressColor = (percent: number): string => {
        if (percent >= 90) return 'progress-danger'
        if (percent >= 70) return 'progress-warning'
        return 'progress-normal'
    }

    /** 格式化费用显示 */
    const formatCost = (cost: number): string => {
        if (cost < 0.01) return `$${cost.toFixed(4)}`
        return `$${cost.toFixed(2)}`
    }

    /** 月份导航 */
    const changeMonth = (delta: number) => {
        const [y, m] = month.split('-').map(Number)
        const d = new Date(y, m - 1 + delta, 1)
        setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    /** 格式化月份显示 */
    const formatMonth = (m: string): string => {
        const [year, mon] = m.split('-')
        return `${year} 年 ${parseInt(mon, 10)} 月`
    }

    return (
        <div className="stats-page">
            <div className="page-header">
                <h1 className="page-title">使用统计</h1>
                <p className="page-desc">查看 API 调用量、成功率和费用概览</p>
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

            {/* 月份选择 */}
            <div className="month-selector">
                <button className="btn btn-nav" onClick={() => changeMonth(-1)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                    上月
                </button>
                <span className="month-display">{formatMonth(month)}</span>
                <button className="btn btn-nav" onClick={() => changeMonth(1)}>
                    下月
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
            </div>

            {loading ? (
                <div className="stats-loading">
                    <div className="loading-spinner" />
                    <span>正在加载统计数据...</span>
                </div>
            ) : stats ? (
                <>
                    {/* 统计卡片网格 */}
                    <div className="stats-grid">
                        <StatsCard
                            icon={<IconPhone />}
                            title="总调用数"
                            value={stats.total_calls}
                            subtitle={`成功 ${stats.successful_calls} / 失败 ${stats.failed_calls}`}
                        />
                        <StatsCard
                            icon={<IconCheck />}
                            title="成功率"
                            value={`${stats.success_rate}%`}
                            className={stats.success_rate >= 90 ? 'card-good' : stats.success_rate >= 50 ? 'card-warning' : 'card-danger'}
                        />
                        <StatsCard
                            icon={<IconDollar />}
                            title="费用估算"
                            value={formatCost(stats.total_cost)}
                            subtitle="估算值，仅供参考"
                        />
                        <StatsCard
                            icon={<IconWallet />}
                            title="预算剩余"
                            value={formatCost(stats.budget_remaining)}
                            subtitle={`上限 ${formatCost(stats.monthly_budget)}`}
                            className={stats.budget_remaining < 0 ? 'card-danger' : stats.budget_remaining / stats.monthly_budget < 0.2 ? 'card-warning' : ''}
                        />
                    </div>

                    {/* 赠金进度条 */}
                    <section className="budget-section">
                        <div className="budget-header">
                            <h2 className="section-title">
                                <span className="section-icon"><IconCreditCard /></span>
                                赠金消耗进度
                            </h2>
                            {!editingBudget ? (
                                <button className="btn btn-accent btn-sm" onClick={startEditBudget}>
                                    <IconEdit /> 修改预算
                                </button>
                            ) : (
                                <div className="budget-edit">
                                    <span className="budget-edit-label">$</span>
                                    <input
                                        type="number"
                                        className="budget-input"
                                        value={budgetInput}
                                        onChange={(e) => setBudgetInput(e.target.value)}
                                        min="0"
                                        step="1"
                                        autoFocus
                                    />
                                    <button
                                        className="btn btn-success btn-sm"
                                        onClick={saveBudget}
                                        disabled={saving}
                                    >
                                        <IconSave /> {saving ? '保存中...' : '保存'}
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={cancelEditBudget}
                                    >
                                        取消
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="progress-bar-container">
                            <div className="progress-bar-track">
                                <div
                                    className={`progress-bar-fill ${getProgressColor(budgetUsedPercent)}`}
                                    style={{ width: `${budgetUsedPercent}%` }}
                                />
                            </div>
                            <div className="progress-labels">
                                <span className="progress-used">
                                    已用 {formatCost(stats.total_cost)}
                                </span>
                                <span className="progress-percent">
                                    {budgetUsedPercent.toFixed(1)}%
                                </span>
                                <span className="progress-total">
                                    上限 {formatCost(stats.monthly_budget)}
                                </span>
                            </div>
                        </div>

                        {stats.budget_remaining < 0 && (
                            <div className="budget-warning">
                                <IconAlertTriangle />
                                当月费用已超出预算 {formatCost(Math.abs(stats.budget_remaining))}
                            </div>
                        )}
                    </section>

                    {/* 估算说明 */}
                    <div className="estimate-disclaimer">
                        <IconInfo />
                        <span>
                            所有费用数据均为<strong>估算值</strong>，基于 Gemini token 定价计算，
                            与 Google Cloud Console 实际账单可能有偏差。
                        </span>
                    </div>
                </>
            ) : (
                <div className="stats-empty">暂无统计数据</div>
            )}
        </div>
    )
}

export default Stats
