import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/cloud': {
        target: 'https://env-00jy6bcqqsjw.dev-hz.cloudbasefunction.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cloud/, '')
      }
    }
  },
  preview: {
    allowedHosts: ['.trycloudflare.com'],
  },
})
