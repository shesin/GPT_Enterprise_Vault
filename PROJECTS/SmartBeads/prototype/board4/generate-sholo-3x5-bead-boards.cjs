'use strict';
/**
 * Generate 3 / 4 / 5-bead playable HTML + headless engines from 6-bead 3×5 template.
 * Geometry from sketch: same 3×5 lattice as SHOLO_GUTI_6_BEAD_WITH_FEATURE.html.
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const HTML_TEMPLATE = fs.readFileSync(path.join(DIR, 'SHOLO_GUTI_6_BEAD_WITH_FEATURE.html'), 'utf8');
const ENGINE_TEMPLATE = fs.readFileSync(path.join(DIR, 'sholo-6-bead-fullturn-engine.cjs'), 'utf8');

const SIX_START = `function startingBoard() {
  const b = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const p = NODES[i];
    if (p.y === 0 || p.y === 2) b[i] = P2;
    else if (p.y === 6 || p.y === 8) b[i] = P1;
  }
  return b;
}`;

const VARIANTS = [
  {
    beads: 3,
    desc: '3×5 · 3 vs 3. Row 1 only per side · Row 3 amber centre · Ivory bottom. You play from the bottom.',
    comment: '3 vs 3: P2 (Ebony) row 1 top; row 3 empty; P1 (Ivory) row 5 bottom.',
    start: `function startingBoard() {
  const b = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const p = NODES[i];
    if (p.y === 0) b[i] = P2;
    else if (p.y === 8) b[i] = P1;
  }
  return b;
}`,
  },
  {
    beads: 4,
    desc: '3×5 · 4 vs 4. Outer columns rows 1–2 · Row 3 amber centre · Ivory bottom. You play from the bottom.',
    comment: '4 vs 4: P2 (Ebony) outer cols rows 1–2; row 3 empty; P1 (Ivory) outer cols rows 4–5.',
    start: `function startingBoard() {
  const b = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const p = NODES[i];
    if ((p.y === 0 || p.y === 2) && p.x !== 2) b[i] = P2;
    else if ((p.y === 6 || p.y === 8) && p.x !== 2) b[i] = P1;
  }
  return b;
}`,
  },
  {
    beads: 5,
    desc: '3×5 · 5 vs 5. Full row 1 + outer row 2 · Row 3 amber centre · Ivory bottom. You play from the bottom.',
    comment: '5 vs 5: P2 (Ebony) row 1 + outer row 2; row 3 empty; P1 (Ivory) row 5 + outer row 4.',
    start: `function startingBoard() {
  const b = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const p = NODES[i];
    if (p.y === 0 || (p.y === 2 && p.x !== 2)) b[i] = P2;
    else if (p.y === 8 || (p.y === 6 && p.x !== 2)) b[i] = P1;
  }
  return b;
}`,
  },
];

function buildHtml(v) {
  let html = HTML_TEMPLATE;
  html = html.replace(/Sholo Guti 6 Bead With Features/g, `Sholo Guti ${v.beads} Bead With Features`);
  html = html.replace(/6-bead slice: rows 1–2 Ebony top/g, `${v.beads}-bead slice: sketch geometry from 6-bead 3×5`);
  html = html.replace(
    /3×5 · 6 vs 6\. Ebony top \(rows 1–2\) · Row 3 amber centre · Ivory bottom \(rows 4–5\)\. You play from the bottom\./,
    v.desc,
  );
  html = html.replace(
    /\/\/ 6 vs 6: P2 \(Ebony\) rows 1–2 top; row 3 empty; P1 \(Ivory\) rows 4–5 bottom\./,
    `// ${v.comment}`,
  );
  html = html.replace(SIX_START, v.start);
  html = html.replace(/id="p1-pieces">8</, `id="p1-pieces">${v.beads}<`);
  html = html.replace(/id="p2-pieces">8</, `id="p2-pieces">${v.beads}<`);
  html = html.replace(/__SHOLO_GUTI_6_FEATURE__/g, `__SHOLO_GUTI_${v.beads}_FEATURE__`);
  return html;
}

function buildEngine(v) {
  let eng = ENGINE_TEMPLATE;
  eng = eng.replace(
    /Headless 6-bead \/ 3×5 Lab engine\.\n \* Geometry \+ start match SHOLO_GUTI_6_BEAD_WITH_FEATURE\.html\./,
    `Headless ${v.beads}-bead / 3×5 Lab engine.\n * Geometry + start match SHOLO_GUTI_${v.beads}_BEAD_WITH_FEATURE.html.`,
  );
  eng = eng.replace(SIX_START, v.start);
  return eng;
}

function buildVerify(v) {
  return `'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILE = path.join(__dirname, 'SHOLO_GUTI_${v.beads}_BEAD_WITH_FEATURE.html');

function assert(ok, msg) {
  if (!ok) throw new Error(msg);
}
function el(id, extra) {
  return Object.assign({
    id, style: {}, value: '', disabled: false, textContent: '', dataset: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
    getContext: () => ({
      clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc() {},
      save() {}, restore() {}, closePath() {}, strokeRect() {},
      createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; },
    }),
    width: 560, height: 560,
  }, extra || {});
}

const html = fs.readFileSync(FILE, 'utf8');
assert(/3×5|COLS = 3/.test(html), '${v.beads}-bead should use 3×5 lattice');
assert(/__SHOLO_GUTI_${v.beads}_FEATURE__/.test(html), 'API name missing');

const scriptMatch = html.match(/<script>([\\s\\S]*?)<\\/script>/);
const elements = {
  'game-mode-select': el('game-mode-select', { value: 'pve' }),
  'ai-level-select': el('ai-level-select', { value: '2' }),
  'center-rule-select': el('center-rule-select', { value: 'off' }),
  'match-timer-select': el('match-timer-select', { value: 'off' }),
  'shot-clock-select': el('shot-clock-select', { value: 'off' }),
  'move-highlight-select': el('move-highlight-select', { value: 'on', dataset: {} }),
  board: el('board'), status: el('status'), 'finish-btn': el('finish-btn'), 'undo-btn': el('undo-btn'),
  'restart-btn': el('restart-btn'), 'play-again-btn': el('play-again-btn'),
  'result-modal': el('result-modal'), 'result-title': el('result-title'), 'result-desc': el('result-desc'),
  'p1-role': el('p1-role'), 'p2-role': el('p2-role'),
  'p1-pieces': el('p1-pieces'), 'p2-pieces': el('p2-pieces'), 'p1-caps': el('p1-caps'), 'p2-caps': el('p2-caps'),
  'turn-count': el('turn-count'), 'shot-clock-val': el('shot-clock-val'), 'match-clock-val': el('match-clock-val'),
  'p1-clock': el('p1-clock'), 'p2-clock': el('p2-clock'), 'pill-p1': el('pill-p1'), 'pill-p2': el('pill-p2'),
  'p1-center': el('p1-center'), 'p2-center': el('p2-center'), 'ai-level-container': el('ai-level-container', { style: {} }),
  'bgm-audio': el('bgm-audio'), 'bgm-select': el('bgm-select'), 'bgm-vol': el('bgm-vol', { value: '0.3' }),
  'bgm-play': el('bgm-play'), 'bgm-pause': el('bgm-pause'),
};
const sandbox = {
  console, Math,
  performance: { now: () => Date.now() },
  requestAnimationFrame(fn) { return setTimeout(() => fn(Date.now()), 0); },
  cancelAnimationFrame() {},
  setTimeout(fn) { fn(); return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
  window: {},
  document: { getElementById: (id) => elements[id] || el(id), addEventListener() {} },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(scriptMatch[1], sandbox);
const api = sandbox.window.__SHOLO_GUTI_${v.beads}_FEATURE__;
assert(api, 'API missing');
assert(api.N === 15, 'expected 15 nodes, got ' + api.N);
const b = api.getBoard();
const p1 = b.filter((x) => x === api.P1).length;
const p2 = b.filter((x) => x === api.P2).length;
assert(p1 === ${v.beads} && p2 === ${v.beads}, 'start not ${v.beads}/${v.beads}: ' + p1 + '/' + p2);

const row3 = api.NODES.filter((n) => n.y === 4);
assert(row3.every((n) => b[api.NODE_INDEX[n.id]] === 0), 'row 3 must start empty');

${v.beads === 3 ? `
const top = api.NODES.filter((n) => n.y === 0);
const bot = api.NODES.filter((n) => n.y === 8);
assert(top.every((n) => b[api.NODE_INDEX[n.id]] === api.P2), 'row 1 must be all P2');
assert(bot.every((n) => b[api.NODE_INDEX[n.id]] === api.P1), 'row 5 must be all P1');
` : v.beads === 4 ? `
const topBeads = api.NODES.filter((n) => (n.y === 0 || n.y === 2) && n.x !== 2);
const botBeads = api.NODES.filter((n) => (n.y === 6 || n.y === 8) && n.x !== 2);
assert(topBeads.every((n) => b[api.NODE_INDEX[n.id]] === api.P2), 'top outer cols rows 1–2 must be P2');
assert(botBeads.every((n) => b[api.NODE_INDEX[n.id]] === api.P1), 'bottom outer cols rows 4–5 must be P1');
assert(api.NODES.filter((n) => n.x === 2 && (n.y === 0 || n.y === 2 || n.y === 6 || n.y === 8)).every((n) => b[api.NODE_INDEX[n.id]] === 0), 'center col bead rows must be empty');
` : `
const topBeads = api.NODES.filter((n) => n.y === 0 || (n.y === 2 && n.x !== 2));
const botBeads = api.NODES.filter((n) => n.y === 8 || (n.y === 6 && n.x !== 2));
assert(topBeads.every((n) => b[api.NODE_INDEX[n.id]] === api.P2), 'top rows 1–2 layout must be P2');
assert(botBeads.every((n) => b[api.NODE_INDEX[n.id]] === api.P1), 'bottom rows 4–5 layout must be P1');
assert(api.NODES.filter((n) => n.y === 0).every((n) => b[api.NODE_INDEX[n.id]] === api.P2), 'row 1 must be full P2');
assert(api.NODES.filter((n) => n.y === 8).every((n) => b[api.NODE_INDEX[n.id]] === api.P1), 'row 5 must be full P1');
`}

assert(api.getAllLegalMoves().length > 0, 'no opening moves');

const engine = require('./sholo-${v.beads}-bead-fullturn-engine.cjs');
const hb = engine.startingBoard();
assert(hb.join('') === b.join(''), 'playable start must match headless engine');

const out = {
  file: 'SHOLO_GUTI_${v.beads}_BEAD_WITH_FEATURE.html',
  engine: 'sholo-${v.beads}-bead-fullturn-engine.cjs',
  N: api.N,
  start: { p1, p2 },
  ok: true,
};
fs.writeFileSync(path.join(__dirname, 'SHOLO_${v.beads}_BEAD_FEATURE_SMOKE.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
process.exit(0);
`;
}

for (const v of VARIANTS) {
  const htmlPath = path.join(DIR, `SHOLO_GUTI_${v.beads}_BEAD_WITH_FEATURE.html`);
  const engPath = path.join(DIR, `sholo-${v.beads}-bead-fullturn-engine.cjs`);
  const verifyPath = path.join(DIR, `verify-sholo-${v.beads}-bead-feature.cjs`);

  fs.writeFileSync(htmlPath, buildHtml(v), 'utf8');
  fs.writeFileSync(engPath, buildEngine(v), 'utf8');
  fs.writeFileSync(verifyPath, buildVerify(v), 'utf8');
  console.log('Wrote', v.beads + '-bead:', path.basename(htmlPath), path.basename(engPath), path.basename(verifyPath));
}

console.log('Done — run verify-sholo-{3,4,5}-bead-feature.cjs');
