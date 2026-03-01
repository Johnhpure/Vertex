import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 将 API 请求代理到后端开发服务器
      '/api': 'http://localhost:3000',
      '/v1': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    }
  }
})
