# Web Report: All Board Families (Sholo Ladder + Cursor Index 4×4)

**Date:** 2026-08-14  
**Location:** SmartBeads root — Web JSON/engines in `prototype/board4/`  
**Methodology:** `LAB_TERMINOLOGY_05P.md` (G1–G9 gates, no new thresholds)  
**Reference anchor:** 16-bead Sholo — **FULLY CERTIFIED** — `WEB_REPORT_16_BEAD_05P.md`, `LAB_16_BEAD_REFERENCE_VALIDATION.json`  
**Authoritative evaluators:**
- Sholo ladder: `evaluate-ladder-lab.cjs` → `LADDER_LAB_EVALUATION.json`
- Cursor Index 4×4: `evaluate-cursor-index-lab.cjs` → `CURSOR_INDEX_LAB_EVALUATION.json` (same certified protocol via `cursor-index-fullturn-engine.cjs`)

**Sholo protocol (canonical):** D1 / D2 / D3 · seeds 101, 202, 303 · **N=30** per seed · move-cap **120** · P1 first · 270 games per board · 540 games per compare run (`sholo-lab-protocol.cjs`).

**Playable vs Web:** Web D2 ≠ browser Level 2 — see `LAB_TERMINOLOGY_05P.md`.

**Result reporting:** Every fairness result below follows the Result Reporting Rule in `VISION/CURSOR_PROMPT_01.md` — who moved first, who won more (first mover or second mover), exact win percentages for both sides, depth, and failed/pending gate with plain-language reason. No verdict changes in this update.

---

## Verification status (2026-08-14 — 4-bead & 5-bead 3×5 re-run)

| Check | Status | Evidence |
|-------|--------|----------|
| 16-bead reference instrument | **CERTIFIED** | Unchanged — `instrumentValid=true`, N=30 |
| Ladder G1–G9 — **4-bead, 5-bead (3×5 sketch)** | **PASS (evaluator)** | `evaluate-ladder-lab.cjs --only 4,5` → both **REJECT** (G2) |
| Ladder G1–G9 — boards **10, 7, 6, 8** | **UNCHANGED** | Prior verdicts preserved in `LADDER_LAB_EVALUATION.json` |
| **3-bead (3×5 sketch)** | **NOT TESTED** | Dropped from ladder — not evaluated |
| Cursor Index G1–G9 — **4, 6** | **UNCHANGED** | INDEX_4 **REJECT**; INDEX_6 **NEEDS FURTHER TESTING** |
| Compare batches | **PASS** | `SHOLO_4_VS_16_LAB_COMPARE.json`, `SHOLO_5_VS_16_LAB_COMPARE.json` (3×5 geometry) |
| Human playtest | **NOT APPLICABLE** | Gameplay / UX Review — out of Web scope |

---

## One-page ladder verdict (updated targets only)

| Board | Authoritative `selectionVerdict` | Failed gates | Plain-language summary |
|-------|----------------------------------|--------------|------------------------|
| **16** | **REFERENCE** | — | Unchanged calibration anchor |
| **10** | **NEEDS FURTHER TESTING** | none | Unchanged — all G1–G9 pass |
| **7** | **NEEDS FURTHER TESTING** | none | Unchanged — all G1–G9 pass |
| **6** (3×5) | **NEEDS FURTHER TESTING** | none | Unchanged — all G1–G9 pass |
| **5** (3×5 sketch) | **REJECT** | **G2** | **D1**, P1 opens: second mover wins **100%** (P1 **0%** / P2 **100%**). |
| **4** (3×5 sketch) | **REJECT** | **G2** | **D1**, P1 opens: second mover wins **100%** (P1 **0%** / P2 **100%**). |
| **8** | **REJECT** | **G2** | **D2**, P1 opens: second mover wins **67.8%** (P1 **0%** / P2 **67.8%**); D2 capture ratio also fails G2. Swap: second mover wins **100%** of games with a winner either way. |
| **Cursor Index 4** | **REJECT** | **G2** | **D1**, P1 opens: second mover wins **85.6%** (P1 **14.4%** / P2 **85.6%**). Exceeds G2 ±35 pp limit → `g2_fairness_fail`. |
| **Cursor Index 6** | **NEEDS FURTHER TESTING** | none | All G1–G9 pass. **D3** first mover P1 wins **95.6%** (P2 **0%**) — not a G2 input. **Remaining:** human playtest sign-off. |

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

**Fairness (Result Reporting Rule):** Certified batch — P1 (Red) opens every game unless noted.

