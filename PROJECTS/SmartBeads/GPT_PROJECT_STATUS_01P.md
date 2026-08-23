# SmartBeads Project Status

## Purpose

This document records the current implementation status of SmartBeads.

It provides a concise snapshot of where the project stands today.

Only current implementation information belongs here.

Do not record permanent engineering rules, long-term philosophy, or historical design reasoning.

Target: 01P (~1 page)

---

## Current Phase

V1 app integration — **7 boards locked** in `VISION_05P.md` (2026-08)

---

## Current Focus

1. **V1 seven boards** are in the production play shell (`npm run web:smartbeads`).  
2. **Quality gate (standing rule, not an open task):** Human Oracle — failing Jest for exact screen clicks before engine fixes. A green `npm test` is not UI proof.

**V1 locked set (authoritative):** 16-bead · 5×5 (reference), 6×4×4, 6×3×5, 10×5×5, 12×6×5, 8×4×6 hourglass, 7×4×5 hourglass — `VISION_05P.md`. Do not swap boards without documented Lab/gameplay failure.

**Historical (superseded for product scope):** Human KEEP registry (4 ladder boards, 2026-08-15), `ALL_NON_REJECT_LAB_RANKING.json`, discovery NFT lists — Lab archive only; not the V1 product list.

---

## Verified Milestones & Completed Work

