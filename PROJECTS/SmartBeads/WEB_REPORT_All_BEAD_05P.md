# Web Report: All Board Families (Sholo Ladder + Cursor Index 4×4)

**Date:** 2026-08-15 (4×4 selection finalized) · comparison run same day · prior sections 2026-08-14  
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

## Verification status (2026-08-15 — 4×4 6-bead vs 6-bead-b)

| Check | Status | Evidence |
|-------|--------|----------|
| 16-bead reference instrument | **CERTIFIED** | Unchanged — `instrumentValid=true`, N=30 |
| Ladder G1–G9 — **4-bead, 5-bead (3×5 sketch)** | **PASS (evaluator)** | `evaluate-ladder-lab.cjs --only 4,5` → both **REJECT** (G2) |
| Ladder G1–G9 — boards **10, 7, 6, 8** | **UNCHANGED** | Prior verdicts in `LADDER_LAB_EVALUATION.json` |
| **3-bead (3×5 sketch)** | **NOT TESTED** | Dropped from ladder — not evaluated |
| Cursor Index G1–G9 — **6, 6-b** | **PASS (evaluator)** | `evaluate-cursor-index-lab.cjs` 2026-08-15 → both **NEEDS FURTHER TESTING** (G1–G9 pass) |
| **4×4 playable selection** | **FINALIZED** | **Cross variant kept** → `SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html`; rays removed; `_b_` filename retired |
| Cursor Index playable smoke | **PASS** | `verify-cursor-index.cjs` → active 4×4 feature shell |
| Cursor Index G1–G9 — **4** | **UNCHANGED** | INDEX_4 **REJECT** (G2) |
| Compare batches (3×5) | **PASS** | `SHOLO_4_VS_16_LAB_COMPARE.json`, `SHOLO_5_VS_16_LAB_COMPARE.json` |
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
| **Cursor Index 6** (`SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE`) | **NEEDS FURTHER TESTING** | none | **Active playable (2026-08-15):** full box crosses. Web verdict from INDEX_6_B audit. Rays variant removed. |
| **Cursor Index 6 (rays — audit)** | **NEEDS FURTHER TESTING** | none | Historical INDEX_6 run only — `CURSOR_INDEX_6_LAB_EVAL.json`. Playable removed. |
| **Cursor Index 6-b (cross — audit)** | **NEEDS FURTHER TESTING** | none | Historical INDEX_6_B run — `CURSOR_INDEX_6_B_LAB_EVAL.json`. Merged into active filename. |

**No board receives Web KEEP from Lab alone** — human playtest sign-off required.

**Human KEEP (2026-08-15):** `SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html`, `SHOLO_GUTI_10_BEAD_WITH_FEATURE.html`, `SHOLO_GUTI_7_BEAD_WITH_FEATURE.html`, `SHOLO_GUTI_6_BEAD_WITH_FEATURE.html` — registered in `FEATURE_TEST_KEEP_REGISTRY.json`. Web G1–G9 verdicts below unchanged.

**Discovery D1–D5 (2026-08-17):** `evaluate-d1-d5-lab.cjs` → `D1_D5_LAB_EVALUATION.json`. **D1/D3 REJECT (G2)** · **D2/D4/D5 NEEDS FURTHER TESTING**.

**Final round F1b–F5b (2026-08-17):** `evaluate-final-round-lab.cjs` → `FINAL_ROUND_LAB_EVALUATION.json`. Skipped C5/F3a/F5a/F4a. **F1b/F3b/F4b/F5b REJECT (G2)** · **F1a/F2a/F2b NEEDS FURTHER TESTING**.

**Combined non-REJECT ranking:** `ALL_NON_REJECT_LAB_RANKING.json`.

**Feature Test (2026-08-15):** **COMPLETE** — per-board centre study `FEATURE_TEST_CENTRE_RULE_EVALUATION.json`. Report **`WEB_FEATURE_TEST_05P.md`**.

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

All G1–G9 **PASS**. **D1**, P1 opens: first mover **20%**, second mover **80%** (FPA **−30 pp**) — second mover wins more, **inside** G2’s D1 bound (`|FPA| > 35` fails; 4/5-bead REJECT was 0/100). **D2** (primary) captures 4.12 vs 4.47 (ratio 1.08×). Human **KEEP** 2026-08-15. Review 2026-08-17: **KEEP** — do not recheck Lab, do not change geometry.

