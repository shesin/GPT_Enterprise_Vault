/**
 * Entry point. Development: `npm run server` (runs the TypeScript directly).
 * Hosting: `npm run build` (site -> dist/), `npm run build:server` (-> server-dist/main.js), then `npm start`.
 * Environment: PORT (default 3000), STATIC_DIR (default: the dist/ folder next to the server),
 * TRUST_PROXY=1 when a reverse proxy sits in front (rate limits then use the X-Forwarded-For client address).
 */
import { existsSync } from 'fs';
import path from 'path';
import { startApp } from './app';

function findStaticDir(): string | undefined {
  const candidates = [
    process.env.STATIC_DIR,
    path.resolve(__dirname, '../dist'), // bundled: server-dist/main.js
    path.resolve(__dirname, '../../../dist'), // tsx: PROJECTS/SmartBeads/server/main.ts
  ];
  for (const c of candidates) if (c && existsSync(path.join(c, 'index.html'))) return c;
  return undefined;
}

// One bad request must never end every running game: log the fault and keep serving.
process.on('uncaughtException', (err) => console.error('[server] uncaught exception', err));
process.on('unhandledRejection', (err) => console.error('[server] unhandled rejection', err));

const staticDir = findStaticDir();
const port = Number(process.env.PORT ?? 3000);

void startApp({ port, staticDir, trustProxy: process.env.TRUST_PROXY === '1' }).then((app) => {
  console.log(`Smart Bead Chess server on port ${app.port} (site: ${staticDir ?? 'API only'})`);
});
