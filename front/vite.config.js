import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_BACKEND_PROXY || 'http://localhost:4000';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      // Generar sourcemaps solo en desarrollo (nunca en builds desplegados)
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor core: React + ReactDOM (se cachean a largo plazo)
            'vendor-react': ['react', 'react-dom'],
            // Router en su propio chunk
            'vendor-router': ['react-router-dom'],
            // Socket.io-client (~80KB) separado
            'vendor-socket': ['socket.io-client'],
            // Headless UI separado (~50KB)
            'vendor-headlessui': ['@headlessui/react'],
            // FontAwesome core + iconos en un chunk dedicado
            'vendor-fontawesome': [
              '@fortawesome/fontawesome-svg-core',
              '@fortawesome/react-fontawesome',
              '@fortawesome/free-solid-svg-icons',
              '@fortawesome/free-regular-svg-icons',
            ],
            // jsPDF separado (solo se usa en validaciones/vehículos)
            'vendor-jspdf': ['jspdf'],
            // Axios + utilidades HTTP
            'vendor-http': ['axios'],
          },
        },
      },
      // Incrementar el límite de aviso de chunk para evitar ruido
      chunkSizeWarningLimit: 600,
    },
  };
})
