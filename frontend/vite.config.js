import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    allowedHosts: ['cnrsystem.com.tr', 'www.cnrsystem.com.tr'],
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
