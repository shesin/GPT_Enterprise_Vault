import { BoardDefinition } from '../models/GameState';
import { Board4 } from '../boards/Board4';
import { Board5 } from '../boards/Board5';
import { Board6 } from '../boards/Board6';
import { Board6x3x5 } from '../boards/Board6x3x5';
import { Board7 } from '../boards/Board7';
import { Board16Sholo } from '../boards/Board16Sholo';

/**
 * Selects which physical board definition to use.
 * Geometry lives on BoardDefinition; register new variants here.
 */
export type BoardVariant = '4' | '5' | '6' | '6x3x5' | '7' | '16';

const boardVariants: Record<BoardVariant, BoardDefinition> = {
  '4': Board4,
  '5': Board5,
  '6': Board6,
  '6x3x5': Board6x3x5,
  '7': Board7,
  '16': Board16Sholo,
};

export function listBoardVariants(): BoardVariant[] {
  return ['4', '5', '6', '7', '16', '6x3x5'];
}

export function resolveBoard(variant: BoardVariant): BoardDefinition {
  return boardVariants[variant];
}
