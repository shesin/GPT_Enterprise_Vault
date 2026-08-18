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

1. **M2 — shared play UI** (timers, centre rules, polish) on top of M0/M1 shell.  
2. **M3 — port six remaining product boards** — see locked list in `VISION_05P.md`.  
3. **Optional Lab follow-up** — size-adjusted move-cap sensitivity; not a blocker.  
4. **Match timer, shot clock, centre defaults** — from Feature Test when wiring M2 settings.  
5. **Resignation rule** — not yet decided.

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
- **5/5/8/12-bead discovery Lab (2026-08-16):** `evaluate-c1-c4-lab.cjs` → `LAB_EVALUATION_5_5_8_12_BEAD_DISCOVERY_SET.json`. **5-bead 3×5 LR / 5-bead 4×4 / 12-bead miniwing REJECT (G2)**. **8-bead 5×5** Lab closed at N=100 (`8_BEAD_5x5_LAB_COMPLETE.json`) — all G1–G9 pass; human playtest remaining. See `BOARD_DISCOVERY_05P.md`.
- **12-bead Baro (2026-08-16):** traditional 5×5 Alquerque rank camps — **REJECT (G2)** (`BARO_12_LAB_EVALUATION.json`). Distinct from 12-bead miniwing. Do not promote.
- **7-bead Lab review (2026-08-17):** D1 20%/80% (F/SP −30 pp) is greedy-depth lean **inside** G2 (±35 pp). D2 captures balanced. **KEEP** — no Lab recheck, no geometry change.
- **9/7/5/12/4-bead set (2026-08-17):** `LAB_EVALUATION_9_7_5_12_4_BEAD_SET.json` — 9-bead 5×5 and 5-bead 3×5 rear thin REJECT G2; 7-bead 5×5, 12-bead 6×5, 4-bead 3×5 rear NFT.
- **Web REJECT cleanup (2026-08-17):** Removed 10 discovery REJECT playables + dedicated engines from `prototype/board4/`. Kept Lab audit JSON, KEEP/NFT playables, ladder playables, 16-bead reference.
- **Playable folders (2026-08-18):** Locked V1 seven + ladder playables in `prototype/board4/` root; **left-out NFT only** (5) in `unrejected games/`. `playable-dir.cjs` resolves both.
- **M0 + M1 (2026-08-18):** Production **16-bead Sholo Guti** — `Board16Sholo.ts`, `BoardCatalog.ts`, generic `BoardRenderer.ts`, `terminationProfile: sholo_guti` (elimination + stalemate, one ply per turn). Web playtest defaults to 16-bead (`npm run web:smartbeads`). **42 Jest tests pass** including prototype parity vs `sholo-guti-fullturn-engine.cjs`.

---

## Open Items

**Human KEEP confirmed (2026-08-15):**

| Playable | Web verdict | Human KEEP | Feature Test |
|----------|-------------|------------|--------------|
| `SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html` | NEEDS FURTHER TESTING | **KEEP** | Complete |
| `SHOLO_GUTI_10_BEAD_WITH_FEATURE.html` | NEEDS FURTHER TESTING | **KEEP** | Complete |
| `SHOLO_GUTI_7_BEAD_WITH_FEATURE.html` | NEEDS FURTHER TESTING | **KEEP** | Complete |
| `SHOLO_GUTI_6_BEAD_WITH_FEATURE.html` | NEEDS FURTHER TESTING | **KEEP** | Complete |

**Pending human decision:** match timer, shot clock, per-board centre **defaults** (UI already has Off/Cumulative/End-Game), resignation rule.

**Do not promote:** 4-bead, 5-bead 3×5 sketch, 8-bead 4×5, Cursor Index 4, **5-bead 3×5 LR**, **5-bead 4×4**, **12-bead miniwing**, **12-bead Baro**. **8-bead 5×5** is Lab-pass only until human playtest.

---

## Next Step

1. **M2** — Feature shell parity (settings panel, timers, centre rules) without changing core 16-bead rules.  
2. **M3** — Register and port six remaining locked boards.  
3. Set product **defaults** from Feature Test when M2 settings layer is wired.  
4. Decide **resignation** when ready.

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

Ship the **locked V1 seven-board** SmartBeads app using the production TypeScript engine and a shared board-config + renderer architecture.

Quality takes priority over feature count.
