import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** Developer-only pages in public/ stay available on the dev server but are not shipped in a production build. */
const DEV_ONLY_PAGES = ['sound-preview.html'];
function dropDevOnlyPages(): Plugin {
  let outDir = 'dist';
  return {
    name: 'drop-dev-only-pages',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      for (const page of DEV_ONLY_PAGES) fs.rmSync(path.join(outDir, page), { force: true });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [dropDevOnlyPages()],
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
