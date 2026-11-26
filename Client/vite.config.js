import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        xlsx: 'xlsx/xlsx.mjs'
      }
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://192.168.100.11:5000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@mui')) return 'mui-vendor';
              if (id.includes('chart.js') || id.includes('recharts') || id.includes('react-chartjs-2')) return 'chart-vendor';
              if (id.includes('xlsx') || id.includes('jspdf') || id.includes('tesseract.js') || id.includes('html2canvas')) return 'heavy-utils';
              if (id.includes('react') || id.includes('redux') || id.includes('axios') || id.includes('i18next')) return 'framework-vendor';
              return 'vendor';
            }
          }
        }
      },
      chunkSizeWarningLimit: 1000
    }
  }
})
