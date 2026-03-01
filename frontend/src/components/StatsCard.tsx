/**
 * 统计卡片组件
 * 展示单个统计指标，使用 SVG 图标替代 emoji
 * 支持 glassmorphism 卡片风格和 accent 发光
 */

import type { ReactNode } from 'react'

interface StatsCardProps {
    /** 卡片标题 */
    title: string;
    /** 统计数值 */
    value: string | number;
    /** SVG 图标节点 */
    icon: ReactNode;
    /** 副标题/描述 */
    subtitle?: string;
    /** 额外的 CSS class */
    className?: string;
}

function StatsCard({ title, value, icon, subtitle, className = '' }: StatsCardProps) {
    return (
        <div className={`stats-card ${className}`}>
            <div className="stats-card-icon">{icon}</div>
            <div className="stats-card-body">
                <span className="stats-card-title">{title}</span>
                <span className="stats-card-value">{value}</span>
                {subtitle && <span className="stats-card-subtitle">{subtitle}</span>}
            </div>
        </div>
    )
}

export default StatsCard
