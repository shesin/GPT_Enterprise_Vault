/**
 * Evidence collector for Board4 gameplay lab.
 * Writes raw logs under ./evidence/ — does not modify production app.
 *
 * Usage:
 *   node collect-evidence.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const http = require('http');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = __dirname;
const EVIDENCE = path.join(ROOT, 'evidence');
const HTML = path.join(ROOT, 'index.html');
const NODE = process.execPath;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

function loadLab() {
  const html = fs.readFileSync(HTML, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('No script in index.html');
  const sandbox = {
    console,
    Math,
    Date,
    Object,
    Array,
    Set,
    Map,
    Infinity,
    parseInt,
    parseFloat,
    isFinite,
    globalThis: {},
  };
  sandbox.globalThis = sandbox;
  sandbox.globalThis.__BOARD4_LAB_HEADLESS__ = true;
  vm.runInNewContext(match[1], sandbox, { filename: 'board4-lab.js' });
  if (!sandbox.globalThis.Board4Lab) throw new Error('Board4Lab missing');
  return sandbox.globalThis.Board4Lab;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function snapshot(state) {
  return {
    occupants: state.occupants.slice(),
    currentPlayer: state.currentPlayer,
    firstPlayer: state.firstPlayer,
    plyCount: state.plyCount,
    captures: { RED: state.captures.RED, BLUE: state.captures.BLUE },
    chainPieceId: state.chainPieceId,
    gameOver: state.gameOver,
    winner: state.winner,
    endReason: state.endReason,
    positionKey: null,
  };
}

function playAiVsAiDetailed(Lab, gameIndex, firstPlayer, difficulty) {
  const state = Lab.createInitialState(firstPlayer, difficulty);
  Lab.recordPosition(state);
  const log = {
    gameIndex,
    firstPlayer,
    difficulty,
    events: [],
    final: null,
  };
  log.events.push({
    type: 'start',
    ply: 0,
    state: snapshot(state),
  });

  let guard = 0;
  while (!state.gameOver && guard < 500) {
    const before = snapshot(state);
    const actions = Lab.listAiActions(state);
    let actionDesc = null;
    let applied = false;

    if (actions.length === 0) {
      Lab.checkImmediateAndTerminal(state);
      log.events.push({
        type: 'no_actions_terminal_check',
        before,
        after: snapshot(state),
      });
      break;
    }

    // Deterministic-ish voluntary finish: every 3rd opportunity when available
    if (Lab.canFinishMultiJump(state) && (guard % 3 === 0)) {
      actionDesc = { type: 'finish' };
      applied = Lab.finishMultiJump(state);
    } else {
      const action = Lab.chooseAiAction(state);
      actionDesc = action
        ? action.type === 'finish'
          ? { type: 'finish' }
          : {
              type: 'move',
              from: action.move.from,
              to: action.move.to,
              isJump: !!action.move.isJump,
              over: action.move.over,
            }
        : null;
      if (!action) {
        Lab.checkImmediateAndTerminal(state);
        log.events.push({ type: 'choose_null', before, after: snapshot(state) });
        break;
      }
      if (action.type === 'finish') applied = Lab.finishMultiJump(state);
      else applied = Lab.applyMove(state, action.move);
    }

    log.events.push({
      type: 'action',
      action: actionDesc,
      applied,
      before,
      after: snapshot(state),
      moveHistoryTail: state.moveHistory.slice(-1)[0] || null,
    });
    guard++;
  }

  log.final = {
    winner: state.winner,
    endReason: state.endReason,
    plyCount: state.plyCount,
    captures: { ...state.captures },
    occupants: state.occupants.slice(),
    moveHistory: state.moveHistory.slice(),
    terminated: state.gameOver,
    steps: guard,
  };
  return log;
}

function playHumanVsAiRecorded(Lab, firstPlayer, difficulty, seedMoves) {
  const state = Lab.createInitialState(firstPlayer, difficulty);
  Lab.recordPosition(state);
  const playthrough = {
    title: 'Human vs AI recorded playthrough',
    firstPlayer,
    difficulty,
    policy: 'prefer_captures_then_finish_optional',
    events: [],
  };
  playthrough.events.push({ type: 'start', state: snapshot(state) });

  let step = 0;
  while (!state.gameOver && step < 500) {
    if (state.currentPlayer === Lab.HUMAN) {
      if (Lab.canFinishMultiJump(state) && step % 2 === 0) {
        const before = snapshot(state);
        Lab.finishMultiJump(state);
        playthrough.events.push({
          actor: 'HUMAN',
          action: { type: 'finish_multi_jump' },
          before,
          after: snapshot(state),
        });
        step++;
        continue;
      }
      const moves = Lab.getLegalMoves(state);
      if (moves.length === 0) {
        if (Lab.canFinishMultiJump(state)) {
          Lab.finishMultiJump(state);
          playthrough.events.push({ actor: 'HUMAN', action: { type: 'finish_forced' }, after: snapshot(state) });
        } else {
          Lab.checkImmediateAndTerminal(state);
          playthrough.events.push({ actor: 'HUMAN', action: { type: 'terminal' }, after: snapshot(state) });
        }
        step++;
        continue;
      }
      const jumps = moves.filter((m) => m.isJump);
      const pick = jumps.length ? jumps[step % jumps.length] : moves[step % moves.length];
      const before = snapshot(state);
      Lab.applyMove(state, pick);
      playthrough.events.push({
        actor: 'HUMAN',
        action: { type: 'move', from: pick.from, to: pick.to, isJump: pick.isJump, over: pick.over },
        before,
        after: snapshot(state),
        historyEntry: state.moveHistory.slice(-1)[0],
      });
    } else {
      const before = snapshot(state);
      const action = Lab.chooseAiAction(state);
      let applied = false;
      let desc = null;
      if (!action) {
        Lab.checkImmediateAndTerminal(state);
        desc = { type: 'null' };
      } else if (action.type === 'finish') {
        applied = Lab.finishMultiJump(state);
        desc = { type: 'finish' };
      } else {
        applied = Lab.applyMove(state, action.move);
        desc = { type: 'move', from: action.move.from, to: action.move.to, isJump: action.move.isJump };
      }
      playthrough.events.push({
        actor: 'AI',
        action: desc,
        applied,
        before,
        after: snapshot(state),
        historyEntry: state.moveHistory.slice(-1)[0] || null,
      });
    }
    step++;
  }

  playthrough.final = {
    winner: state.winner,
    endReason: state.endReason,
    plyCount: state.plyCount,
    captures: { ...state.captures },
    moveHistory: state.moveHistory.slice(),
    terminated: state.gameOver,
  };
  return playthrough;
}

function runAssertions(Lab, aiLogs, humanPlay) {
  const assertions = [];
  function check(id, pass, detail) {
    assertions.push({ id, pass: !!pass, detail });
  }

  check('A01_lab_loaded', !!Lab && typeof Lab.applyMove === 'function', 'Board4Lab API present');
  check('A02_ai_count_20', aiLogs.length === 20, 'aiLogs.length=' + aiLogs.length);
  check(
    'A03_ai_all_terminated',
    aiLogs.every((g) => g.final && g.final.terminated === true),
    aiLogs.filter((g) => !g.final || !g.final.terminated).map((g) => g.gameIndex),
  );
  check(
    'A04_ai_valid_winners',
    aiLogs.every((g) => ['RED', 'BLUE', 'DRAW'].includes(g.final.winner)),
    aiLogs.map((g) => ({ i: g.gameIndex, w: g.final.winner })),
  );
  check(
    'A05_ai_end_reasons',
    aiLogs.every((g) =>
      ['elimination', 'stalemate', 'repetition', 'ply_limit'].includes(g.final.endReason),
    ),
    aiLogs.map((g) => ({ i: g.gameIndex, r: g.final.endReason })),
  );
  check(
    'A06_alternating_first',
    aiLogs.every((g, i) => g.firstPlayer === (i % 2 === 0 ? 'RED' : 'BLUE')),
    aiLogs.map((g) => g.firstPlayer),
  );
  check(
    'A07_diagonals',
    Lab.CONNECTIONS.some(({ from, to }) => {
      const r1 = Math.floor(from / 4);
      const c1 = from % 4;
      const r2 = Math.floor(to / 4);
      const c2 = to % 4;
      return Math.abs(r1 - r2) === 1 && Math.abs(c1 - c2) === 1;
    }),
    'connectionCount=' + Lab.CONNECTIONS.length,
  );
  check('A08_human_terminated', humanPlay.final.terminated === true, humanPlay.final);
  check(
    'A09_human_has_history',
    Array.isArray(humanPlay.final.moveHistory) && humanPlay.final.moveHistory.length > 0,
    'historyLen=' + (humanPlay.final.moveHistory || []).length,
  );
  check(
    'A10_history_shape',
    humanPlay.final.moveHistory.every(
      (h) =>
        h &&
        typeof h.player === 'string' &&
        typeof h.from === 'number' &&
        typeof h.to === 'number' &&
        typeof h.ply === 'number' &&
        ('captured' in h),
    ),
    humanPlay.final.moveHistory.slice(0, 3),
  );

  // Forced feature assertions (same as prior verify, with evidence)
  const sRep = Lab.createInitialState('RED', 'easy');
  Lab.recordPosition(sRep);
  sRep.positionCounts[Lab.positionKey(sRep)] = 2;
  Lab.checkImmediateAndTerminal(sRep);
  check('A11_repetition', sRep.gameOver && sRep.winner === 'DRAW' && sRep.endReason === 'repetition', {
    winner: sRep.winner,
    endReason: sRep.endReason,
  });

  const sElim = Lab.createInitialState('RED', 'easy');
  sElim.occupants = new Array(16).fill(null);
  sElim.occupants[0] = 'RED';
  Lab.checkImmediateAndTerminal(sElim);
  check('A12_elimination', sElim.gameOver && sElim.winner === 'RED' && sElim.endReason === 'elimination', {
    winner: sElim.winner,
    endReason: sElim.endReason,
  });

  const sStale = Lab.createInitialState('RED', 'easy');
  sStale.occupants = new Array(16).fill(null);
  sStale.occupants[5] = 'RED';
  for (let i = 0; i < 16; i++) if (i !== 5) sStale.occupants[i] = 'BLUE';
  sStale.currentPlayer = 'RED';
  Lab.checkImmediateAndTerminal(sStale);
  check('A13_stalemate', sStale.gameOver && sStale.endReason === 'stalemate' && sStale.winner === 'BLUE', {
    winner: sStale.winner,
    endReason: sStale.endReason,
  });

  const sCenter = Lab.createInitialState('RED', 'easy');
  sCenter.captures = { RED: 1, BLUE: 1 };
  sCenter.occupants = new Array(16).fill(null);
  sCenter.occupants[5] = 'RED';
  sCenter.occupants[12] = 'BLUE';
  check('A14_tiebreak_center', Lab.resolvePlyLimitWinner(sCenter) === 'RED', Lab.resolvePlyLimitWinner(sCenter));

  const sCap = Lab.createInitialState('RED', 'easy');
  sCap.captures = { RED: 3, BLUE: 1 };
  check('A15_tiebreak_captures', Lab.resolvePlyLimitWinner(sCap) === 'RED', Lab.resolvePlyLimitWinner(sCap));

  const sMj = Lab.createInitialState('RED', 'easy');
  sMj.occupants = new Array(16).fill(null);
  sMj.occupants[8] = 'RED';
  sMj.occupants[9] = 'BLUE';
  sMj.occupants[6] = 'BLUE';
  sMj.currentPlayer = 'RED';
  const j = Lab.getLegalMoves(sMj).find((m) => m.from === 8 && m.to === 10 && m.isJump);
  if (j) Lab.applyMove(sMj, j);
  check('A16_multijump', !!j && sMj.chainPieceId === 10 && Lab.canFinishMultiJump(sMj), {
    jumpFound: !!j,
    chainPieceId: sMj.chainPieceId,
    canFinish: Lab.canFinishMultiJump(sMj),
    legal: Lab.getLegalMoves(sMj),
  });
  if (Lab.canFinishMultiJump(sMj)) {
    Lab.finishMultiJump(sMj);
    check('A17_finish', sMj.chainPieceId === null && sMj.currentPlayer === 'BLUE', {
      chainPieceId: sMj.chainPieceId,
      currentPlayer: sMj.currentPlayer,
    });
  } else {
    check('A17_finish', false, 'finish not available');
  }

  const e1 = Lab.evaluate(Lab.createInitialState('RED', 'medium'));
  const e2 = Lab.evaluate(Lab.createInitialState('RED', 'medium'));
  check('A18_eval_deterministic', e1 === e2, { e1, e2 });

  const plyGames = aiLogs.filter((g) => g.final.endReason === 'ply_limit');
  check('A19_ply40_observed', plyGames.length >= 1, { count: plyGames.length, indices: plyGames.map((g) => g.gameIndex) });

  return assertions;
}

function findChrome() {
  for (const p of CHROME_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function cdpSend(ws, id, method, params) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ id, method, params });
    const onMsg = (buf) => {
      try {
        const msg = JSON.parse(buf.toString());
        if (msg.id === id) {
          ws.off('message', onMsg);
          if (msg.error) reject(new Error(JSON.stringify(msg.error)));
          else resolve(msg.result);
        }
      } catch (e) {
        /* ignore partial */
      }
    };
    ws.on('message', onMsg);
    ws.send(payload);
  });
}

