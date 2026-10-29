import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // En desarrollo, /api y /uploads se envían al backend: misma URL, cookies HttpOnly sin CORS.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: {
    // three.js (~250 kB gzip) vive en su propio chunk y solo se descarga cuando se muestra una escena 3D.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(three|@react-three|react-reconciler|its-fine|suspend-react|react-use-measure)\//.test(id)) return 'three';
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react';
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion';
          // Resto de dependencias (zustand, lucide…) en un chunk propio para que no se mezclen con three.
          return 'vendor';
        },
      },
    },
  },
});
