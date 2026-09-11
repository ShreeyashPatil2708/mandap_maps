import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Content Security Policy, injected as a <meta> tag into the production build
 * only (dev relies on inline HMR scripts). Scripts may only come from our own
 * origin, so injected markup can't run code. Styles allow 'unsafe-inline' for
 * the inline style attributes React and Leaflet set; images allow any https
 * host (OSM tiles, future photos; images can't execute). frame-ancestors can't
 * be set from a meta tag: clickjacking is covered by the X-Frame-Options header
 * from the CloudFront security headers policy.
 */
function contentSecurityPolicy() {
  const connect = ["'self'"];
  if (process.env.VITE_API_URL) connect.push(new URL(process.env.VITE_API_URL).origin);
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https:",
    `connect-src ${connect.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  return {
    name: 'mandapmaps-csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
        injectTo: 'head-prepend',
      },
    ],
  };
}

// Frontend builds to static files -> S3 -> CloudFront (see architecture notes).
export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
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
    sourcemap: true,
  },
});
