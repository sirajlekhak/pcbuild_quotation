import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5001',
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path.replace(/^\/api/, ''),
      // Add headers if needed for your Flask CORS configuration
      headers: {
        'Connection': 'keep-alive'
      }
    },
      '/quotations': {
        target: 'http://localhost:5001', // Your Flask backend port
        changeOrigin: true,
        secure: false
      }
    },
    cors: false // Let Flask handle CORS
  },
  build: {
    outDir: '../backend/static', // Output to Flask's static folder
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          lucide: ['lucide-react'],
          pdf: ['html2pdf.js']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'html2pdf.js']
  }
})