import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  // W6: test hooks and the local premium flag are compiled out of production builds (SB_TEST_HOOKS=1 keeps them).
  define: {
    __SB_TEST_HOOKS__: JSON.stringify(mode !== 'production' || process.env.SB_TEST_HOOKS === '1'),
  },
  server: {
    port: 5173,
    host: true,
    // Online play: in development the game server (`npm run server`, port 3001) answers /api and /ws.
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/ws': { target: 'ws://127.0.0.1:3001', ws: true },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
}));
