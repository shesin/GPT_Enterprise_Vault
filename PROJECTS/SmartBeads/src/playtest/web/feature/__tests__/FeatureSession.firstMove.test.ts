import { listProductBoards, resolveEngineVariant } from '../../../../config/BoardCatalog';
import { findJumpPath } from '../../../../models/GameState';
import { FeatureSession } from '../FeatureSession';
import { applyAiHops, AiHopRecord } from '../aiTurnPath';
import { selectAiTurnPath } from '../HonestAi';
import {
  engineOccupancy,
  firstOpeningSlide,
  hangingOpeningSlides,
  isolatedPly,
  moveByLabel,
  occupancyDiff,
} from '../firstMoveInvariants';
import { AI_REPLY_DELAY_MS, HUMAN_PLY_OBSERVE_MS, HUMAN_SLIDE_ANIM_MS } from '../pveTiming';

const off = {
  aiLevel: 2 as const,
  matchTimer: 'off' as const,
  shotClock: 'off' as const,
  centerRule: 'off' as const,
};

const productBoards = listProductBoards();

function expectBoundedAiHops(hops: AiHopRecord[], aiPlayer: 'BLUE'): void {
  expect(hops.length).toBeGreaterThan(0);
  for (let i = 0; i < hops.length; i++) {
    const hop = hops[i];
    expect(hop.player).toBe(aiPlayer);
    expect(hop.fromOccupant).toBe(aiPlayer);
    if (hop.chainPieceIdBefore !== null) {
      expect(hop.from).toBe(hop.chainPieceIdBefore);
    }
    if (i > 0) {
      expect(hop.from).toBe(hops[i - 1].to);
    }
  }
}

