import { BEAD_SET_THEMES, getActiveBeadSet, readBeadSetId } from '../beadSetThemes';

function mockStoredBoardLook(id: string): void {
  const store = new Map<string, string>([['sb-play-board-look', id]]);
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    },
    configurable: true,
  });
}

describe('beadSetThemes — fully automatic per board (2026-09-21, no manual picker)', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('wood-toned dark boards (Wood Classic, Warm Walnut) default to Black & White', () => {
    mockStoredBoardLook('2');
    expect(readBeadSetId()).toBe('white-black');
    mockStoredBoardLook('14');
    expect(readBeadSetId()).toBe('white-black');
  });

  it('the other dark boards default to Wooden & White', () => {
    for (const id of ['1', '3', '6']) {
      mockStoredBoardLook(id);
      expect(readBeadSetId()).toBe('wooden');
    }
  });

  it('the 4 light-canvas Matched boards default to Black & Wooden', () => {
    for (const id of ['23', '24', '25', '26']) {
      mockStoredBoardLook(id);
      expect(readBeadSetId()).toBe('black-wooden');
    }
  });

  it('falls back to Black & White when no board is stored', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem: () => null, setItem: () => {} },
      configurable: true,
    });
    expect(readBeadSetId()).toBe('white-black');
  });

  // A stored id from a removed board row (e.g. old Sandy Beige, id 4 — see
  // playShellThemes.ts's REMOVED_LIGHT_BOARD_LOOK_IDS) has no entry in
  // DEFAULT_BEAD_SET_BY_BOARD — must fall back cleanly, not return undefined
  // (2026-09-22 audit: this is the function actually used for rendering, so
  // an undefined bead set here would throw downstream in CanvasBoardRenderer).
  it('falls back to Black & White for a stored id from a removed board row', () => {
    for (const removedId of ['4', '15', '16', '17', '18']) {
      mockStoredBoardLook(removedId);
      expect(readBeadSetId()).toBe('white-black');
    }
  });

  it('getActiveBeadSet() resolves a full renderable BeadSetTheme, not just an id', () => {
    mockStoredBoardLook('23');
    const active = getActiveBeadSet();
    expect(active).toBe(BEAD_SET_THEMES['black-wooden']);
    expect(active.creamBead.highlight).toEqual(expect.any(String));
    expect(active.blackBead.shadow).toEqual(expect.any(String));
    expect(active.creamStroke).toEqual(expect.any(String));
    expect(active.blackRimStroke).toEqual(expect.any(String));
  });
});
