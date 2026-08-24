import { BoardVariant } from './BoardConfig';
import {
  CenterRule,
  GameFeatureSettings,
  MatchTimerMinutes,
  ShotClockSeconds,
} from '../playtest/web/feature/GameFeatureSettings';

/** Catalog id for each locked V1 board (VISION_05P.md). */
export type ProductBoardId =
  | '16'
  | '6x4'
  | '6x3x5'
  | '10x5'
  | '12x6x5'
  | '8x4x6'
  | '7x4x5';

/** Product dropdown order: largest → smallest bead count, 6×4 before 6×3×5. */
export const PRODUCT_BOARD_ORDER: ProductBoardId[] = [
  '16',
  '12x6x5',
  '10x5',
  '8x4x6',
  '7x4x5',
  '6x4',
  '6x3x5',
];

export interface BoardPlayConfig {
  defaultSettings: GameFeatureSettings;
  centerRuleOptions: CenterRule[];
  matchTimerOptions: MatchTimerMinutes[];
  shotClockOptions: ShotClockSeconds[];
}

export interface BoardCatalogEntry {
  id: ProductBoardId;
  engineVariant: BoardVariant | null;
  displayName: string;
  description: string;
  beadCount: number;
  lattice: string;
  playable: boolean;
  productVisible: boolean;
  play: BoardPlayConfig;
}

const BASE_SETTINGS: GameFeatureSettings = {
  mode: 'pve',
  aiLevel: 2,
  matchTimer: 'off',
  shotClock: 'off',
  centerRule: 'off',
};

/** Locked V1 seven — human-decided catalog settings (2026-08-19). */
export const BOARD_CATALOG: BoardCatalogEntry[] = [
  {
    id: '16',
    engineVariant: '16',
    displayName: '16-bead · 5×5 Classic',
    description: 'Sholo Guti reference — 37-point board with wing triangles',
    beadCount: 16,
    lattice: '5×5 + wings',
    playable: true,
    productVisible: true,
    play: {
      defaultSettings: {
        ...BASE_SETTINGS,
        centerRule: 'off',
        matchTimer: 'off',
        shotClock: 'off',
      },
      centerRuleOptions: ['off', 'endgame'],
      matchTimerOptions: ['off', '15', '25', '35'],
      shotClockOptions: ['off', '60', '90', '120'],
    },
  },
  {
    id: '12x6x5',
    engineVariant: '12x6x5',
    displayName: '12-bead · 6×5',
    description: 'Locked V1 #5 — two-file rank camps, empty centre file',
    beadCount: 12,
    lattice: '6×5',
    playable: true,
    productVisible: true,
    play: {
      defaultSettings: {
        ...BASE_SETTINGS,
        centerRule: 'off',
        matchTimer: 'off',
        shotClock: 'off',
      },
      centerRuleOptions: ['off', 'endgame'],
      matchTimerOptions: ['off', '10', '20', '30'],
      shotClockOptions: ['off', '60', '90'],
    },
  },
  {
    id: '10x5',
    engineVariant: '10x5',
    displayName: '10-bead · 5×5',
    description: 'Locked V1 #4 — two-file camps, empty centre file',
    beadCount: 10,
    lattice: '5×5',
    playable: true,
    productVisible: true,
    play: {
      defaultSettings: {
        ...BASE_SETTINGS,
        centerRule: 'off',
        matchTimer: 'off',
        shotClock: 'off',
      },
      centerRuleOptions: ['off', 'endgame'],
      matchTimerOptions: ['off', '10', '20', '30'],
      shotClockOptions: ['off', '60', '90'],
    },
  },
  {
    id: '8x4x6',
    engineVariant: '8x4x6',
    displayName: '8-bead · 4×6',
    description: 'Locked V1 #6 — 4×6 grid, waist camp layout',
    beadCount: 8,
    lattice: '4×6',
    playable: true,
    productVisible: true,
    play: {
      defaultSettings: {
        ...BASE_SETTINGS,
        centerRule: 'endgame',
        matchTimer: 'off',
        shotClock: 'off',
      },
      centerRuleOptions: ['off', 'cumulative', 'endgame'],
      matchTimerOptions: ['off', '3', '5', '10'],
      shotClockOptions: ['off', '30', '60'],
    },
  },
  {
    id: '7x4x5',
    engineVariant: '7',
    displayName: '7-bead · 4×5',
    description: 'Locked V1 #7 — 4×5 grid, waist camp layout',
    beadCount: 7,
    lattice: '4×5',
    playable: true,
    productVisible: true,
    play: {
      defaultSettings: {
        ...BASE_SETTINGS,
        centerRule: 'endgame',
        matchTimer: 'off',
        shotClock: 'off',
      },
      centerRuleOptions: ['off', 'cumulative', 'endgame'],
      matchTimerOptions: ['off', '3', '5', '10'],
      shotClockOptions: ['off', '30', '60'],
    },
  },
  {
    id: '6x4',
    engineVariant: '6',
    displayName: '6-bead · 4×4',
    description: 'Locked V1 #2 — full box cross diagonals',
    beadCount: 6,
    lattice: '4×4',
    playable: true,
    productVisible: true,
    play: {
      defaultSettings: {
        ...BASE_SETTINGS,
        centerRule: 'endgame',
        matchTimer: 'off',
        shotClock: 'off',
      },
      centerRuleOptions: ['off', 'cumulative', 'endgame'],
      matchTimerOptions: ['off', '3', '5', '10'],
      shotClockOptions: ['off', '30', '60'],
    },
  },
  {
    id: '6x3x5',
    engineVariant: '6x3x5',
    displayName: '6-bead · 3×5',
    description: 'Locked V1 #3 — top–bottom camps, single centre node',
    beadCount: 6,
    lattice: '3×5',
    playable: true,
    productVisible: true,
    play: {
      defaultSettings: {
        ...BASE_SETTINGS,
        centerRule: 'endgame',
        matchTimer: 'off',
        shotClock: 'off',
      },
      centerRuleOptions: ['off', 'cumulative', 'endgame'],
      matchTimerOptions: ['off', '3', '5', '10'],
      shotClockOptions: ['off', '30', '60'],
    },
  },
];

export function listProductBoards(): BoardCatalogEntry[] {
  const playable = BOARD_CATALOG.filter((entry) => entry.productVisible && entry.playable);
  return PRODUCT_BOARD_ORDER.map((id) => playable.find((entry) => entry.id === id)).filter(
    (entry): entry is BoardCatalogEntry => entry !== undefined,
  );
}

export function listCatalogBoards(): BoardCatalogEntry[] {
  return BOARD_CATALOG;
}

export function getCatalogEntry(id: ProductBoardId): BoardCatalogEntry | undefined {
  return BOARD_CATALOG.find((entry) => entry.id === id);
}

export const DEFAULT_PRODUCT_BOARD: ProductBoardId = '16';

export function getPlayConfig(id: ProductBoardId): BoardPlayConfig {
  const entry = getCatalogEntry(id);
  if (!entry) {
    throw new Error(`Unknown catalog board: ${id}`);
  }
  return entry.play;
}

export function resolveEngineVariant(id: ProductBoardId): BoardVariant {
  const entry = getCatalogEntry(id);
  if (!entry?.engineVariant || !entry.playable) {
    throw new Error(`Board not playable in production: ${id}`);
  }
  return entry.engineVariant;
}
