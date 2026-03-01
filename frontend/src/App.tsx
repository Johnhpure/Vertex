/**
 * 应用根组件
 * 配置 react-router-dom 路由，使用 Layout 组件提供统一导航
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Logs from './pages/Logs'
import Stats from './pages/Stats'
import Settings from './pages/Settings'
import Tasks from './pages/Tasks'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Layout 作为父路由，为所有子页面提供统一导航栏 */}
        <Route element={<Layout />}>
          {/* 默认重定向到日志页面 */}
          <Route path="/" element={<Navigate to="/logs" replace />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
