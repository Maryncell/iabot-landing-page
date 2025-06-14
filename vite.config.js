import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/iabot-landing-page/', // <-- ¡Añade esta línea!
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000' // Proxy para el backend (solo para desarrollo local)
    }
  },
  build: {
    outDir: 'dist' // Directorio de salida para el build
  }
});
  
