import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_PROXY_TARGET || env.VITE_API_BASE || 'http://192.168.1.72:9005'
  const enableProxy = command === 'serve' && mode === 'development'
  const server = {
    port: 5173,
    host: true,
    ...(enableProxy
      ? {
          proxy: {
            '/api': { target, changeOrigin: true },
            '/uploads': { target, changeOrigin: true },
          },
        }
      : {}),
  }
  return { plugins: [react()], server }
})
