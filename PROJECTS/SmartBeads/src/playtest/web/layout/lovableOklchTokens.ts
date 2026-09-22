/** Lovable design tokens (OKLCH) — source of truth for shell, boards, beads. */

export const LOVABLE_SHELL = {
  pageBg: 'oklch(0.13 0.025 158)',
  rail: 'oklch(0.155 0.028 157 / 91%)',
  header: 'oklch(0.10 0.02 157 / 94%)',
  text: 'oklch(0.93 0.025 82)',
  muted: 'oklch(0.70 0.025 145)',
  gold: 'oklch(0.72 0.105 78)',
  softGold: 'oklch(0.82 0.075 82)',
  border: 'oklch(0.45 0.055 95 / 35%)',
} as const;

export interface LovableBoardTokens {
  label: string;
  surface: string;
  shadow: string;
  frameOuter: string;
  frameInner: string;
  lines: string;
  /** Optional canvas-only override for surface/shadow — falls back to
   * `surface`/`shadow` when unset. Lets the board canvas run a different
   * lightness than the matched side panel, which always uses `surface`/`shadow`. */
  boardSurface?: string;
  boardShadow?: string;
}

/** Complete row — matched board + side (5 looks). */
export const LOVABLE_COMPLETE_BOARD_THEMES: readonly LovableBoardTokens[] = [
  {
    label: 'Classic Green',
    surface: 'oklch(0.30 0.07 157)',
    shadow: 'oklch(0.22 0.055 157)',
    frameOuter: 'oklch(0.25 0.055 66)',
    frameInner: 'oklch(0.13 0.035 62)',
    lines: 'oklch(0.72 0.105 78)',
  },
  {
    label: 'Wood Classic',
    surface: 'oklch(0.39 0.075 63)',
    shadow: 'oklch(0.29 0.07 57)',
    frameOuter: 'oklch(0.27 0.07 55)',
    frameInner: 'oklch(0.15 0.045 50)',
    lines: 'oklch(0.82 0.065 83)',
  },
  {
    label: 'Ocean Blue',
    surface: 'oklch(0.34 0.07 220)',
    shadow: 'oklch(0.23 0.055 225)',
    frameOuter: 'oklch(0.22 0.045 225)',
    frameInner: 'oklch(0.13 0.035 230)',
    lines: 'oklch(0.81 0.055 90)',
  },
  {
    label: 'Purple Night',
    surface: 'oklch(0.25 0.07 310)',
    shadow: 'oklch(0.17 0.055 305)',
    frameOuter: 'oklch(0.20 0.055 300)',
    frameInner: 'oklch(0.11 0.035 300)',
    lines: 'oklch(0.72 0.09 82)',
  },
  {
    // Moved from the light-board row (2026-09-18) — its lightness (0.55) and
    // distinct frame colours already set it apart from the pale pastel light
    // boards; reads better grouped with the other matched dark/medium boards.
    label: 'Warm Walnut',
    surface: 'oklch(0.55 0.075 55)',
    shadow: 'oklch(0.42 0.07 52)',
    frameOuter: 'oklch(0.32 0.06 50)',
    frameInner: 'oklch(0.18 0.045 48)',
    lines: 'oklch(0.76 0.055 80)',
  },
  {
    // Added 2026-09-21, per human request — new board id 23 (fresh, not
    // reusing 19-22, which are in REMOVED_COMPLETE_LOOK_IDS as a stale-
    // storage migration guard). Canvas uses the existing light-theme
    // Seaglass tones (boardSurface/boardShadow); the matched side panel
    // uses a separate, darker Seaglass tone (surface/shadow). Started at
    // option 3 ("Deep") to match the Page 1 hub rail, then both this and
    // the Page 1 rail were switched to option 4 ("Darkest") 2026-09-21 per
    // human request — still intentionally kept in sync, not a coincidence.
    // Frame is a new darker-still shade of the same hue (no existing
    // Seaglass frame to borrow, since the light-theme Seaglass board only
    // ever pairs with a charcoal side). Lines are dark, same-hue — gold
    // would wash out against the light canvas (same fix as Pale Sage/Sky
    // Blue needed).
    label: 'Seaglass Matched',
    surface: 'oklch(0.40 0.065 195)',
    shadow: 'oklch(0.28 0.07 198)',
    frameOuter: 'oklch(0.44 0.05 197)',
    frameInner: 'oklch(0.26 0.04 200)',
    lines: 'oklch(0.32 0.06 197)',
    boardSurface: 'oklch(0.80 0.045 195)',
    boardShadow: 'oklch(0.68 0.05 198)',
  },
  {
    // Added 2026-09-21, per human request — new board id 24, second board in
    // the "Matched" pattern established by Seaglass Matched (id 23) above.
    // Same recipe: canvas keeps the light-theme Powder Lilac tones
    // (boardSurface/boardShadow), matched side panel uses a separate
    // "Darkest" shade of the same hue (surface/shadow) — L drops by the same
    // 0.40 step used for Seaglass (0.82->0.42 surface, 0.70->0.30 shadow),
    // chroma nudged up so the darker tone doesn't read washed out. Frame
    // colours reused as-is from the light-theme Powder Lilac board (same
    // approach Seaglass Matched took — no separate darker frame needed).
    // Lines darkened off the light board's own lines value since gold would
    // wash out against the light canvas, same fix as Seaglass Matched.
    label: 'Powder Lilac Matched',
    surface: 'oklch(0.42 0.06 305)',
    shadow: 'oklch(0.30 0.065 305)',
    frameOuter: 'oklch(0.46 0.06 300)',
    frameInner: 'oklch(0.28 0.045 298)',
    lines: 'oklch(0.34 0.065 302)',
    boardSurface: 'oklch(0.82 0.04 305)',
    boardShadow: 'oklch(0.70 0.045 305)',
  },
  {
    // Added 2026-09-21, per human request — id 25, third "Matched" board,
    // same recipe as Seaglass Matched (23) / Powder Lilac Matched (24):
    // canvas keeps light-theme Celadon Jade tones (boardSurface/boardShadow),
    // matched side panel uses the same 0.40 "Darkest" L-drop of the same hue
    // (surface/shadow), chroma nudged up, frame reused as-is from the
    // light-theme Celadon Jade board, lines darkened off the light board's
    // own lines value.
    label: 'Celadon Jade Matched',
    surface: 'oklch(0.42 0.07 170)',
    shadow: 'oklch(0.30 0.075 172)',
    frameOuter: 'oklch(0.44 0.055 175)',
    frameInner: 'oklch(0.26 0.04 178)',
    lines: 'oklch(0.32 0.075 176)',
    boardSurface: 'oklch(0.82 0.05 170)',
    boardShadow: 'oklch(0.70 0.055 172)',
  },
  {
    // Added 2026-09-21, per human request — id 26, fourth "Matched" board,
    // same recipe as the three above: canvas keeps light-theme Alabaster
    // Pearl tones (boardSurface/boardShadow), matched side panel uses the
    // same 0.40 "Darkest" L-drop of the same hue (surface/shadow), chroma
    // nudged up, frame reused as-is from the light-theme Alabaster Pearl
    // board, lines darkened off the light board's own lines value.
    label: 'Alabaster Pearl Matched',
    // Surface/shadow use a bigger L-drop + chroma boost than the standard
    // "Darkest" formula (2026-09-21, per human request) — Pearl's very low
    // starting chroma (0.018) made the standard step read as flat grey
    // instead of a distinct colour; this warm-bronze step reads correctly.
    surface: 'oklch(0.40 0.048 85)',
    shadow: 'oklch(0.30 0.055 82)',
    frameOuter: 'oklch(0.55 0.055 72)',
    frameInner: 'oklch(0.33 0.045 65)',
    lines: 'oklch(0.34 0.065 70)',
    boardSurface: 'oklch(0.88 0.018 85)',
    boardShadow: 'oklch(0.78 0.025 82)',
  },
] as const;

