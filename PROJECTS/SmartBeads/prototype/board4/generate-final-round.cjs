'use strict';
/**
 * Generate final-round playables + headless engines (7 boards worth testing).
 * Dropped (not built): C5, F3a, F5a, F4a — repeat failure classes / redundant geometry.
 * Run: node generate-final-round.cjs
 */
const fs = require('fs');
const path = require('path');

const { ROOT, playablePath } = require('./playable-dir.cjs');

const C3_HTML = fs.readFileSync(playablePath('SHOLO_GUTI_8_BEAD_5x5_WITH_FEATURE.html'), 'utf8');
const C3_ENGINE = fs.readFileSync(path.join(ROOT, 'sholo-c3-8-5x5-fullturn-engine.cjs'), 'utf8');
const BEAD6_HTML = fs.readFileSync(playablePath('SHOLO_GUTI_6_BEAD_WITH_FEATURE.html'), 'utf8');
const BEAD6_ENGINE = fs.readFileSync(path.join(ROOT, 'sholo-6-bead-fullturn-engine.cjs'), 'utf8');
const BEAD6_4x4_HTML = fs.readFileSync(playablePath('SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html'), 'utf8');
const BEAD7_HTML = fs.readFileSync(playablePath('SHOLO_GUTI_7_BEAD_WITH_FEATURE.html'), 'utf8');
const BEAD7_ENGINE = fs.readFileSync(path.join(ROOT, 'sholo-7-bead-fullturn-engine.cjs'), 'utf8');

function patchEngine(src, header, startingBoardFn) {
  let eng = src.replace(/^\/\*\*[\s\S]*?\*\//, header);
  eng = eng.replace(/function startingBoard\(\) \{[\s\S]*?\n\}/, startingBoardFn.trim());
  return eng;
}

function engineStart(body) {
  return body.replace(/^  /gm, '').replace(/^function/m, 'function');
}

function latticeEngine(cols, rows) {
  return `const COLS = ${cols};
const ROWS = ${rows};
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
}

function latticeHtml(cols, rows) {
  return `  const COLS = ${cols};
  const ROWS = ${rows};
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
}

function latticeBoxCrossEngine(cols, rows) {
  return `const COLS = ${cols};
const ROWS = ${rows};
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) addNode('A' + r + c, 2 * c, 2 * r);
const N = NODES.length;
const ADJ = Array.from({ length: N }, () => []);
function linkIdx(i, j) {
  if (!ADJ[i].includes(j)) ADJ[i].push(j);
  if (!ADJ[j].includes(i)) ADJ[j].push(i);
}
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const u = r * COLS + c;
    if (c + 1 < COLS) linkIdx(u, u + 1);
    if (r + 1 < ROWS) linkIdx(u, u + COLS);
  }
}
for (let r = 0; r < ROWS - 1; r++) {
  for (let c = 0; c < COLS - 1; c++) {
    const tl = r * COLS + c;
    linkIdx(tl, tl + COLS + 1);
    linkIdx(tl + 1, tl + COLS);
  }
}`;
}

function replaceAlquerqueLattice(html, eng, cols, rows) {
  const oldHtml = /  for \(let r = 0; r < 5; r\+\+\) for \(let c = 0; c < 5; c\+\+\) addNode[\s\S]*?link\('A' \+ r \+ c, 'A' \+ r2 \+ c2\);\s*\}\s*\}\s*\}/;
  const oldEng =
    /for \(let r = 0; r < 5; r\+\+\) for \(let c = 0; c < 5; c\+\+\) addNode[\s\S]*?link\('A' \+ r \+ c, 'A' \+ r2 \+ c2\);\s*\}\s*\}\s*\}/;
  return {
    html: html.replace(oldHtml, latticeHtml(cols, rows)),
    eng: eng.replace(oldEng, latticeEngine(cols, rows)),
  };
}

function patchColsRows(html, eng, cols, rows) {
  const h = html.replace('const COLS = 3;', 'const COLS = ' + cols + ';').replace('const ROWS = 5;', 'const ROWS = ' + rows + ';');
  const e = eng.replace('const COLS = 3;', 'const COLS = ' + cols + ';').replace('const ROWS = 5;', 'const ROWS = ' + rows + ';');
  return { html: h, eng: e };
}

