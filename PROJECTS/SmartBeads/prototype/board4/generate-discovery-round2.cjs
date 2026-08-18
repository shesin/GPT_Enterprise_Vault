'use strict';
/**
 * Generate D1–D5 discovery round-2 playables + headless engines from C3 / 6-bead templates.
 * Run once: node generate-discovery-round2.cjs
 */
const fs = require('fs');
const path = require('path');

const { ROOT, playablePath } = require('./playable-dir.cjs');

const C3_HTML = fs.readFileSync(playablePath('SHOLO_GUTI_8_BEAD_5x5_WITH_FEATURE.html'), 'utf8');
const C3_ENGINE = fs.readFileSync(path.join(ROOT, 'sholo-c3-8-5x5-fullturn-engine.cjs'), 'utf8');
const BEAD6_HTML = fs.readFileSync(playablePath('SHOLO_GUTI_6_BEAD_WITH_FEATURE.html'), 'utf8');
const BEAD6_ENGINE = fs.readFileSync(path.join(ROOT, 'sholo-6-bead-fullturn-engine.cjs'), 'utf8');

function patchC3Html(replacements) {
  let html = C3_HTML;
  for (const [from, to] of replacements) {
    if (!html.includes(from)) throw new Error('C3 patch miss: ' + from.slice(0, 80));
    html = html.replace(from, to);
  }
  return html;
}

function patch6Html(replacements) {
  let html = BEAD6_HTML;
  for (const [from, to] of replacements) {
    if (!html.includes(from)) throw new Error('6-bead patch miss: ' + from.slice(0, 80));
    html = html.replace(from, to);
  }
  return html;
}

function patchEngine(src, meta, startingBoardFn) {
  let eng = src;
  const headerRe = /^\/\*\*[\s\S]*?\*\//;
  eng = eng.replace(headerRe, meta.header);
  const startRe = /function startingBoard\(\) \{[\s\S]*?\n\}/;
  if (!startRe.test(eng)) throw new Error('startingBoard not found in engine');
  eng = eng.replace(startRe, startingBoardFn.trim());
  return eng;
}

const D1_START_HTML = `  function startingBoard() {
    const b = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      const p = NODES[i];
      // 10-bead two-file start, minus one outer far corner per side (180°): P1 A00, P2 A44.
      const p1Missing = p.x === 0 && p.y === 0;
      const p2Missing = p.x === 8 && p.y === 8;
      if ((p.x === 0 || p.x === 2) && !p1Missing) b[i] = P1;
      else if ((p.x === 6 || p.x === 8) && !p2Missing) b[i] = P2;
    }
    return b;
  }`;

const D2_START_HTML = `  function startingBoard() {
    const b = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      const p = NODES[i];
      // Outer file partial ranks + inner file full (5×5 thin hourglass).
      if (p.x === 2 || (p.x === 0 && (p.y === 2 || p.y === 6))) b[i] = P1;
      else if (p.x === 6 || (p.x === 8 && (p.y === 2 || p.y === 6))) b[i] = P2;
    }
    return b;
  }`;

const D3_START_HTML = `  function startingBoard() {
    const b = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      const p = NODES[i];
      const r = p.y / 2;
      const c = p.x / 2;
      if (r === 2) continue;
      if (r === 0 && c === 2) continue;
      if (r === 4 && c === 0) continue;
      if (r === 0 || r === 1) b[i] = P2;
      else if (r === 3 || r === 4) b[i] = P1;
    }
    return b;
  }`;

const D5_START_HTML = `  function startingBoard() {
    const b = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      const p = NODES[i];
      const r = p.y / 2;
      const c = p.x / 2;
      if (r === 2) continue;
      if (r === 0 && c === 1) b[i] = P2;
      else if (r === 1) b[i] = P2;
      else if (r === 3) b[i] = P1;
      else if (r === 4 && c === 1) b[i] = P1;
    }
    return b;
  }`;

function engineStart(body) {
  return body.replace(/^  /gm, '').replace(/^function/m, 'function');
}

