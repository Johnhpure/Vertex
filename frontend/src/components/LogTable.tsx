/**
 * 日志表格组件
 * 可展开行查看重试详情
 * 使用 SVG 图标替代 emoji
 */

import { useState } from 'react'
import type { LogEntry } from '../api/client'

interface LogTableProps {
    items: LogEntry[]
    loading: boolean
}

/** 截断文本 */
function truncate(text: string | undefined, maxLen: number): string {
    if (!text) return '—'
    return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

/** 格式化时间 */
function formatTime(timestamp: string): string {
    try {
        const d = new Date(timestamp)
        return d.toLocaleString('zh-CN', {
            month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        })
    } catch {
        return timestamp
    }
}

/** 格式化耗时 */
function formatDuration(ms: number | undefined): string {
    if (ms === undefined || ms === null) return '—'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
}

/** 格式化费用 */
function formatCost(cost: number | undefined): string {
    if (cost === undefined || cost === null) return '—'
    return `$${cost.toFixed(4)}`
}

function LogTable({ items, loading }: LogTableProps) {
    const [expandedId, setExpandedId] = useState<number | null>(null)

    if (loading) {
        return (
            <div className="table-loading">
                正在加载日志...
            </div>
        )
    }

    if (items.length === 0) {
        return <div className="table-empty">暂无日志记录</div>
    }

    return (
        <div className="log-table-wrapper">
            <table className="log-table">
                <thead>
                    <tr>
                        <th>时间</th>
                        <th>Prompt</th>
                        <th>状态</th>
                        <th>耗时</th>
                        <th>重试</th>
                        <th>费用</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((log) => {
                        const isExpanded = expandedId === log.id
                        const hasRetry = log.retry_count > 0 && log.retry_details

                        return (
                            <>
                                <tr
                                    key={log.id}
                                    className={`log-row ${hasRetry ? 'expandable' : ''} ${isExpanded ? 'expanded' : ''}`}
                                    onClick={() => hasRetry && setExpandedId(isExpanded ? null : log.id)}
                                >
                                    <td className="col-time">{formatTime(log.timestamp)}</td>
                                    <td className="col-prompt" title={log.prompt}>{truncate(log.prompt, 40)}</td>
                                    <td>
                                        <span className={`status-tag status-${log.status}`}>
                                            {log.status === 'success' ? (
                                                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> 成功</>
                                            ) : (
                                                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> 失败</>
                                            )}
                                        </span>
                                    </td>
                                    <td className="col-duration">{formatDuration(log.response_time_ms)}</td>
                                    <td className="col-retry">
                                        {log.retry_count > 0 ? (
                                            <span className="retry-badge">
                                                {log.retry_count}次 {hasRetry ? (
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points={isExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} /></svg>
                                                ) : ''}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="col-cost">{formatCost(log.estimated_cost)}</td>
                                </tr>
                                {isExpanded && hasRetry && (
                                    <tr key={`${log.id}-detail`} className="retry-detail-row">
                                        <td colSpan={6}>
                                            <div className="retry-detail-content">
                                                <strong>重试详情：</strong>
                                                <pre className="retry-json">
                                                    {JSON.stringify(JSON.parse(log.retry_details!), null, 2)}
                                                </pre>
                                                {log.error_message && (
                                                    <div className="error-msg">
                                                        <strong>错误信息：</strong> {log.error_message}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

export default LogTable
