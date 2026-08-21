import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This app now serves the whole product (the former client/ CRA app has
// been merged in). `/api` is proxied to the Express backend so the browser
// sees everything as one same-origin app in dev too — no CORS, no auth
// handoff needed. Override the target with API_PROXY_TARGET if the
// backend's default port (5000) is unavailable locally (e.g. macOS's
// AirPlay Receiver also listens on 5000 by default).
const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5183,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
