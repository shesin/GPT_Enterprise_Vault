import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

function playBoardAsRoot(): Plugin {
  return {
    name: 'play-board-as-root',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url === '/index.html') {
          req.url = '/play-board.html';
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const isPlayDev = mode === 'play';

  return {
    server: {
      port: isPlayDev ? 5174 : 5173,
      open: isPlayDev ? '/' : '/',
    },
    plugins: isPlayDev ? [playBoardAsRoot()] : [],
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          play: path.resolve(__dirname, 'play-board.html'),
        },
      },
    },
  };
});
