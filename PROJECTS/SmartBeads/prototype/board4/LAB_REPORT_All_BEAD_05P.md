# Lab Report: All Board Families (Sholo Ladder + Cursor Index 4×4)

**Date:** 2026-08-14  
**Methodology:** `LAB_TERMINOLOGY_05P.md` (G1–G9 gates, no new thresholds)  
**Reference anchor:** 16-bead Sholo — **FULLY CERTIFIED** — `LAB_REPORT_16_BEAD_05P.md`, `LAB_16_BEAD_REFERENCE_VALIDATION.json`  
**Authoritative evaluators:**
- Sholo ladder: `evaluate-ladder-lab.cjs` → `LADDER_LAB_EVALUATION.json`
- Cursor Index 4×4: `evaluate-cursor-index-lab.cjs` → `CURSOR_INDEX_LAB_EVALUATION.json` (same certified protocol via `cursor-index-fullturn-engine.cjs`)

**Sholo protocol (canonical):** D1 / D2 / D3 · seeds 101, 202, 303 · **N=30** per seed · move-cap **120** · P1 first · 270 games per board · 540 games per compare run (`sholo-lab-protocol.cjs`).

**Playable vs Lab:** Lab D2 ≠ browser Level 2 — see `LAB_TERMINOLOGY_05P.md`.

---

## Verification status (2026-08-14 — target boards re-run)

| Check | Status | Evidence |
|-------|--------|----------|
| 16-bead reference instrument | **CERTIFIED** | Unchanged — `instrumentValid=true`, N=30 |
| Ladder G1–G9 — boards **5, 8** | **PASS (evaluator)** | `evaluate-ladder-lab.cjs --only 5,8` → **REJECT** on G2 (`g2_fairness_fail`) |
| Ladder G1–G9 — boards **10, 7, 6** | **UNCHANGED** | Prior verified `NEEDS FURTHER TESTING` preserved in `LADDER_LAB_EVALUATION.json` |
| Cursor Index complete-turn engine | **PASS** | `cursor-index-fullturn-engine.cjs` — same D1/D2/D3, N=30, move-cap 120, no eval noise |
| Cursor Index G1–G9 — **4, 6** | **PASS (evaluator)** | `evaluate-cursor-index-lab.cjs` — INDEX_4 **REJECT** (G2); INDEX_6 **NEEDS FURTHER TESTING** |
| Verdict-path audit | **PASS** | `LAB_VERDICT_PATH_AUDIT.json` — `CODE_PATHS_OK` |
| 5-bead / 8-bead fairness investigation | **PASS** | Trust audits confirm structural G2 failures (not harness bugs) |
| Cursor Index playable smoke | **PASS (Technical)** | `verify-cursor-index.cjs` |
| Human playtest | **NOT APPLICABLE** | Gameplay / UX Review — out of Lab scope |

**Fix applied (2026-08-14):** G2 fairness failure now maps to **REJECT** via `g2_fairness_fail` reject trigger — no softened NEEDS FURTHER TESTING label for audited fairness failures.

---

## One-page ladder verdict (updated targets only)

| Board | Authoritative `selectionVerdict` | Failed gates | Plain-language summary |
|-------|----------------------------------|--------------|------------------------|
| **16** | **REFERENCE** | — | Unchanged calibration anchor |
| **10** | **NEEDS FURTHER TESTING** | none | Unchanged — all G1–G9 pass |
| **7** | **NEEDS FURTHER TESTING** | none | Unchanged — all G1–G9 pass |
| **6** (3×5) | **NEEDS FURTHER TESTING** | none | Unchanged — all G1–G9 pass |
| **8** | **REJECT** | **G2** | Second-mover wins ~73–77% on D2 swap (N=60). Investigated — structural, not Lab bug. |
| **5** | **REJECT** | **G2** | D1 P2 wins **97.8%** (FPA −47.8 pp); swap 100% second-mover at D1. Investigated — structural. |
| **Cursor Index 4** | **REJECT** | **G2** | Complete-turn protocol; D1 P2 **85.6%**; swap FPA gap > ±35 pp. |
| **Cursor Index 6** | **NEEDS FURTHER TESTING** | none | All G1–G9 pass under certified protocol. **Remaining:** human playtest sign-off. |

**No board receives KEEP** — KEEP requires human playtest per methodology.

---

## Methodology confidence (Sholo ladder)

