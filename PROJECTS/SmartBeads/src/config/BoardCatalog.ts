import { BoardVariant } from './BoardConfig';

/** Product-facing metadata for board selection UI. */
export interface BoardCatalogEntry {
  id: BoardVariant;
  displayName: string;
  description: string;
  beadCount: number;
  lattice: string;
  /** When false, hidden from the app selector (legacy lab boards). */
  productVisible: boolean;
}

/**
 * V1 catalog — M0 ships with the 16-bead reference only.
 * Additional locked boards register here in later milestones.
 */
export const BOARD_CATALOG: BoardCatalogEntry[] = [
  {
    id: '16',
    displayName: '16-bead · 5×5 Classic',
    description: 'Sholo Guti reference — 37-point board with wing triangles',
    beadCount: 16,
    lattice: '5×5 + wings',
    productVisible: true,
  },
  {
    id: '4',
    displayName: '4×4 Lab',
    description: 'Legacy SmartBeads 4×4 prototype (development only)',
    beadCount: 4,
    lattice: '4×4',
    productVisible: false,
  },
];

export function listProductBoards(): BoardCatalogEntry[] {
  return BOARD_CATALOG.filter((entry) => entry.productVisible);
}

export function getCatalogEntry(id: BoardVariant): BoardCatalogEntry | undefined {
  return BOARD_CATALOG.find((entry) => entry.id === id);
}

export const DEFAULT_PRODUCT_BOARD: BoardVariant = '16';
