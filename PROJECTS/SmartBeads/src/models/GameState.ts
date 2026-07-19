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

/** Independent copy so each game can mutate occupants without sharing templates. */
export function cloneBoardDefinition(board: BoardDefinition): BoardDefinition {
    return {
        name: board.name,
        intersections: board.intersections.map((intersection) => ({ ...intersection })),
        connections: board.connections.map((connection) => ({ ...connection })),
    };
}

export interface GameState {
    board: BoardDefinition;

    currentPlayer: Player;
    moveCount: number;

    winner?: Player;
    gameOver: boolean;
}