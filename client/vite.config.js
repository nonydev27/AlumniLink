import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  // Local development talks to the live API; production uses VITE_API_BASE_URL
  // or a reverse proxy in front of both services.
  server: {
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET || 'http://localhost:4000', changeOrigin: true },
    },
  },
})

