'use strict';
/**
 * Generates CURSOR_INDEX_4.html and CURSOR_INDEX_6.html — playable Human-vs-AI games.
 * Rules match Gemini Index; AI/UX improvements only. Gemini originals untouched.
 */
const fs = require('fs');
const path = require('path');

function buildHtml(variant) {
  const beads = variant.beads;
  const startBoard = JSON.stringify(variant.startBoard);
  const title = `${beads}-Bead SmartBeads — Cursor Index`;
  const h1 = `CURSOR INDEX ${beads}`;
  const tagline = variant.tagline;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet">
  <style>
    :root {
      --ink: #14201c;
      --panel: #1c2e28;
      --panel-2: #243832;
      --line: #3d564c;
      --sand: #e8dcc8;
      --amber: #e0a045;
      --red: #d64545;
      --blue: #3d8fd1;
      --mint: #3cb89a;
      --muted: #9ab0a6;
      --text: #f3efe6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      color: var(--text);
      min-height: 100vh;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 16px 16px 28px;
      background:
        radial-gradient(ellipse 80% 60% at 20% 10%, rgba(224,160,69,0.14), transparent 55%),
        radial-gradient(ellipse 70% 50% at 90% 90%, rgba(60,184,154,0.12), transparent 50%),
        linear-gradient(160deg, #0c1613 0%, #14201c 45%, #1a2a24 100%);
    }
    .game-container {
      background: linear-gradient(180deg, rgba(36,56,50,0.96), rgba(28,46,40,0.98));
      border-radius: 20px;
      box-shadow: 0 18px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06);
      padding: 18px;
      max-width: 460px; width: 100%;
      text-align: center;
      border: 1px solid rgba(224,160,69,0.22);
    }
    .header-bar { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 6px; }
    .brand h1 {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.45rem; font-weight: 700; color: var(--amber);
      letter-spacing: 0.02em; line-height: 1.15; text-align: left;
    }
    .brand .tag { display: block; margin-top: 4px; font-size: 0.78rem; color: var(--muted); font-weight: 600; text-align: left; }
    .audio-btn {
      background: var(--panel-2); border: 1px solid rgba(224,160,69,0.45); color: var(--amber);
      padding: 7px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; cursor: pointer; white-space: nowrap;
    }
    .hint {
      text-align: left; font-size: 0.78rem; color: #c5d5cc; line-height: 1.45;
      background: rgba(12,22,19,0.55); border: 1px solid rgba(61,86,76,0.7);
      border-radius: 10px; padding: 8px 10px; margin-bottom: 10px;
    }
    .setting-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
      background: rgba(12,22,19,0.65); padding: 10px; border-radius: 12px; margin-bottom: 10px; text-align: left;
    }
    .setting-item { display: flex; flex-direction: column; gap: 3px; }
    .setting-item label { color: var(--muted); font-size: 0.68rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; }
    select {
      background: var(--panel); color: var(--amber); border: 1px solid rgba(224,160,69,0.35);
      padding: 6px 8px; border-radius: 8px; font-weight: 700; cursor: pointer; font-family: inherit;
    }
    select:disabled { opacity: 0.4; cursor: not-allowed; }
    .countdown-banner {
      background: rgba(12,22,19,0.7); border: 1.5px solid rgba(224,160,69,0.35);
      border-radius: 12px; padding: 8px 14px; margin-bottom: 10px;
      display: flex; justify-content: space-around; align-items: center;
    }
    .count-box .label { font-size: 0.68rem; text-transform: uppercase; color: var(--muted); }
    .count-box .val { font-size: 1.2rem; font-weight: 800; color: var(--amber); font-variant-numeric: tabular-nums; }
    .scoreboard { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
    .player-card {
      background: rgba(12,22,19,0.7); padding: 10px; border-radius: 12px;
      border-top: 4px solid #64748b; text-align: left;
    }
    .player-card.red { border-color: var(--red); }
    .player-card.blue { border-color: var(--blue); }
    .player-card.active-turn { box-shadow: inset 0 0 0 1px rgba(224,160,69,0.35); }
    .player-name { font-weight: 700; font-size: 0.88rem; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; gap: 6px; }
    .role { font-size: 0.68rem; font-weight: 600; color: var(--muted); }
    .chess-clock { font-family: ui-monospace, monospace; background: var(--panel); padding: 2px 6px; border-radius: 4px; font-size: 0.82rem; color: #cbd5e1; }
    .chess-clock.active { color: var(--amber); background: var(--panel-2); font-weight: bold; }
    .stat-row { display: flex; justify-content: space-between; font-size: 0.78rem; color: #c5d5cc; margin-top: 2px; }
    .stat-val { font-weight: 700; }
    .canvas-wrap {
      position: relative; display: inline-block; width: 100%; max-width: 360px;
      margin-bottom: 10px; border-radius: 14px; overflow: hidden;
      border: 2px solid var(--line);
      background: linear-gradient(145deg, #1a2924, #0f1915);
      box-shadow: inset 0 0 40px rgba(0,0,0,0.35);
    }
    canvas { display: block; width: 100%; height: auto; cursor: pointer; touch-action: none; }
    .status-badge {
      display: block; padding: 9px 12px; border-radius: 12px; font-weight: 700; font-size: 0.84rem;
      margin-bottom: 10px; background: var(--panel-2); color: var(--amber); transition: all 0.2s;
    }
    .status-badge.danger { background: #5c1d1d; color: #fca5a5; animation: pulse 1s infinite; }
    .controls { display: flex; gap: 10px; flex-wrap: wrap; }
    button.main-btn {
      flex: 1; min-width: 120px; padding: 12px; border: none; border-radius: 10px;
      font-weight: 700; background: var(--amber); color: #1a1408; cursor: pointer; font-family: inherit; font-size: 0.9rem;
    }
    button.main-btn.secondary { background: var(--panel-2); color: var(--sand); border: 1px solid var(--line); }
    .btn-finish { background: var(--mint); color: #06241c; display: none; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.82); align-items: center; justify-content: center; z-index: 100; }
    .modal-content {
      background: var(--panel); padding: 24px; border-radius: 16px; max-width: 360px; width: 90%;
      text-align: center; border: 2px solid rgba(224,160,69,0.5);
    }
    .modal-title { font-family: 'Fraunces', Georgia, serif; font-size: 1.55rem; color: var(--amber); margin-bottom: 10px; font-weight: 700; }
    .modal-body { font-size: 0.95rem; margin-bottom: 18px; color: #c5d5cc; line-height: 1.45; }
  </style>
</head>
<body>
<div class="game-container">
  <div class="header-bar">
    <div class="brand">
      <h1>${h1}</h1>
      <span class="tag">${tagline}</span>
    </div>
    <button class="audio-btn" id="audio-toggle" type="button">SFX: ON</button>
  </div>

  <p class="hint">You play <strong>Red</strong>. Capture by jumping (optional). During a multi-jump you may <strong>Finish</strong> early. Eliminate the opponent — or win on captures / center if a limit ends the game.</p>

  <div class="setting-grid">
    <div class="setting-item">
      <label>Game Mode</label>
      <select id="game-mode-select">
        <option value="pve" selected>Human vs AI</option>
        <option value="pvp">Human vs Human</option>
      </select>
    </div>
    <div class="setting-item" id="ai-level-container">
      <label>AI Level</label>
      <select id="ai-difficulty">
        <option value="1">Easy</option>
        <option value="2" selected>Medium</option>
        <option value="3">Hard</option>
      </select>
    </div>
    <div class="setting-item">
      <label>Turn Shot Clock</label>
      <select id="turn-timer-select">
        <option value="10">10 Sec</option>
        <option value="15">15 Sec</option>
        <option value="20">20 Sec</option>
        <option value="0" selected>Off</option>
      </select>
    </div>
    <div class="setting-item">
      <label>Match Timer</label>
      <select id="timer-mode-select">
        <option value="global_60">1 Min</option>
        <option value="global_120">2 Min</option>
        <option value="global_180">3 Min</option>
        <option value="off" selected>Off</option>
      </select>
    </div>
    <div class="setting-item">
      <label>Max Moves</label>
      <select id="max-move-select">
        <option value="20">20 Moves</option>
        <option value="40">40 Moves</option>
        <option value="60">60 Moves</option>
        <option value="0" selected>Unlimited</option>
      </select>
    </div>
    <div class="setting-item">
      <label>Center Rule</label>
      <select id="center-rule-select">
        <option value="cumulative">Cumulative</option>
        <option value="endgame">End-Game</option>
        <option value="off" selected>Off</option>
      </select>
    </div>
  </div>

  <div class="countdown-banner" id="global-timer-banner">
    <div class="count-box"><div class="label">Match Timer</div><div class="val" id="match-timer" style="color:#9ab0a6;">OFF</div></div>
    <div class="count-box"><div class="label">Moves Left</div><div class="val" id="moves-left">∞</div></div>
    <div class="count-box"><div class="label">Starts</div><div class="val" id="starts-label" style="font-size:0.95rem;">Red</div></div>
  </div>

  <div class="scoreboard">
    <div class="player-card red" id="card-red">
      <div class="player-name" style="color: var(--red);">
        <span>Red <span class="role" id="red-role">(You)</span></span>
        <span id="red-shot-clock" style="color:#fca5a5;font-weight:bold;"></span>
        <span class="chess-clock" id="red-clock" style="display:none;">01:00</span>
      </div>
      <div class="stat-row"><span>Beads</span><span class="stat-val" id="red-beads">${beads}</span></div>
      <div class="stat-row"><span>Captures</span><span class="stat-val" id="red-captures">0</span></div>
      <div class="stat-row"><span>Center</span><span class="stat-val" id="red-center-steps" style="color:var(--amber);">0</span></div>
    </div>
    <div class="player-card blue" id="card-blue">
      <div class="player-name" style="color: var(--blue);">
        <span>Blue <span class="role" id="blue-role">(AI)</span></span>
        <span id="blue-shot-clock" style="color:#93c5fd;font-weight:bold;"></span>
        <span class="chess-clock" id="blue-clock" style="display:none;">01:00</span>
      </div>
      <div class="stat-row"><span>Beads</span><span class="stat-val" id="blue-beads">${beads}</span></div>
      <div class="stat-row"><span>Captures</span><span class="stat-val" id="blue-captures">0</span></div>
      <div class="stat-row"><span>Center</span><span class="stat-val" id="blue-center-steps" style="color:var(--amber);">0</span></div>
    </div>
  </div>

  <div class="status-badge" id="status-badge">Your turn — select a Red bead</div>
  <div class="canvas-wrap"><canvas id="board" width="360" height="360"></canvas></div>

  <div class="controls">
    <button id="finish-btn" class="main-btn btn-finish" type="button">Finish Multi-Jump</button>
    <button class="main-btn secondary" id="restart-btn" type="button">New Game</button>
  </div>
</div>

<div class="modal" id="win-modal">
  <div class="modal-content">
    <div class="modal-title" id="modal-winner">Game Over</div>
    <div class="modal-body" id="modal-desc">Details...</div>
    <button class="main-btn" id="play-again-btn" type="button">Play Again</button>
  </div>
</div>

<script>
(function () {
  const BEADS = ${beads};
  const START_BOARD = ${startBoard};
  const CONFIG = { CANVAS_SIZE: 360, P1: 1, P2: 2, CENTER_NODES: [5, 6, 9, 10], SPACING: 80, OFFSET: 60 };
  const STATE = { IDLE: 'IDLE', SELECTED: 'SELECTED', CHAIN_JUMPING: 'CHAIN_JUMPING', GAME_OVER: 'GAME_OVER' };
  const REP_HARD = 900;
  const REP_SOFT = 35;

  let currentState = STATE.IDLE;
  let board = [];
  let currentTurn = CONFIG.P1;
  let startingPlayer = CONFIG.P1;
  let timerMode = 'off';
  let matchTimeRemaining = 60;
  let p1TimeRemaining = 120;
  let p2TimeRemaining = 120;
  let turnTimeLimit = 0;
  let turnTimeRemaining = 0;
  let maxMoveLimit = 0;
  let moveCount = 0;
  let centerRule = 'off';
  let redCenterPoints = 0;
  let blueCenterPoints = 0;
  let selectedNode = null;
  let validMoves = [];
  let lastMove = null;
  let positionHistory = {};
  let timerInterval = null;
  let aiTimeout = null;
  let aiThinking = false;
  let audioCtx = null;
  let sfxEnabled = true;
  let dpr = 1;

  const POSITIONS = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    POSITIONS.push({ x: CONFIG.OFFSET + c * CONFIG.SPACING, y: CONFIG.OFFSET + r * CONFIG.SPACING });
  }
  const DIAGONAL_RAYS = [[0,5,10,15],[3,6,9,12],[1,6,11],[4,9,14],[2,5,8],[7,10,13]];
  function buildGraph() {
    const adj = {}; for (let i = 0; i < 16; i++) adj[i] = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const u = r * 4 + c;
      if (c < 3) { const v = r * 4 + c + 1; adj[u].push(v); adj[v].push(u); }
      if (r < 3) { const v = (r + 1) * 4 + c; adj[u].push(v); adj[v].push(u); }
    }
    DIAGONAL_RAYS.forEach((ray) => {
      for (let i = 0; i < ray.length - 1; i++) {
        const u = ray[i], v = ray[i + 1];
        if (!adj[u].includes(v)) adj[u].push(v);
        if (!adj[v].includes(u)) adj[v].push(u);
      }
    });
    return adj;
  }
  const ADJACENCY = buildGraph();
  function generateValidJumps() {
    const jumps = [];
    for (let from = 0; from < 16; from++) {
      ADJACENCY[from].forEach((over) => {
        const r1 = Math.floor(from / 4), c1 = from % 4, r2 = Math.floor(over / 4), c2 = over % 4;
        const tr = r2 + (r2 - r1), tc = c2 + (c2 - c1);
        if (tr >= 0 && tr < 4 && tc >= 0 && tc < 4) {
          const to = tr * 4 + tc;
          if (ADJACENCY[over].includes(to)) jumps.push([from, over, to]);
        }
      });
    }
    return jumps;
  }
  const JUMPS = generateValidJumps();

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');

  function setupCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CONFIG.CANVAS_SIZE * dpr;
    canvas.height = CONFIG.CANVAS_SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }
  function toggleSFX() {
    sfxEnabled = !sfxEnabled;
    document.getElementById('audio-toggle').textContent = sfxEnabled ? 'SFX: ON' : 'SFX: OFF';
    if (sfxEnabled) initAudio();
  }
  function playTone(freq, type, duration, vol) {
    if (!sfxEnabled) return;
    initAudio();
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }
  function playSoundEffect(type) {
    if (!sfxEnabled) return;
    if (type === 'select') playTone(523.25, 'sine', 0.1, 0.2);
    else if (type === 'move') playTone(220, 'triangle', 0.14, 0.3);
    else if (type === 'center_step') { playTone(659.25, 'sine', 0.12, 0.3); setTimeout(() => playTone(880, 'sine', 0.18, 0.3), 60); }
    else if (type === 'capture') { playTone(440, 'sine', 0.1, 0.3); setTimeout(() => playTone(587.33, 'sine', 0.18, 0.3), 70); }
    else if (type === 'win') [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => playTone(f, 'triangle', 0.3, 0.3), i * 100));
    else if (type === 'lose') [349.23, 329.63, 293.66, 261.63].forEach((f, i) => setTimeout(() => playTone(f, 'sawtooth', 0.22, 0.2), i * 110));
  }

  function getMovesForNode(currBoard, node, player) {
    const moves = [];
    ADJACENCY[node].forEach((neighbor) => {
      if (currBoard[neighbor] === 0) moves.push({ from: node, to: neighbor, captured: null });
    });
    JUMPS.forEach(([from, over, to]) => {
      if (from === node && currBoard[over] !== 0 && currBoard[over] !== player && currBoard[to] === 0) {
        moves.push({ from: node, to: to, captured: over });
      }
    });
    return moves;
  }
  function getAllLegalMoves(currBoard, player) {
    let moves = [];
    for (let i = 0; i < 16; i++) if (currBoard[i] === player) moves = moves.concat(getMovesForNode(currBoard, i, player));
    return moves;
  }
  function applyMoveClone(currBoard, move) {
    const nb = currBoard.slice();
    nb[move.to] = nb[move.from];
    nb[move.from] = 0;
    if (move.captured !== null) nb[move.captured] = 0;
    return nb;
  }
  function countCapturesAvailable(currBoard, player) {
    return getAllLegalMoves(currBoard, player).filter((m) => m.captured !== null).length;
  }
  function evaluateBoard(b) {
    const p1 = b.filter((x) => x === CONFIG.P1).length;
    const p2 = b.filter((x) => x === CONFIG.P2).length;
    if (p1 === 0) return 10000;
    if (p2 === 0) return -10000;
    let p1c = 0, p2c = 0;
    CONFIG.CENTER_NODES.forEach((idx) => { if (b[idx] === CONFIG.P1) p1c++; if (b[idx] === CONFIG.P2) p2c++; });
    const mob2 = getAllLegalMoves(b, CONFIG.P2).length;
    const mob1 = getAllLegalMoves(b, CONFIG.P1).length;
    const cap2 = countCapturesAvailable(b, CONFIG.P2);
    const cap1 = countCapturesAvailable(b, CONFIG.P1);
    const centerW = centerRule === 'off' ? 4 : 8;
    return (p2 - p1) * 28 + (p2c - p1c) * centerW + (mob2 - mob1) * 1.5 + (cap2 - cap1) * 4;
  }
  function positionKey(b, turnJustMoved) {
    return b.join('') + '_' + turnJustMoved;
  }
  function repetitionPenalty(b, mover) {
    const key = positionKey(b, mover);
    const count = positionHistory[key] || 0;
    if (count + 1 >= 3) return REP_HARD;
    if (count + 1 === 2) return REP_SOFT;
    return 0;
  }
  /** Enumerate legal turn endings: steps, and capture paths with optional early stop. */
  function generateTurnEnds(currBoard, player, maxBranch) {
    const ends = [];
    const rootMoves = getAllLegalMoves(currBoard, player);
    for (let i = 0; i < rootMoves.length; i++) {
      const m = rootMoves[i];
      const after = applyMoveClone(currBoard, m);
      if (m.captured === null) {
        ends.push({ board: after, opening: m, stopAfterFirst: true });
        continue;
      }
      // Capture: may finish now (Capture Optionality) or continue
      ends.push({ board: after, opening: m, stopAfterFirst: true });
      const stack = [{ board: after, pos: m.to, depth: 1 }];
      while (stack.length) {
        const node = stack.pop();
        if (node.depth > 6) continue;
        const jumps = getMovesForNode(node.board, node.pos, player).filter((x) => x.captured !== null);
        for (let j = 0; j < jumps.length; j++) {
          const nj = jumps[j];
          const nb = applyMoveClone(node.board, nj);
          ends.push({ board: nb, opening: m, stopAfterFirst: false });
          stack.push({ board: nb, pos: nj.to, depth: node.depth + 1 });
          if (ends.length > maxBranch) return ends;
        }
      }
    }
    return ends;
  }
  function minimax(currBoard, depth, isMaximizing, alpha, beta) {
    if (depth === 0) return evaluateBoard(currBoard);
    const player = isMaximizing ? CONFIG.P2 : CONFIG.P1;
    const ends = generateTurnEnds(currBoard, player, depth >= 2 ? 36 : 64);
    if (!ends.length) return isMaximizing ? -1000 : 1000;
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < ends.length; i++) {
        const v = minimax(ends[i].board, depth - 1, false, alpha, beta);
        if (v > maxEval) maxEval = v;
        if (v > alpha) alpha = v;
        if (beta <= alpha) break;
      }
      return maxEval;
    }
    let minEval = Infinity;
    for (let i = 0; i < ends.length; i++) {
      const v = minimax(ends[i].board, depth - 1, true, alpha, beta);
      if (v < minEval) minEval = v;
      if (v < beta) beta = v;
      if (beta <= alpha) break;
    }
    return minEval;
  }
  function selectAIMove() {
    const legalMoves = getAllLegalMoves(board, CONFIG.P2);
    if (!legalMoves.length) return null;
    const depth = parseInt(document.getElementById('ai-difficulty').value, 10);
    if (depth === 1) {
      const caps = legalMoves.filter((m) => m.captured !== null);
      const pool = caps.length ? caps : legalMoves;
      // Prefer non-repeating when possible
      const safe = pool.filter((m) => repetitionPenalty(applyMoveClone(board, m), CONFIG.P2) < REP_HARD);
      const use = safe.length ? safe : pool;
      return use[Math.floor(Math.random() * use.length)];
    }
    let bestScore = -Infinity;
    let bestMoves = [];
    const searchDepth = Math.min(depth, 3);
    const ends = generateTurnEnds(board, CONFIG.P2, searchDepth >= 3 ? 56 : 90);
    // Score by opening move: take best turn-end score among ends sharing that opening
    const byOpening = new Map();
    for (let i = 0; i < ends.length; i++) {
      const end = ends[i];
      const key = end.opening.from + '>' + end.opening.to + ':' + end.opening.captured;
      let score = minimax(end.board, Math.max(0, searchDepth - 1), false, -Infinity, Infinity);
      score -= repetitionPenalty(end.board, CONFIG.P2);
      const prev = byOpening.get(key);
      if (!prev || score > prev.score) byOpening.set(key, { score, opening: end.opening, preferStop: end.stopAfterFirst });
    }
    byOpening.forEach((v) => {
      if (v.score > bestScore) { bestScore = v.score; bestMoves = [v]; }
      else if (v.score === bestScore) bestMoves.push(v);
    });
    const pick = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    // Stash whether AI prefers stopping after first capture of this opening
    window.__aiPreferStop = !!pick.preferStop && pick.opening.captured !== null;
    return pick.opening;
  }
  function selectAIChainContinuation(followUpJumps) {
    // Evaluate Finish vs each continue jump (1-ply + short lookahead)
    const depth = Math.max(1, parseInt(document.getElementById('ai-difficulty').value, 10) - 1);
    let bestAction = { type: 'finish', score: -Infinity };
    // Finish: current board, Blue just moved → opponent to play conceptually scored from Blue POV after turn end
    let finishScore = evaluateBoard(board) - repetitionPenalty(board, CONFIG.P2);
    // Prefer finish slightly when Soft/Hard repetition looming and no capture gain
    if (finishScore > bestAction.score) bestAction = { type: 'finish', score: finishScore };

    for (let i = 0; i < followUpJumps.length; i++) {
      const j = followUpJumps[i];
      let nb = applyMoveClone(board, j);
      // Greedy extend remaining chain for evaluation snapshot
      let pos = j.to;
      for (let guard = 0; guard < 6; guard++) {
        const more = getMovesForNode(nb, pos, CONFIG.P2).filter((m) => m.captured !== null);
        if (!more.length) break;
        let bestJ = more[0], maxF = -1;
        for (let k = 0; k < more.length; k++) {
          const tb = applyMoveClone(nb, more[k]);
          const f = getMovesForNode(tb, more[k].to, CONFIG.P2).filter((m) => m.captured !== null).length;
          if (f > maxF) { maxF = f; bestJ = more[k]; }
        }
        nb = applyMoveClone(nb, bestJ);
        pos = bestJ.to;
      }
      let score = minimax(nb, Math.max(0, depth - 1), false, -Infinity, Infinity);
      score -= repetitionPenalty(nb, CONFIG.P2);
      if (score > bestAction.score) bestAction = { type: 'jump', move: j, score };
    }
    // If root preferred stop and finish is within 8 of best jump, finish
    if (window.__aiPreferStop && bestAction.type === 'jump' && finishScore >= bestAction.score - 8) {
      return { type: 'finish' };
    }
    return bestAction;
  }

  function resetTurnTimer() {
    turnTimeLimit = parseInt(document.getElementById('turn-timer-select').value, 10);
    turnTimeRemaining = turnTimeLimit;
  }
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return m + ':' + s;
  }
  function recordPositionState() {
    const key = positionKey(board, currentTurn);
    positionHistory[key] = (positionHistory[key] || 0) + 1;
    return positionHistory[key];
  }
  function syncAiLevelEnabled() {
    const pvp = document.getElementById('game-mode-select').value === 'pvp';
    const sel = document.getElementById('ai-difficulty');
    sel.disabled = pvp;
    document.getElementById('ai-level-container').style.opacity = pvp ? '0.45' : '1';
    document.getElementById('red-role').textContent = '(You)';
    document.getElementById('blue-role').textContent = pvp ? '(Human)' : '(AI)';
  }
  function resetGame() {
    clearInterval(timerInterval);
    if (aiTimeout) clearTimeout(aiTimeout);
    aiThinking = false;
    window.__aiPreferStop = false;
    document.getElementById('win-modal').style.display = 'none';

    maxMoveLimit = parseInt(document.getElementById('max-move-select').value, 10);
    centerRule = document.getElementById('center-rule-select').value;
    const gameMode = document.getElementById('game-mode-select').value;
    const timerSetting = document.getElementById('timer-mode-select').value;

    if (timerSetting !== 'off') {
      const selectedSeconds = parseInt(timerSetting.split('_')[1], 10);
      if (gameMode === 'pvp') {
        timerMode = 'chess';
        p1TimeRemaining = selectedSeconds;
        p2TimeRemaining = selectedSeconds;
      } else {
        timerMode = 'global';
        matchTimeRemaining = selectedSeconds;
      }
    } else timerMode = 'off';

    syncAiLevelEnabled();
    board = START_BOARD.slice();
    currentTurn = startingPlayer;
    document.getElementById('starts-label').textContent = currentTurn === CONFIG.P1 ? 'Red' : 'Blue';
    startingPlayer = startingPlayer === CONFIG.P1 ? CONFIG.P2 : CONFIG.P1;
    moveCount = 0; redCenterPoints = 0; blueCenterPoints = 0;
    selectedNode = null; validMoves = []; lastMove = null; positionHistory = {}; currentState = STATE.IDLE;
    recordPositionState();
    resetTurnTimer();
    updateUI();
    drawBoard();
    startTimers();
    if (gameMode === 'pve' && currentTurn === CONFIG.P2) {
      aiThinking = true;
      updateUI();
      aiTimeout = setTimeout(makeAIMove, 420);
    }
  }
  function startTimers() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (currentState === STATE.GAME_OVER) { clearInterval(timerInterval); return; }
      if (aiThinking) { updateUI(); return; } // pause shot clock while AI thinks
      if (turnTimeLimit > 0) {
        turnTimeRemaining--;
        if (turnTimeRemaining <= 0) {
          clearInterval(timerInterval);
          if (currentTurn === CONFIG.P1) endGame(CONFIG.P2, "Time's up! You took too long (forfeit).");
          else endGame(CONFIG.P1, 'AI timed out — you win by forfeit!');
          return;
        }
      }
      if (timerMode === 'global') {
        matchTimeRemaining--;
        if (matchTimeRemaining <= 0) evaluateScoreAndEnd('Match time expired!');
      } else if (timerMode === 'chess') {
        if (currentTurn === CONFIG.P1) p1TimeRemaining--;
        else p2TimeRemaining--;
        if (p1TimeRemaining <= 0) endGame(CONFIG.P2, 'Red ran out of time!');
        if (p2TimeRemaining <= 0) endGame(CONFIG.P1, 'Blue ran out of time!');
      }
      updateUI();
    }, 1000);
  }
  function updateUI() {
    const redPieces = board.filter((p) => p === CONFIG.P1).length;
    const bluePieces = board.filter((p) => p === CONFIG.P2).length;
    document.getElementById('red-beads').textContent = redPieces;
    document.getElementById('blue-beads').textContent = bluePieces;
    document.getElementById('red-captures').textContent = BEADS - bluePieces;
    document.getElementById('blue-captures').textContent = BEADS - redPieces;
    if (centerRule === 'cumulative') {
      document.getElementById('red-center-steps').textContent = redCenterPoints;
      document.getElementById('blue-center-steps').textContent = blueCenterPoints;
    } else if (centerRule === 'endgame') {
      document.getElementById('red-center-steps').textContent = 'End';
      document.getElementById('blue-center-steps').textContent = 'End';
    } else {
      document.getElementById('red-center-steps').textContent = 'Off';
      document.getElementById('blue-center-steps').textContent = 'Off';
    }
    document.getElementById('moves-left').textContent = maxMoveLimit > 0 ? Math.max(0, maxMoveLimit - moveCount) : '∞';
    const globalBanner = document.getElementById('global-timer-banner');
    const rClock = document.getElementById('red-clock');
    const bClock = document.getElementById('blue-clock');
    if (timerMode === 'global') {
      globalBanner.style.display = 'flex'; rClock.style.display = 'none'; bClock.style.display = 'none';
      const tEl = document.getElementById('match-timer');
      tEl.textContent = formatTime(matchTimeRemaining);
      tEl.style.color = matchTimeRemaining <= 15 ? '#ef4444' : '#e0a045';
    } else if (timerMode === 'chess') {
      globalBanner.style.display = 'flex';
      document.getElementById('match-timer').textContent = 'Chess';
      rClock.style.display = 'inline-block'; bClock.style.display = 'inline-block';
      rClock.textContent = formatTime(p1TimeRemaining); bClock.textContent = formatTime(p2TimeRemaining);
      rClock.className = 'chess-clock' + (currentTurn === CONFIG.P1 ? ' active' : '');
      bClock.className = 'chess-clock' + (currentTurn === CONFIG.P2 ? ' active' : '');
    } else {
      globalBanner.style.display = 'flex';
      document.getElementById('match-timer').textContent = 'OFF';
      document.getElementById('match-timer').style.color = '#9ab0a6';
      rClock.style.display = 'none'; bClock.style.display = 'none';
    }
    if (turnTimeLimit > 0 && !aiThinking) {
      document.getElementById('red-shot-clock').textContent = currentTurn === CONFIG.P1 ? ('⏳ ' + turnTimeRemaining + 's') : '';
      document.getElementById('blue-shot-clock').textContent = currentTurn === CONFIG.P2 ? ('⏳ ' + turnTimeRemaining + 's') : '';
    } else {
      document.getElementById('red-shot-clock').textContent = '';
      document.getElementById('blue-shot-clock').textContent = '';
    }
    document.getElementById('card-red').classList.toggle('active-turn', currentTurn === CONFIG.P1 && currentState !== STATE.GAME_OVER);
    document.getElementById('card-blue').classList.toggle('active-turn', currentTurn === CONFIG.P2 && currentState !== STATE.GAME_OVER);
    const finishBtn = document.getElementById('finish-btn');
    finishBtn.style.display = (currentState === STATE.CHAIN_JUMPING && currentTurn === CONFIG.P1) ? 'block' : 'none';
    const badge = document.getElementById('status-badge');
    const lvl = document.getElementById('ai-difficulty');
    const lvlName = lvl.options[lvl.selectedIndex] ? lvl.options[lvl.selectedIndex].text : 'AI';
    if (currentState !== STATE.GAME_OVER) {
      if (turnTimeLimit > 0 && turnTimeRemaining <= 3 && !aiThinking) badge.className = 'status-badge danger';
      else badge.className = 'status-badge';
      if (currentTurn === CONFIG.P1) {
        if (currentState === STATE.CHAIN_JUMPING) {
          badge.textContent = 'Multi-jump — tap next jump or Finish';
          badge.style.background = 'rgba(60,184,154,0.18)'; badge.style.color = '#3cb89a';
        } else if (currentState === STATE.SELECTED) {
          badge.textContent = 'Tap a highlighted square to move';
          badge.style.background = 'rgba(214,69,69,0.16)'; badge.style.color = '#f0a0a0';
        } else {
          badge.textContent = 'Your turn — select a Red bead';
          badge.style.background = 'rgba(214,69,69,0.16)'; badge.style.color = '#f0a0a0';
        }
      } else {
        const gameMode = document.getElementById('game-mode-select').value;
        if (gameMode === 'pve') {
          badge.textContent = 'Blue (' + lvlName + ') is thinking…';
          badge.style.background = 'rgba(61,143,209,0.16)'; badge.style.color = '#8ec5f0';
        } else {
          badge.textContent = "Blue's turn — select a Blue bead";
          badge.style.background = 'rgba(61,143,209,0.16)'; badge.style.color = '#8ec5f0';
        }
      }
    }
  }
  function drawBoard() {
    ctx.clearRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);
    // soft board wash
    const bg = ctx.createLinearGradient(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);
    bg.addColorStop(0, '#15241f'); bg.addColorStop(1, '#0e1814');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);

    ctx.strokeStyle = '#4a675c'; ctx.lineWidth = 3;
    for (let u = 0; u < 16; u++) {
      ADJACENCY[u].forEach((v) => {
        if (u < v) {
          ctx.beginPath();
          ctx.moveTo(POSITIONS[u].x, POSITIONS[u].y);
          ctx.lineTo(POSITIONS[v].x, POSITIONS[v].y);
          ctx.stroke();
        }
      });
    }
    if (lastMove && lastMove.from !== undefined && lastMove.to !== undefined) {
      const p1 = POSITIONS[lastMove.from], p2 = POSITIONS[lastMove.to];
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = 'rgba(224,160,69,0.8)'; ctx.lineWidth = 5; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(p1.x, p1.y, 14, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(224,160,69,0.55)'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    POSITIONS.forEach((pos, idx) => {
      const isCenter = CONFIG.CENTER_NODES.includes(idx);
      ctx.fillStyle = isCenter ? '#243832' : '#15241f';
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = isCenter ? '#e0a045' : '#5d7a6e'; ctx.lineWidth = isCenter ? 3 : 2; ctx.stroke();
    });
    if (currentState !== STATE.GAME_OVER && currentState !== STATE.CHAIN_JUMPING) {
      const gameMode = document.getElementById('game-mode-select').value;
      if (gameMode === 'pvp' || currentTurn === CONFIG.P1) {
        POSITIONS.forEach((pos, idx) => {
          if (board[idx] === currentTurn && getMovesForNode(board, idx, currentTurn).length > 0) {
            ctx.beginPath(); ctx.arc(pos.x, pos.y, 19, 0, Math.PI * 2);
            ctx.strokeStyle = '#e0a045'; ctx.lineWidth = 3; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
          }
        });
      }
    }
    POSITIONS.forEach((pos, idx) => {
      const val = board[idx];
      if (val === 0) return;
      const radius = 13;
      const grad = ctx.createRadialGradient(pos.x - 4, pos.y - 4, 2, pos.x, pos.y, radius);
      if (val === CONFIG.P1) { grad.addColorStop(0, '#f0a8a8'); grad.addColorStop(0.35, '#d64545'); grad.addColorStop(1, '#7a1f1f'); }
      else { grad.addColorStop(0, '#a8d4f5'); grad.addColorStop(0.35, '#3d8fd1'); grad.addColorStop(1, '#1a4f7a'); }
      ctx.beginPath(); ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    });
    if (lastMove && lastMove.to !== undefined) {
      const p2 = POSITIONS[lastMove.to];
      ctx.beginPath(); ctx.arc(p2.x, p2.y, 17, 0, Math.PI * 2);
      ctx.strokeStyle = '#e0a045'; ctx.lineWidth = 3; ctx.stroke();
    }
    if (selectedNode !== null) {
      ctx.strokeStyle = '#e0a045'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(POSITIONS[selectedNode].x, POSITIONS[selectedNode].y, 18, 0, Math.PI * 2); ctx.stroke();
      validMoves.forEach((m) => {
        const targetPos = POSITIONS[m.to];
        ctx.beginPath(); ctx.arc(targetPos.x, targetPos.y, 18, 0, Math.PI * 2);
        if (m.captured !== null) {
          ctx.fillStyle = 'rgba(224,160,69,0.42)'; ctx.fill();
          ctx.strokeStyle = '#e0a045'; ctx.lineWidth = 3; ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(60,184,154,0.42)'; ctx.fill();
          ctx.strokeStyle = '#3cb89a'; ctx.lineWidth = 3; ctx.stroke();
        }
      });
    }
  }
  function canvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CONFIG.CANVAS_SIZE / rect.width;
    const scaleY = CONFIG.CANVAS_SIZE / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }
  function handleCanvasClick(e) {
    if (currentState === STATE.GAME_OVER || aiThinking) return;
    const gameMode = document.getElementById('game-mode-select').value;
    if (gameMode === 'pve' && currentTurn !== CONFIG.P1) return;
    initAudio();
    const { x: clickX, y: clickY } = canvasCoords(e);
    const clickedIdx = POSITIONS.findIndex((pos) => Math.hypot(pos.x - clickX, pos.y - clickY) <= 28);
    if (clickedIdx === -1) return;
    if (currentState === STATE.CHAIN_JUMPING) {
      if (board[clickedIdx] === 0) {
        const move = validMoves.find((m) => m.to === clickedIdx);
        if (move) executeMove(move);
      }
      return;
    }
    if (board[clickedIdx] === currentTurn) {
      playSoundEffect('select');
      selectedNode = clickedIdx;
      validMoves = getMovesForNode(board, clickedIdx, currentTurn);
      currentState = STATE.SELECTED;
      updateUI(); drawBoard();
      return;
    }
    if (currentState === STATE.SELECTED && board[clickedIdx] === 0) {
      const move = validMoves.find((m) => m.to === clickedIdx);
      if (move) { executeMove(move); return; }
    }
    selectedNode = null; validMoves = []; currentState = STATE.IDLE; updateUI(); drawBoard();
  }
  function executeMove(move) {
    board[move.to] = board[move.from];
    board[move.from] = 0;
    lastMove = { from: move.from, to: move.to };
    const hitCenter = CONFIG.CENTER_NODES.includes(move.to);
    let wasCapture = false;
    if (move.captured !== null) { board[move.captured] = 0; wasCapture = true; playSoundEffect('capture'); }
    else if (hitCenter) playSoundEffect('center_step');
    else playSoundEffect('move');

    if (wasCapture) {
      const followUpJumps = getMovesForNode(board, move.to, currentTurn).filter((m) => m.captured !== null);
      if (followUpJumps.length > 0) {
        currentState = STATE.CHAIN_JUMPING;
        selectedNode = move.to;
        validMoves = followUpJumps;
        // Do not reset shot clock mid-chain (Gemini reset made stalling easy)
        updateUI(); drawBoard();
        if (currentTurn === CONFIG.P2 && document.getElementById('game-mode-select').value === 'pve') {
          aiTimeout = setTimeout(() => {
            const action = selectAIChainContinuation(followUpJumps);
            if (action.type === 'finish') completeTurn();
            else executeMove(action.move);
          }, 520);
        }
        return;
      }
    }
    completeTurn();
  }
  function manualFinishTurn() { if (currentState === STATE.CHAIN_JUMPING && currentTurn === CONFIG.P1) completeTurn(); }
  function completeTurn() {
    currentState = STATE.IDLE; selectedNode = null; validMoves = [];
    if (centerRule === 'cumulative') {
      CONFIG.CENTER_NODES.forEach((idx) => {
        if (board[idx] === CONFIG.P1) redCenterPoints++;
        if (board[idx] === CONFIG.P2) blueCenterPoints++;
      });
    }
    moveCount++;
    resetTurnTimer();
    updateUI(); drawBoard();
    const redPieces = board.filter((p) => p === CONFIG.P1).length;
    const bluePieces = board.filter((p) => p === CONFIG.P2).length;
    if (redPieces === 0) { endGame(CONFIG.P2, 'Blue eliminated all Red beads!'); return; }
    if (bluePieces === 0) { endGame(CONFIG.P1, 'Red eliminated all Blue beads!'); return; }
    if (maxMoveLimit > 0 && moveCount >= maxMoveLimit) { evaluateScoreAndEnd('Max moves limit of ' + maxMoveLimit + ' reached!'); return; }
    if (recordPositionState() >= 3) { endGame(0, 'Draw — 3-fold repetition.'); return; }
    currentTurn = currentTurn === CONFIG.P1 ? CONFIG.P2 : CONFIG.P1;
    updateUI();
    if (getAllLegalMoves(board, currentTurn).length === 0) {
      const winner = currentTurn === CONFIG.P1 ? CONFIG.P2 : CONFIG.P1;
      const loser = currentTurn === CONFIG.P1 ? 'Red has' : 'Blue has';
      endGame(winner, loser + ' no legal moves (stalemate).');
      return;
    }
    const gameMode = document.getElementById('game-mode-select').value;
    if (gameMode === 'pve' && currentTurn === CONFIG.P2) {
      aiThinking = true;
      updateUI();
      aiTimeout = setTimeout(makeAIMove, 380);
    } else {
      aiThinking = false;
    }
  }
  function makeAIMove() {
    try {
      const move = selectAIMove();
      if (move) executeMove(move);
      else endGame(CONFIG.P1, 'AI has no moves — you win by stalemate!');
    } finally {
      // aiThinking cleared when turn completes or next human turn; keep true during chain
      if (currentTurn !== CONFIG.P2 || currentState === STATE.GAME_OVER) aiThinking = false;
      if (currentState === STATE.CHAIN_JUMPING && currentTurn === CONFIG.P2) aiThinking = true;
      if (currentTurn === CONFIG.P1) aiThinking = false;
      updateUI();
    }
  }
  function evaluateScoreAndEnd(prefixReason) {
    if (currentState === STATE.GAME_OVER) return;
    const redPieces = board.filter((p) => p === CONFIG.P1).length;
    const bluePieces = board.filter((p) => p === CONFIG.P2).length;
    const redCaptures = BEADS - bluePieces;
    const blueCaptures = BEADS - redPieces;
    if (redCaptures > blueCaptures) { endGame(CONFIG.P1, prefixReason + ' Red won on captures (' + redCaptures + ' vs ' + blueCaptures + ').'); return; }
    if (blueCaptures > redCaptures) { endGame(CONFIG.P2, prefixReason + ' Blue won on captures (' + blueCaptures + ' vs ' + redCaptures + ').'); return; }
    if (centerRule === 'endgame') {
      redCenterPoints = 0; blueCenterPoints = 0;
      CONFIG.CENTER_NODES.forEach((idx) => {
        if (board[idx] === CONFIG.P1) redCenterPoints++;
        if (board[idx] === CONFIG.P2) blueCenterPoints++;
      });
    }
    if (centerRule !== 'off') {
      if (redCenterPoints > blueCenterPoints) { endGame(CONFIG.P1, prefixReason + ' Captures tied — Red won on center (' + redCenterPoints + ' vs ' + blueCenterPoints + ').'); return; }
      if (blueCenterPoints > redCenterPoints) { endGame(CONFIG.P2, prefixReason + ' Captures tied — Blue won on center (' + blueCenterPoints + ' vs ' + redCenterPoints + ').'); return; }
      endGame(0, prefixReason + ' Draw — equal captures and center.');
    } else {
      endGame(0, prefixReason + ' Draw — equal captures (' + redCaptures + ').');
    }
  }
  function endGame(winner, reason) {
    clearInterval(timerInterval);
    if (aiTimeout) clearTimeout(aiTimeout);
    aiThinking = false;
    currentState = STATE.GAME_OVER;
    const modal = document.getElementById('win-modal');
    const title = document.getElementById('modal-winner');
    const desc = document.getElementById('modal-desc');
    const pve = document.getElementById('game-mode-select').value === 'pve';
    if (winner === CONFIG.P1) {
      title.textContent = 'Red wins';
      title.style.color = '#d64545';
      playSoundEffect('win');
    } else if (winner === CONFIG.P2) {
      title.textContent = pve ? 'Blue wins' : 'Blue wins';
      title.style.color = '#3d8fd1';
      playSoundEffect(pve ? 'lose' : 'win');
    } else {
      title.textContent = 'Draw';
      title.style.color = '#e0a045';
      playSoundEffect('select');
    }
    desc.textContent = reason;
    modal.style.display = 'flex';
    updateUI(); drawBoard();
  }

  function init() {
    setupCanvas();
    document.body.addEventListener('click', initAudio, { once: true });
    canvas.addEventListener('click', handleCanvasClick);
    document.getElementById('audio-toggle').addEventListener('click', toggleSFX);
    document.getElementById('finish-btn').addEventListener('click', manualFinishTurn);
    document.getElementById('restart-btn').addEventListener('click', resetGame);
    document.getElementById('play-again-btn').addEventListener('click', () => {
      document.getElementById('win-modal').style.display = 'none';
      resetGame();
    });
    document.getElementById('game-mode-select').addEventListener('change', syncAiLevelEnabled);
    window.addEventListener('resize', () => { setupCanvas(); drawBoard(); });
    resetGame();
  }
  window.addEventListener('load', init);
  // Headless / QA hook (not used by players)
  window.__CURSOR_INDEX__ = {
    BEADS, CONFIG, STATE,
    getBoard: () => board.slice(),
    getTurn: () => currentTurn,
    getState: () => currentState,
    resetGame,
    selectAIMove,
    getAllLegalMoves: (b, p) => getAllLegalMoves(b || board, p || currentTurn),
    evaluateBoard,
    makeAIMove,
    executeMove,
    completeTurn,
    getMovesForNode,
    isAiThinking: () => aiThinking,
  };
})();
</script>
</body>
</html>`;
}

const outDir = __dirname;
const variants = [
  {
    beads: 4,
    startBoard: [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2],
    tagline: '4 beads · 4×4 · Human vs AI',
    file: 'CURSOR_INDEX_4.html',
  },
  {
    beads: 6,
    startBoard: [1, 1, 1, 1, 1, 0, 0, 1, 2, 0, 0, 2, 2, 2, 2, 2],
    tagline: '6 beads · 4×4 · Human vs AI',
    file: 'CURSOR_INDEX_6.html',
  },
];

for (const v of variants) {
  const html = buildHtml(v);
  // Fix accidental CSS typo if any
  const cleaned = html.replace(/--muted: #9 Panela3b0;\s*/g, '');
  fs.writeFileSync(path.join(outDir, v.file), cleaned, 'utf8');
  console.log('Wrote', v.file, cleaned.length, 'bytes');
}
