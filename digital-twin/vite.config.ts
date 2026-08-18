import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Separate port from the existing CRA client (3000) and Express API (5000)
// so both apps in this repo can run side by side during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5183,
  },
});
