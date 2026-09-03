import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';
import {
  aiOpponentReplyPlies,
  evaluate,
  generateTurnEnds,
  selectAiTurnPath,
  thinkBudgetForLevel,
  EASY_SOFT_MISS_RATE,
  MEDIUM_SOFT_MISS_RATE,
  CENTER_EVAL_WEIGHT,
} from '../HonestAi';
import { Move } from '../../../../models/GameState';

function clearBoard(engine: SmartBeadsEngine): void {
  for (const point of engine.getState().board.intersections) {
    point.occupant = undefined;
  }
}

function setOcc(engine: SmartBeadsEngine, label: string, player: 'RED' | 'BLUE'): void {
  const point = engine.getState().board.intersections.find((p) => p.label === label);
  if (!point) throw new Error(`missing ${label}`);
  point.occupant = player;
}

function pathKey(path: Move[]): string {
  return path.map((m) => `${m.from}>${m.to}`).join(',');
}

function applyPath(engine: SmartBeadsEngine, path: Move[]): void {
  for (const move of path) {
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

describe('HonestAi difficulty contract', () => {
  it('documents search depth: Easy 0, Medium 1, Hard 2', () => {
    expect(aiOpponentReplyPlies(1)).toBe(0);
    expect(aiOpponentReplyPlies(2)).toBe(1);
    expect(aiOpponentReplyPlies(3)).toBe(2);
    expect(EASY_SOFT_MISS_RATE).toBeCloseTo(0.3, 5);
    expect(MEDIUM_SOFT_MISS_RATE).toBeCloseTo(0.2, 5);
    expect(CENTER_EVAL_WEIGHT).toBeGreaterThan(0);
  });

  it('Medium soft-miss still captures when a capture exists', () => {
    const engine = new SmartBeadsEngine('16');
    clearBoard(engine);
    setOcc(engine, 'A00', 'BLUE');
    setOcc(engine, 'A01', 'RED');
    setOcc(engine, 'A10', 'BLUE');
    engine.getState().currentPlayer = 'BLUE';
    const snap = engine.exportSnapshot();

    let captureTurns = 0;
    for (let i = 0; i < 20; i++) {
      const path = selectAiTurnPath('16', 2, snap, 'BLUE', {
        budgetMs: 400,
        mediumSoftMissRate: 1,
        rng: () => (i + 0.1) / 20,
      });
      const caps = path!.filter((m) =>
        engine.getState().board.jumpPaths?.some((j) => j.from === m.from && j.to === m.to),
      ).length;
      if (caps > 0) captureTurns += 1;
    }
    expect(captureTurns).toBe(20);
  });

  it('Hard never soft-misses (mediumSoftMissRate ignored at level 3)', () => {
    const engine = new SmartBeadsEngine('16');
    clearBoard(engine);
    setOcc(engine, 'A00', 'BLUE');
    setOcc(engine, 'A01', 'RED');
    setOcc(engine, 'A10', 'BLUE');
    engine.getState().currentPlayer = 'BLUE';
    const snap = engine.exportSnapshot();
    const path = selectAiTurnPath('16', 3, snap, 'BLUE', {
      budgetMs: 800,
      mediumSoftMissRate: 1,
      rng: () => 0,
    });
    const caps = path!.filter((m) =>
      engine.getState().board.jumpPaths?.some((j) => j.from === m.from && j.to === m.to),
    ).length;
    expect(caps).toBeGreaterThan(0);
  });

  it('Easy opening on 6x3x5 explores many slides (not evaluate-only best)', () => {
    const engine = new SmartBeadsEngine('6x3x5');
    engine.getState().currentPlayer = 'BLUE';
    const snap = engine.exportSnapshot();
    const ends = generateTurnEnds('6x3x5', snap, 'BLUE', 200);
    expect(ends.length).toBeGreaterThan(5);

    const distinct = new Set<string>();
    for (let i = 0; i < ends.length; i++) {
      let call = 0;
      const path = selectAiTurnPath('6x3x5', 1, snap, 'BLUE', {
        budgetMs: 500,
        easySoftMissRate: 0,
        rng: () => {
          call += 1;
          if (call === 1) return 0.99;
          return (i + 0.5) / ends.length;
        },
      });
      expect(path?.length).toBeGreaterThan(0);
      distinct.add(pathKey(path!));
    }
    expect(distinct.size).toBeGreaterThan(3);
  });

  it('Easy soft-miss still captures when a capture exists (not silly)', () => {
    const engine = new SmartBeadsEngine('16');
    clearBoard(engine);
    setOcc(engine, 'A00', 'BLUE');
    setOcc(engine, 'A01', 'RED');
    setOcc(engine, 'A10', 'BLUE');
    engine.getState().currentPlayer = 'BLUE';
    const snap = engine.exportSnapshot();

    let captureTurns = 0;
    for (let i = 0; i < 30; i++) {
      const path = selectAiTurnPath('16', 1, snap, 'BLUE', {
        budgetMs: 400,
        easySoftMissRate: 1,
        rng: () => (i + 0.1) / 30,
      });
      const caps = path!.filter((m) =>
        engine.getState().board.jumpPaths?.some((j) => j.from === m.from && j.to === m.to),
      ).length;
      if (caps > 0) captureTurns += 1;
    }
    // Soft-miss with captures available must still prefer capturing lines.
    expect(captureTurns).toBe(30);
  });

  it('evaluate values center when endgame rule is on', () => {
    const engine = new SmartBeadsEngine('6x3x5');
    clearBoard(engine);
    setOcc(engine, 'A21', 'BLUE'); // centre
    setOcc(engine, 'A00', 'BLUE');
    setOcc(engine, 'A40', 'RED');
    setOcc(engine, 'A41', 'RED');
    const withCenter = evaluate(engine.getState(), '6x3x5', 'BLUE', { centerRule: 'endgame' });
    const without = evaluate(engine.getState(), '6x3x5', 'BLUE', { centerRule: 'off' });
    expect(withCenter).toBeGreaterThan(without);
  });

  it('Medium prefers occupying center under endgame when material equal', () => {
    const engine = new SmartBeadsEngine('6x3x5');
    clearBoard(engine);
    // BLUE adjacent to centre; can slide onto A21 or away
    setOcc(engine, 'A11', 'BLUE');
    setOcc(engine, 'A00', 'RED');
    setOcc(engine, 'A02', 'RED');
    setOcc(engine, 'A40', 'BLUE');
    engine.getState().currentPlayer = 'BLUE';
    const snap = engine.exportSnapshot();
    const centerId = engine.getState().board.intersections.find((p) => p.label === 'A21')!.id;

    const path = selectAiTurnPath('6x3x5', 2, snap, 'BLUE', {
      budgetMs: 1500,
      rng: () => 0,
      mediumSoftMissRate: 0,
      center: { centerRule: 'endgame' },
    });
    expect(path).not.toBeNull();
    // Apply and check BLUE ends on centre when that is available and valuable
    const eng2 = new SmartBeadsEngine('6x3x5');
    eng2.loadSnapshot(snap);
    applyPath(eng2, path!);
    const onCenter = eng2.getState().board.intersections[centerId]?.occupant === 'BLUE';
    const movedToCenter = path!.some((m) => m.to === centerId);
    expect(onCenter || movedToCenter).toBe(true);
  });

  it('Medium prefers center seat under cumulative when totals favor occupying centre', () => {
    const engine = new SmartBeadsEngine('6x3x5');
    clearBoard(engine);
    setOcc(engine, 'A11', 'BLUE');
    setOcc(engine, 'A00', 'RED');
    setOcc(engine, 'A02', 'RED');
    setOcc(engine, 'A40', 'BLUE');
    engine.getState().currentPlayer = 'BLUE';
    const snap = engine.exportSnapshot();
    const centerId = engine.getState().board.intersections.find((p) => p.label === 'A21')!.id;

    const withoutCum = selectAiTurnPath('6x3x5', 2, snap, 'BLUE', {
      budgetMs: 1500,
      rng: () => 0,
      mediumSoftMissRate: 0,
      center: { centerRule: 'off' },
    });
    const withCum = selectAiTurnPath('6x3x5', 2, snap, 'BLUE', {
      budgetMs: 1500,
      rng: () => 0,
      mediumSoftMissRate: 0,
      center: { centerRule: 'cumulative', cumulativeRed: 0, cumulativeBlue: 0 },
    });
    expect(withoutCum).not.toBeNull();
    expect(withCum).not.toBeNull();

    const engCum = new SmartBeadsEngine('6x3x5');
    engCum.loadSnapshot(snap);
    applyPath(engCum, withCum!);
    const onCenter = engCum.getState().board.intersections[centerId]?.occupant === 'BLUE';
    const movedToCenter = withCum!.some((m) => m.to === centerId);
    expect(onCenter || movedToCenter).toBe(true);
  });

  it('Easy ignores center eval even when endgame rule is on (capture-only contract)', () => {
    const engine = new SmartBeadsEngine('6x3x5');
    clearBoard(engine);
    setOcc(engine, 'A11', 'BLUE');
    setOcc(engine, 'A21', 'RED');
    setOcc(engine, 'A00', 'RED');
    setOcc(engine, 'A40', 'BLUE');
    engine.getState().currentPlayer = 'BLUE';
    const snap = engine.exportSnapshot();
    const withCenter = selectAiTurnPath('6x3x5', 1, snap, 'BLUE', {
      budgetMs: 400,
      rng: () => 0,
      easySoftMissRate: 0,
      center: { centerRule: 'endgame' },
    });
    const withoutCenter = selectAiTurnPath('6x3x5', 1, snap, 'BLUE', {
      budgetMs: 400,
      rng: () => 0,
      easySoftMissRate: 0,
      center: { centerRule: 'off' },
    });
    expect(withCenter).toEqual(withoutCenter);
  });
});

describe('HonestAi production strength gates (6x3x5)', () => {
  function playMatch(
    blueLevel: 1 | 2 | 3,
    seed: number,
    maxPlies = 50,
  ): 'RED' | 'BLUE' | 'DRAW' {
    const engine = new SmartBeadsEngine('6x3x5');
    let ply = 0;
    let rngState = seed + 1;
    const rng = () => {
      rngState = (rngState * 1103515245 + 12345) % 0x100000000;
      return (rngState >>> 0) / 0x100000000;
    };

    while (!engine.getState().gameOver && ply < maxPlies) {
      const player = engine.getState().currentPlayer;
      const level = player === 'BLUE' ? blueLevel : 1;
      const path = selectAiTurnPath('6x3x5', level, engine.exportSnapshot(), player, {
        budgetMs: level >= 3 ? 1200 : level === 2 ? 500 : 200,
        easySoftMissRate: level === 1 ? EASY_SOFT_MISS_RATE : 0,
        mediumSoftMissRate: level === 2 ? MEDIUM_SOFT_MISS_RATE : 0,
        rng,
        center: { centerRule: 'off' },
      });
      if (!path?.length) break;
      applyPath(engine, path);
      ply += 1;
    }

    if (engine.getState().gameOver) {
      return engine.getState().winner ?? 'DRAW';
    }
    const red = engine.countPieces('RED');
    const blue = engine.countPieces('BLUE');
    if (red === blue) return 'DRAW';
    return red > blue ? 'RED' : 'BLUE';
  }

  it('Medium BLUE wins more than Easy BLUE vs same Easy RED stand-in', () => {
    let easyBlueWins = 0;
    let mediumBlueWins = 0;
    const games = 16;
    for (let seed = 0; seed < games; seed++) {
      if (playMatch(1, seed * 17 + 3) === 'BLUE') easyBlueWins += 1;
      if (playMatch(2, seed * 17 + 3) === 'BLUE') mediumBlueWins += 1;
    }
    expect(mediumBlueWins).toBeGreaterThan(easyBlueWins);
  });

  it('Hard BLUE wins at least as often as Medium BLUE vs same Easy RED stand-in', () => {
    let mediumBlueWins = 0;
    let hardBlueWins = 0;
    const games = 12;
    for (let seed = 0; seed < games; seed++) {
      if (playMatch(2, seed * 31 + 5) === 'BLUE') mediumBlueWins += 1;
      if (playMatch(3, seed * 31 + 5) === 'BLUE') hardBlueWins += 1;
    }
    expect(hardBlueWins).toBeGreaterThanOrEqual(mediumBlueWins);
  });

  it('Hard (RED) beats Medium (BLUE) more often than it loses (6x3x5 head-to-head)', () => {
    let hardWins = 0;
    let mediumWins = 0;
    const games = 8;
    for (let seed = 0; seed < games; seed++) {
      const engine = new SmartBeadsEngine('6x3x5');
      let ply = 0;
      let rngState = seed * 97 + 11;
      const rng = () => {
        rngState = (rngState * 1103515245 + 12345) % 0x100000000;
        return (rngState >>> 0) / 0x100000000;
      };
      while (!engine.getState().gameOver && ply < 55) {
        const player = engine.getState().currentPlayer;
        // Hard as first player (RED) vs Medium (BLUE) — isolates skill from second-player deficit.
        const level = player === 'RED' ? 3 : 2;
        const path = selectAiTurnPath('6x3x5', level as 2 | 3, engine.exportSnapshot(), player, {
          budgetMs: level === 3 ? 2500 : 700,
          easySoftMissRate: 0,
          mediumSoftMissRate: level === 2 ? MEDIUM_SOFT_MISS_RATE : 0,
          rng,
          center: { centerRule: 'off' },
        });
        if (!path?.length) break;
        applyPath(engine, path);
        ply += 1;
      }
      let winner: 'RED' | 'BLUE' | 'DRAW';
      if (engine.getState().gameOver) winner = engine.getState().winner ?? 'DRAW';
      else {
        const red = engine.countPieces('RED');
        const blue = engine.countPieces('BLUE');
        winner = red === blue ? 'DRAW' : red > blue ? 'RED' : 'BLUE';
      }
      if (winner === 'RED') hardWins += 1;
      if (winner === 'BLUE') mediumWins += 1;
    }
    expect(hardWins).toBeGreaterThan(mediumWins);
  });

  it('Super Expert tiers 4–5 use depth-2 search with increasing budget (spectate slice)', () => {
    expect(aiOpponentReplyPlies(4)).toBe(2);
    expect(aiOpponentReplyPlies(5)).toBe(2);
    expect(thinkBudgetForLevel(5)).toBeGreaterThan(thinkBudgetForLevel(4));
    expect(thinkBudgetForLevel(4)).toBeGreaterThan(thinkBudgetForLevel(3));

    const engine = new SmartBeadsEngine('6x3x5');
    for (const level of [4, 5] as const) {
      const path = selectAiTurnPath('6x3x5', level, engine.exportSnapshot(), 'RED', {
        budgetMs: thinkBudgetForLevel(level),
        rng: () => 0,
        center: { centerRule: 'off' },
      });
      expect(path?.length).toBeGreaterThan(0);
    }
  });
});

describe('HonestAi strength gates (8x4x6 — human-reported Medium≈Hard board)', () => {
  it('Hard (RED) beats Medium (BLUE) more often than it loses', () => {
    let hardWins = 0;
    let mediumWins = 0;
    const games = 8;
    for (let seed = 0; seed < games; seed++) {
      const engine = new SmartBeadsEngine('8x4x6');
      let ply = 0;
      let rngState = seed * 53 + 19;
      const rng = () => {
        rngState = (rngState * 1103515245 + 12345) % 0x100000000;
        return (rngState >>> 0) / 0x100000000;
      };
      while (!engine.getState().gameOver && ply < 60) {
        const player = engine.getState().currentPlayer;
        const level = player === 'RED' ? 3 : 2;
        const path = selectAiTurnPath('8x4x6', level as 2 | 3, engine.exportSnapshot(), player, {
          budgetMs: level === 3 ? 2500 : 700,
          easySoftMissRate: 0,
          mediumSoftMissRate: level === 2 ? MEDIUM_SOFT_MISS_RATE : 0,
          rng,
          center: { centerRule: 'off' },
        });
        if (!path?.length) break;
        applyPath(engine, path);
        ply += 1;
      }
      let winner: 'RED' | 'BLUE' | 'DRAW';
      if (engine.getState().gameOver) winner = engine.getState().winner ?? 'DRAW';
      else {
        const red = engine.countPieces('RED');
        const blue = engine.countPieces('BLUE');
        winner = red === blue ? 'DRAW' : red > blue ? 'RED' : 'BLUE';
      }
      if (winner === 'RED') hardWins += 1;
      if (winner === 'BLUE') mediumWins += 1;
    }
    expect(hardWins).toBeGreaterThan(mediumWins);
  });
});

describe('HonestAi Hard coverage on 16-bead', () => {
  it('Hard returns a legal complete turn from opening', () => {
    const engine = new SmartBeadsEngine('16');
    engine.getState().currentPlayer = 'BLUE';
    const path = selectAiTurnPath('16', 3, engine.exportSnapshot(), 'BLUE', {
      budgetMs: 2800,
      mediumSoftMissRate: 0,
      rng: () => 0,
    });
    expect(path?.length).toBeGreaterThan(0);
    applyPath(engine, path!);
    expect(engine.getState().currentPlayer).toBe('RED');
  });

  it('Hard BLUE wins at least as often as Easy BLUE vs Easy RED stand-in', () => {
    function play(level: 1 | 3, seed: number): 'RED' | 'BLUE' | 'DRAW' {
      const engine = new SmartBeadsEngine('16');
      let ply = 0;
      let rngState = seed + 7;
      const rng = () => {
        rngState = (rngState * 1103515245 + 12345) % 0x100000000;
        return (rngState >>> 0) / 0x100000000;
      };
      while (!engine.getState().gameOver && ply < 40) {
        const player = engine.getState().currentPlayer;
        const lv = player === 'BLUE' ? level : 1;
        const path = selectAiTurnPath('16', lv, engine.exportSnapshot(), player, {
          budgetMs: lv === 3 ? 2000 : 200,
          easySoftMissRate: lv === 1 ? EASY_SOFT_MISS_RATE : 0,
          mediumSoftMissRate: 0,
          rng,
        });
        if (!path?.length) break;
        applyPath(engine, path);
        ply += 1;
      }
      if (engine.getState().gameOver) return engine.getState().winner ?? 'DRAW';
      const red = engine.countPieces('RED');
      const blue = engine.countPieces('BLUE');
      return red === blue ? 'DRAW' : red > blue ? 'RED' : 'BLUE';
    }

    let easyWins = 0;
    let hardWins = 0;
    for (let seed = 0; seed < 8; seed++) {
      if (play(1, seed * 11) === 'BLUE') easyWins += 1;
      if (play(3, seed * 11) === 'BLUE') hardWins += 1;
    }
    expect(hardWins).toBeGreaterThanOrEqual(easyWins);
  });
});
