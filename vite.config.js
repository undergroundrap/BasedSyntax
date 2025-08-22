import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// No extra Monaco plugin needed — @monaco-editor/react works fine with Vite.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, '')
      }
    }
  }
})
