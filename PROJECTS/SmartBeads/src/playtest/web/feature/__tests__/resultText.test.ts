import { composeResultDescription, drawScoreLine } from '../resultText';

describe('result text shown to the player', () => {
  it('never shows a raw engine reason code', () => {
    for (const code of ['safety_cap', 'safety_cap_captures', 'repetition']) {
      const text = composeResultDescription('headline', code);
      expect(text).not.toContain('_');
      expect(text.split(' • ')[1]).not.toBe(code);
      expect(text.startsWith('headline • ')).toBe(true);
    }
  });

  it('names the move limit and repetition in words', () => {
    expect(composeResultDescription('h', 'safety_cap')).toBe('h • Move limit reached');
    expect(composeResultDescription('h', 'safety_cap_captures')).toBe('h • Move limit reached');
    expect(composeResultDescription('h', 'repetition')).toBe('h • Draw by threefold repetition');
  });

  it('leaves the headline alone when it already says why', () => {
    expect(composeResultDescription('h', 'elimination')).toBe('h');
    expect(composeResultDescription('h', 'stalemate')).toBe('h');
    expect(composeResultDescription('h', undefined)).toBe('h');
    expect(composeResultDescription('h', 'Normal')).toBe('h');
  });

  it('does not repeat a capture win the headline already states', () => {
    expect(
      composeResultDescription(
        'You won by 2 beads (5 vs 3)',
        'Timer expired. Cream won on captures.',
      ),
    ).toBe('You won by 2 beads (5 vs 3)');
  });

  it('appends feature reasons (timer, shot clock, resignation)', () => {
    expect(composeResultDescription('h', ' Shot clock expired. ')).toBe('h • Shot clock expired.');
  });

  it('a draw headline only says "tied" when the captures really are tied', () => {
    expect(drawScoreLine(2, 2)).toBe('Tied in captures (2 vs 2 beads)');
    expect(drawScoreLine(4, 1)).toBe('Draw (4 vs 1 captures)');
  });
});