function patchColsRows47(html, eng, cols, rows) {
  const h = html.replace('const COLS = 4;', 'const COLS = ' + cols + ';').replace('const ROWS = 5;', 'const ROWS = ' + rows + ';');
  const e = eng.replace('const COLS = 4;', 'const COLS = ' + cols + ';').replace('const ROWS = 5;', 'const ROWS = ' + rows + ';');
  return { html: h, eng: e };
}

function gridStartHtml(rows) {
  const lines = rows.map((row) => {
    const cells = row.split('').map((ch) => (ch === '1' ? 'P1' : ch === '2' ? 'P2' : '0'));
    return '      [' + cells.join(', ') + ']';
  });
  return `  function startingBoard() {
    const layout = [
${lines.join(',\n')}
    ];
    const b = new Array(N).fill(0);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) b[r * COLS + c] = layout[r][c];
    return b;
  }`;
}

function gridStartEngine(rows) {
  const lines = rows.map((row) => {
    const cells = row.split('').map((ch) => (ch === '1' ? '1' : ch === '2' ? '2' : '0'));
    return '    [' + cells.join(', ') + ']';
  });
  return `function startingBoard() {
  const layout = [
    ${lines.join(',\n    ')}
  ];
  const b = new Array(N).fill(0);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) b[r * COLS + c] = layout[r][c];
  return b;
}`;
}

function arrayStartHtml(arr) {
  return `  function startingBoard() {
    return [${arr.join(', ')}];
  }`;
}

function arrayStartEngine(arr) {
  return `function startingBoard() {
  return [${arr.join(', ')}];
}`;
}

function hourglassStartHtml(extraInnerYs) {
  const ys = extraInnerYs.map((y) => 'p.y === ' + y).join(' || ');
  return `  function startingBoard() {
    const b = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      const p = NODES[i];
      if (p.x === 0) b[i] = P1;
      else if (p.x === 6) b[i] = P2;
      else if (p.x === 2 && (${ys})) b[i] = P1;
      else if (p.x === 4 && (${ys})) b[i] = P2;
    }
    return b;
  }`;
}

function hourglassStartEngine(extraInnerYs) {
  return engineStart(hourglassStartHtml(extraInnerYs));
}

function patchC3Meta(html, meta) {
  let h = html;
  for (const [from, to] of meta) {
    if (!h.includes(from)) throw new Error('C3 patch miss: ' + from.slice(0, 60));
    h = h.replace(from, to);
  }
  return h;
}

const BEAD7_TOXY = `  function toXY(x, y) {
    // 4×5 lattice (portrait board mapping — matches approved 7-bead snapshot).
    const pad = 44;
    const px = pad + (y / 8) * (canvas.width - pad * 2);
    const py = pad + ((6 - x) / 6) * (canvas.height - pad * 2);
    return [px, py];
  }`;
function toXYBlock(cols, rows) {
  return `  function toXY(x, y) {
    const pad = 44;
    const maxX = 2 * (${cols} - 1);
    const maxY = 2 * (${rows} - 1);
    const px = pad + (y / maxY) * (canvas.width - pad * 2);
    const py = pad + ((maxX - x) / maxX) * (canvas.height - pad * 2);
    return [px, py];
  }`;
}

function amberRects(rects) {
  return rects
    .map(
      ([x, y]) => `    {
      const [cx, cy] = toXY(${x}, ${y});
      ctx.fillStyle = 'rgba(232,168,60,0.35)';
      ctx.fillRect(cx - 14, cy - 14, 28, 28);
      ctx.strokeStyle = 'rgba(232,168,60,0.95)';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 14, cy - 14, 28, 28);
    }`
    )
    .join('\n');
}

function centerPredicateJs(expr) {
  return `  function isEndgameCenterNode(node) {
    return ${expr};
  }`;
}

