export type Player = "RED" | "BLUE";

export interface Intersection {
    id: number;
    occupant?: Player;
}

export interface Connection {
    from: number;
    to: number;
}

/**
 * Board geometry + optional match rules.
 * Larger grids (5x5, 6x6) add new BoardDefinition variants; the engine stays unchanged.
 */
export interface BoardDefinition {
    name: string;
    intersections: Intersection[];
    connections: Connection[];
    /** Nodes used for center-control tie-break when captures are equal. */
    centerNodeIds?: number[];
    /**
     * Soft move limit. `null`, `undefined`, or `0` = unlimited.
     * When moveCount reaches this value, the game ends and a winner is evaluated.
     */
    maxPlies?: number | null;
}

/** Independent copy so each game can mutate occupants without sharing templates. */
export function cloneBoardDefinition(board: BoardDefinition): BoardDefinition {
    return {
        name: board.name,
        intersections: board.intersections.map((intersection) => ({ ...intersection })),
        connections: board.connections.map((connection) => ({ ...connection })),
        centerNodeIds: board.centerNodeIds ? [...board.centerNodeIds] : undefined,
        maxPlies: board.maxPlies,
    };
}

export interface GameState {
    board: BoardDefinition;
    currentPlayer: Player;
    moveCount: number;
    captures: Record<Player, number>;
    winner?: Player | "DRAW";
    gameOver: boolean;
}

/** Slide along a board connection from one intersection to another. */
export interface Move {
    from: number;
    to: number;
}

/** Adjacent intersection ids joined by a legal connection. */
export function getConnectedIds(board: BoardDefinition, pointId: number): number[] {
    const connected: number[] = [];
    for (const connection of board.connections) {
        if (connection.from === pointId) {
            connected.push(connection.to);
        } else if (connection.to === pointId) {
            connected.push(connection.from);
        }
    }
    return connected;
}

/** Lookup by id; throws if the board graph is inconsistent. */
export function requireIntersection(board: BoardDefinition, id: number): Intersection {
    const point = board.intersections.find((intersection) => intersection.id === id);
    if (!point) {
        throw new Error(`Unknown intersection id: ${id}`);
    }
    return point;
}

/** True when a positive maxPlies is configured and the limit has been reached. */
export function hasReachedPlyLimit(maxPlies: number | null | undefined, moveCount: number): boolean {
    return typeof maxPlies === "number" && maxPlies > 0 && moveCount >= maxPlies;
}