const LATTICE_6x5 = `const COLS = 5;
const ROWS = 6;
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) addNode('A' + r + c, 2 * c, 2 * r);
const N = NODES.length;
const ADJ = Array.from({ length: N }, () => []);
function link(a, b) {
  const i = NODE_INDEX[a];
  const j = NODE_INDEX[b];
  if (!ADJ[i].includes(j)) ADJ[i].push(j);
  if (!ADJ[j].includes(i)) ADJ[j].push(i);
}
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const r2 = r + dr;
      const c2 = c + dc;
      if (r2 < 0 || r2 >= ROWS || c2 < 0 || c2 >= COLS) continue;
      link('A' + r + c, 'A' + r2 + c2);
    }
  }
}`;

const LATTICE_6x5_HTML = `  const COLS = 5;
  const ROWS = 6;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) addNode('A' + r + c, 2 * c, 2 * r);
  const N = NODES.length;
  const ADJ = Array.from({ length: N }, () => []);
  function link(a, b) {
    const i = NODE_INDEX[a], j = NODE_INDEX[b];
    if (!ADJ[i].includes(j)) ADJ[i].push(j);
    if (!ADJ[j].includes(i)) ADJ[j].push(i);
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const r2 = r + dr, c2 = c + dc;
        if (r2 < 0 || r2 >= ROWS || c2 < 0 || c2 >= COLS) continue;
        link('A' + r + c, 'A' + r2 + c2);
      }
    }
  }`;

const D4_START_HTML = `  function startingBoard() {
    const b = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      const p = NODES[i];
      // Two-file rank camps, empty centre file (6×5 Alquerque).
      if (p.x === 0 || p.x === 2) b[i] = P1;
      else if (p.x === 6 || p.x === 8) b[i] = P2;
    }
    return b;
  }`;

const D4_CENTER_HTML = `  function isEndgameCenterNode(node) {
    // Centre file ranks 3–4 (lattice y=4 and y=6 at x=4).
    return node.x === 4 && (node.y === 4 || node.y === 6);
  }`;

const D4_TOXY = `  function toXY(x, y) {
    const pad = 44;
    const maxX = 2 * (COLS - 1);
    const maxY = 2 * (ROWS - 1);
    const px = pad + (y / maxY) * (canvas.width - pad * 2);
    const py = pad + ((maxX - x) / maxX) * (canvas.height - pad * 2);
    return [px, py];
  }`;

const D4_AMBER = `    // Amber centre squares on empty centre file (ranks 3–4).
    for (const cy of [4, 6]) {
      const [cx, cyPx] = toXY(4, cy);
      ctx.fillStyle = 'rgba(232,168,60,0.35)';
      ctx.fillRect(cx - 14, cyPx - 14, 28, 28);
      ctx.strokeStyle = 'rgba(232,168,60,0.95)';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 14, cyPx - 14, 28, 28);
    }`;

const D4_START_ENGINE = `function startingBoard() {
  const b = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const p = NODES[i];
    if (p.x === 0 || p.x === 2) b[i] = P1;
    else if (p.x === 6 || p.x === 8) b[i] = P2;
  }
  return b;
}`;

function buildD1() {
  const html = patchC3Html([
    ['<title>Sholo Guti 8 Bead 5×5 (C3)</title>', '<title>Sholo Guti 9 Bead 5×5 (D1)</title>'],
    ['id="p1-pieces">8</span>', 'id="p1-pieces">9</span>'],
    ['id="p2-pieces">8</span>', 'id="p2-pieces">9</span>'],
    [
      'C3 discovery · 5×5 Alquerque · 8 vs 8. 10-bead two-file camps with outer-file far corners removed. Empty centre file. Amber = middle node. Off / Cumulative / End-Game.',
      'D1 discovery · 5×5 Alquerque · 9 vs 9. 10-bead two-file camps with one outer far corner removed per side (180°). Empty centre file. Amber = middle node. Off / Cumulative / End-Game.',
    ],
    [
      `  function startingBoard() {
    const b = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      const p = NODES[i];
      // 10-bead two-file start, minus outer-file far corners (P1 x=0 y=0/8, P2 x=8 y=0/8).
      const p1OuterCorner = p.x === 0 && (p.y === 0 || p.y === 8);
      const p2OuterCorner = p.x === 8 && (p.y === 0 || p.y === 8);
      if ((p.x === 0 || p.x === 2) && !p1OuterCorner) b[i] = P1;
      else if ((p.x === 6 || p.x === 8) && !p2OuterCorner) b[i] = P2;
    }
    return b;
  }`,
      D1_START_HTML,
    ],
    ['window.__SHOLO_GUTI_C3_8_5x5_FEATURE__', 'window.__SHOLO_GUTI_D1_9_5x5_FEATURE__'],
  ]);
  const eng = patchEngine(C3_ENGINE, {
    header:
      "/**\n * Headless D1 / 9-bead 5×5 Lab engine.\n * Geometry + start match SHOLO_GUTI_9_BEAD_5x5_WITH_FEATURE.html.\n */",
  }, engineStart(D1_START_HTML));
  return { html, eng };
}