function buildF1b() {
  const rows = ['1122', '1..2', '1122'];
  const startHtml = gridStartHtml(rows);
  const startEng = gridStartEngine(rows);
  let html = patchC3Meta(BEAD6_HTML, [
    ['<title>Sholo Guti 6 Bead With Features</title>', '<title>Sholo Guti 5 Bead 4×3 Hourglass (F1b)</title>'],
    ['id="p1-pieces">8</span>', 'id="p1-pieces">5</span>'],
    ['id="p2-pieces">8</span>', 'id="p2-pieces">5</span>'],
    [
      '3×5 · 6 vs 6. Ebony top (rows 1–2) · Row 3 amber centre · Ivory bottom (rows 4–5). You play from the bottom.',
      'F1b final · 5 vs 5 · 4×3 hourglass · smallest quality geometry. Waist amber (2 nodes). You play from the bottom.',
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
      startHtml,
    ],
    [
      `  function isEndgameCenterNode(node) {
    // Row 3 (y=4): single centre node only.
    return node.y === 4 && node.x === 2;
  }`,
      centerPredicateJs('node.y === 2 && (node.x === 2 || node.x === 4)'),
    ],
    ['window.__SHOLO_GUTI_6_FEATURE__', 'window.__SHOLO_GUTI_F1b_5_4x3_FEATURE__'],
  ]);
  let eng = BEAD6_ENGINE;
  const lat = patchColsRows(html, eng, 4, 3);
  html = lat.html;
  eng = patchEngine(lat.eng, '/**\n * Headless F1b / 5-bead 4×3 hourglass Lab engine.\n */', startEng);
  return { html, eng };
}

function buildF2b() {
  const startArr = [1, 1, 1, 1, 1, 1, 0, 1, 2, 0, 2, 2, 2, 2, 2, 2];
  const startHtml = arrayStartHtml(startArr);
  const startEng = arrayStartEngine(startArr);
  let html = BEAD6_4x4_HTML;
  html = html.replace('<title>Sholo Guti 6 Bead 4×4 With Features</title>', '<title>Sholo Guti 7 Bead 4×4 Dense (F2b)</title>');
  html = html.replace('id="p1-pieces">6</span>', 'id="p1-pieces">7</span>');
  html = html.replace('id="p2-pieces">6</span>', 'id="p2-pieces">7</span>');
  html = html.replace(
    /function startingBoard\(\) \{[\s\S]*?\n  \}/,
    startHtml.trim()
  );
  html = html.replace('window.__SHOLO_GUTI_6_FEATURE__', 'window.__SHOLO_GUTI_F2b_7_4x4_FEATURE__');
  let eng = patchEngine(
    C3_ENGINE.replace(
      /for \(let r = 0; r < 5; r\+\+\) for \(let c = 0; c < 5; c\+\+\) addNode[\s\S]*?link\('A' \+ r \+ c, 'A' \+ r2 \+ c2\);\s*\}\s*\}\s*\}/,
      latticeBoxCrossEngine(4, 4)
    ),
    '/**\n * Headless F2b / 7-bead 4×4 dense full-cross Lab engine.\n */',
    startEng
  );
  return { html, eng };
}

function buildF3b() {
  const rows = ['11.22', '11.22', '11.22', '11.22'];
  const startHtml = gridStartHtml(rows);
  const startEng = gridStartEngine(rows);
  let html = patchC3Meta(C3_HTML, [
    ['<title>Sholo Guti 8 Bead 5×5 (C3)</title>', '<title>Sholo Guti 8 Bead 5×4 Two-File (F3b)</title>'],
    [
      'C3 discovery · 5×5 Alquerque · 8 vs 8. 10-bead two-file camps with outer-file far corners removed. Empty centre file. Amber = middle node. Off / Cumulative / End-Game.',
      'F3b final · 5×4 Alquerque · 8 vs 8. KEEP-10 minus one rank. Empty centre file. Amber = centre file ranks 2–3.',
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
      startHtml,
    ],
    [
      `  function isEndgameCenterNode(node) {
    // Middle row centre node (lattice x=4,y=4) — same single-node pattern as 6-bead row 3.
    return node.y === 4 && node.x === 4;
  }`,
      centerPredicateJs('node.x === 4 && (node.y === 2 || node.y === 4)'),
    ],
    [
      `  function toXY(x, y) {
    // Square 5×5 lattice: x,y in {0,2,4,6,8}
    const pad = 44;
    const px = pad + (y / 8) * (canvas.width - pad * 2);
    const py = pad + ((8 - x) / 8) * (canvas.height - pad * 2);
    return [px, py];
  }`,
      toXYBlock(5, 4),
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
      amberRects([
        [4, 2],
        [4, 4],
      ]),
    ],
    ['window.__SHOLO_GUTI_C3_8_5x5_FEATURE__', 'window.__SHOLO_GUTI_F3b_8_5x4_FEATURE__'],
  ]);
  let eng = C3_ENGINE;
  const lat = replaceAlquerqueLattice(html, eng, 5, 4);
  html = lat.html;
  eng = patchEngine(lat.eng, '/**\n * Headless F3b / 8-bead 5×4 two-file Lab engine.\n */', startEng);
  return { html, eng };
}

