import { formatAiLevelLabel } from '../GameFeatureSettings';

describe('GameFeatureSettings AI labels', () => {
  it('maps levels 1–3 to Casual / Standard / Expert', () => {
    expect(formatAiLevelLabel(1)).toBe('Casual');
    expect(formatAiLevelLabel(2)).toBe('Standard');
    expect(formatAiLevelLabel(3)).toBe('Expert');
  });
});