function buildD2() {
  const html = patchC3Html([
    ['<title>Sholo Guti 8 Bead 5×5 (C3)</title>', '<title>Sholo Guti 7 Bead 5×5 (D2)</title>'],
    ['id="p1-pieces">8</span>', 'id="p1-pieces">7</span>'],
    ['id="p2-pieces">8</span>', 'id="p2-pieces">7</span>'],
    [
      'C3 discovery · 5×5 Alquerque · 8 vs 8. 10-bead two-file camps with outer-file far corners removed. Empty centre file. Amber = middle node. Off / Cumulative / End-Game.',
      'D2 discovery · 5×5 Alquerque · 7 vs 7. Thin hourglass: inner file full, outer file partial ranks. Empty centre file. Amber = middle node. Off / Cumulative / End-Game.',
    ],
    [
      `  function startingBoard() {
    const b = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      const p = NODES[i];
      // 10-bead two-file start, minus outer-file far corners (P1 x=0 y=0/8, P2 x=8 y=0/8).
      const p1OuterCorner = p.x === 0 && (p.y === 0 || p.y === 8);
      const p2OuterCorner = p.x === 8 && (p.y === 0 || p.y === 8);
      if ((p.x === 0 || p.x === 2) && !p1OuterCorner) b[i] = P1;
      else if ((p.x === 6 || p.x === 8) && !p2OuterCorner) b[i] = P2;
    }
    return b;
  }`,
      D2_START_HTML,
    ],
    ['window.__SHOLO_GUTI_C3_8_5x5_FEATURE__', 'window.__SHOLO_GUTI_D2_7_5x5_FEATURE__'],
  ]);
  const eng = patchEngine(C3_ENGINE, {
    header:
      "/**\n * Headless D2 / 7-bead 5×5 thin Lab engine.\n * Geometry + start match SHOLO_GUTI_7_BEAD_5x5_WITH_FEATURE.html.\n */",
  }, engineStart(D2_START_HTML));
  return { html, eng };
}

function buildD3() {
  const html = patch6Html([
    ['<title>Sholo Guti 6 Bead With Features</title>', '<title>Sholo Guti 5 Bead 3×5 Rear Thin (D3)</title>'],
    ['id="p1-pieces">8</span>', 'id="p1-pieces">5</span>'],
    ['id="p2-pieces">8</span>', 'id="p2-pieces">5</span>'],
    [
      '3×5 · 6 vs 6. Ebony top (rows 1–2) · Row 3 amber centre · Ivory bottom (rows 4–5). You play from the bottom.',
      'D3 discovery · 5 vs 5 · 3×5 · KEEP-6 rear-wing thin. Ebony top · row 3 amber centre · Ivory bottom. You play from the bottom.',
    ],
    [
      `  function startingBoard() {
    const b = new Array(N).fill(0);
    // 6 vs 6: P2 (Ebony) rows 1–2 top; row 3 empty; P1 (Ivory) rows 4–5 bottom.
    for (let i = 0; i < N; i++) {
      const p = NODES[i];
      if (p.y === 0 || p.y === 2) b[i] = P2;
      else if (p.y === 6 || p.y === 8) b[i] = P1;
    }
    return b;
  }`,
      D3_START_HTML,
    ],
    ['window.__SHOLO_GUTI_6_FEATURE__', 'window.__SHOLO_GUTI_D3_5_3x5_FEATURE__'],
  ]);
  const eng = patchEngine(BEAD6_ENGINE, {
    header:
      "/**\n * Headless D3 / 5-bead 3×5 rear-thin Lab engine.\n * Geometry + start match SHOLO_GUTI_5_BEAD_3x5_REAR_THIN_WITH_FEATURE.html.\n */",
  }, engineStart(D3_START_HTML));
  return { html, eng };
}

