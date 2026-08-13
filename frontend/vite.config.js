import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend builds to static files -> S3 -> CloudFront (see architecture notes).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Local dev: forward API calls to the backend so we don't need CORS.
      '/api': {
        target: process.env.VITE_DEV_API_PROXY || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