---

## 6-bead (Sholo 3×5) — NEEDS FURTHER TESTING

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 9.2 | 17.0 | 100% | 0% | 59% / 41% |
| D2 | 6.0 | 110.9 | 34.4% | 65.6% | 20% / 14% |
| D3 | 9.2 | 107.1 | 26.7% | 73.3% | 1% / 26% |

All G1–G9 **PASS**. D2 captures below 16-bead reference (~12) but above alive floor. Swap capture symmetry within ±3. Human **KEEP** 2026-08-15.

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
**Geometry:** 3×5 lattice — full row 1 + outer row 2 (5 vs 5). Playable removed (Web REJECT G2).

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

## Cursor Index 6 vs 6-b (4×4, 6 vs 6) — side-by-side Web run (2026-08-15)

**Evaluator:** `evaluate-cursor-index-lab.cjs` · **Engine:** `cursor-index-fullturn-engine.cjs` (geometry: `rays` vs `fullBoxCross`) · **Protocol:** D1/D2/D3 · seeds 101/202/303 · N=30/seed · move-cap 120 · P1 opens.

| Playable | Geometry | Web verdict | Failed gates |
|----------|----------|-------------|--------------|
| `SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html` | Long diagonal rays | **NEEDS FURTHER TESTING** | none (G1–G9 pass) |
| `SHOLO_GUTI_6_BEAD_b_4x4_WITH_FEATURE.html` | Full box crosses (X in every 2×2 cell) | **NEEDS FURTHER TESTING** | none (G1–G9 pass) |

**Neither is Web REJECT.** **Neither receives KEEP** — KEEP requires human playtest (Gameplay / UX Review).

### Lab metrics (primary depth D2)

| Metric | 6 (rays) | 6-b (full crosses) | Notes |
|--------|----------|-------------------|-------|
| D2 avgCaptures | **6.8** | 6.6 | Similar contest at primary depth |
| D2 avgLength | 111.9 | 116.0 | Both hit move-cap often (~86%) |
| D2 elimination | 14.4% | 14.4% | Same |
| D2 move-cap draw | 85.6% | 85.6% | Same |
| D2 P1 / P2 win (all games) | 6.7% / 7.8% | 7.8% / 6.7% | Near even |
| D2 among games with winner | P1 **46.2%** / P2 **53.8%** | P1 **53.8%** / P2 **46.2%** | Both within G2 |

### D1 greedy fairness (G2 input)

| Who opens | 6 (rays) | 6-b (full crosses) |
|-----------|----------|-------------------|
| P1 | First mover **33.3%** · second mover **66.7%** | First mover **43.3%** · second mover **56.7%** |
| D1 avgCaptures | 8.7 | **9.8** |

**6-b is more balanced at D1** (smaller second-mover edge) and shows **higher capture activity**.

### D3 longer horizon (not a G2 input — human review only)

| Who opens | 6 (rays) | 6-b (full crosses) |
|-----------|----------|-------------------|
| P1 | P1 **95.6%** · P2 **0%** | P1 **68.9%** · P2 **0%** |
| D3 elimination | 95.6% | 68.9% |
| D3 move-cap draw | 2.2% | 31.1% |

**6-b has less extreme D3 first-mover skew** (still P2 **0%** at D3 — flag for human review on both).

### Recommendation (Web → product) — **selection finalized 2026-08-15**

| Action | Board |
|--------|-------|
| **Active playable** | **`SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html`** (full box crosses — was 6-b) |
| **Removed** | Rays variant (former file at same path); `SHOLO_GUTI_6_BEAD_b_4x4_WITH_FEATURE.html` |
| **Audit preserved** | `CURSOR_INDEX_6_LAB_EVAL.json` (rays), `CURSOR_INDEX_6_B_LAB_EVAL.json` (cross) — metrics unchanged |
| **Web REJECT** | Neither geometry variant |
| **Human playtest next** | Active 4×4 file above |

---

## Cursor Index 6 (4×4, 6 vs 6) — active playable detail

**File:** `SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html` · **Geometry:** full box crosses · **Web verdict:** **NEEDS FURTHER TESTING** (from INDEX_6_B audit, G1–G9 pass).

**Sources:** `cursor-index-fullturn-engine.cjs` (geometry `fullBoxCross`), `CURSOR_INDEX_6_B_LAB_EVAL.json`.

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

