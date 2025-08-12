import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', 'papaparse', 'date-fns', 'lucide-react', 'xlsx', '@tanstack/react-virtual']
  }
})