**Conclusion: METHODOLOGY CONSISTENT for Sholo family**

| Area | Evidence |
|------|----------|
| Single verdict path | `evaluate-ladder-lab.cjs` only; compare scripts metrics-only; audit clean |
| Canonical N=30 | All compare JSON + G9 pass |
| Complete-turn search | Candidate engines share Sholo full-turn semantics; trust gate 25/25 |
| Reproducibility | Identical D2 fingerprints (seed 101, N=30) on every candidate |
| Fairness swap | Evaluator runs 60-game D2 swap batches per candidate |
| Anomaly investigation | 5-bead and 8-bead G2 failures confirmed via dedicated fairness trust audits |

---

## 16-bead — REFERENCE

| Depth | avgCaptures | avgLength | elimination | move-cap draw |
|-------|-------------|-----------|-------------|---------------|
| D1 | 27.6 | 54.2 | 100% | 0% |
| D2 | 11.7 | 119.9 | 0% | 98.9% |
| D3 | 24.1 | 119.2 | 4.4% | 95.6% |

---

## 10-bead — NEEDS FURTHER TESTING

**Sources:** `SHOLO_10_VS_16_LAB_COMPARE.json` (N=30, 540 games), `LADDER_LAB_EVALUATION.json`  
**Geometry:** Verified — N=25, not silently 16-bead.

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 16.6 | 24.9 | 100% | 0% | 41% / 59% |
| D2 | 12.0 | 117.4 | 8.9% | 91.1% | 8.9% / 0% |
| D3 | 16.3 | 105.7 | 22.2% | 77.8% | 0% / 22.2% |

All G1–G9 **PASS**. D2 capture rate matches 16-bead reference spirit (~12/game). **Why not KEEP:** human playtest not done.

---

## 8-bead — REJECT

**Sources:** `SHOLO_8_VS_16_LAB_COMPARE.json` (N=30), `LADDER_LAB_EVALUATION.json`, fairness audit.

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 12.8 | 20.7 | 100% | 0% | 31% / 69% |
| D2 | 9.1 | 69.6 | 67.8% | 32.2% | **0% / 67.8%** |
| D3 | 12.9 | 96.0 | 40.0% | 60.0% | 1% / 39% |

**G2 investigation:** Parity confirmed; symmetric Lab AI; D2 swap (N=60) — second-mover wins **73% / 77%** depending on who moves first. Structural turn-order bias, not harness error.

**Authoritative verdict:** **REJECT** (`g2_fairness_fail`). Drop from ladder until geometry redesigned and re-tested.

---

## 7-bead — NEEDS FURTHER TESTING

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 11.8 | 18.2 | 100% | 0% | 20% / 80% |
| D2 | 8.6 | 113.3 | 12.2% | 87.8% | 3% / 9% |
| D3 | 11.2 | 100.1 | 42.2% | 57.8% | 3% / 39% |

All G1–G9 **PASS**. D1 P2 skew −30 pp (within ±35 pp gate). Human playtest needed.

---

## 6-bead (Sholo 3×5) — NEEDS FURTHER TESTING

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 9.2 | 17.0 | 100% | 0% | 59% / 41% |
| D2 | 6.0 | 110.9 | 34.4% | 65.6% | 20% / 14% |
| D3 | 9.2 | 107.1 | 26.7% | 73.3% | 1% / 26% |

All G1–G9 **PASS**. D2 captures below 16-bead reference (~12) but above alive floor. Swap capture symmetry within ±3. Human playtest needed.

---

## 5-bead — REJECT

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 5.3 | 8.7 | 100% | 0% | **2% / 98%** |
| D2 | 5.2 | 111.3 | 21.1% | 78.9% | 14% / 7% |
| D3 | 7.1 | 109.5 | 26.7% | 73.3% | 12% / 14% |

**G2 investigation:** D1 P2 wins **88/90** (FPA **−47.8 pp**); D1 swap audit — second-mover wins **100%**. Parity confirmed; not a Lab bug.

**Authoritative verdict:** **REJECT** (`g2_fairness_fail`). Drop until geometry/facing redesigned.

---

## Cursor Index 4 (4×4, 4 vs 4) — REJECT