| Depth | Who opens | First mover wins | Second mover wins | Who wins more |
|-------|-----------|------------------|-------------------|---------------|
| **D2** (primary) | P1 | **0%** (0/90) | **67.8%** (61/90) | **Second mover** |
| **D2 swap** | P1 | **0%** (0/38 among games with a winner) | **100%** (38/38 among games with a winner) | **Second mover** |
| **D2 swap** | P2 | **0%** (0/47 among games with a winner) | **100%** (47/47 among games with a winner) | **Second mover** |

**Failed gate:** **G2** (No meaningful side bias) → **REJECT** (`g2_fairness_fail`). At **D2** with P1 opening, the second mover wins **67.8%** of all games (P1 **0%**). G2 also fails because **D2** average captures are skewed beyond the 2× limit (P2 **7.6**/game vs P1 **1.5**/game at avg length **69.6**). Swap batches confirm second-mover dominance regardless of who opens. Parity confirmed; symmetric Web AI — structural, not harness error.

**Authoritative verdict:** **REJECT**. Drop from ladder until geometry redesigned and re-tested.

---

## 7-bead — NEEDS FURTHER TESTING

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 11.8 | 18.2 | 100% | 0% | 20% / 80% |
| D2 | 8.6 | 113.3 | 12.2% | 87.8% | 3% / 9% |
| D3 | 11.2 | 100.1 | 42.2% | 57.8% | 3% / 39% |

All G1–G9 **PASS**. **D1**, P1 opens: first mover **20%**, second mover **80%** — second mover wins more, but within G2 limit. **Pending gate:** none (Web). **Remaining test:** human playtest sign-off.

---

## 6-bead (Sholo 3×5) — NEEDS FURTHER TESTING

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 9.2 | 17.0 | 100% | 0% | 59% / 41% |
| D2 | 6.0 | 110.9 | 34.4% | 65.6% | 20% / 14% |
| D3 | 9.2 | 107.1 | 26.7% | 73.3% | 1% / 26% |

All G1–G9 **PASS**. D2 captures below 16-bead reference (~12) but above alive floor. Swap capture symmetry within ±3. Human playtest needed.

---

## 4-bead (Sholo 3×5 sketch) — REJECT

**Sources:** `SHOLO_4_VS_16_LAB_COMPARE.json`, `LADDER_LAB_EVALUATION.json`  
**Geometry:** 3×5 lattice — outer columns rows 1–2 (4 vs 4). Same family as 6-bead; derived from sketch.

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 5.0 | 8.0 | 100% | 0% | **0% / 100%** |
| D2 | 3.4 | 115.6 | 6.7% | 93.3% | 3.3% / 3.3% |
| D3 | 5.1 | 105.8 | 28.9% | 71.1% | 8.9% / 20% |

**Fairness (Result Reporting Rule):** Certified batch — P1 (Ivory) opens every game unless noted.

| Depth | Who opens | First mover wins | Second mover wins | Who wins more |
|-------|-----------|------------------|-------------------|---------------|
| **D1** | P1 | **0%** (0/90) | **100%** (90/90) | **Second mover** |
| **D2** (primary) | P1 | **3.3%** (3/90) | **3.3%** (3/90) | Even among all games |
| **D2 swap** | P1 | **33.3%** among games with a winner | **66.7%** among games with a winner | Second mover (6 games total) |
| **D2 swap** | P2 | **62.5%** among games with a winner | **37.5%** among games with a winner | First mover (8 games total) |

**Failed gate:** **G2** (No meaningful side bias) → **REJECT** (`g2_fairness_fail`).

**Depth responsible:** **D1** (greedy). With P1 opening, the second mover wins **100%** of all 90 games — beyond the G2 ±35 pp limit. D2 and swap batches are near even but do not override the D1 failure.

**Authoritative verdict:** **REJECT**. Drop until geometry redesigned.

---

## 5-bead (Sholo 3×5 sketch) — REJECT

**Sources:** `SHOLO_5_VS_16_LAB_COMPARE.json`, `LADDER_LAB_EVALUATION.json`  
**Geometry:** 3×5 lattice — full row 1 + outer row 2 (5 vs 5). **Replaces prior 5×3 board** (`SHOLO_GUTI_5_BEAD_WITH_FEATURE.html` now uses this geometry).

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 7.0 | 12.0 | 100% | 0% | **0% / 100%** |
| D2 | 4.9 | 113.1 | 25.6% | 74.4% | 16.7% / 8.9% |
| D3 | 7.0 | 98.6 | 37.8% | 62.2% | 24.4% / 13.3% |

