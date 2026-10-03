import { SmartBeadsEngine } from '../../../../core/SmartBeadsEngine';
import { buildPositionKey } from '../../../../core/positionKey';
import { generateTurnEnds, selectAiTurnPath, TurnEnd } from '../HonestAi';
import { honestAiTestOpts } from './honestAiTestOpts';

/**
 * AI audit 3 (2026-10-03): the search used to give every game-ending move the same +/-900 whatever the
 * result, so a draw by repetition counted as a win for the side that caused it. These tests build real
 * positions where one quiet move would be the third repetition and check the AI values it as a draw.
 */

function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Scenario {
  snap: ReturnType<SmartBeadsEngine['exportSnapshot']>;
  draw: TurnEnd;
}

/** BLUE to move, piece difference (BLUE - RED) = `diff`, and one quiet BLUE move that would be a 3rd repetition. */
function scenario(diffSign: 1 | -1, minAbs: number, seed: number): Scenario {
  const rng = mulberry(seed);
  for (let tries = 0; tries < 3000; tries += 1) {
    const eng = new SmartBeadsEngine('6');
    for (let t = 0; t < 120 && !eng.getState().gameOver; t += 1) {
      const diff = eng.countPieces('BLUE') - eng.countPieces('RED');
      if (
        eng.getState().currentPlayer === 'BLUE' &&
        eng.getChainPieceId() === null &&
        diff * diffSign >= minAbs
      ) {
        const snap = eng.exportSnapshot();
        const quiet = generateTurnEnds('6', snap, 'BLUE', Infinity).filter(
          (e) =>
            !e.snapshot.state.gameOver &&
            e.path.length === 1 &&
            e.snapshot.state.captures.BLUE === snap.state.captures.BLUE,
        );
        if (quiet.length) {
          const draw = quiet[Math.floor(rng() * quiet.length)]!;
          const key = buildPositionKey(draw.snapshot.state, draw.snapshot.chainPieceId);
          snap.positionHistory = { ...snap.positionHistory, [key]: 2 };
          return { snap, draw };
        }
      }
      const moves = eng.getLegalMoves();
      if (!moves.length) break;
      eng.applyMove(moves[Math.floor(rng() * moves.length)]!);
      if (eng.getChainPieceId() !== null) eng.endTurn();
    }
  }
  throw new Error('could not build a scenario');
}

function endsGameAsDraw(s: Scenario): boolean {
  const real = new SmartBeadsEngine('6');
  real.loadSnapshot(s.snap);
  real.applyMove(s.draw.path[0]!);
  return real.getState().endReason === 'repetition';
}

describe('HonestAi values game-ending moves by their result', () => {
  it.each([2, 3] as const)(
    'level %i does not take a repetition draw while 3+ pieces ahead',
    (level) => {
      for (let i = 0; i < 6; i += 1) {
        const s = scenario(1, 3, 100 + i);
        expect(endsGameAsDraw(s)).toBe(true); // the scenario really is a draw move
        const pick = selectAiTurnPath(
          '6',
          level,
          s.snap,
          'BLUE',
          honestAiTestOpts({ rng: () => 0.5 }),
        );
        expect(pick).not.toEqual(s.draw.path);
      }
    },
  );

  it('Expert takes a repetition draw while 3+ pieces behind', () => {
    for (let i = 0; i < 6; i += 1) {
      const s = scenario(-1, 3, 200 + i);
      expect(endsGameAsDraw(s)).toBe(true);
      const pick = selectAiTurnPath('6', 3, s.snap, 'BLUE', honestAiTestOpts({ rng: () => 0.5 }));
      expect(pick).toEqual(s.draw.path);
    }
  });
});