async function captureScreenshots(outDir) {
  const chrome = findChrome();
  if (!chrome) {
    return { ok: false, error: 'No Chrome/Edge found', shots: [] };
  }

  const WebSocket = (() => {
    try {
      return require('ws');
    } catch (_) {
      return null;
    }
  })();

  // Prefer CDP via puppeteer-core-less raw websocket. If `ws` missing, use chrome --screenshot per file.
  const port = 9222;
  const userData = path.join(outDir, 'chrome-profile');
  ensureDir(userData);

  const shots = [
    { name: '01-initial-board', shot: 'initial' },
    { name: '02-multi-jump', shot: 'multijump' },
    { name: '03-finish-multi-jump', shot: 'finish' },
    { name: '04-game-over', shot: 'gameover' },
    { name: '05-40-ply-result', shot: 'ply40' },
  ];

  const results = [];

  // Use headless screenshot mode per URL (no ws dependency)
  for (const s of shots) {
    const fileUrl = pathToFileURL(HTML).href + '?shot=' + s.shot;
    const outPng = path.join(outDir, s.name + '.png');
    if (fs.existsSync(outPng)) fs.unlinkSync(outPng);

    const args = [
      '--headless=new',
      '--disable-gpu',
      '--allow-file-access-from-files',
      '--hide-scrollbars',
      `--window-size=700,980`,
      `--screenshot=${outPng}`,
      fileUrl,
    ];

    await new Promise((resolve, reject) => {
      const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      child.stderr.on('data', (d) => (stderr += d.toString()));
      child.on('error', reject);
      child.on('close', (code) => {
        const exists = fs.existsSync(outPng);
        const size = exists ? fs.statSync(outPng).size : 0;
        results.push({
          name: s.name,
          shot: s.shot,
          path: outPng,
          exitCode: code,
          exists,
          bytes: size,
          stderrTail: stderr.slice(-500),
        });
        resolve();
      });
    });
    await delay(200);
  }

  return { ok: results.every((r) => r.exists && r.bytes > 1000), chrome, results };
}