- Project migrated into GPT_Enterprise_Vault.
- BoardDefinition established as the authoritative board model.
- Registered board variants in BoardConfig (Board4–Board7).
- SmartBeadsEngine: slides, captures, multi-jump chains, endTurn, ply limits, capture-count victories.
- SelfPlayRunner + HumanVsAiRunner CLI + browser SVG playtest GUI (`npm run web:board4`).
- **16-bead Sholo reference:** Web instrument certified — see `WEB_REPORT_16_BEAD_05P.md`, `LAB_16_BEAD_REFERENCE_VALIDATION.json`.
- **Sholo ladder G1–G9 (authoritative):** `evaluate-ladder-lab.cjs` → `LADDER_LAB_EVALUATION.json`; consolidated verdicts in `WEB_REPORT_All_BEAD_05P.md`.
- **4-bead & 5-bead (3×5 sketch):** evaluated 2026-08-14 — both **REJECT** (G2); playables removed.
- **8-bead, Cursor Index 4:** **REJECT** (G2); playables removed.
- **10, 7, 6-bead (3×5):** **NEEDS FURTHER TESTING** (Web) · **KEEP** (human playtest 2026-08-15).
- **4×4 6-bead (2026-08-15):** Side-by-side Web run (rays vs full box cross). **Selected:** full box cross → `SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html`. **Removed:** rays variant. Audit: `CURSOR_INDEX_6_LAB_EVAL.json` (INDEX_6 rays), `CURSOR_INDEX_6_B_LAB_EVAL.json` (INDEX_6_B cross).
- **4×4 active Web verdict:** **NEEDS FURTHER TESTING** (G1–G9 pass) · **KEEP** (human playtest 2026-08-15).
- **3-bead sketch:** dropped — playable removed (not Web-evaluated).
- Web documentation at SmartBeads root: `LAB_TERMINOLOGY_05P.md`, `WEB_REPORT_16_BEAD_05P.md`, `WEB_REPORT_All_BEAD_05P.md`, **`WEB_FEATURE_TEST_05P.md`**.
- **Feature Test (2026-08-15):** **COMPLETE** — four KEEP boards; artifacts `FEATURE_TEST_EVALUATION.json`, `FEATURE_TEST_CENTRE_RULE_EVALUATION.json`. Per-board centre rule: **4×4 End-Game**, **10-bead inconclusive**, **7/6-bead cumulative**. **UI parity (2026-08-15):** Cumulative + End-Game enabled on all KEEP playables. Report: **`WEB_FEATURE_TEST_05P.md`**.
- **5/5/8/12-bead discovery Lab (2026-08-16):** `evaluate-c1-c4-lab.cjs` → `LAB_EVALUATION_5_5_8_12_BEAD_DISCOVERY_SET.json`. **5-bead 3×5 LR / 5-bead 4×4 / 12-bead miniwing REJECT (G2)**. **8-bead 5×5** Lab closed at N=100 (`8_BEAD_5x5_LAB_COMPLETE.json`) — all G1–G9 pass; **not in the V1 seven** (Lab-pass archive only). See `BOARD_DISCOVERY_05P.md`.
- **12-bead Baro (2026-08-16):** traditional 5×5 Alquerque rank camps — **REJECT (G2)** (`BARO_12_LAB_EVALUATION.json`). Distinct from 12-bead miniwing. Do not promote.
- **7-bead Lab review (2026-08-17):** D1 20%/80% (F/SP −30 pp) is greedy-depth lean **inside** G2 (±35 pp). D2 captures balanced. **KEEP** — no Lab recheck, no geometry change.
- **9/7/5/12/4-bead set (2026-08-17):** `LAB_EVALUATION_9_7_5_12_4_BEAD_SET.json` — 9-bead 5×5 and 5-bead 3×5 rear thin REJECT G2; 7-bead 5×5, 12-bead 6×5, 4-bead 3×5 rear NFT.
- **Web REJECT cleanup (2026-08-17):** Removed 10 discovery REJECT playables + dedicated engines from `prototype/board4/`. Kept Lab audit JSON, KEEP/NFT playables, ladder playables, 16-bead reference.
- **Playable folders (2026-08-18):** Locked V1 seven + ladder playables in `prototype/board4/` root; **left-out NFT only** (5) in `unrejected games/`. `playable-dir.cjs` resolves both.
- **M0 + M1 (2026-08-18):** Production **16-bead Sholo Guti** — `Board16Sholo.ts`, `BoardCatalog.ts`, `terminationProfile: sholo_guti`.
- **Jest (2026-08-20):** Production PvE sanity is `FeatureSession` + `HonestAi` + `runAiTurn` on **all seven V1 boards** (`v1ProductionSanity.test.ts`): every `jumpPath` captures, unique-over click, optional-stop AI closes the chain, Easy games return the turn. Lab `.cjs` N=100 and Board4 `SelfPlayRunner` are not that path. Technical verification only — not UI proof.
- **Capture click (2026-08-20):** `FeatureSession.interpretClick` — unique capture-over (and idle unique-victim) is the same legal hop as clicking the empty landing. All seven V1 boards.
- **Catalog timers (2026-08-19):** Per-board match/shot defaults are already in `BoardCatalog.ts` (human-decided). Not an open item.
- **M2 + M3 shell (2026-08-19):** Shared play shell — `PlayController.ts`, `FeatureSession.ts`, `CanvasBoardRenderer.ts`, board `<select>`, centre rules, undo, honest AI. Browser scripts: `m2-browser-verify.mjs`, `m2-6x4-browser-verify.mjs`, `m2-6x3x5-browser-verify.mjs`, `m2-10x5-browser-verify.mjs`, `m2-12x6x5-browser-verify.mjs`, `m2-8x4x6-browser-verify.mjs`, `m2-7x4x5-browser-verify.mjs`.
- **6-bead · 4×4 (2026-08-19):** `Board6.ts` — full box cross, catalog `6x4`, default centre **End-Game**, unlimited plies. Prototype parity vs `cursor-index-fullturn-engine.cjs` (`fullBoxCross`).
- **6-bead · 3×5 (2026-08-19):** `Board6x3x5.ts` — separate board module (not reused 4×4), catalog `6x3x5`, centre node index **7**. Prototype parity vs `sholo-6-bead-fullturn-engine.cjs` / `SHOLO_GUTI_6_BEAD_WITH_FEATURE.html`.
- **10-bead · 5×5 (2026-08-19):** `Board10x5.ts` — 25-node Alquerque, two-file camps, empty centre file, catalog `10x5`, default centre **Off** (Feature Test: no Lab recommendation), centre node index **12**. Prototype parity vs `sholo-10-bead-fullturn-engine.cjs` / `SHOLO_GUTI_10_BEAD_WITH_FEATURE.html`.
- **12-bead · 6×5 (2026-08-19):** `Board12x6x5.ts` — 30-node 6×5 Alquerque, two-file rank camps, empty centre file, catalog `12x6x5`, default centre **Off** (catalog; not in Feature Test KEEP set), centre nodes **12, 17**. Prototype parity vs `sholo-d4-12-6x5-fullturn-engine.cjs` / `SHOLO_GUTI_12_BEAD_6x5_WITH_FEATURE.html`.
- **8-bead · 4×6 hourglass (2026-08-19):** `Board8x4x6.ts` — 24-node hourglass waist, catalog `8x4x6`, centre nodes **9, 10, 13, 14**. Prototype parity vs `sholo-f1a-8-4x6-fullturn-engine.cjs` / `SHOLO_GUTI_8_BEAD_4x6_HOURGLASS_WITH_FEATURE.html`.
- **7-bead · 4×5 hourglass (2026-08-19):** `Board7.ts` — 20-node hourglass (5+2+2+5 camps), catalog `7x4x5`, centre nodes **9, 10**. Prototype parity vs `sholo-7-bead-fullturn-engine.cjs` / `SHOLO_GUTI_7_BEAD_WITH_FEATURE.html`. **V1 seven-board port complete.**
- **Human-decided catalog settings (2026-08-19):** Per-board centre/timer/shot defaults and option lists in `BoardCatalog.ts`; UI reads catalog via `PlayController`. Timer expiry → score hierarchy (`evaluateScoreAndEnd` on global match timeout). Capture majority then centre tiebreak.
- **Resignation (2026-08-19):** P1/current player offers resignation; opponent accepts draw or claims win. PvP offer modal; PvE uses `shouldAcceptResignationDraw` (HonestAi eval). Browser: `m2-resignation-verify.mjs`.
- **PvE turn boundary (2026-08-19):** `HonestAi.getFollowUpJumps` returns none when `chainPieceId` is null. `PlayController.runAiTurn` stops when the chain is over (no leftover-path hops). Live two-click gate: `scripts/m2-2step-observe.mjs` (16-bead hanging **A41→A42**). Session occupancy: `firstMoveInvariants.ts`.
- **Human Oracle / engine vs animation (2026-08-19):** `GPT_PROJECT_RULES_01P.md` — screen bugs get a failing Jest test for those exact clicks before engine/session/AI changes; `SmartBeadsEngine` and `FeatureSession` must be correct with no renderer. A green `npm test` is not UI proof.

---

## Open Items

- **AI turn finish:** optional-stop closes the chain (`completeAiTurnIfChainOpen`); it is not regression-proven (per Section 3 and Section D) and requires further verification. Medium/Hard think budget 800ms with Easy/first-legal fallback so the shell cannot stick on “AI is thinking…”.

The four 2026-08-15 human KEEP HTML playables (6×4, 10, 7, 6×3×5) are already production TypeScript boards in the V1 seven. Lab Web “NEEDS FURTHER TESTING” on those HTML files is archive, not an open product task.

**Do not promote** (standing constraint, not a task): 4-bead, 5-bead 3×5 sketch, 8-bead 4×5, Cursor Index 4, **5-bead 3×5 LR**, **5-bead 4×4**, **12-bead miniwing**, **12-bead Baro**. **8-bead 5×5** is Lab-pass only (not in the V1 seven).

---

## Next Step

No open implementation item. Standing quality rule: screen-reproduced bugs get a failing named-click Jest first, then engine/session/AI. Jest green is not UI proof.

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

The **locked V1 seven-board** SmartBeads app is in the production TypeScript engine and shared play shell. Quality takes priority over feature count. No open V1 implementation item.
