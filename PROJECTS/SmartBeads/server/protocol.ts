/** Online play protocol (A9): shared by the server and the browser client. */
import type { Player } from '../src/models/GameState';
import type { ProductBoardId } from '../src/config/BoardCatalog';
import type {
  CenterRule,
  ShotClockSeconds,
  TimerMinutes,
} from '../src/playtest/web/feature/GameFeatureSettings';

/** Boards open for online play at launch (more open once these are stable). */
export const ONLINE_BOARDS: readonly ProductBoardId[] = ['6x4', '8x4x6', '16'];

export interface RoomSettings {
  timer: TimerMinutes;
  tournamentTimer: TimerMinutes;
  shotClock: ShotClockSeconds;
  centerRule: CenterRule;
}

export type Intent =
  | { type: 'move'; from: number; to: number }
  | { type: 'finishChain' }
  | { type: 'resign' }
  | { type: 'resignRespond'; acceptDraw: boolean };

export interface RoomView {
  code: string;
  version: number;
  boardId: ProductBoardId;
  settings: RoomSettings;
  /** Seats filled so far. The game starts when both are. */
  seats: { RED: boolean; BLUE: boolean };
  /** Which seat the viewer holds. */
  you: Player;
  started: boolean;
  currentPlayer: Player;
  moveCount: number;
  captures: Record<Player, number>;
  occupants: Array<Player | null>;
  chainPieceId: number | null;
  /** Legal moves for the side to move; the client shows them only on its own turn. */
  legalMoves: Array<{ from: number; to: number }>;
  lastMove: { from: number; to: number; by: Player } | null;
  clocks: {
    shotRemaining: number;
    shotLimit: number;
    matchRemaining: number;
    p1: number;
    p2: number;
  };
  gameOver: boolean;
  winner: Player | 'DRAW' | null;
  reason: string | null;
  pendingResign: Player | null;
}

export type ServerMessage = { type: 'state'; view: RoomView } | { type: 'error'; message: string };

export type ClientMessage = { type: 'intent'; intent: Intent };
