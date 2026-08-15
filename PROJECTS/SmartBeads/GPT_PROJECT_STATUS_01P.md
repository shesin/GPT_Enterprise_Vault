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

Headless G1–G9 board selection on the Sholo Guti ladder (4–16 bead variants + Cursor Index 4×4), with human playtest sign-off for boards that pass all Web gates.

---

## Verified Milestones & Completed Work

- Project migrated into GPT_Enterprise_Vault.
- BoardDefinition established as the authoritative board model.
- Registered board variants in BoardConfig (Board4–Board7).
- SmartBeadsEngine: slides, captures, multi-jump chains, endTurn, ply limits, capture-count victories.
- SelfPlayRunner + HumanVsAiRunner CLI + browser SVG playtest GUI (`npm run web:board4`).
- **16-bead Sholo reference:** Web instrument certified — see `WEB_REPORT_16_BEAD_05P.md`, `LAB_16_BEAD_REFERENCE_VALIDATION.json`.
- **Sholo ladder G1–G9 (authoritative):** `evaluate-ladder-lab.cjs` → `LADDER_LAB_EVALUATION.json`; consolidated verdicts in `WEB_REPORT_All_BEAD_05P.md`.
- **4-bead & 5-bead (3×5 sketch):** evaluated 2026-08-14 — both **REJECT** (G2, D1 second-mover 100%).
- **8-bead, Cursor Index 4:** **REJECT** (G2). **10, 7, 6-bead, Cursor Index 6:** **NEEDS FURTHER TESTING** — human playtest pending.
- **3-bead sketch:** dropped — not tested.
- Web documentation at SmartBeads root: `LAB_TERMINOLOGY_05P.md`, `WEB_REPORT_16_BEAD_05P.md`, `WEB_REPORT_All_BEAD_05P.md`.

---

## Open Items

None — all requested ladder Web runs and report updates for 4/5-bead 3×5 are complete. Human playtest for 10/7/6-bead and Cursor Index 6 is the next human-owned step, not a pending engineering item.

---

## Next Step

Schedule human playtest for **10-bead**, **7-bead**, **6-bead (3×5)**, and **Cursor Index 6** (all Web gates pass). Do not promote **4-bead**, **5-bead (3×5)**, **8-bead**, or **Cursor Index 4** until geometry is redesigned and re-evaluated.

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
