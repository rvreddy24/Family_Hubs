import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

/** Public Render (or other) origin for Socket.io + API when building for production. */
const PRODUCTION_SOCKET_URL = 'https://family-hubs.onrender.com';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const viteSocketUrl =
    env.VITE_SOCKET_URL || (mode === 'production' ? PRODUCTION_SOCKET_URL : '');

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      ...(viteSocketUrl
        ? {'import.meta.env.VITE_SOCKET_URL': JSON.stringify(viteSocketUrl)}
        : {}),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Proxy API and Socket.io requests to Express backend
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          ws: true,
        },
        '/health': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