function buildF1a() {
  const rows = ['1122', '1..2', '1..2', '1..2', '1..2', '1122'];
  const startHtml = gridStartHtml(rows);
  const startEng = gridStartEngine(rows);
  let html = patchC3Meta(BEAD7_HTML, [
    ['<title>Sholo Guti 7 Bead With Features</title>', '<title>Sholo Guti 8 Bead 4×6 Hourglass (F1a)</title>'],
    ['id="p1-pieces">7</span>', 'id="p1-pieces">8</span>'],
    ['id="p2-pieces">7</span>', 'id="p2-pieces">8</span>'],
    [
      '4 columns × 5 rows · 7 vs 7. Amber centre line at row 3 between col 2 and col 3 (endgame zone).',
      'F1a final · 4×6 hourglass · 8 vs 8. Waist 2×2 amber. You play from the bottom.',
    ],
    [
      `  function startingBoard() {
    const b = new Array(N).fill(0);
    // 7 vs 7: P1 left flank (5) + col2 at rows 1 & 5; P2 right flank (5) + col3 at rows 1 & 5.
    for (let i = 0; i < N; i++) {
      const p = NODES[i];
      if (p.x === 0) b[i] = P1;
      else if (p.x === 6) b[i] = P2;
      else if (p.x === 2 && (p.y === 0 || p.y === 8)) b[i] = P1;
      else if (p.x === 4 && (p.y === 0 || p.y === 8)) b[i] = P2;
    }
    return b;
  }`,
      startHtml,
    ],
    [
      `  function isEndgameCenterNode(node) {
    // Row 3 (y=4): empty centre nodes at col 2 and col 3 — connected by amber line.
    return node.y === 4 && (node.x === 2 || node.x === 4);
  }`,
      centerPredicateJs('(node.x === 2 || node.x === 4) && (node.y === 4 || node.y === 6)'),
    ],
    [BEAD7_TOXY, toXYBlock(4, 6)],
    ['window.__SHOLO_GUTI_7_FEATURE__', 'window.__SHOLO_GUTI_F1a_8_4x6_FEATURE__'],
  ]);
  let eng = BEAD7_ENGINE;
  const lat = patchColsRows47(html, eng, 4, 6);
  html = lat.html;
  eng = patchEngine(lat.eng, '/**\n * Headless F1a / 8-bead 4×6 hourglass Lab engine.\n */', startEng);
  return { html, eng };
}

function buildF2a() {
  const rows = ['.1.2.', '11.22', '11.22', '11.22', '11.22', '11.22', '.1.2.'];
  const startHtml = gridStartHtml(rows);
  const startEng = gridStartEngine(rows);
  let html = patchC3Meta(C3_HTML, [
    ['<title>Sholo Guti 8 Bead 5×5 (C3)</title>', '<title>Sholo Guti 12 Bead 5×7 Two-File (F2a)</title>'],
    ['id="p1-pieces">8</span>', 'id="p1-pieces">12</span>'],
    ['id="p2-pieces">8</span>', 'id="p2-pieces">12</span>'],
    [
      'C3 discovery · 5×5 Alquerque · 8 vs 8. 10-bead two-file camps with outer-file far corners removed. Empty centre file. Amber = middle node. Off / Cumulative / End-Game.',
      'F2a final · 5×7 Alquerque · 12 vs 12. Two-file C3-thinned corners. Amber = centre file middle rank.',
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
      startHtml,
    ],
    [
      `  function isEndgameCenterNode(node) {
    // Middle row centre node (lattice x=4,y=4) — same single-node pattern as 6-bead row 3.
    return node.y === 4 && node.x === 4;
  }`,
      centerPredicateJs('node.y === 8 && node.x === 4'),
    ],
    [
      `  function toXY(x, y) {
    // Square 5×5 lattice: x,y in {0,2,4,6,8}
    const pad = 44;
    const px = pad + (y / 8) * (canvas.width - pad * 2);
    const py = pad + ((8 - x) / 8) * (canvas.height - pad * 2);
    return [px, py];
  }`,
      toXYBlock(5, 7),
    ],
    ['window.__SHOLO_GUTI_C3_8_5x5_FEATURE__', 'window.__SHOLO_GUTI_F2a_12_5x7_FEATURE__'],
  ]);
  let eng = C3_ENGINE;
  const lat = replaceAlquerqueLattice(html, eng, 5, 7);
  html = lat.html;
  eng = patchEngine(lat.eng, '/**\n * Headless F2a / 12-bead 5×7 two-file Lab engine.\n */', startEng);
  return { html, eng };
}

