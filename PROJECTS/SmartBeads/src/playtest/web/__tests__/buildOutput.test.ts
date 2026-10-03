import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Audit 2026-10-03: runs a real production build and checks what would be shipped. The developer-only
 * sound audition page must stay out, and every font the stylesheet names must exist (and be shipped once).
 */
const root = path.resolve(__dirname, '../../../../../..');
let out: string;

beforeAll(() => {
  out = fs.mkdtempSync(path.join(os.tmpdir(), 'sb-build-'));
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', out, '--emptyOutDir'],
    { cwd: root, stdio: 'pipe' },
  );
}, 120_000);

describe('production build output', () => {
  it('ships the site and legal pages but not the developer-only sound page', () => {
    for (const f of ['index.html', 'privacy.html', 'terms.html', 'credits.html', 'favicon.svg']) {
      expect(fs.existsSync(path.join(out, f))).toBe(true);
    }
    expect(fs.existsSync(path.join(out, 'sound-preview.html'))).toBe(false);
  });

  it('every font in fonts.css exists, and no font file is shipped twice', () => {
    const css = fs.readFileSync(path.join(out, 'fonts/fonts.css'), 'utf8');
    const urls = [...css.matchAll(/url\('\/fonts\/([^']+)'\)/g)].map((m) => m[1]!);
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) expect(fs.existsSync(path.join(out, 'fonts', u))).toBe(true);
    const files = fs.readdirSync(path.join(out, 'fonts')).filter((f) => f.endsWith('.woff2'));
    const bytes = files.map((f) => fs.readFileSync(path.join(out, 'fonts', f)).toString('base64'));
    expect(new Set(bytes).size).toBe(files.length);
  });
});