**Fairness (Result Reporting Rule):** Certified batch — P1 (Ivory) opens every game unless noted.

| Depth | Who opens | First mover wins | Second mover wins | Who wins more |
|-------|-----------|------------------|-------------------|---------------|
| **D1** | P1 | **0%** (0/90) | **100%** (90/90) | **Second mover** |
| **D2** (primary) | P1 | **16.7%** (15/90) | **8.9%** (8/90) | **First mover** among all games; among 23 games with a winner: P1 **65.2%**, P2 **34.8%** |
| **D2 swap** | P1 | **66.7%** among games with a winner | **33.3%** among games with a winner | First mover (9 games total) |
| **D2 swap** | P2 | **27.3%** among games with a winner | **72.7%** among games with a winner | Second mover (11 games total) |

**Failed gate:** **G2** (No meaningful side bias) → **REJECT** (`g2_fairness_fail`).

**Depth responsible:** **D1** (greedy). With P1 opening, the second mover wins **100%** of all 90 games. D2 primary depth favours the first mover, but G2 still fails on the D1 batch.

**Authoritative verdict:** **REJECT**. Drop until geometry redesigned.

**Note:** Prior Web **REJECT** on old **5×3** geometry is superseded by this run — same verdict, new board family member on 3×5 sketch lattice.

---

## Cursor Index 4 (4×4, 4 vs 4) — REJECT

**Sources:** `cursor-index-fullturn-engine.cjs`, `CURSOR_INDEX_4_LAB_EVAL.json`, certified protocol N=30 / move-cap 120.

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 4.2 | 9.5 | 100% | 0% | 14.4% / **85.6%** |
| D2 | 3.8 | 111.5 | 8.9% | 91.1% | **0% / 8.9%** |
| D3 | 5.3 | 99.3 | 26.7% | 73.3% | 21.1% / 5.6% |

**Fairness (Result Reporting Rule):** Certified batch — P1 (Red) opens every game unless noted.

| Depth | Who opens | First mover wins | Second mover wins | Who wins more |
|-------|-----------|------------------|-------------------|---------------|
| **D1** | P1 | **14.4%** (13/90) | **85.6%** (77/90) | **Second mover** |
| **D2** | P1 | **0%** (0/90 overall; 0/8 among games with a winner) | **8.9%** (8/90 overall; 8/8 among games with a winner) | **Second mover** |
| **D2 swap** | P1 | **0%** (0/17 among games with a winner) | **100%** (17/17 among games with a winner) | **Second mover** |
| **D2 swap** | P2 | **14.3%** (1/7 among games with a winner) | **85.7%** (6/7 among games with a winner) | **Second mover** |

**Failed gate:** **G2** (No meaningful side bias) → **REJECT** (`g2_fairness_fail`).

**Depth responsible:** **D1** (greedy). With P1 opening, the second mover wins **85.6%** vs the first mover **14.4%** — the first-mover/second-mover gap exceeds the G2 ±35 percentage-point limit (90 decisive games, no draws). D2 swap batches show the same second-mover advantage pattern but did not alone exceed the swap FPA gap rule; **D1 is the condition that failed G2**.

G1 and G3–G9 pass. Complete-turn protocol; parity confirmed.

---

## Cursor Index 6 (4×4, 6 vs 6) — NEEDS FURTHER TESTING

**Sources:** `cursor-index-fullturn-engine.cjs`, `CURSOR_INDEX_6_LAB_EVAL.json`.

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 8.7 | 11.0 | 100% | 0% | 33.3% / 66.7% |
| D2 | 6.8 | 111.9 | 14.4% | 85.6% | 6.7% / 7.8% |
| D3 | 8.5 | 45.5 | 95.6% | 2.2% | **95.6% / 0%** |

**Fairness (Result Reporting Rule):** Certified batch — P1 (Red) opens every game unless noted.

| Depth | Who opens | First mover wins | Second mover wins | Who wins more |
|-------|-----------|------------------|-------------------|---------------|
| **D1** | P1 | **33.3%** (30/90) | **66.7%** (60/90) | **Second mover** (within G2 limit) |
| **D2** (primary Web Depth) | P1 | **6.7%** (6/90) | **7.8%** (7/90) | Near even among all games; among 13 games with a winner: P1 **46.2%**, P2 **53.8%** |
| **D2 swap** | P1 | **45.5%** among games with a winner | **54.5%** among games with a winner | Near even |
| **D2 swap** | P2 | **27.3%** among games with a winner | **72.7%** among games with a winner | Second mover wins more (gap **18.2 pp** — within G2 ±35 pp swap rule) |
| **D3** | P1 | **95.6%** (86/90) | **0%** (0/90) | **First mover** |