async function main() {
  ensureDir(EVIDENCE);
  const Lab = loadLab();

  const aiLogs = [];
  for (let i = 0; i < 20; i++) {
    const first = i % 2 === 0 ? 'RED' : 'BLUE';
    const diff = ['easy', 'medium', 'hard'][i % 3];
    aiLogs.push(playAiVsAiDetailed(Lab, i, first, diff));
  }
  writeJson(path.join(EVIDENCE, 'ai-vs-ai-logs.json'), {
    generatedAt: new Date().toISOString(),
    gameCount: aiLogs.length,
    games: aiLogs,
  });

  // Full move history of first terminated game with longest history
  const richest = aiLogs.slice().sort((a, b) => b.final.moveHistory.length - a.final.moveHistory.length)[0];
  writeJson(path.join(EVIDENCE, 'full-game-move-history.json'), {
    source: 'ai-vs-ai',
    gameIndex: richest.gameIndex,
    firstPlayer: richest.firstPlayer,
    difficulty: richest.difficulty,
    final: {
      winner: richest.final.winner,
      endReason: richest.final.endReason,
      plyCount: richest.final.plyCount,
      captures: richest.final.captures,
    },
    moveHistory: richest.final.moveHistory,
  });

  const humanPlay = playHumanVsAiRecorded(Lab, 'RED', 'medium');
  writeJson(path.join(EVIDENCE, 'human-vs-ai-playthrough.json'), {
    generatedAt: new Date().toISOString(),
    playthrough: humanPlay,
  });

  const assertions = runAssertions(Lab, aiLogs, humanPlay);
  writeJson(path.join(EVIDENCE, 'assertions.json'), {
    generatedAt: new Date().toISOString(),
    total: assertions.length,
    passed: assertions.filter((a) => a.pass).length,
    failed: assertions.filter((a) => !a.pass),
    all: assertions,
  });

  const shotReport = await captureScreenshots(EVIDENCE);
  writeJson(path.join(EVIDENCE, 'screenshots.json'), {
    generatedAt: new Date().toISOString(),
    ...shotReport,
  });

  const failed = assertions.filter((a) => !a.pass);
  const summary = {
    evidenceDir: EVIDENCE,
    aiGames: aiLogs.length,
    aiTerminated: aiLogs.filter((g) => g.final.terminated).length,
    endReasonCounts: aiLogs.reduce((acc, g) => {
      acc[g.final.endReason] = (acc[g.final.endReason] || 0) + 1;
      return acc;
    }, {}),
    humanTerminated: humanPlay.final.terminated,
    humanPlies: humanPlay.final.plyCount,
    humanHistoryLen: humanPlay.final.moveHistory.length,
    assertionsPassed: assertions.filter((a) => a.pass).length,
    assertionsFailed: failed.length,
    failedAssertions: failed,
    screenshotsOk: shotReport.ok,
    screenshotResults: shotReport.results,
  };
  writeJson(path.join(EVIDENCE, 'SUMMARY.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
  process.exit(failed.length === 0 && shotReport.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
