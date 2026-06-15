import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.VITE_API_TARGET || 'https://localhost:3011'

const proxyOptions = {
  target: apiTarget,
  changeOrigin: true,
  secure: false,
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
  server: {
    proxy: {
      '/auth': proxyOptions,
      '/beacons': proxyOptions,
      '/history': proxyOptions,
      '/settings': proxyOptions,
      '/floor-plan': proxyOptions,
      '/socket.io': {
        ...proxyOptions,
        ws: true,
      },
    },
  },
  build: {
    outDir: process.env.VITE_BUILD_OUT_DIR || '../nodeapp/public',
    emptyOutDir: true,
  },
})
