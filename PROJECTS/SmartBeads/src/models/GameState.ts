export type Player = "RED" | "BLUE";

export interface GameState {

    board: number[];

    currentPlayer: Player;

    moveCount: number;

    winner: Player | null;

    gameOver: boolean;

}