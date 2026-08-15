# SmartBeads Project Status

## Purpose

This document records the current implementation status of SmartBeads.

It provides a concise snapshot of where the project stands today.

Only current implementation information belongs here.

Do not record permanent engineering rules, long-term philosophy, or historical design reasoning.

Target: 01P (~1 page)

---

## Current Phase

Sholo ladder Web evaluation & human playtest scheduling

---

## Current Focus

Headless G1–G9 board selection on the Sholo Guti ladder (4–16 bead variants + Cursor Index 4×4), with human playtest sign-off for boards that pass all Web gates. **4×4 6-bead vs 6-bead-b comparison complete (2026-08-15)** — prefer **6-b** for first human session.

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
- **10, 7, 6-bead (3×5):** **NEEDS FURTHER TESTING** — human playtest pending.
- **4×4 6-bead (2026-08-15):** `SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html` (long diagonal rays) — **NEEDS FURTHER TESTING**; G1–G9 pass; playable + lab parity confirmed.
- **4×4 6-bead-b (2026-08-15):** `SHOLO_GUTI_6_BEAD_b_4x4_WITH_FEATURE.html` (full box crosses) — **NEEDS FURTHER TESTING**; G1–G9 pass; **preferred lab profile** vs rays variant (better D1 balance, higher D1 captures, milder D3 skew).
- **Cursor Index lab engine:** `cursor-index-fullturn-engine.cjs` supports geometry `rays` | `fullBoxCross`; evaluator `evaluate-cursor-index-lab.cjs` runs both INDEX_6 and INDEX_6_B.
- **4×4 playables:** feature shell (Ivory/Ebony, undo, animations, settings); centre highlight = per-node amber rings on nodes 5, 6, 9, 10.
- **3-bead sketch:** dropped — playable removed (not Web-evaluated).
- **Removed superseded files:** `CURSOR_INDEX_6.html`, `GEMINI_INDEX_4.html`, `GEMINI_INDEX_6.html`.
- Web documentation at SmartBeads root: `LAB_TERMINOLOGY_05P.md`, `WEB_REPORT_16_BEAD_05P.md`, `WEB_REPORT_All_BEAD_05P.md`.

---

## Open Items

Human playtest (Gameplay / UX Review) — not an engineering blocker:

| Priority | Board | Web verdict |
|----------|-------|-------------|
| 1 | **4×4 6-bead-b** (`SHOLO_GUTI_6_BEAD_b_4x4_WITH_FEATURE`) | NEEDS FURTHER TESTING |
| 2 | 10-bead, 7-bead, 6-bead (3×5) | NEEDS FURTHER TESTING |
| 3 | 4×4 6-bead rays (`SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE`) | NEEDS FURTHER TESTING (alternate geometry) |

Do not promote **4-bead**, **5-bead (3×5)**, **8-bead**, or **Cursor Index 4** until geometry is redesigned and re-evaluated.

---

## Next Step

Schedule human playtest starting with **`SHOLO_GUTI_6_BEAD_b_4x4_WITH_FEATURE.html`**, then **10-bead**, **7-bead**, and **6-bead (3×5)**. Web cannot grant KEEP without human sign-off.

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