**Why G2 does not trigger on D3:** G2 fairness inputs are **D1 greedy batch**, **D2 primary-depth batch**, and **D2 first-player swap batches** only — plus capture symmetry on swap. **D3 is not a G2 input.** At D1 and D2 (and D2 swap), win rates stay within G2 limits; swap average captures differ by less than 3 per game.

**Failed gate:** none — all G1–G9 **PASS**.

**Remaining test before KEEP:** human playtest sign-off (Gameplay / UX Review). Web cannot grant KEEP alone. The **D3** first-mover **95.6%** win rate (P1 opens, P2 **0%**) is recorded for human review; it did not fail any Web gate.

---

## Comparative notes

**D2 capture activity vs 16-bead reference (~11.7):** 10-bead 12.0 ✓ · 8-bead 9.1 · 7-bead 8.6 · 6-bead 6.0 · **5-bead (3×5) 4.9** · **4-bead (3×5) 3.4**.

**Fairness:** **4-bead** and **5-bead (3×5 sketch)** both **REJECT** on **G2** at **D1** (second mover **100%** when P1 opens). **8-bead** **REJECT** at **D2**. Cursor Index 4 **REJECT** at **D1**. **6-bead** and Cursor Index 6 pass all gates — human playtest pending. **3-bead sketch not tested.**

---

## Who continues to human / product testing?

### Sholo Guti ladder

| Continue? | Boards |
|-----------|--------|
| **Yes — schedule human playtest** | **10-bead**, **7-bead**, **Sholo 6-bead (3×5)** |
| **No — Web REJECT (G2)** | **8-bead**, **5-bead (3×5)**, **4-bead (3×5)** |
| **Reference only** | **16-bead** |

### Cursor Index 4×4

| Continue? | Boards |
|-----------|--------|
| **Yes — schedule human playtest** | **Cursor Index 6** (all Web gates pass) |
| **No — Web REJECT (G2)** | **Cursor Index 4** |

---

## Technical Verification vs Gameplay / UX Review

| | Technical Verification (Web) | Gameplay / UX Review (human) |
|--|---------------------------|------------------------------|
| **Sholo 10, 7, 6** | NEEDS FURTHER TESTING — **remaining: human playtest** | Not started |
| **Sholo 8, 5, 4** | **REJECT** (G2) | N/A until redesign |
| **Cursor Index 6** | NEEDS FURTHER TESTING — **remaining: human playtest** | Not started |
| **Cursor Index 4** | **REJECT** (G2) | N/A until redesign |
| **16-bead** | REFERENCE | N/A |

---

## Artifacts (2026-08-14)

| File | Content |
|------|---------|
| `LADDER_LAB_EVALUATION.json` | Fresh Sholo G1–G9 authoritative verdicts |
| `SHOLO_*_VS_16_LAB_COMPARE.json` | Fresh N=30 compare batches (4/5/6/7/8/10) |
| `LAB_VERDICT_PATH_AUDIT.json` | Verdict-path + N consistency audit |
| `SHOLO_5_BEAD_FAIRNESS_TRUST.json` | 5-bead G2 investigation |
| `SHOLO_8_BEAD_FAIRNESS_TRUST.json` | 8-bead G2 investigation |
| `SHOLO_*_BEAD_FEATURE_SMOKE.json` | Playable smoke (5/6/7/8/10) |
| `LAB_16_BEAD_REFERENCE_VALIDATION.json` | Certified 16-bead anchor |
| `cursor-index-fullturn-engine.cjs` | Complete-turn headless engine (4/6 bead, 4×4) |
| `CURSOR_INDEX_LAB_EVALUATION.json` | Fresh Cursor Index G1–G9 (certified protocol) |
| `CURSOR_INDEX_4_LAB_EVAL.json` / `CURSOR_INDEX_6_LAB_EVAL.json` | Per-board eval artifacts |

---

*SmartBeads Web — 4-bead & 5-bead 3×5 sketch evaluation 2026-08-14. `evaluate-ladder-lab.cjs --only 4,5`. 3-bead sketch not tested.*
