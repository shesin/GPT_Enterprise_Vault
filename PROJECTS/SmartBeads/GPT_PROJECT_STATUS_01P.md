# SmartBeads Project Status

## Purpose

This document records the current implementation status of SmartBeads.

It provides a concise snapshot of where the project stands today.

Only current implementation information belongs here.

Do not record permanent engineering rules, long-term philosophy, or historical design reasoning.

Target: 01P (~1 page)

---

## Current Phase

Core Engine Evaluation & Playtesting

---

## Current Focus

Evaluate Board4 using AI self-play and developer playtesting with:

- Slides
- Optional captures
- Multi-jump chains

---

## Verified Milestones & Completed Work

- Project migrated into GPT_Enterprise_Vault.
- BoardDefinition established as the authoritative board model.
- Registered board variants in BoardConfig:
  - Board4: fully implemented and playable (4×4 orthogonal grid with jumpPaths, center nodes, and ply limits).
  - Board5: registered stub.
  - Board6: registered stub.
  - Board7: registered stub.
- SmartBeadsEngine capabilities:
  - legal slides
  - optional captures
  - multi-jump chains
  - voluntary endTurn
  - ply limits (configurable per board)
  - capture-count victories & center tie-break logic
  - countPieces(playerId) utility
- SelfPlayRunner simulation module:
  - automated game execution
  - random legal move selection (`executeAiRandomMove`)
  - alternating starting players
  - safety guards & GameResult metric tracking
  - machine-readable JSON batch reporting (`generateBatchReport` / `npm run sim:board4`)
  - verified 100-game Board4 self-play run
- Playtest interfaces for Board4:
  - HumanVsAiRunner CLI interface (`npm run play:board4`).
  - Browser SVG web playtest GUI (`npm run web:board4`) — CONFIRMED loading and rendering: directly observed via headless-browser console log and DOM dump showing the SVG board rendering all 16 nodes/connections with correct RED/BLUE starting piece placement and no console errors. Interactive click-to-move gameplay (piece selection, capture chains, AI turn execution) has NOT yet been directly observed end-to-end.

---

## Open Items

- Web GUI end-of-game display: the `gameOver` banner element exists in the markup but announcing the winner/loser/draw at game end has not been directly observed working.
- Ply-limit tie-breaker center-node-control logic (`SmartBeadsEngine.evaluateWinner`) needs verification against real gameplay — currently only exercised by automated self-play, not confirmed against a human-played scenario that actually reaches the ply limit with a center-node tiebreak.
- AI opponent strength is undecided: the current playtest/self-play AI (`executeAiRandomMove`) is random-legal-move-only by design, intended for engine validation and balance analysis, not competitive strength. Whether a stronger AI (e.g. heuristic or minimax) is needed for meaningful human playtesting is an open question, not yet decided.

---

## Next Step

Collect empirical AI self-play data and conduct developer playtesting on Board4 to measure balance, game length, and first-player advantage.

Only after sufficient evidence should larger board variants become the primary research focus.

---

## Current Architecture

### Enterprise Layer

- Documentation
- Standards
- Templates

### Shared Technology Layer

- Reusable game engines
- Shared utilities

### Project Layer

- SmartBeads gameplay
- Board definitions
- Rules engine
- AI integration

---

## Current Objective

Develop the strongest possible four-bead game before expanding the platform to larger variants.

Quality takes priority over feature count.
