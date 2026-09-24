import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** Finds the inner-content boundaries of the div opened at `openTagStart`:
 * `innerStart` (right after its own `>`) and `innerEnd` (right before the
 * `</div>` that closes it), by counting nested `<div` / `</div>`
 * occurrences (ignores tags inside comments/strings — fine here since this
 * only ever scans our own generated markup, never arbitrary/untrusted
 * HTML). The caller keeps everything outside [innerStart, innerEnd) —
 * including the opening tag's own attributes — untouched. */
function findInnerBounds(html: string, openTagStart: number): { innerStart: number; innerEnd: number } {
  const innerStart = html.indexOf('>', openTagStart) + 1;
  let depth = 1;
  let i = innerStart;
  while (depth > 0) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose === -1) throw new Error('Unbalanced <div> in index.html');
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
    } else {
      depth -= 1;
      i = nextClose + 6;
    }
  }
  return { innerStart, innerEnd: i - 6 };
}

/** Dev-only: lets the "Edit layout" tool in HubEditMode.ts save its
 * arranged #play-hub markup straight back into index.html on disk. */
function hubEditSavePlugin(): Plugin {
  return {
    name: 'hub-edit-save',
    configureServer(server) {
      server.middlewares.use('/__hub-edit-save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const { html } = JSON.parse(body) as { html: string };
            const indexPath = path.resolve(__dirname, 'index.html');
            const original = fs.readFileSync(indexPath, 'utf8');
            const startIdx = original.indexOf('<div id="play-hub"');
            if (startIdx === -1) throw new Error('Could not find <div id="play-hub"> in index.html');
            const { innerStart, innerEnd } = findInnerBounds(original, startIdx);
            const updated = original.slice(0, innerStart) + html + original.slice(innerEnd);
            fs.writeFileSync(indexPath, updated, 'utf8');
            res.statusCode = 200;
            res.end('ok');
          } catch (err) {
            res.statusCode = 500;
            res.end(err instanceof Error ? err.message : String(err));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [hubEditSavePlugin()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
});