describe('first-ply occupancy (app session — no DOM)', () => {
  it.each(productBoards)('$id selecting a piece does not move any bead', (entry) => {
    const variant = resolveEngineVariant(entry.id);
    const session = new FeatureSession(variant, { mode: 'pve', ...off });
    const engine = session.getEngine();
    const slide = firstOpeningSlide(engine);
    const before = engineOccupancy(engine);
    expect(session.selectNode(slide.from)).toBe(true);
    expect(occupancyDiff(before, engineOccupancy(engine))).toEqual([]);
    expect(session.getSelectedId()).toBe(slide.from);
    expect(session.getMoveCount()).toBe(0);
  });

  it.each(productBoards)('$id PvE: every legal opening move is an isolated Ivory ply; Ebony does not move', (entry) => {
    const variant = resolveEngineVariant(entry.id);
    const probe = new FeatureSession(variant, { mode: 'pve', ...off });
    const openingMoves = probe.getEngine().getLegalMoves();
    expect(openingMoves.length).toBeGreaterThan(0);

    for (const move of openingMoves) {
      const session = new FeatureSession(variant, { mode: 'pve', ...off });
      const engine = session.getEngine();
      const before = engineOccupancy(engine);
      const over = findJumpPath(engine.getState().board, move.from, move.to)?.over;
      session.applyMove(move);
      const after = engineOccupancy(engine);
      const result = isolatedPly(before, after, move, 'RED', over);
      expect(result.ok).toBe(true);
      expect(engine.getState().currentPlayer).toBe('BLUE');
      expect(session.canHumanAct()).toBe(false);
      expect(session.getMoveCount()).toBe(1);
    }
  });

  it.each(productBoards)('$id PvP: first slide changes exactly two nodes and passes the turn', (entry) => {
    const variant = resolveEngineVariant(entry.id);
    const session = new FeatureSession(variant, { mode: 'pvp', ...off });
    const engine = session.getEngine();
    const slide = firstOpeningSlide(engine);
    const before = engineOccupancy(engine);
    session.applyMove(slide);
    const result = isolatedPly(before, engineOccupancy(engine), slide, 'RED');
    expect(result.ok).toBe(true);
    expect(engine.getState().currentPlayer).toBe('BLUE');
    expect(session.canHumanAct()).toBe(true);
    expect(session.getMoveCount()).toBe(1);
  });

  it.each(productBoards)('$id PvE: FeatureSession never applies the AI; Medium AI is a second ply', (entry) => {
    const variant = resolveEngineVariant(entry.id);
    const session = new FeatureSession(variant, { mode: 'pve', ...off });
    const engine = session.getEngine();
    const slide = firstOpeningSlide(engine);
    const start = engineOccupancy(engine);
    session.applyMove(slide);
    const afterHuman = engineOccupancy(engine);
    expect(isolatedPly(start, afterHuman, slide, 'RED').ok).toBe(true);

    const path = selectAiTurnPath(variant, 2, session.getEngine().exportSnapshot(), 'BLUE');
    expect(path?.length).toBeGreaterThan(0);
    const hops = applyAiHops(session, path!, 'BLUE');
    expectBoundedAiHops(hops, 'BLUE');
    if (session.getUiState() === 'chain') session.finishChain();

    const afterAi = engineOccupancy(engine);
    expect(session.getMoveCount()).toBeGreaterThanOrEqual(2);
    expect(occupancyDiff(afterHuman, afterAi).length).toBeGreaterThan(0);
    expect(isolatedPly(start, afterAi, slide, 'RED').ok).toBe(false);
    expect(engine.getState().currentPlayer).toBe('RED');
  });

  it('16-bead hanging edge A41→A42 (the two-click a person points at) is one Ivory slide; Medium AI capture is a later ply', () => {
    const session = new FeatureSession('16', { mode: 'pve', ...off });
    const engine = session.getEngine();
    const hang = moveByLabel(engine, 'A41', 'A42');
    const start = engineOccupancy(engine);
    session.applyMove(hang);
    const afterHuman = engineOccupancy(engine);
    expect(isolatedPly(start, afterHuman, hang, 'RED').ok).toBe(true);
    expect(engine.getState().board.intersections.find((n) => n.label === 'A42')?.occupant).toBe('RED');
    expect(session.canHumanAct()).toBe(false);

    const path = selectAiTurnPath('16', 2, session.getEngine().exportSnapshot(), 'BLUE');
    expect(path?.length).toBeGreaterThan(0);
    const hops = applyAiHops(session, path!, 'BLUE');
    expectBoundedAiHops(hops, 'BLUE');
    const last = hops[hops.length - 1];
    expect(last.chainPieceIdAfter).toBeNull();
    if (session.getUiState() === 'chain') session.finishChain();

    expect(occupancyDiff(afterHuman, engineOccupancy(engine)).length).toBeGreaterThan(0);
    expect(isolatedPly(start, engineOccupancy(engine), hang, 'RED').ok).toBe(false);
    expect(engine.getChainPieceId()).toBeNull();
    expect(engine.getState().currentPlayer).toBe('RED');
  });

  it.each(productBoards)('$id every hanging opening slide is an isolated Ivory ply', (entry) => {
    const variant = resolveEngineVariant(entry.id);
    const probe = new FeatureSession(variant, { mode: 'pve', ...off });
    const hanging = hangingOpeningSlides(probe.getEngine());
    for (const move of hanging) {
      const session = new FeatureSession(variant, { mode: 'pve', ...off });
      const before = engineOccupancy(session.getEngine());
      session.applyMove(move);
      expect(isolatedPly(before, engineOccupancy(session.getEngine()), move, 'RED').ok).toBe(true);
    }
  });
});

describe('PvE timing contract', () => {
  it('matches the 16-bead prototype: 200ms slide, 40ms AI reply', () => {
    expect(HUMAN_SLIDE_ANIM_MS).toBe(200);
    expect(AI_REPLY_DELAY_MS).toBe(40);
    expect(HUMAN_PLY_OBSERVE_MS).toBeGreaterThan(HUMAN_SLIDE_ANIM_MS);
    expect(HUMAN_PLY_OBSERVE_MS).toBeLessThan(HUMAN_SLIDE_ANIM_MS + AI_REPLY_DELAY_MS);
  });
});
