MASTER ARCHITECTURE: SmartBeads v2.1 (Production Spec)
1. Core Identity & Proven Baseline
Game Family: Abstract strategy board game (Alquerque / Guti family).
Primary Production Variant (Empirically Proven): 6-Bead on 4x4 Grid (16 nodes, 12 beads total, 4 empty nodes).
Empirical Justification: 2,900+ AI self-play simulations proved 6-bead yields a 52.5% decisive win rate with 0% First-Mover Advantage (Red 26.6% vs Blue 25.8%), whereas 4-bead suffered a 67–89% draw rate due to excessive empty space.
Secondary Board Variant: 4-Bead on 4x4 Grid (16 nodes, 8 beads total, 8 empty nodes).
6-Bead Initial State (1D Array 0–15):
Red (P1 / Human): Indices 0, 1, 2, 3, 4, 7
Blue (P2 / AI / Human 2): Indices 8, 11, 12, 13, 14, 15
Empty (0): Indices 5, 6, 9, 10
4-Bead Initial State (1D Array 0–15):
Red (P1): Indices 0, 1, 2, 3
Blue (P2): Indices 12, 13, 14, 15
Empty (0): Indices 4, 5, 6, 7, 8, 9, 10, 11
2. Board Graph Geometry & Adjacency List
Movement is strictly graph-based via an ADJACENCY list to allow seamless scaling to larger boards (Board5, Board6, Board7). Pure 2D grid math is forbidden.
Orthogonal Edges: Standard grid connections (up, down, left, right).
Diagonal Rays (Alquerque Specific):
[0, 5, 10, 15] and [3, 6, 9, 12] (Main diagonals)
[1, 6, 11], [4, 9, 14], [2, 5, 8], and [7, 10, 13]
Center Nodes: Indices [5, 6, 9, 10].
3. Movement, Captures & Game Modes
Game Modes:
Human vs AI (PvE): Player 1 controls Red. AI controls Blue.
Human vs Human (PvP): Player 1 controls Red. Player 2 controls Blue. AI execution is disabled. Active player highlights their valid beads on their turn.
Standard Move: Slide one bead along an adjacent connection to an empty node.
Capture (Jump): Jump over an adjacent opponent bead into an empty node directly behind it in a straight line. The jumped bead is removed.
Capture Optionality (Multi-Jumps):
Captures are optional (never forced).
Chain-jumps are permitted whenever a legal consecutive capture exists from the landing node.
Human: May click consecutive targets OR click "Finish Multi-Jump" button to end turn voluntarily mid-chain.
AI: Executes 1-step lookahead during chain-jumps to automatically select the path yielding the maximum total captures.
4. Game Modes, Timers & Anti-Stall Mechanics
Turn Shot Clock (Anti-Stall): Configurable (10s, 15s, 20s, Off). Default: Off (15s for Blitz). If a player fails to execute a move before 0s, they instantly forfeit. Clock resets on turn change AND on every jump within a multi-jump combo. Status badge flashes red at 
≤
3
s
≤3s
.
Match Timer:
PvE Mode (Global Timer): Configurable (1m, 2m, 3m, Off). Single shared countdown clock in banner. Evaluating winner via Victory Hierarchy on 0s.
PvP Mode (Auto Chess Clock): Selecting 1m/2m/3m in PvP mode automatically converts the timer into two individual Chess Clocks on the player cards.
Red Turn: Red Clock ticks down; Blue Clock is frozen.
Blue Turn: Blue Clock ticks down; Red Clock is frozen.
Timeout Forfeit: Hitting 0s results in an immediate forfeit loss.
Max Moves (Plies): Configurable (20, 40, 60, Unlimited). Default: Off (40 for competitive play). Triggers Victory Hierarchy when total completed move count is reached.
5. Victory Hierarchy & Center Rules
When a match move limit or global time limit is reached, resolve the winner via this strict hierarchy:
Total Captures: Most opponent beads captured wins.
Center-Hold Tiebreaker (Empirically Proven Default: End-Game):
End-Game / Musical Chairs (Default): Calculated ONLY on the final move. Whoever occupies the most center nodes [5, 6, 9, 10] wins. (Proven to break draws cleanly in 52.5% of games).
Cumulative / King of the Hill: +1 point accumulated for every ply a bead ends its turn on a center node. Most points wins.
Off: Tiebreaker disabled. Skips to Draw.
Draw: Legitimate outcome if captures and center points are equal.
Instant End Conditions: Elimination (0 beads left), Stalemate (0 legal moves on turn), 3-Fold Repetition (Draw).
6. AI Engine & Smart Game Lab Specification
AI Algorithm: Minimax with Alpha-Beta Pruning.
Easy: Depth 1 (Greedy capture, random fallback).
Medium: Depth 2 (Standard Minimax).
Hard: Depth 3 (Deep Minimax).
Heuristic Evaluation Formula:
Score
=
(
AI Beads
−
Human Beads
)
×
25
+
(
AI Center
−
Human Center
)
×
5
+
Random
(
−
1
,
1
)
Score=(AI Beads−Human Beads)×25+(AI Center−Human Center)×5+Random(−1,1)
Smart Game Lab (Self-Play Batch Simulator):
Headless runner capability (runBatchSimulation) executing 
N
N
 automated games without canvas delay.
