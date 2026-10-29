import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative base so the build works on any host or sub-path (e.g. GitHub Pages).
  base: './',
  plugins: [react()],
  server: { host: true },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1800,
  },
})
