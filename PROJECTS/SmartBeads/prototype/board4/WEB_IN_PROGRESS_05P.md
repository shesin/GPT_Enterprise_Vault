# Board4 Web Prototype — In Progress

Rules/behavior implemented in index.html but NOT yet verified (see WEB_STATUS_05P.md for what "verified" requires). Move an entry to WEB_RULES_05P.md only after it has a passed verification record.

---

## Movement

- Adjacent move to an empty connected node, OR jump over one adjacent enemy bead into an empty landing node.
- Board graph is 4×4 with horizontal, vertical, and diagonal connections, generated from grid geometry.
- Not yet checked: whether this generated graph matches the real physical board's connections, or whether it's a convenient approximation (Board Fidelity rule requires the real intersections/legal connections).

## Multi-Jump / Capture Optionality

- After a capture, additional legal jumps for the same piece are auto-detected.
- Player (human or AI) may continue the chain or voluntarily end it after completing a legal jump.
- Human sees a "Finish Multi-Jump" button whenever optional continuation exists.
- Matches production Capture Optionality rule in wording — not yet confirmed matching in actual play.

## Turn Management

- First player alternates each new game.
- Ply count, remaining plies, current player tracked in GameState.
- Max plies: 40 (prototype default — not yet cross-checked against the production numeric default).

## AI

- Easy: depth 1, prefers captures, otherwise random legal move.
- Medium: depth 3, minimax.
- Hard: depth 4, alpha-beta pruning.
- Evaluation function is deterministic; randomness used only to break ties among equally-scored moves.
- AI's continue-vs-stop policy during multi-jump chains is implementation detail, not a gameplay rule (per VISION_05P.md).

## End Conditions

- Win: opponent eliminated (0 pieces remaining).
- Loss: no legal moves available (stalemate).
- Draw: three-fold repetition.
- Ply limit reached (40): resolve via captures → center control (nodes 5, 6, 9, 10) → draw.

## Not yet implemented / undecided

- Resignation — matches production status (undecided, not implemented). Do not implement here either until a decision is recorded in GPT_PROJECT_RULES_01P.md.
- Timer-based match ending — only move-limit ending exists so far; time and unlimited modes not built.
- Board5 / Board7 equivalents.