Auto-detects active board variant (4-bead vs 6-bead).
Outputs statistical metrics: Red Win %, Blue Win %, Draw %, Average Game Length, and End Reason Breakdown (Elimination vs Max Moves vs Repetition).
Used for empirical matrix sweeps across board variants (Board4, Board5, Board6, Board7).
7. UI & Rendering Specification
Canvas: 360x360 pixels.
Visual Polish:
3D Glass Marbles drawn using Radial Gradients (Red/Dark Red, Blue/Dark Blue).
Center nodes styled with gold stroke overlays.
Persistent Last-Move Trail: Dashed gold line connecting origin and destination with a ghost origin ring.
Selection & Target Overlays: Glowing gold ring on selected node; green target overlays for valid moves; orange overlays for captures.
Layout: Header, 2-Column Setting Grid (6 items: Game Mode, AI Level, Shot Clock, Match Timer, Max Moves, Center Rule), Countdown Banner, Scoreboard with active Shot Clocks & Chess Clocks, Turn Status Badge, Control Buttons, and Victory Modal.
8. Audio Architecture
BGM Engine: Fixed bottom-left panel (#bgm-panel) with dropdown, play/pause controls, volume slider, and looping <audio> element loading external tracks from soundimage.org.
SFX Engine: Synthesized in real-time via Web Audio API oscillators:
select: 523.25Hz (C5) Sine.
move: 220.00Hz Triangle thock.
center_step: Dual Sine chime (659.25Hz 
→
→
 880.00Hz).
capture: Dual ascending Sine (440Hz 
→
→
 587Hz).
win: 4-note major arpeggio.
lose: 4-note descending minor sawtooth.
9. State Persistence & Data Structures
The engine state consists of:
code
TypeScript
interface GameState {
  board: Array<number>;          // Length 16 (0=empty, 1=Red, 2=Blue)
  currentTurn: number;           // 1 (Red) or 2 (Blue)
  currentState: string;          // IDLE, SELECTED, CHAIN_JUMPING, GAME_OVER
  gameMode: 'pve' | 'pvp';       // Human vs AI or Human vs Human
  moveCount: number;             // Total completed plies
  redCenterPoints: number;       // Cumulative or endgame center score
  blueCenterPoints: number;      // Cumulative or endgame center score
  positionHistory: Record<string, number>; // State frequency for 3-fold repetition
  matchTimeRemaining: number;   // Seconds (Global)
  p1TimeRemaining: number;      // Seconds (P1 Chess Clock)
  p2TimeRemaining: number;      // Seconds (P2 Chess Clock)
  turnTimeRemaining: number;    // Shot clock seconds
}