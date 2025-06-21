import { defineConfig } from 'vite'
        import react from '@vitejs/plugin-react'

        // https://vitejs.dev/config/
        export default defineConfig({
          plugins: [react()],
          build: {
            // Asegura que los assets se referencien correctamente para el despliegue en subcarpetas si fuera necesario
            // Por ahora, 'base: /' es lo común para la raíz del dominio
            // Para el modo de desarrollo, las peticiones /api/* se redirigirán a Flask
            rollupOptions: {
              output: {
                // Configuración opcional para nombrar los archivos de salida
                // Por defecto, Vite ya maneja bien los nombres con hashes.
              }
            }
          },
          server: {
            // Configura un proxy para redirigir las llamadas a la API de Flask
            proxy: {
              '/api': {
                target: 'http://localhost:3000', // Donde corre tu servidor Flask
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '/api'), // Asegura que la ruta /api se mantenga
              },
            },
          },
        }) 