export type BeadSetId = 'white-black' | 'wooden' | 'black-wooden';

export interface LovableBeadSetTokens {
  id: BeadSetId;
  label: string;
  creamHighlight: string;
  creamMid: string;
  creamShadow: string;
  creamStroke: string;
  blackHighlight: string;
  blackMid: string;
  blackShadow: string;
  blackRimStroke: string;
}

export const LOVABLE_BEAD_SETS: readonly LovableBeadSetTokens[] = [
  {
    // Renamed from 'White & Black' (2026-09-21) — same tokens, name order
    // flipped to match the other two sets' "Black & ..." naming.
    id: 'white-black',
    label: 'Black & White',
    creamHighlight: 'oklch(1.0 0 0)',
    creamMid: 'oklch(0.94 0 0)',
    creamShadow: 'oklch(0.86 0 0)',
    creamStroke: 'oklch(0.78 0 0)',
    blackHighlight: 'oklch(0.48 0 0)',
    blackMid: 'oklch(0.22 0 0)',
    blackShadow: 'oklch(0.06 0 0)',
    blackRimStroke: 'oklch(0.55 0 0)',
  },
  {
    // Renamed from 'Wooden' (2026-09-21) — names both sides plainly, same
    // tokens (brown wood bead + near-white ivory bead).
    id: 'wooden',
    label: 'Wooden & White',
    // Cream side was a medium brown too (too close to the dark side) — replaced
    // with a clean, faintly warm white so the pairing is Brown + White, not
    // brown vs. duller brown.
    creamHighlight: 'oklch(0.97 0.006 70)',
    creamMid: 'oklch(0.90 0.006 70)',
    creamShadow: 'oklch(0.80 0.008 70)',
    creamStroke: 'oklch(0.86 0.01 70)',
    // Richer + more saturated wood tone (2026-09-21, per human request,
    // option B of 3 samples) — the old chroma 0.06-0.09 brown read as "dark
    // grey" next to the true-black bead at actual in-game bead size, not
    // clearly wood. This step also had to stay readable against the light
    // Matched boards (same tokens reused below in black-wooden's cream slot),
    // so it's tuned lighter than the boldest option tried, to keep a safe
    // contrast margin against those pastel canvases.
    blackHighlight: 'oklch(0.66 0.13 55)',
    blackMid: 'oklch(0.46 0.13 50)',
    blackShadow: 'oklch(0.30 0.10 46)',
    blackRimStroke: 'oklch(0.72 0.13 61)',
  },
  {
    // Renamed from 'black-brown'/'Black & Brown' (2026-09-21) — the cream-slot
    // bead is the Wooden set's own wood-brown ball, not a separate "brown", so
    // the name should say that plainly.
    id: 'black-wooden',
    label: 'Black & Wooden',
    // Reuses Wooden's dark-wood brown (creamBead slot) and White & Black's true
    // black (blackBead slot) — both already-approved gradients, not new colours.
    // Soft default for light board themes (see beadSetThemes.ts).
    // Same richer wood tone as Wooden's own blackHighlight/Mid/Shadow above
    // (2026-09-21, per human request) — kept in sync since both are the same
    // bead rendered the same way.
    creamHighlight: 'oklch(0.66 0.13 55)',
    creamMid: 'oklch(0.46 0.13 50)',
    creamShadow: 'oklch(0.30 0.10 46)',
    // Back to Wooden's own blackRimStroke value (2026-09-21) — briefly
    // darkened to oklch(0.16 0.05 52) when this bead only got a flat outline
    // (no specular), which made a bright rim read as a mismatched halo. Now
    // that CanvasBoardRenderer.ts gives this set's cream bead the same
    // glossy specular treatment as Wooden's own black-slot bead, the bright
    // rim is correct again — it's the same bead rendered the same way.
    creamStroke: 'oklch(0.72 0.13 61)',
    blackHighlight: 'oklch(0.48 0 0)',
    blackMid: 'oklch(0.22 0 0)',
    blackShadow: 'oklch(0.06 0 0)',
    blackRimStroke: 'oklch(0.55 0 0)',
  },
] as const;
