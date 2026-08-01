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
  - Browser SVG web playtest GUI (`npm run web:board4`).

---

## Open Items

- Web playtest GUI (`npm run web:board4`) does not currently announce the winner/loser/draw in its end-of-game UI. The `gameOver` banner element exists but this behavior has not been verified against real gameplay.
- Ply-limit tie-breaker center-node-control logic (`SmartBeadsEngine.evaluateWinner`) needs verification against real gameplay — currently only exercised by automated self-play, not confirmed against a human-played scenario that actually reaches the ply limit with a center-node tiebreak.

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
