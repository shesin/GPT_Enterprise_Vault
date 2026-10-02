/**
 * Entry point. Development: `npm run server` (runs the TypeScript directly).
 * Hosting: `npm run build` (site -> dist/), `npm run build:server` (-> server-dist/main.js), then `npm start`.
 * Environment: PORT (default 3000), STATIC_DIR (default: the dist/ folder next to the server).
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

const staticDir = findStaticDir();
const port = Number(process.env.PORT ?? 3000);

void startApp({ port, staticDir }).then((app) => {
  console.log(`Smart Bead Chess server on port ${app.port} (site: ${staticDir ?? 'API only'})`);
});