function buildF4b() {
  const startHtml = hourglassStartHtml([0, 2, 8, 10]);
  const startEng = hourglassStartEngine([0, 2, 8, 10]);
  let html = patchC3Meta(BEAD7_HTML, [
    ['<title>Sholo Guti 7 Bead With Features</title>', '<title>Sholo Guti 10 Bead 4×6 Hourglass (F4b)</title>'],
    ['id="p1-pieces">7</span>', 'id="p1-pieces">10</span>'],
    ['id="p2-pieces">7</span>', 'id="p2-pieces">10</span>'],
    [
      '4 columns × 5 rows · 7 vs 7. Amber centre line at row 3 between col 2 and col 3 (endgame zone).',
      'F4b final · 4×6 hourglass · 10 vs 10. Waist gaps amber. You play from the bottom.',
    ],
    [
      `  function startingBoard() {
    const b = new Array(N).fill(0);
    // 7 vs 7: P1 left flank (5) + col2 at rows 1 & 5; P2 right flank (5) + col3 at rows 1 & 5.
    for (let i = 0; i < N; i++) {
      const p = NODES[i];
      if (p.x === 0) b[i] = P1;
      else if (p.x === 6) b[i] = P2;
      else if (p.x === 2 && (p.y === 0 || p.y === 8)) b[i] = P1;
      else if (p.x === 4 && (p.y === 0 || p.y === 8)) b[i] = P2;
    }
    return b;
  }`,
      startHtml,
    ],
    [
      `  function isEndgameCenterNode(node) {
    // Row 3 (y=4): empty centre nodes at col 2 and col 3 — connected by amber line.
    return node.y === 4 && (node.x === 2 || node.x === 4);
  }`,
      centerPredicateJs('(node.x === 2 || node.x === 4) && (node.y === 4 || node.y === 6)'),
    ],
    [BEAD7_TOXY, toXYBlock(4, 6)],
    ['window.__SHOLO_GUTI_7_FEATURE__', 'window.__SHOLO_GUTI_F4b_10_4x6_FEATURE__'],
  ]);
  let eng = BEAD7_ENGINE;
  const lat = patchColsRows47(html, eng, 4, 6);
  html = lat.html;
  eng = patchEngine(lat.eng, '/**\n * Headless F4b / 10-bead 4×6 hourglass Lab engine.\n */', startEng);
  return { html, eng };
}