**Sources:** `cursor-index-fullturn-engine.cjs`, `CURSOR_INDEX_4_LAB_EVAL.json`, certified protocol N=30 / move-cap 120.

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 4.2 | 9.5 | 100% | 0% | 14% / **86%** |
| D2 | 3.8 | 111.5 | 8.9% | 91.1% | **0% / 8.9%** |
| D3 | 5.3 | 99.3 | 26.7% | 73.3% | 21% / 6% |

**Gates:** G1/G3–G9 pass · **G2 FAIL** → **REJECT** (`g2_fairness_fail`). D1 FPA −35.6 pp; swap FPA gap exceeds ±35 pp rule.

---

## Cursor Index 6 (4×4, 6 vs 6) — NEEDS FURTHER TESTING

**Sources:** `cursor-index-fullturn-engine.cjs`, `CURSOR_INDEX_6_LAB_EVAL.json`.

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 8.7 | 11.0 | 100% | 0% | 33% / 67% |
| D2 | 6.8 | 111.9 | 14.4% | 85.6% | 7% / 8% |
| D3 | 8.5 | 45.5 | 95.6% | 2.2% | 96% / 0% |

All G1–G9 **PASS** at primary depth (D2 avgCaptures 6.8, swap capture symmetry within ±3).

**Remaining test before KEEP:** human playtest sign-off (Gameplay / UX Review) — Lab cannot satisfy this alone.

---

## Comparative notes

**D2 capture activity vs 16-bead reference (~11.7):** 10-bead 12.0 ✓ · 8-bead 9.1 · 7-bead 8.6 · 6-bead 6.0 · 5-bead 5.2.

**Fairness:** 5-bead, 8-bead, and Cursor Index 4 **REJECT** on G2 (investigated). Cursor Index 6 passes all gates — human playtest pending.

---

## Who continues to human / product testing?

### Sholo Guti ladder

| Continue? | Boards |
|-----------|--------|
| **Yes — schedule human playtest** | **10-bead**, **7-bead**, **Sholo 6-bead (3×5)** |
| **No — Lab REJECT (G2)** | **8-bead**, **5-bead** |
| **Reference only** | **16-bead** |

### Cursor Index 4×4

| Continue? | Boards |
|-----------|--------|
| **Yes — schedule human playtest** | **Cursor Index 6** (all Lab gates pass) |
| **No — Lab REJECT (G2)** | **Cursor Index 4** |

---

## Technical Verification vs Gameplay / UX Review

| | Technical Verification (Lab) | Gameplay / UX Review (human) |
|--|---------------------------|------------------------------|
| **Sholo 10, 7, 6** | NEEDS FURTHER TESTING — **remaining: human playtest** | Not started |
| **Sholo 8, 5** | **REJECT** (G2) | N/A until redesign |
| **Cursor Index 6** | NEEDS FURTHER TESTING — **remaining: human playtest** | Not started |
| **Cursor Index 4** | **REJECT** (G2) | N/A until redesign |
| **16-bead** | REFERENCE | N/A |

---

## Artifacts (2026-08-14)

| File | Content |
|------|---------|
| `LADDER_LAB_EVALUATION.json` | Fresh Sholo G1–G9 authoritative verdicts |
| `SHOLO_*_VS_16_LAB_COMPARE.json` | Fresh N=30 compare batches (5/6/7/8/10) |
| `LAB_VERDICT_PATH_AUDIT.json` | Verdict-path + N consistency audit |
| `SHOLO_5_BEAD_FAIRNESS_TRUST.json` | 5-bead G2 investigation |
| `SHOLO_8_BEAD_FAIRNESS_TRUST.json` | 8-bead G2 investigation |
| `SHOLO_*_BEAD_FEATURE_SMOKE.json` | Playable smoke (5/6/7/8/10) |
| `LAB_16_BEAD_REFERENCE_VALIDATION.json` | Certified 16-bead anchor |
| `cursor-index-fullturn-engine.cjs` | Complete-turn headless engine (4/6 bead, 4×4) |
| `CURSOR_INDEX_LAB_EVALUATION.json` | Fresh Cursor Index G1–G9 (certified protocol) |
| `CURSOR_INDEX_4_LAB_EVAL.json` / `CURSOR_INDEX_6_LAB_EVAL.json` | Per-board eval artifacts |

---

*SmartBeads Lab — target board update 2026-08-14. G2 fix + Cursor Index complete-turn engine. No rules, geometry, AI strength, thresholds, or 16-bead reference modified.*