function buildD5() {
  const html = patch6Html([
    ['<title>Sholo Guti 6 Bead With Features</title>', '<title>Sholo Guti 4 Bead 3×5 Rear (D5)</title>'],
    ['id="p1-pieces">8</span>', 'id="p1-pieces">4</span>'],
    ['id="p2-pieces">8</span>', 'id="p2-pieces">4</span>'],
    [
      '3×5 · 6 vs 6. Ebony top (rows 1–2) · Row 3 amber centre · Ivory bottom (rows 4–5). You play from the bottom.',
      'D5 discovery · 4 vs 4 · 3×5 · KEEP-6 rear corners. Ebony top · row 3 amber centre · Ivory bottom. You play from the bottom.',
    ],
    [
      `  function startingBoard() {
    const b = new Array(N).fill(0);
    // 6 vs 6: P2 (Ebony) rows 1–2 top; row 3 empty; P1 (Ivory) rows 4–5 bottom.
    for (let i = 0; i < N; i++) {
      const p = NODES[i];
      if (p.y === 0 || p.y === 2) b[i] = P2;
      else if (p.y === 6 || p.y === 8) b[i] = P1;
    }
    return b;
  }`,
      D5_START_HTML,
    ],
    ['window.__SHOLO_GUTI_6_FEATURE__', 'window.__SHOLO_GUTI_D5_4_3x5_FEATURE__'],
  ]);
  const eng = patchEngine(BEAD6_ENGINE, {
    header:
      "/**\n * Headless D5 / 4-bead 3×5 rear Lab engine.\n * Geometry + start match SHOLO_GUTI_4_BEAD_3x5_REAR_WITH_FEATURE.html.\n */",
  }, engineStart(D5_START_HTML));
  return { html, eng };
}

