import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // One React even when @voult/react is linked locally (npm link / file:) during development.
  resolve: { dedupe: ['react', 'react-dom'] },
  publicDir: '../public',
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:2000',
        changeOrigin: true,
      },
    },
  },
});
