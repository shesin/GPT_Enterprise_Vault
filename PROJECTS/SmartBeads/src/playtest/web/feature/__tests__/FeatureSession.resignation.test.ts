import { FeatureSession } from '../FeatureSession';
import { shouldAcceptResignationDraw } from '../HonestAi';

describe('FeatureSession resignation', () => {
  it('accept draw ends in DRAW with reason', () => {
    const session = new FeatureSession('16', {
      mode: 'pvp',
      aiLevel: 2,
      matchTimer: 'off',
      shotClock: 'off',
      centerRule: 'off',
    });
    session.resolveResignation('RED', true);
    expect(session.isGameOver()).toBe(true);
    expect(session.getDisplayedWinner()).toBe('DRAW');
    expect(session.getDisplayedReason()).toContain('agreed to a draw');
  });

  it('decline draw awards win to opponent', () => {
    const session = new FeatureSession('16', {
      mode: 'pvp',
      aiLevel: 2,
      matchTimer: 'off',
      shotClock: 'off',
      centerRule: 'off',
    });
    session.resolveResignation('RED', false);
    expect(session.getDisplayedWinner()).toBe('BLUE');
    expect(session.getDisplayedReason()).toContain('declined the draw');
  });

  it('P2 resignation decline gives P1 the win', () => {
    const session = new FeatureSession('6', {
      mode: 'pvp',
      aiLevel: 2,
      matchTimer: 'off',
      shotClock: 'off',
      centerRule: 'off',
    });
    session.resolveResignation('BLUE', false);
    expect(session.getDisplayedWinner()).toBe('RED');
  });
});

describe('shouldAcceptResignationDraw', () => {
  it('accepts draw at equal opening position', () => {
    const session = new FeatureSession('16', {
      mode: 'pve',
      aiLevel: 2,
      matchTimer: 'off',
      shotClock: 'off',
      centerRule: 'off',
    });
    const accept = shouldAcceptResignationDraw(
      '16',
      session.getEngine().exportSnapshot(),
      'BLUE',
    );
    expect(accept).toBe(true);
  });
});
