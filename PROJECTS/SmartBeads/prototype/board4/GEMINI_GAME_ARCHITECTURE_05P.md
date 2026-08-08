# 📄 MASTER ARCHITECTURE: SmartBeads (4-Bead Prototype)

## 1. Core Identity & Setup
*   **Game Type:** Abstract strategy board game (Alquerque family).
*   **Format:** Single-file HTML5 (Canvas for rendering, JS for logic, CSS for styling).
*   **Players:** Player 1 (Human / Red) vs Player 2 (AI / Blue).
*   **Board:** 4x4 grid (16 nodes).
*   **Pieces:** 4 Red beads, 4 Blue beads.
*   **Initial State (1D Array 0-15):**
    *   Indices 0, 1, 2, 3: Red (P1)
    *   Indices 4 to 11: Empty (0)
    *   Indices 12, 13, 14, 15: Blue (P2)

## 2. Board Graph & Adjacency (The Math)
The board is represented as a 1D array of 16 integers. Movement is dictated by a Graph Adjacency List, NOT pure 2D array math.
*   **Orthogonal:** Every node connects up, down, left, right.
*   **Diagonal (Alquerque specific):** Diagonals only exist along these specific rays:
    *   `[0, 5, 10, 15]` and `[3, 6, 9, 12]` (Main diagonals)
    *   `[1, 6, 11]` and `[4, 9, 14]`
    *   `[2, 5, 8]` and `[7, 10, 13]`
*   **Center Nodes:** Indices `[5, 6, 9, 10]`.

## 3. Movement & Capture Mechanics
*   **Standard Move:** Slide one bead along a valid adjacency line to an empty node.
*   **Capture (Jump):** Jump over an adjacent opponent bead to an empty node immediately behind it in a straight line. The jumped bead is removed.
*   **Capture Optionality (Multi-Jumps):**
    *   Captures are *not* forced.
    *   If a capture is made, and another valid capture exists from the landing node, a chain-jump is triggered.
    *   **Human:** Can click the next valid jump target, OR click a "Finish Multi-Jump" button to voluntarily end their turn mid-chain.
    *   **AI:** Uses a 1-step lookahead during chain-jumps to simulate all available follow-up jumps and automatically executes the path that yields the highest number of future captures.

## 4. Match Limits & Timers
*   **Turn Shot Clock (Anti-Stall):** Configurable (10s, 15s, 20s, Off). If a player fails to move before the clock hits 0, they instantly forfeit. The clock resets on every new turn AND during multi-jump combos.
*   **Match Timer:** 
    *   *Global:* (1m, 2m, 3m) A single countdown clock. When it hits 0, evaluate the winner.
    *   *Chess Clock:* (2m) Each player has their own timer. It only ticks down during their active turn. Hitting 0 results in an instant forfeit.
*   **Max Moves (Plies):** Configurable (20, 40, 60, Unlimited). Game evaluates winner when reached.

## 5. Victory Hierarchy & Center Rules
When a match limit is reached, the winner is decided by this strict hierarchy:
1.  **Total Captures:** Player with the most captured beads wins.
2.  **Center-Hold Tiebreaker (If Captures are tied):**
    *   *Cumulative (King of the Hill):* +1 point for every ply a bead ends its turn on a center node. Player with most points wins.
    *   *End-Game (Musical Chairs):* Points are ONLY calculated on the final move of the game. Whoever occupies the most center nodes at that exact moment wins.
    *   *Off:* Tiebreakers disabled. Game skips to Draw.
3.  **Draw:** If captures (and center points, if enabled) are tied, the game is a Draw.
*   **Instant End Conditions:** Elimination (lose all beads), Stalemate (no legal moves), 3-Fold Repetition (Draw).

## 6. AI Engine (Minimax)
*   **Algorithm:** Minimax with Alpha-Beta Pruning.
*   **Difficulty Levels:**
    *   Easy (Depth 1): Picks a random capture if available, otherwise a random move.
    *   Medium (Depth 2): Standard Minimax.
    *   Hard (Depth 3): Deep Minimax.
*   **Heuristic Evaluation Formula:**
    *   `Material Score = (AI Pieces - Human Pieces) * 25`
    *   `Center Score = (AI Center Occupancy - Human Center Occupancy) * 5`
    *   `Randomizer = Math.random() * 2 - 1` (Prevents repetitive identical games).
    *   `Total Score = Material + Center + Randomizer`.

## 7. UI & Rendering (Canvas)
*   **Canvas Size:** 360x360.
*   **Visual Elements:**
    *   **Board Lines:** Drawn using the Adjacency List.
    *   **Beads:** Drawn as circles with radial gradients (Red/Dark Red, Blue/Dark Blue) to look like 3D glass marbles.
    *   **Center Nodes:** Highlighted with gold rings and darker backgrounds.
    *   **Last Move Trail:** A dashed gold line and ghost ring showing where the last piece moved from.
    *   **Valid Move Hints:** Dashed gold rings around beads that have legal moves (Human turn only).
    *   **Target Highlights:** When a bead is selected, valid empty targets glow green; valid capture targets glow orange.
*   **HTML Layout:** Includes a Header, Settings Grid, Countdown Banner, Scoreboard (tracking beads, captures, center plies, and Shot Clocks), Status Badge (flashes red at <= 3s), and a Game Over Modal.

## 8. Audio Architecture
*   **Background Music (BGM):**
    *   External MP3 player UI fixed to the bottom left.
    *   Uses an `<audio>` tag and a `<select>` dropdown populated with URLs from `soundimage.org`.
*   **Sound Effects (SFX):**
    *   Generated purely via JavaScript `Web Audio API` (Oscillators).
    *   `select`: High C5 sine beep.
    *   `move`: Warm triangle thock.
    *   `center_step`: Double sine chime.
    *   `capture`: Two-tone ascending sine.
    *   `win`: 4-note ascending major arpeggio.
    *   `lose`: 4-note descending minor sawtooth.

## 9. State Management Variables
To rebuild this, the engine must track:
*   `board`: Array[16]
*   `currentTurn`: 1 (Red) or 2 (Blue)
*   `currentState`: IDLE, SELECTED, CHAIN_JUMPING, GAME_OVER
*   `moveCount`: Integer
*   `redCenterPoints` / `blueCenterPoints`: Integers
*   `positionHistory`: Dictionary/Object mapping `boardString_turn` to occurrence count.
*   `matchTimeRemaining`, `p1TimeRemaining`, `p2TimeRemaining`, `turnTimeRemaining`: Integers (seconds)