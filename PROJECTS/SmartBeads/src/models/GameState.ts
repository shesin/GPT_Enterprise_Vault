export type Player = "RED" | "BLUE";

export interface Intersection {
    id: number;
    occupant?: Player;
}

export interface Connection {
    from: number;
    to: number;
}

export interface BoardDefinition {
    name: string;
    intersections: Intersection[];
    connections: Connection[];
}

export interface GameState {
    board: BoardDefinition;

    currentPlayer: Player;
    moveCount: number;

    winner?: Player;
    gameOver: boolean;
}