**Remaining test before KEEP:** human playtest sign-off on the active 4×4 file.

---

## Cursor Index 6 (rays — audit only)

**Sources:** `CURSOR_INDEX_6_LAB_EVAL.json` · geometry `rays` · playable **removed** 2026-08-15.

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 9.8 | 13.2 | 100% | 0% | 43.3% / 56.7% |
| D2 | 6.6 | 116.0 | 14.4% | 85.6% | 7.8% / 6.7% |
| D3 | 8.8 | 80.0 | 68.9% | 31.1% | **68.9% / 0%** |

**Fairness (D2 primary):** P1 opens — among 13 games with a winner: P1 **53.8%**, P2 **46.2%**. D2 swap batches within G2 limits.

**Failed gate:** none — all G1–G9 **PASS**. Parity confirmed (playable ↔ lab engine).

---

## Comparative notes

**D2 capture activity vs 16-bead reference (~11.7):** 10-bead 12.0 ✓ · 8-bead 9.1 · 7-bead 8.6 · 6-bead 6.0 · **5-bead (3×5) 4.9** · **4-bead (3×5) 3.4**.

**Fairness:** **4-bead** and **5-bead (3×5 sketch)** both **REJECT** on **G2** at **D1**. **8-bead** **REJECT** at **D2**. Cursor Index 4 **REJECT** at **D1**. **Active 4×4 6-bead** (full box cross) human **KEEP**. **7-bead D1 20/80** is inside G2, not a retest trigger.

---

## Who continues to human / product testing?

### Sholo Guti ladder

| Continue? | Boards |
|-----------|--------|
| **Yes — human KEEP (2026-08-15)** | **10-bead**, **7-bead**, **Sholo 6-bead (3×5)**, **6-bead 4×4 cross** |
| **Yes — Lab pass, human playtest remaining** | **C3** · **F2b** (best final-round) · **D2** · **D4** · **F1a** · **F2a** · **D5** (lowest priority) |
| **No — Web REJECT (G2)** | **8-bead 4×5**, **5-bead (3×5 sketch)**, **4-bead (3×5)** — playables removed |
| **No — discovery REJECT (G2)** | **C1**, **C2**, **C4**, **Baro Guti 12**, **D1**, **D3**, **F1b**, **F3b**, **F4b**, **F5b** |
| **Not built (skipped)** | **C5**, **F3a**, **F5a**, **F4a** |
| **Reference only** | **16-bead** |

### Cursor Index 4×4

| Continue? | Boards |
|-----------|--------|
| **Yes — human KEEP (2026-08-15)** | **`SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE`** (full box crosses — selected) |
| **Removed — audit only** | Rays variant; former `_b_` filename |
| **No — Web REJECT (G2)** | **Cursor Index 4** — playable removed |

---

## Technical Verification vs Gameplay / UX Review