function buildF5b() {
  const rows = ['1122', '1122', '1..2', '1122', '1..2', '1122', '1122'];
  const startHtml = gridStartHtml(rows);
  const startEng = gridStartEngine(rows);
  let html = patchC3Meta(BEAD7_HTML, [
    ['<title>Sholo Guti 7 Bead With Features</title>', '<title>Sholo Guti 12 Bead 4×7 Hourglass (F5b)</title>'],
    ['id="p1-pieces">7</span>', 'id="p1-pieces">12</span>'],
    ['id="p2-pieces">7</span>', 'id="p2-pieces">12</span>'],
    [
      '4 columns × 5 rows · 7 vs 7. Amber centre line at row 3 between col 2 and col 3 (endgame zone).',
      'F5b final · 4×7 hourglass · 12 vs 12. Waist gaps at ranks 3 and 5 amber. You play from the bottom.',
    ],
    [
      `  function startingBoard() {
    const b = new Array(N).fill(0);
    // 7 vs 7: P1 left flank (5) + col2 at rows 1 & 5; P2 right flank (5) + col3 at rows 1 & 5.
    for (let i = 0; i < N; i++) {
      const p = NODES[i];
      if (p.x === 0) b[i] = P1;
      else if (p.x === 6) b[i] = P2;
      else if (p.x === 2 && (p.y === 0 || p.y === 8)) b[i] = P1;
      else if (p.x === 4 && (p.y === 0 || p.y === 8)) b[i] = P2;
    }
    return b;
  }`,
      startHtml,
    ],
    [
      `  function isEndgameCenterNode(node) {
    // Row 3 (y=4): empty centre nodes at col 2 and col 3 — connected by amber line.
    return node.y === 4 && (node.x === 2 || node.x === 4);
  }`,
      centerPredicateJs('(node.x === 2 || node.x === 4) && (node.y === 4 || node.y === 8)'),
    ],
    [BEAD7_TOXY, toXYBlock(4, 7)],
    ['window.__SHOLO_GUTI_7_FEATURE__', 'window.__SHOLO_GUTI_F5b_12_4x7_FEATURE__'],
  ]);
  let htmlOut = html;
  let eng = BEAD7_ENGINE;
  const lat = patchColsRows47(htmlOut, eng, 4, 7);
  htmlOut = lat.html;
  eng = patchEngine(lat.eng, '/**\n * Headless F5b / 12-bead 4×7 hourglass Lab engine.\n */', startEng);
  return { html: htmlOut, eng };
}

const OUTPUTS = [
  {
    id: 'F1b',
    file: 'SHOLO_GUTI_5_BEAD_4x3_HOURGLASS_WITH_FEATURE.html',
    engine: 'sholo-f1b-5-4x3-fullturn-engine.cjs',
    build: buildF1b,
  },
  {
    id: 'F2b',
    file: 'SHOLO_GUTI_7_BEAD_4x4_DENSE_WITH_FEATURE.html',
    engine: 'sholo-f2b-7-4x4-fullturn-engine.cjs',
    build: buildF2b,
  },
  {
    id: 'F3b',
    file: 'SHOLO_GUTI_8_BEAD_5x4_WITH_FEATURE.html',
    engine: 'sholo-f3b-8-5x4-fullturn-engine.cjs',
    build: buildF3b,
  },
  {
    id: 'F1a',
    file: 'SHOLO_GUTI_8_BEAD_4x6_HOURGLASS_WITH_FEATURE.html',
    engine: 'sholo-f1a-8-4x6-fullturn-engine.cjs',
    build: buildF1a,
  },
  {
    id: 'F2a',
    file: 'SHOLO_GUTI_12_BEAD_5x7_WITH_FEATURE.html',
    engine: 'sholo-f2a-12-5x7-fullturn-engine.cjs',
    build: buildF2a,
  },
  {
    id: 'F4b',
    file: 'SHOLO_GUTI_10_BEAD_4x6_HOURGLASS_WITH_FEATURE.html',
    engine: 'sholo-f4b-10-4x6-fullturn-engine.cjs',
    build: buildF4b,
  },
  {
    id: 'F5b',
    file: 'SHOLO_GUTI_12_BEAD_4x7_HOURGLASS_WITH_FEATURE.html',
    engine: 'sholo-f5b-12-4x7-fullturn-engine.cjs',
    build: buildF5b,
  },
];

for (const spec of OUTPUTS) {
  const { html, eng } = spec.build();
  fs.writeFileSync(playablePath(spec.file), html);
  fs.writeFileSync(path.join(ROOT, spec.engine), eng);
  const e = require(path.join(ROOT, spec.engine));
  const s = e.startingBoard();
  const p1 = s.filter((x) => x === 1).length;
  const p2 = s.filter((x) => x === 2).length;
  if (p1 !== p2) throw new Error(spec.id + ' asymmetric start ' + p1 + ' vs ' + p2);
  console.log('Wrote', spec.file, '+', spec.engine, 'N=' + e.N, p1 + 'v' + p2);
}

console.log('Done — 7 final-round playables + engines (C5/F3a/F5a/F4a skipped).');
