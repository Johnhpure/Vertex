/**
 * 日志页面 — 查看和筛选 API 调用日志
 * 支持日期范围筛选、状态筛选、分页导航
 * 使用 SVG 图标，暗黑科技风设计
 */

import { useState, useEffect, useCallback } from 'react'
import LogTable from '../components/LogTable'
import { getLogs, type LogEntry, type LogQueryParams } from '../api/client'
import './Logs.css'

/** SVG 图标 - 搜索/筛选 */
function IconFilter() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
    )
}

/** SVG 图标 - 重置 */
function IconRefresh() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
    )
}

function Logs() {
    const [items, setItems] = useState<LogEntry[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [pageSize] = useState(20)
    const [loading, setLoading] = useState(true)

    // 筛选条件
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    /** 加载日志 */
    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true)
            const params: LogQueryParams = {
                page,
                page_size: pageSize,
            }
            if (startDate) params.start_date = startDate
            if (endDate) params.end_date = endDate
            if (statusFilter) params.status = statusFilter

            const res = await getLogs(params)
            if (res.data) {
                setItems(res.data.items)
                setTotal(res.data.total)
            }
        } catch (err) {
            console.error('获取日志失败:', err)
            setItems([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, startDate, endDate, statusFilter])

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    /** 重置筛选并回到第 1 页 */
    const handleReset = () => {
        setStartDate('')
        setEndDate('')
        setStatusFilter('')
        setPage(1)
    }

    /** 筛选提交 */
    const handleFilter = () => {
        setPage(1)
    }

    return (
        <div className="logs-page">
            <div className="page-header">
                <h1 className="page-title">请求日志</h1>
                <p className="page-desc">查看所有 API 调用记录和错误日志</p>
            </div>

            {/* 筛选区域 */}
            <div className="filter-bar">
                <div className="filter-group">
                    <label className="filter-label" htmlFor="log-start-date">开始日期</label>
                    <input
                        id="log-start-date"
                        type="date"
                        className="filter-input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <label className="filter-label" htmlFor="log-end-date">结束日期</label>
                    <input
                        id="log-end-date"
                        type="date"
                        className="filter-input"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <label className="filter-label" htmlFor="log-status">状态</label>
                    <select
                        id="log-status"
                        className="filter-input"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">全部</option>
                        <option value="success">成功</option>
                        <option value="error">失败</option>
                    </select>
                </div>
                <div className="filter-actions">
                    <button className="btn btn-accent" onClick={handleFilter}>
                        <IconFilter /> 筛选
                    </button>
                    <button className="btn btn-ghost" onClick={handleReset}>
                        <IconRefresh /> 重置
                    </button>
                </div>
            </div>

            {/* 统计栏 */}
            <div className="logs-stats">
                共 <strong>{total}</strong> 条记录 · 第 {page}/{totalPages} 页
            </div>

            {/* 日志表格 */}
            <LogTable items={items} loading={loading} />

            {/* 分页导航 */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="btn btn-page"
                        disabled={page <= 1}
                        onClick={() => setPage(1)}
                    >
                        首页
                    </button>
                    <button
                        className="btn btn-page"
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        上一页
                    </button>
                    <span className="page-info">{page} / {totalPages}</span>
                    <button
                        className="btn btn-page"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        下一页
                    </button>
                    <button
                        className="btn btn-page"
                        disabled={page >= totalPages}
                        onClick={() => setPage(totalPages)}
                    >
                        末页
                    </button>
                </div>
            )}
        </div>
    )
}

export default Logs
