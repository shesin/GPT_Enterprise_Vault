import { BoardDefinition } from '../models/GameState';
import { Board4 } from '../boards/Board4';
import { Board5 } from '../boards/Board5';
import { Board7 } from '../boards/Board7';

/**
 * Selects which physical board definition to use.
 * Does not define board geometry — that lives on BoardDefinition.
 *
 * Add a new board size by:
 * 1. Adding a BoardDefinition under src/boards/
 * 2. Registering it here
 * No engine changes required.
 */
export type BoardVariant = '4' | '5' | '7';

const boardVariants: Record<BoardVariant, BoardDefinition> = {
  '4': Board4,
  '5': Board5,
  '7': Board7,
};

export function listBoardVariants(): BoardVariant[] {
  return Object.keys(boardVariants) as BoardVariant[];
}

export function resolveBoard(variant: BoardVariant): BoardDefinition {
  return boardVariants[variant];
}
