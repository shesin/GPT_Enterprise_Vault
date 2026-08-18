export type Player = "RED" | "BLUE";

export interface Intersection {
    id: number;
    occupant?: Player;
    /** Layout coordinate for rendering (board-specific units). */
    x?: number;
    y?: number;
    /** Original node label from the reference board (e.g. A22, LT). */
    label?: string;
}

/** How a completed match is resolved when limits or terminal positions are reached. */
export type TerminationProfile = "ply_limit" | "sholo_guti";

export interface Connection {
    from: number;
    to: number;
}

/**
 * Straight-line capture geometry on the board graph.
 * Occupancy is checked at runtime; this only defines legal jump routes.
 */
export interface JumpPath {
    from: number;
    over: number;
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
    /** Optional capture routes (from → over opponent → empty to). */
    jumpPaths?: JumpPath[];
    /** Nodes used for center-control tie-break when captures are equal. */
    centerNodeIds?: number[];
    /**
     * Soft move limit. `null`, `undefined`, or `0` = unlimited.
     * When moveCount reaches this value, the game ends and a winner is evaluated.
     */
    maxPlies?: number | null;
    /**
     * Match termination behaviour. Default `ply_limit` (SmartBeads 4×4 lab).
     * `sholo_guti` = elimination + stalemate; one ply per completed turn.
     */
    terminationProfile?: TerminationProfile;
}

/** Independent copy so each game can mutate occupants without sharing templates. */
export function cloneBoardDefinition(board: BoardDefinition): BoardDefinition {
    return {
        name: board.name,
        intersections: board.intersections.map((intersection) => ({ ...intersection })),
        connections: board.connections.map((connection) => ({ ...connection })),
        jumpPaths: board.jumpPaths
            ? board.jumpPaths.map((path) => ({ ...path }))
            : undefined,
        centerNodeIds: board.centerNodeIds ? [...board.centerNodeIds] : undefined,
        maxPlies: board.maxPlies,
        terminationProfile: board.terminationProfile,
    };
}

export interface GameState {
    board: BoardDefinition;
    currentPlayer: Player;
    moveCount: number;
    captures: Record<Player, number>;
    winner?: Player | "DRAW";
    gameOver: boolean;
    /** Human-readable end reason when gameOver (e.g. elimination, stalemate). */
    endReason?: string;
}

/** Slide or single capture hop along a board route. Multi-jump = sequential Moves. */
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

/** Geometry-only jump route for a from→to hop, if the board defines one. */
export function findJumpPath(
    board: BoardDefinition,
    from: number,
    to: number,
): JumpPath | undefined {
    return board.jumpPaths?.find((path) => path.from === from && path.to === to);
}

/** True when a positive maxPlies is configured and the limit has been reached. */
export function hasReachedPlyLimit(maxPlies: number | null | undefined, moveCount: number): boolean {
    return typeof maxPlies === "number" && maxPlies > 0 && moveCount >= maxPlies;
}
