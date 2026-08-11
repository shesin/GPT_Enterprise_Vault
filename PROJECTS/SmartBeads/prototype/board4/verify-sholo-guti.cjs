'use strict';
/**
 * Smoke-test SHOLO_GUTI.html: geometry, captures, Finish, honest AI depths, AI replies.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = __dirname;
const FILE = 'SHOLO_GUTI.html';

function el(id, extra) {
  const o = {
    id,
    style: {},
    value: '',
    disabled: false,
    textContent: '',
    className: '',
    classList: {
      _c: new Set(),
      toggle(n, on) {
        if (on === false) this._c.delete(n);
        else if (on === true) this._c.add(n);
        else if (this._c.has(n)) this._c.delete(n);
        else this._c.add(n);
      },
      add(n) { this._c.add(n); },
      remove(n) { this._c.delete(n); },
    },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 520 }),
    width: 360,
    height: 520,
    getContext: () => ({
      setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {},
      moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc() {},
      setLineDash() {},
      createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; },
    }),
  };
  return Object.assign(o, extra || {});
}

function loadGame() {
  const html = fs.readFileSync(path.join(ROOT, FILE), 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('no script');

  const elements = {
    board: el('board', { width: 500, height: 680 }),
    'board-frame': el('board-frame'),
    status: el('status'),
    'finish-btn': el('finish-btn', { disabled: true }),
    'ai-level': el('ai-level', { value: '2' }),
    'level-note': el('level-note'),
    'human-count': el('human-count'),
    'ai-count': el('ai-count'),
    'human-caps': el('human-caps'),
    'ai-caps': el('ai-caps'),
    'turn-count': el('turn-count'),
    'pill-human': el('pill-human'),
    'pill-ai': el('pill-ai'),
    'win-modal': el('win-modal'),
    'modal-title': el('modal-title'),
    'modal-desc': el('modal-desc'),
    'restart-btn': el('restart-btn'),
    'play-again-btn': el('play-again-btn'),
    'bgm-audio': el('bgm-audio'),
    'bgm-select': el('bgm-select'),
    'bgm-vol': el('bgm-vol', { value: '0.3' }),
    'bgm-play': el('bgm-play'),
    'bgm-pause': el('bgm-pause'),
  };

  const timers = [];
  const sandbox = {
    console,
    Math,
    performance: { now: () => Date.now() },
    requestAnimationFrame(cb) { return setTimeout(() => cb(Date.now()), 0); },
    setTimeout(fn, ms) {
      const id = { fn, ms };
      timers.push(id);
      return id;
    },
    clearTimeout() {},
    addEventListener() {},
    window: {},
    document: {
      getElementById: (id) => elements[id] || el(id),
      addEventListener() {},
    },
    HTMLCanvasElement: function () {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(match[1], sandbox, { filename: FILE });
  const api = sandbox.window.__SHOLO_GUTI__;
  if (!api) throw new Error('API missing');
  return { api, elements, flush() {
    // Drain immediate timers a few times (AI scheduling)
    for (let n = 0; n < 20; n++) {
      const batch = timers.splice(0, timers.length);
      if (!batch.length) break;
      batch.forEach((t) => t.fn());
    }
  } };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function main() {
  const results = [];
  function pass(name, detail) { results.push({ ok: true, name, detail }); }
  function fail(name, detail) { results.push({ ok: false, name, detail }); }

  try {
    const { api, elements } = loadGame();
    assert(api.N === 37, 'expected 37 nodes, got ' + api.N);
    pass('geometry', 'N=' + api.N);

    api.resetGame();
    assert(api.count(api.P1) === 16 && api.count(api.P2) === 16, 'start counts');
    assert(api.getTurn() === api.P1, 'human starts');
    pass('start position', '16 vs 16, P1 to move');

    // Legal slide exists
    const legal = api.getAllLegalMoves();
    assert(legal.length > 0, 'no legal moves at start');
    const slides = legal.filter((m) => m.captured === null);
    const caps = legal.filter((m) => m.captured !== null);
    pass('legal generation', 'moves=' + legal.length + ' slides=' + slides.length + ' caps=' + caps.length);

    // Play a human slide then AI reply
    elements['ai-level'].value = '2';
    const slide = slides[0];
    const beforeAi = api.count(api.P2);
    api.executeMoveHuman(slide);
    assert(api.getTurn() === api.P2, 'should be AI turn after slide');
    const path = api.playAITurnSync();
    assert(path && path.length >= 1, 'AI returned empty path');
    assert(api.getTurn() === api.P1, 'back to human after AI');
    assert(api.count(api.P1) + api.count(api.P2) <= 32, 'piece count intact');
    pass('AI reply L2', 'pathLen=' + path.length + ' aiPieces=' + api.count(api.P2) + ' (was ' + beforeAi + ')');

    // Honest depth info
    const d1 = api.aiDepthInfo(1);
    const d2 = api.aiDepthInfo(2);
    const d3 = api.aiDepthInfo(3);
    assert(d1.search === false && d1.label === 'greedy', 'L1 not greedy');
    assert(d2.search === true && d2.opponentReplyPlies === 0, 'L2 depth wrong');
    assert(d3.search === true && d3.opponentReplyPlies === 1, 'L3 depth wrong');
    assert(api.opponentReplyPlies(2) === 0 && api.opponentReplyPlies(3) === 1, 'reply plies');
    pass('honest AI depths', 'L1 greedy; L2 1-turn; L3 2-turn (1 opponent reply ply)');

    // Levels produce different search behaviour on same board: compare selectAITurn structure
    api.resetGame();
    // Force a mid-ish position: play a few sync exchanges
    elements['ai-level'].value = '1';
    for (let i = 0; i < 3; i++) {
      const m = api.getAllLegalMoves(api.getBoard(), api.P1);
      if (!m.length) break;
      api.executeMoveHuman(m[0]);
      if (api.getTurn() === api.P2) api.playAITurnSync();
    }
    const b = api.getBoard();
    api.forceBoard(b, api.P2);
    const p1 = api.selectAITurn(1, b);
    const p2 = api.selectAITurn(2, b);
    const p3 = api.selectAITurn(3, b);
    assert(p1 && p2 && p3, 'all levels return paths');
    pass('AI all levels return moves', 'L1 hops=' + p1.length + ' L2=' + p2.length + ' L3=' + p3.length);

    // Capture + Finish path if a capture exists from start or after resets
    api.resetGame();
    let foundChain = false;
    // Search a few opening slides for a capture opportunity by scanning legal caps after mutual play
    for (let t = 0; t < 12 && !foundChain; t++) {
      const moves = api.getAllLegalMoves(api.getBoard(), api.P1);
      const cap = moves.find((m) => m.captured !== null);
      const choice = cap || moves[0];
      if (!choice) break;
      const r = api.executeMoveHuman(choice);
      if (r.follow && r.follow.length) {
        foundChain = true;
        assert(api.getState() === api.STATE.CHAIN_JUMPING, 'expected CHAIN_JUMPING');
        api.finishChain();
        assert(api.getTurn() === api.P2 || api.getState() === api.STATE.GAME_OVER, 'Finish should end turn');
        pass('multi-jump Finish', 'Finish ended chain; follow options were ' + r.follow.length);
        break;
      }
      if (api.getTurn() === api.P2) api.playAITurnSync();
    }
    if (!foundChain) {
      // Construct capture: place enemy adjacent with landing
      // Use API continueCollinear on a known adjacency from geometry
      const board = new Array(api.N).fill(0);
      // Pick first edge with collinear continuation
      let built = false;
      for (let i = 0; i < api.N && !built; i++) {
        for (const over of api.ADJ[i]) {
          const land = api.continueCollinear(i, over);
          if (land >= 0) {
            board[i] = api.P1;
            board[over] = api.P2;
            board[land] = 0;
            // fill rest so game doesn't auto-end
            let filled = 0;
            for (let k = 0; k < api.N && filled < 15; k++) {
              if (!board[k] && k !== land) { board[k] = api.P1; filled++; }
            }
            filled = 0;
            for (let k = 0; k < api.N && filled < 15; k++) {
              if (!board[k] && k !== land) { board[k] = api.P2; filled++; }
            }
            api.forceBoard(board, api.P1);
            const caps2 = api.getMovesForNode(board, i, api.P1).filter((m) => m.captured !== null);
            assert(caps2.length >= 1, 'constructed capture missing');
            const r = api.executeMoveHuman(caps2[0]);
            // may or may not have follow
            if (r.follow && r.follow.length) {
              api.finishChain();
              pass('multi-jump Finish', 'constructed board Finish ok');
            } else {
              pass('capture apply', 'single capture applied; caps you=' + api.humanCaps());
            }
            built = true;
            break;
          }
        }
      }
      assert(built, 'could not construct capture');
    }

    // Turn-end generator includes optional stop
    api.resetGame();
    const ends = api.generateTurnEnds(api.getBoard(), api.P1, 200);
    assert(ends.length >= slides.length, 'turn ends too few');
    pass('turn-end enumeration', 'ends=' + ends.length);

    // L3 AI responds on forced board
    api.resetGame();
    elements['ai-level'].value = '3';
    api.executeMoveHuman(api.getAllLegalMoves()[0]);
    const path3 = api.playAITurnSync();
    assert(path3 && path3.length >= 1, 'L3 AI silent');
    pass('AI reply L3', 'pathLen=' + path3.length);

  } catch (e) {
    fail('exception', e.stack || String(e));
  }

  const failed = results.filter((r) => !r.ok);
  results.forEach((r) => {
    console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + r.name + (r.detail ? ' — ' + r.detail : ''));
  });
  console.log(failed.length ? '\nFAILED: ' + failed.length : '\nALL PASS (' + results.length + ')');
  process.exit(failed.length ? 1 : 0);
}

main();
