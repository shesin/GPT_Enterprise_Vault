# Smart Bead Chess — Project Decisions (01P)

## Match Termination & Victory

Support three configurable end modes (move-limit, time-limit, unlimited) without hardcoding.

**Engine elimination / stalemate:** standard engine paths.

Three-fold repetition of the same position (board state + player to move) ends the match in a draw. Applies uniformly to PvE, PvP, and Watch AI vs AI.

**On configured limit (timer expiry hierarchy):**

1. Total captures — most wins.
2. Center tiebreak — per active center rule (Off / End-game / Cumulative).
3. Draw — if still tied.
