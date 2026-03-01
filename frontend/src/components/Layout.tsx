/**
 * 布局组件
 * 提供统一侧边导航和内容区容器
 * 使用 SVG 图标替代 emoji，遵循 ui-ux-pro-max 规范
 */

import { NavLink, Outlet } from 'react-router-dom'
import './Layout.css'

/** SVG 图标组件 - 日志（文档列表） */
function IconLogs() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
        </svg>
    )
}

/** SVG 图标组件 - 统计（柱状图） */
function IconStats() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
    )
}

/** SVG 图标组件 - 设置（齿轮） */
function IconSettings() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    )
}

/** SVG 图标组件 - 任务（图片） */
function IconTasks() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
        </svg>
    )
}

/** SVG 图标组件 - Logo（神经网络/AI 节点） */
function IconLogo() {
    return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="url(#logo-gradient)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <defs>
                <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="2" fill="url(#logo-gradient)" />
            <circle cx="12" cy="4" r="1.5" />
            <circle cx="18.5" cy="8" r="1.5" />
            <circle cx="18.5" cy="16" r="1.5" />
            <circle cx="12" cy="20" r="1.5" />
            <circle cx="5.5" cy="16" r="1.5" />
            <circle cx="5.5" cy="8" r="1.5" />
            <line x1="12" y1="5.5" x2="12" y2="10" />
            <line x1="17.2" y1="9" x2="14" y2="11" />
            <line x1="17.2" y1="15" x2="14" y2="13" />
            <line x1="12" y1="18.5" x2="12" y2="14" />
            <line x1="6.8" y1="15" x2="10" y2="13" />
            <line x1="6.8" y1="9" x2="10" y2="11" />
        </svg>
    )
}

function Layout() {
    return (
        <div className="app-layout">
            {/* 侧边导航栏 */}
            <aside className="sidebar">
                <div className="sidebar-inner">
                    {/* Logo 区域 */}
                    <div className="sidebar-brand">
                        <div className="brand-icon">
                            <IconLogo />
                        </div>
                        <div className="brand-text">
                            <span className="brand-name">Vertex AI</span>
                            <span className="brand-sub">Gateway</span>
                        </div>
                    </div>

                    {/* 导航链接 */}
                    <nav className="sidebar-nav">
                        <NavLink
                            to="/logs"
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                            }
                        >
                            <span className="sidebar-link-icon"><IconLogs /></span>
                            <span className="sidebar-link-text">请求日志</span>
                        </NavLink>
                        <NavLink
                            to="/tasks"
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                            }
                        >
                            <span className="sidebar-link-icon"><IconTasks /></span>
                            <span className="sidebar-link-text">生成任务</span>
                        </NavLink>
                        <NavLink
                            to="/stats"
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                            }
                        >
                            <span className="sidebar-link-icon"><IconStats /></span>
                            <span className="sidebar-link-text">使用统计</span>
                        </NavLink>
                        <NavLink
                            to="/settings"
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                            }
                        >
                            <span className="sidebar-link-icon"><IconSettings /></span>
                            <span className="sidebar-link-text">系统设置</span>
                        </NavLink>
                    </nav>

                    {/* 底部版本信息 */}
                    <div className="sidebar-footer">
                        <div className="sidebar-version">
                            <span className="version-dot" />
                            <span>系统运行中</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* 移动端顶部导航 */}
            <header className="mobile-header">
                <div className="mobile-brand">
                    <IconLogo />
                    <span className="mobile-title">Vertex AI Gateway</span>
                </div>
                <nav className="mobile-nav">
                    <NavLink to="/logs" className={({ isActive }) => `mobile-link ${isActive ? 'mobile-link-active' : ''}`}>
                        <IconLogs />
                    </NavLink>
                    <NavLink to="/tasks" className={({ isActive }) => `mobile-link ${isActive ? 'mobile-link-active' : ''}`}>
                        <IconTasks />
                    </NavLink>
                    <NavLink to="/stats" className={({ isActive }) => `mobile-link ${isActive ? 'mobile-link-active' : ''}`}>
                        <IconStats />
                    </NavLink>
                    <NavLink to="/settings" className={({ isActive }) => `mobile-link ${isActive ? 'mobile-link-active' : ''}`}>
                        <IconSettings />
                    </NavLink>
                </nav>
            </header>

            {/* 页面内容区 */}
            <main className="main-content">
                <div className="content-inner">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}

export default Layout