| | Technical Verification (Web) | Gameplay / UX Review (human) |
|--|---------------------------|------------------------------|
| **Sholo 10, 7, 6** | NEEDS FURTHER TESTING (G1–G9 pass) | **KEEP** 2026-08-15 |
| **Sholo 8, 5, 4** | **REJECT** (G2) | N/A until redesign |
| **Cursor Index 6 (4×4)** | NEEDS FURTHER TESTING (G1–G9 pass) | **KEEP** 2026-08-15 |
| **Cursor Index 4** | **REJECT** (G2) | N/A until redesign |
| **C3 8-bead 5×5** | G1–G9 **PASS** (`C3_LAB_COMPLETE.json`) | **Remaining** (rank #10 NFT) |
| **C1, C2, C4, Baro 12, D1, D3, F1b, F3b, F4b, F5b** | **REJECT** (G2) | N/A |
| **D2, D4, D5, F1a, F2a, F2b** | **NEEDS FURTHER TESTING** | Optional human playtest — see ranking |
| **16-bead** | REFERENCE | N/A |

---

## Feature Test (product settings — KEEP boards only)

**Status (2026-08-15):** **COMPLETE** — four human-confirmed KEEP boards tested.

| Feature | Result summary |
|---------|----------------|
| Centre rule (per-board) | **4×4:** End-Game · **10:** inconclusive · **7/6:** cumulative — all KEEP playables have Off/Cumulative/End-Game in UI — see `FEATURE_TEST_CENTRE_RULE_EVALUATION.json` |
| Cumulative vs endgame | Per-board study; **not** universal |
| Max moves | **4×4:** Unlimited · others n/a |
| Match timer | Viable ranges per board — no final value |
| Shot clock | Viable ranges per board — no final value |
| Resignation | Not tested |

Full report: **`WEB_FEATURE_TEST_05P.md`**. Evaluators: `evaluate-feature-test-lab.cjs`, `evaluate-centre-rule-feature-test.cjs`.

---

## Discovery boards (2026-08-16) — not KEEP

New geometries, not promotions of REJECT 4/5/8. Protocol: D1/D2/D3 · seeds 101/202/303 · move-cap 120. Authoritative: `evaluate-c1-c4-lab.cjs`, `complete-c3-lab.cjs`, `evaluate-12-bead-baro-lab.cjs`. KEEP boards unchanged.

| Board | Geometry | Lab | Next |
|-------|----------|-----|------|
| **C1** | 5 vs 5, 3×5 left–right | **REJECT (G2)** | stop |
| **C2** | 5 vs 5, 4×4 full box cross | **REJECT (G2)** | stop |
| **C3** | 8 vs 8, 5×5 thinned 10-bead | **G1–G9 PASS** (N=100) | **human playtest** |
| **C4** | 12 vs 12, 5×5 mini-wings | **REJECT (G2)** | stop |
| **Baro 12** | traditional 5×5 Alquerque rank camps | **REJECT (G2)** D1 0/100 | stop |

C6 was tested as **D4** (round 2). Final round F1a–F5b complete — see sections below.

---

## Artifacts (2026-08-15 — 4×4 selection finalized)

| File | Content |
|------|---------|
| `SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html` | **Active** playable (full box crosses) |
| `CURSOR_INDEX_LAB_EVALUATION.json` | Combined eval incl. INDEX_6 + INDEX_6_B audit |
| `CURSOR_INDEX_6_LAB_EVAL.json` | INDEX_6 rays audit (unchanged) |
| `CURSOR_INDEX_6_B_LAB_EVAL.json` | INDEX_6_B cross audit (unchanged) |
| `CURSOR_INDEX_VERIFY_SMOKE.json` | Active playable smoke |
| `FEATURE_TEST_KEEP_REGISTRY.json` | Human-confirmed KEEP gate for Feature Test |
| `FEATURE_TEST_EVALUATION.json` | Feature Test artifact — **COMPLETE** (2026-08-15, 4 KEEP boards) |
| `FEATURE_TEST_CENTRE_RULE_EVALUATION.json` | Per-board End-Game vs Cumulative centre study |

---

## Discovery round 2 — D1–D5 (2026-08-17)

**Evaluator:** `evaluate-d1-d5-lab.cjs` → `D1_D5_LAB_EVALUATION.json` · protocol N=30/seed · move-cap 120.

| ID | Board | Verdict | D2 FPA | D2 move-cap% | D2 elim% |
|----|-------|---------|--------|--------------|----------|
| D1 | 9-bead 5×5 one-corner thin | **REJECT G2** | +41 pp | 33% | 33% |
| D2 | 7-bead 5×5 thin hourglass | **NEEDS FURTHER TESTING** | null | **100%** | 0% |
| D3 | 5-bead 3×5 rear-wing thin | **REJECT G2** | +36 pp | 32% | 34% |
| D4 | 12-bead 6×5 two-file (= C6) | **NEEDS FURTHER TESTING** | +50 pp* | 92% | 7.8% |
| D5 | 4-bead 3×5 rear corners | **NEEDS FURTHER TESTING** | −50 pp* | 99% | 1.1% |

\*Among games with a winner; most D2 games are move-cap draws.

---

## Final round — F1b–F5b (2026-08-17)

**Evaluator:** `evaluate-final-round-lab.cjs` → `FINAL_ROUND_LAB_EVALUATION.json`. **Skipped:** C5, F3a, F5a, F4a (repeat failure classes).

| ID | Board | Verdict | D2 FPA | D2 move-cap% | D2 elim% |
|----|-------|---------|--------|--------------|----------|
| F1b | 5-bead 4×3 hourglass | **REJECT G2** | +38 pp | 33% | 24% |
| F2b | 7-bead 4×4 dense cross | **NEEDS FURTHER TESTING** | −36 pp | 77% | **23%** |
| F3b | 8-bead 5×4 two-file | **REJECT G2** | −50 pp | 32% | 34% |
| F1a | 8-bead 4×6 hourglass | **NEEDS FURTHER TESTING** | **0 pp** | 98% | 2.2% |
| F2a | 12-bead 5×7 C3 corners | **NEEDS FURTHER TESTING** | **0 pp** | 98% | 2.2% |
| F4b | 10-bead 4×6 hourglass | **REJECT G2** | −30 pp | 94% | 1.1% |
| F5b | 12-bead 4×7 hourglass | **REJECT G2** | +17 pp | 97% | 2.2% |

---

## All non-REJECT Lab ranking (2026-08-17)

Authoritative artifact: `ALL_NON_REJECT_LAB_RANKING.json`. **Human KEEP** and **NEEDS FURTHER TESTING** only — no new KEEP from Lab.

| Rank | Board | Tier | D2 elim% | D2 move-cap% | D2 FPA |
|------|-------|------|----------|--------------|--------|
| 1 | **6-bead 3×5** | Human KEEP | **34.4%** | 65.6% | +8 pp |
| 2 | **6-bead 4×4 cross** | Human KEEP | 14.4% | 85.6% | ±4 pp |
| 3 | **7-bead hourglass** | Human KEEP | 12.2% | 87.8% | −23 pp |
| 4 | **10-bead 5×5** | Human KEEP | 8.9% | 91.1% | +50 pp* |
| 5 | **F2b** 7×4×4 dense | NFT | **23.3%** | 76.7% | −36 pp |
| 6 | **D2** 7×5×5 thin | NFT | 0% | 100% | null |
| 7 | **D4** 12×6×5 (= C6) | NFT | 7.8% | 92.2% | +50 pp* |
| 8 | **F2a** 12×5×7 | NFT | 2.2% | 97.8% | **0 pp** |
| 9 | **F1a** 8×4×6 hourglass | NFT | 2.2% | 97.8% | **0 pp** |
| 10 | **C3** 8×5×5 thinned | NFT | 1.7% | 98.3% | +50 pp* |
| 11 | **D5** 4×3×5 rear | NFT | 1.1% | 98.9% | −50 pp* |

\*FPA among games with a winner. **16-bead** is REFERENCE only (not ranked).

**Next human playtest priority:** **F2b** (most alive new board) then **C3** (N=100 confirmed).

---

## Artifacts (2026-08-17 — D1–D5 + final round)

| File | Content |
|------|---------|
| `D1_D5_LAB_EVALUATION.json` | Discovery round-2 G1–G9 (N=30) |
| `D1_LAB_EVAL.json` … `D5_LAB_EVAL.json` | Per-board D-round artifacts |
| `FINAL_ROUND_LAB_EVALUATION.json` | Final round G1–G9 (7 built; 4 skipped) |
| `F1b_LAB_EVAL.json` … `F5b_LAB_EVAL.json` | Per-board F-round artifacts |
| `ALL_NON_REJECT_LAB_RANKING.json` | Combined ranking of non-REJECT boards |
| `generate-final-round.cjs` | Playable + engine generator |
| `verify-final-round-feature.cjs` | Final-round smoke |
| `evaluate-final-round-lab.cjs` | Final-round Lab evaluator |
| `SHOLO_FINAL_ROUND_FEATURE_SMOKE.json` | Final-round smoke results |
| `SHOLO_D1_D5_FEATURE_SMOKE.json` | D-round smoke results |

## Artifacts (2026-08-16 — discovery + Baro)

| File | Content |
|------|---------|
| `C1_C4_LAB_EVALUATION.json` | C1–C4 G1–G9 (N=30) |
| `C3_LAB_COMPLETE.json` | C3 close-out D1/D2/D3 N=100 — G1–G9 pass |
| `BARO_12_LAB_EVALUATION.json` | Baro Guti 12 — REJECT G2 |
| `BOARD_DISCOVERY_05P.md` | Discovery shortlist + Lab outcomes |

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
| `cursor-index-fullturn-engine.cjs` | 4×4 headless engine (`rays` / `fullBoxCross`) |
| `CURSOR_INDEX_4_LAB_EVAL.json` | INDEX_4 eval (REJECT) |

---

*SmartBeads Web — final round Lab 2026-08-17 (F1a/F2a/F2b NFT; 4 REJECT). D1–D5 Lab 2026-08-17. Discovery Lab 2026-08-16. 4×4 cross selected 2026-08-15. Human KEEP four boards 2026-08-15.*
