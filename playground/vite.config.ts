import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    include: ['@rhao/request', '@rhao/request-basic-middleware', '@rhao/request-middleware-vue'],
  },
  build: {
    minify: false,
    sourcemap: true,
    commonjsOptions: {
      include: [/@rhao\/.+/, /node_modules/],
    },
  },
  plugins: [vue()],
})
