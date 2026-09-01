import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend builds to static files -> S3 -> CloudFront (see architecture notes).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Local dev: forward API calls to the backends so we don't need CORS.
      // The chatbot is a separate Python service, so /api/chat goes to it;
      // everything else goes to the Node backend. List /api/chat first so it
      // wins over the more general /api rule.
      '/api/chat': {
        target: process.env.VITE_DEV_CHATBOT_PROXY || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api': {
        target: process.env.VITE_DEV_API_PROXY || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    // No source maps in the prod bundle: they expose readable source on the
    // public CDN and add transfer/storage. Flip to true locally when debugging.
    sourcemap: false,
  },
});
