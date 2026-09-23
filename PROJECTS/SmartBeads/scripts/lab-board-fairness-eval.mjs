/**
 * Production HonestAi board-fairness/playability Lab — TypeScript HonestAi + SmartBeadsEngine only
 * (never prototype .cjs AI — GPT_PROJECT_RULES_01P.md "Rule - Behavioral Gates").
 *
 * Generalized sibling of lab-ai-difficulty-eval.mjs: instead of testing AI-level separation on one
 * board, this loops self-play fairness/playability across a set of production ProductBoardIds at
 * D1/D2/D3 (AI level 1/2/3), both sides run at the SAME level per match (board-fairness read, not
 * AI-difficulty read). BLUE always moves first (first-player baseline), matching the prototype
 * Lab protocol's `firstPlayerBaseline: "P1"`.
 *
 * Per VISION_05P.md "Board selection principles": D2 is the primary fairness depth; D1 is a greedy
 * sanity check; D3 is secondary long-horizon attrition evidence ONLY — never rank boards by D3.
 * Sample sizes are set accordingly (D2 gets the largest N).
 *
 * Usage:
 *   npx tsx PROJECTS/SmartBeads/scripts/lab-board-fairness-eval.mjs [--boards=6x4,6x3x5,...] \
 *     [--games-d1=90] [--games-d2=100] [--games-d3=24] [--out=<path.json>] [--seed=1000]
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');

const { SmartBeadsEngine, ENGINE_SAFETY_MAX_PLIES } = await import(
  pathToFileURL(path.join(root, 'PROJECTS/SmartBeads/src/core/SmartBeadsEngine.ts')).href
);
const {
  selectAiTurnPath,
  EASY_SOFT_MISS_RATE,
  MEDIUM_SOFT_MISS_RATE,
  aiOpponentReplyPlies,
  thinkBudgetForLevel,
} = await import(
  pathToFileURL(path.join(root, 'PROJECTS/SmartBeads/src/playtest/web/feature/HonestAi.ts')).href
);
const { getCatalogEntry } = await import(
  pathToFileURL(path.join(root, 'PROJECTS/SmartBeads/src/config/BoardCatalog.ts')).href
);

// ---- CLI args -------------------------------------------------------------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const ALL_BOARDS = ['6x4', '6x3x5', '10x5', '12x6x5', '8x4x6', '7x4x5'];
const boardIds = args.boards ? String(args.boards).split(',') : ALL_BOARDS;
const gamesByLevel = {
  1: Number(args['games-d1'] ?? 90),
  2: Number(args['games-d2'] ?? 100),
  3: Number(args['games-d3'] ?? 24),
};
const baseSeed = Number(args.seed ?? 1000);
const outPath = args.out
  ? path.resolve(String(args.out))
  : path.join(
      root,
      'PROJECTS/SmartBeads/prototype/board4',
      `PRODUCTION_LAB_FAIRNESS_${new Date().toISOString().slice(0, 10)}.json`,
    );

// ---- deterministic seeded RNG (LCG, matches lab-ai-difficulty-eval.mjs) ---
function makeRng(seed) {
  let rngState = seed + 1;
  return () => {
    rngState = (rngState * 1103515245 + 12345) % 0x100000000;
    return (rngState >>> 0) / 0x100000000;
  };
}

function applyPath(engine, pathMoves) {
  for (const move of pathMoves) {
    if (engine.getState().gameOver) return;
    const legal = engine.getLegalMoves().some((m) => m.from === move.from && m.to === move.to);
    if (!legal) {
      if (engine.getChainPieceId() !== null) engine.endTurn();
      return;
    }
    engine.applyMove(move);
  }
  if (engine.getChainPieceId() !== null) engine.endTurn();
}

/**
 * Plays one self-play match at a fixed AI level for both sides. BLUE moves first.
 * Returns per-game telemetry: winner, endReason, plies, captures per side.
 */
function playMatch(engineVariant, level, seed) {
  const engine = new SmartBeadsEngine(engineVariant);
  const rng = makeRng(seed);
  const budgetMs = thinkBudgetForLevel(level, engineVariant);
  const softMiss =
    level === 1
      ? { easySoftMissRate: EASY_SOFT_MISS_RATE, mediumSoftMissRate: 0 }
      : level === 2
        ? { easySoftMissRate: 0, mediumSoftMissRate: MEDIUM_SOFT_MISS_RATE }
        : { easySoftMissRate: 0, mediumSoftMissRate: 0 };

  // External safety net slightly above the engine's own ENGINE_SAFETY_MAX_PLIES(120) so we never
  // spin forever if a bug produces a non-terminating loop outside engine bookkeeping.
  const hardStop = ENGINE_SAFETY_MAX_PLIES + 5;
  let ply = 0;
  let stoppedByHarness = false;

  while (!engine.getState().gameOver && ply < hardStop) {
    const player = engine.getState().currentPlayer;
    const turnPath = selectAiTurnPath(engineVariant, level, engine.exportSnapshot(), player, {
      budgetMs,
      easySoftMissRate: softMiss.easySoftMissRate,
      mediumSoftMissRate: softMiss.mediumSoftMissRate,
      rng,
      center: { centerRule: 'off' },
    });
    if (!turnPath?.length) {
      stoppedByHarness = true;
      break;
    }
    applyPath(engine, turnPath);
    ply += 1;
  }

  const state = engine.getState();
  const red = engine.countPieces('RED');
  const blue = engine.countPieces('BLUE');

  if (state.gameOver) {
    return {
      winner: state.winner,
      endReason: state.endReason ?? 'unknown',
      plies: ply,
      redPieces: red,
      bluePieces: blue,
      redCaptures: state.captures?.RED ?? 0,
      blueCaptures: state.captures?.BLUE ?? 0,
    };
  }

  // Harness hit hardStop without engine.gameOver (should be rare given ENGINE_SAFETY_MAX_PLIES) —
  // record as a harness-level move-cap draw, decided by piece count if unequal (documented as
  // "harness_cap", distinct from the engine's own "safety_cap" reason).
  let winner = 'DRAW';
  if (red !== blue) winner = red > blue ? 'RED' : 'BLUE';
  return {
    winner,
    endReason: stoppedByHarness ? 'no_legal_turn' : 'harness_cap',
    plies: ply,
    redPieces: red,
    bluePieces: blue,
    redCaptures: state.captures?.RED ?? 0,
    blueCaptures: state.captures?.BLUE ?? 0,
  };
}

