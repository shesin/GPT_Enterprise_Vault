# SmartBeads Project Status

## Purpose

This document records the current implementation status of SmartBeads.

It provides a concise snapshot of where the project stands today.

Only current implementation information belongs here.

Do not record permanent engineering rules, long-term philosophy, or historical design reasoning.

Target: 01P (~1 page)

---

## Current Phase

Sholo ladder — human KEEP confirmed; Feature Test complete (timer finals pending)

---

## Current Focus

1. **Human playtest 7-bead 4×4 dense** — best compact-set Lab survivor (`LAB_EVALUATION_5_7_8_10_12_BEAD_COMPACT_SET.json`).  
2. **Human playtest 8-bead 5×5** — Lab G1–G9 complete at N=100/seed (`8_BEAD_5x5_LAB_COMPLETE.json`).  
3. **Match timer, shot clock, and per-board centre defaults** — pick from Feature Test ranges (`WEB_FEATURE_TEST_05P.md`).  
4. **Resignation rule** — not yet decided.

**Human KEEP (2026-08-15):** all four active ladder playables registered in `FEATURE_TEST_KEEP_REGISTRY.json`.  
**Feature Test:** **COMPLETE** — `FEATURE_TEST_EVALUATION.json`.  
**Discovery 5/5/8/12-bead set:** Lab complete 2026-08-16 — see `LAB_EVALUATION_5_5_8_12_BEAD_DISCOVERY_SET.json`.  
**9/7/5/12/4-bead set:** Built + Lab complete 2026-08-17 — see `LAB_EVALUATION_9_7_5_12_4_BEAD_SET.json`.  
**5/7/8/10/12-bead compact set:** Built + Lab complete 2026-08-17 — see `LAB_EVALUATION_5_7_8_10_12_BEAD_COMPACT_SET.json`, ranking `ALL_NON_REJECT_LAB_RANKING.json`.

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
- **7-bead Lab review (2026-08-17):** D1 20%/80% (FPA −30 pp) is greedy-depth lean **inside** G2 (±35 pp). D2 captures balanced. **KEEP** — no Lab recheck, no geometry change.
- **9/7/5/12/4-bead set (2026-08-17):** `LAB_EVALUATION_9_7_5_12_4_BEAD_SET.json` — 9-bead 5×5 and 5-bead 3×5 rear thin REJECT G2; 7-bead 5×5, 12-bead 6×5, 4-bead 3×5 rear NFT.
- **Web REJECT cleanup (2026-08-17):** Removed 10 discovery REJECT playables + dedicated engines from `prototype/board4/`. Kept Lab audit JSON, KEEP/NFT playables, ladder playables, 16-bead reference.

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

1. Human playtest **8-bead 5×5** (`SHOLO_GUTI_8_BEAD_5x5_WITH_FEATURE.html`).  
2. Set KEEP-board **defaults**: 4×4 End-Game; 7-bead and 6-bead 3×5 Cumulative; 10-bead human choice; timers from Feature Test ranges.  
3. Decide **resignation** when ready. Optional later: long stall-resolution for 7-bead / 4×4 only — not a KEEP condition.

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

Find the smallest balanced, enjoyable Sholo ladder candidate that passes Web G1–G9 and human playtest before expanding the production TypeScript engine to new variants.

Quality takes priority over feature count.