function buildD4() {
  let html = patchC3Html([
    ['<title>Sholo Guti 8 Bead 5×5 (C3)</title>', '<title>Sholo Guti 12 Bead 6×5 (D4)</title>'],
    ['id="p1-pieces">8</span>', 'id="p1-pieces">12</span>'],
    ['id="p2-pieces">8</span>', 'id="p2-pieces">12</span>'],
    [
      'C3 discovery · 5×5 Alquerque · 8 vs 8. 10-bead two-file camps with outer-file far corners removed. Empty centre file. Amber = middle node. Off / Cumulative / End-Game.',
      'D4 discovery · 6×5 Alquerque · 12 vs 12. Two-file rank camps, empty centre file. Amber = centre file ranks 3–4. Off / Cumulative / End-Game.',
    ],
    ['  // 5×5 lattice only — left/right triangle wings removed (Vision 10-bead slice parent).', '  // 6×5 lattice — two-file rank camps, empty centre file.'],
    [
      `  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) addNode('A' + r + c, 2 * c, 2 * r);
  const N = NODES.length;
  const ADJ = Array.from({ length: N }, () => []);
  function link(a, b) {
    const i = NODE_INDEX[a], j = NODE_INDEX[b];
    if (!ADJ[i].includes(j)) ADJ[i].push(j);
    if (!ADJ[j].includes(i)) ADJ[j].push(i);
  }
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const r2 = r + dr, c2 = c + dc;
        if (r2 < 0 || r2 > 4 || c2 < 0 || c2 > 4) continue;
        link('A' + r + c, 'A' + r2 + c2);
      }
    }
  }`,
      LATTICE_6x5_HTML,
    ],
    [
      `  function isEndgameCenterNode(node) {
    // Middle row centre node (lattice x=4,y=4) — same single-node pattern as 6-bead row 3.
    return node.y === 4 && node.x === 4;
  }`,
      D4_CENTER_HTML,
    ],
    [
      `  function startingBoard() {
    const b = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      const p = NODES[i];
      // 10-bead two-file start, minus outer-file far corners (P1 x=0 y=0/8, P2 x=8 y=0/8).
      const p1OuterCorner = p.x === 0 && (p.y === 0 || p.y === 8);
      const p2OuterCorner = p.x === 8 && (p.y === 0 || p.y === 8);
      if ((p.x === 0 || p.x === 2) && !p1OuterCorner) b[i] = P1;
      else if ((p.x === 6 || p.x === 8) && !p2OuterCorner) b[i] = P2;
    }
    return b;
  }`,
      D4_START_HTML,
    ],
    [
      `  function toXY(x, y) {
    // Square 5×5 lattice: x,y in {0,2,4,6,8}
    const pad = 44;
    const px = pad + (y / 8) * (canvas.width - pad * 2);
    const py = pad + ((8 - x) / 8) * (canvas.height - pad * 2);
    return [px, py];
  }`,
      D4_TOXY,
    ],
    [
      `    // Amber centre square at middle row, centre column (lattice x=4,y=4).
    {
      const [cx, cy] = toXY(4, 4);
      ctx.fillStyle = 'rgba(232,168,60,0.35)';
      ctx.fillRect(cx - 14, cy - 14, 28, 28);
      ctx.strokeStyle = 'rgba(232,168,60,0.95)';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 14, cy - 14, 28, 28);
    }`,
      D4_AMBER,
    ],
    ['window.__SHOLO_GUTI_C3_8_5x5_FEATURE__', 'window.__SHOLO_GUTI_D4_12_6x5_FEATURE__'],
  ]);

  let eng = C3_ENGINE;
  eng = eng.replace(/^\/\*\*[\s\S]*?\*\//, '/**\n * Headless D4 / 12-bead 6×5 Lab engine.\n * Geometry + start match SHOLO_GUTI_12_BEAD_6x5_WITH_FEATURE.html.\n */');
  eng = eng.replace(
    /for \(let r = 0; r < 5; r\+\+\) for \(let c = 0; c < 5; c\+\+\) addNode\('A' \+ r \+ c, 2 \* c, 2 \* r\);[\s\S]*?link\('A' \+ r \+ c, 'A' \+ r2 \+ c2\);\s*\}\s*\}\s*\}/,
    LATTICE_6x5
  );
  eng = eng.replace(/function startingBoard\(\) \{[\s\S]*?\n\}/, D4_START_ENGINE.trim());
  return { html, eng };
}

const outputs = [
  { id: 'D1', file: 'SHOLO_GUTI_9_BEAD_5x5_WITH_FEATURE.html', engine: 'sholo-d1-9-5x5-fullturn-engine.cjs', build: buildD1 },
  { id: 'D2', file: 'SHOLO_GUTI_7_BEAD_5x5_WITH_FEATURE.html', engine: 'sholo-d2-7-5x5-fullturn-engine.cjs', build: buildD2 },
  { id: 'D3', file: 'SHOLO_GUTI_5_BEAD_3x5_REAR_THIN_WITH_FEATURE.html', engine: 'sholo-d3-5-3x5-fullturn-engine.cjs', build: buildD3 },
  { id: 'D4', file: 'SHOLO_GUTI_12_BEAD_6x5_WITH_FEATURE.html', engine: 'sholo-d4-12-6x5-fullturn-engine.cjs', build: buildD4 },
  { id: 'D5', file: 'SHOLO_GUTI_4_BEAD_3x5_REAR_WITH_FEATURE.html', engine: 'sholo-d5-4-3x5-fullturn-engine.cjs', build: buildD5 },
];

for (const spec of outputs) {
  const { html, eng } = spec.build();
  fs.writeFileSync(playablePath(spec.file), html);
  fs.writeFileSync(path.join(ROOT, spec.engine), eng);
  console.log('Wrote', spec.file, '+', spec.engine);
}

console.log('Done — 5 playables + 5 engines.');