function summarize(games) {
  const n = games.length;
  let blueWins = 0;
  let redWins = 0;
  let draws = 0;
  const endReasonCounts = {};
  let totalPlies = 0;
  let totalCaptures = 0;
  let totalRedCaptures = 0;
  let totalBlueCaptures = 0;

  for (const g of games) {
    if (g.winner === 'BLUE') blueWins += 1;
    else if (g.winner === 'RED') redWins += 1;
    else draws += 1;
    endReasonCounts[g.endReason] = (endReasonCounts[g.endReason] ?? 0) + 1;
    totalPlies += g.plies;
    totalCaptures += g.redCaptures + g.blueCaptures;
    totalRedCaptures += g.redCaptures;
    totalBlueCaptures += g.blueCaptures;
  }

  const gamesWithWinner = blueWins + redWins;
  const fpaPercentPoints =
    gamesWithWinner > 0 ? Math.round(((blueWins - redWins) / gamesWithWinner) * 1000) / 10 : null;

  return {
    n,
    blueWins,
    redWins,
    draws,
    gamesWithWinner,
    fpaPercentPoints, // First-Player-Advantage in pp, BLUE(P1) minus RED(P2) win share; null if no winners
    // VISION_05P.md "Board selection principles": FPA is only a meaningful fairness read at >=10 winners.
    fpaMeetsWinnerThreshold: gamesWithWinner >= 10,
    endReasonCounts,
    avgPlies: Math.round((totalPlies / n) * 10) / 10,
    avgCapturesPerGame: Math.round((totalCaptures / n) * 100) / 100,
    avgRedCaptures: Math.round((totalRedCaptures / n) * 100) / 100,
    avgBlueCaptures: Math.round((totalBlueCaptures / n) * 100) / 100,
    captureGap: Math.round((totalBlueCaptures / n - totalRedCaptures / n) * 100) / 100,
  };
}

const report = {
  purpose: 'Production HonestAi board-fairness/playability Lab — shipped V1 boards (excl. 16)',
  evaluator: 'lab-board-fairness-eval.mjs',
  engineSource: 'production (SmartBeadsEngine.ts + HonestAi.ts)',
  protocol: {
    firstPlayerBaseline: 'BLUE',
    levels: [1, 2, 3],
    gamesByLevel,
    seedBase: baseSeed,
    budgetMsByLevelNote: 'thinkBudgetForLevel(level, variant) — same function production PvE uses',
    note: 'Both sides play at the SAME AI level per match (board-fairness read, not AI-difficulty separation). D2 is primary per VISION_05P.md; D1 is a sanity check; D3 is secondary long-horizon evidence only — never ranked.',
  },
  boards: {},
  startedAt: new Date().toISOString(),
};

for (const boardId of boardIds) {
  const entry = getCatalogEntry(boardId);
  if (!entry?.engineVariant) {
    console.error(`SKIP ${boardId} — no engineVariant in BoardCatalog`);
    continue;
  }
  const engineVariant = entry.engineVariant;
  console.log(`\n=== Board ${boardId} (engineVariant=${engineVariant}) ===`);
  report.boards[boardId] = { engineVariant, displayName: entry.displayName, levels: {} };

  for (const level of [1, 2, 3]) {
    const n = gamesByLevel[level];
    const games = [];
    const t0 = Date.now();
    for (let i = 0; i < n; i += 1) {
      const seed = baseSeed + level * 100000 + boardIds.indexOf(boardId) * 10000 + i * 7;
      games.push(playMatch(engineVariant, level, seed));
      if ((i + 1) % 10 === 0) {
        process.stdout.write(`  D${level} ${i + 1}/${n} (${Math.round((Date.now() - t0) / 1000)}s)\r`);
      }
    }
    const elapsedS = Math.round((Date.now() - t0) / 1000);
    const summary = summarize(games);
    console.log(
      `  D${level}: BLUE ${summary.blueWins} / RED ${summary.redWins} / DRAW ${summary.draws} ` +
        `(n=${n}, ${elapsedS}s) FPA=${summary.fpaPercentPoints}pp avgPlies=${summary.avgPlies} avgCaptures=${summary.avgCapturesPerGame}`,
    );
    report.boards[boardId].levels[level] = { ...summary, elapsedS, games };
  }
}

report.finishedAt = new Date().toISOString();
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`\nWrote ${outPath}`);
