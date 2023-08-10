import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    include: [
      '@rhao/request',
      '@rhao/request-middleware-vue',
      '@rhao/request-middleware-axios',
      '@rhao/request-basic-middleware',
    ],
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
