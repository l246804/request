import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: false,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@rhao/request': resolve(__dirname, '../packages/request/src'),
      '@rhao/request-utils': resolve(__dirname, '../packages/utils/src'),
      '@rhao/request-basic-middleware': resolve(__dirname, '../packages/basic-middleware/src'),
      '@rhao/request-middleware-vue': resolve(__dirname, '../packages/middleware-vue/src'),
    },
  },
  plugins: [vue()],
})
