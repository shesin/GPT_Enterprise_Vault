# Lab Report: All Board Families (Sholo Ladder + Cursor Index 4×4)

**Date:** 2026-08-14  
**Methodology:** `LAB_TERMINOLOGY_05P.md` (G1–G9 gates, no new thresholds)  
**Reference anchor:** 16-bead Sholo — **FULLY CERTIFIED** — `LAB_REPORT_16_BEAD_05P.md`, `LAB_16_BEAD_REFERENCE_VALIDATION.json`  
**Authoritative evaluators:**
- Sholo ladder: `evaluate-ladder-lab.cjs` → `LADDER_LAB_EVALUATION.json`
- Cursor Index: `evaluate-cursor-index-lab.cjs` — **not run** (protocol STOP — see below)

**Sholo protocol (canonical):** D1 / D2 / D3 · seeds 101, 202, 303 · **N=30** per seed · move-cap **120** · P1 first · 270 games per board · 540 games per compare run (`sholo-lab-protocol.cjs`).

**Playable vs Lab:** Lab D2 ≠ browser Level 2 — see `LAB_TERMINOLOGY_05P.md`.

---

## Verification status (2026-08-14 fresh run)

| Check | Status | Evidence |
|-------|--------|----------|
| 16-bead reference instrument | **CERTIFIED** | `instrumentValid=true`, N=30, 270 games |
| Lab trust gate | **PASS** | 25/25 READY (`SHOLO_LAB_FINAL_TRUST.json`) |
| Compare batches 5/6/7/8/10 vs 16 | **PASS** | Fresh `SHOLO_*_VS_16_LAB_COMPARE.json` — N=30, 540 games each, geometry verified, reproducible D2 |
| Ladder G1–G9 (`evaluate-ladder-lab.cjs`) | **PASS** | Fresh `LADDER_LAB_EVALUATION.json` — authoritative `selectionVerdict` only |
| Verdict-path audit | **PASS** | `LAB_VERDICT_PATH_AUDIT.json` — `CODE_PATHS_OK`, no stale `candidateVerdict` |
| Playable smoke 5/6/7/8/10-bead | **PASS** | `verify-sholo-*-bead-feature.cjs` — all `ok:true` |
| 5-bead fairness investigation | **PASS** | `SHOLO_5_BEAD_FAIRNESS_TRUST.json` — parity OK; D1 swap 100%/100% second-mover |
| 8-bead fairness investigation | **PASS** | `SHOLO_8_BEAD_FAIRNESS_TRUST.json` — parity OK; D2 swap ~73%/77% second-mover |
| Cursor Index protocol vs 16-bead reference | **STOP — INCOMPATIBLE** | Protocol diff below — **no G1–G9 verdict issued** |
| Cursor Index playable smoke | **PASS (Technical only)** | `verify-cursor-index.cjs` — Human-vs-AI games finish |
| Cursor Index G1–G9 batch | **NOT YET VERIFIED** | Blocked until protocol approved |
| Human playtest (timers, feel, fun) | **NOT APPLICABLE** | Gameplay / UX Review — out of Lab scope |

**No stale N=50 compare evidence remains.** All Sholo candidate metrics are from canonical N=30 batches this session.

---

## Cursor Index — protocol compatibility STOP

Per `CURSOR_PROMPT_01.md` Instrument Certification: Cursor Index 4×4 was checked against the **certified 16-bead complete-turn reference** before any batch verdict.

### Protocol diff (plain language)

| Dimension | Certified Sholo reference (`sholo-guti-fullturn-engine.cjs`) | Cursor Index headless (`GEMINI_LAB.html` `playHeadlessGame`) |
|-----------|----------------------------------------------------------------|---------------------------------------------------------------|
| **Search unit** | **Complete turn** — enumerate full turn ends (including capture chains), then minimax on turn outcomes | **Single hop / ply** — each legal opening hop applied alone, then `minimax(depth−1)` on the resulting board |
| **D2 meaning** | 1 **opponent complete-turn reply** after own turn | Depth 2 = one ply of hop minimax — **not** one opponent full turn |
| **D3 meaning** | 2 opponent complete-turn replies | Depth 3 = two plies of hop minimax |
| **Eval noise** | Off (`evalNoise: false`) | On — `evaluateBoard` adds `aiRandom() * 2 − 1` jitter |
| **Move-cap** | 120 turns | 40 turns (Cursor Index family default) |
| **N per seed** | 30 | 50 (Cursor Index family default) |
| **Board geometry** | Sholo ladder boards (may differ) | 4×4 grid — **allowed to differ** |
| **Game loop** | Complete-turn AI search + turn execution | Complete-turn **execution** in loop, but **search** is hop-based |

**Conclusion:** The measurement protocol **silently differs** on the core depth semantics. Cursor Index batch results are **not comparable** to the Sholo ladder reference under the certified instrument rule.

### Required human decision (awaiting approval)

**Option A — Build matching complete-turn search**  
Port Sholo-style `generateTurnEnds` / `minimaxTurns` into a Cursor Index headless engine (or shared module), then re-certify against the 16-bead protocol diff before any KEEP/REJECT/NEEDS FURTHER TESTING.

**Option B — Retain hop-search as a separately documented instrument**  
Explicitly document GEMINI_LAB as a **different Lab family** with its own protocol, gates, reference board, and reports — never mixed with Sholo ladder compares or 16-bead calibration bands.

**No new search engine was built. No silent separate-instrument verdict was issued.** Prior `CURSOR_INDEX_LAB_EVALUATION.json` (hop-search, N=50) is **superseded and not used** in this report.

### Cursor Index final status

| Board | Lab status | Notes |
|-------|------------|-------|
| **Cursor Index 4** | **NOT YET VERIFIED** | Protocol STOP — smoke PASS only |
| **Cursor Index 6** | **NOT YET VERIFIED** | Protocol STOP — smoke PASS only |

---

## One-page ladder verdict (Sholo — fresh N=30)

| Board | Authoritative `selectionVerdict` | Failed gates | Investigation summary |
|-------|----------------------------------|--------------|------------------------|
| **16** | **REFERENCE** | — | Calibration anchor |
| **10** | **NEEDS FURTHER TESTING** | none | All G1–G9 pass. D2 ~12.0 captures/game. Human playtest required before KEEP. |
| **7** | **NEEDS FURTHER TESTING** | none | All G1–G9 pass. D1 P2 skew −30 pp (within gate). Human playtest required. |
| **6** (3×5) | **NEEDS FURTHER TESTING** | none | All G1–G9 pass. D2 captures modest (~6.0). Swap balanced. Human playtest required. |
| **8** | **NEEDS FURTHER TESTING** | **G2** | **Fairness failure investigated** — second-mover wins ~73–77% on D2 swap (N=60). Not a Lab bug. Do not human-test until geometry/facing fixed. |
| **5** | **NEEDS FURTHER TESTING** | **G2** | **Fairness failure investigated** — D1 P2 wins **97.8%** (FPA −47.8 pp, N=90); swap confirms 100% second-mover at D1. Not a Lab bug. Do not human-test until redesign. |

**No board receives KEEP** — KEEP requires human playtest sign-off per methodology.

**Note on G2 failures:** The authoritative evaluator maps G2 failure without automatic reject triggers to **NEEDS FURTHER TESTING** (not REJECT). Investigation confirms 5-bead and 8-bead structural fairness problems are real and reproducible at canonical N=30.

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

## 8-bead — NEEDS FURTHER TESTING (G2 FAIL — do not promote)

**Sources:** `SHOLO_8_VS_16_LAB_COMPARE.json` (N=30), fairness audit refreshed.

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 12.8 | 20.7 | 100% | 0% | 31% / 69% |
| D2 | 9.1 | 69.6 | 67.8% | 32.2% | **0% / 67.8%** |
| D3 | 12.9 | 96.0 | 40.0% | 60.0% | 1% / 39% |

**G2 investigation (before any REJECT label):**

1. Playable ↔ Lab parity confirmed (N=20, coords, opening moves).
2. Lab AI symmetric (both sides maximize same score function).
3. D2 swap (N=60 each): P1 first → P2 wins **73%** among games with a winner; P2 first → P1 wins **77%** — bias flips with turn order (second-mover advantage).
4. **Interpretation:** Structural geometry/turn-order effect, not harness error.

**Authoritative verdict:** NEEDS FURTHER TESTING (G2 fail; no automatic reject trigger). **Ladder action:** drop from human-test queue until geometry redesigned.

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

## 5-bead — NEEDS FURTHER TESTING (G2 FAIL — do not promote)

| Depth | avgCaptures | avgLength | elimination | move-cap draw | P1 / P2 win |
|-------|-------------|-----------|-------------|---------------|-------------|
| D1 | 5.3 | 8.7 | 100% | 0% | **2% / 98%** |
| D2 | 5.2 | 111.3 | 21.1% | 78.9% | 14% / 7% |
| D3 | 7.1 | 109.5 | 26.7% | 73.3% | 12% / 14% |

**G2 investigation:**

1. Parity confirmed (N=15).
2. D1 batch: P2 wins **88/90** games — FPA **−47.8 pp** (exceeds ±35 pp rule).
3. D1 swap audit (N=60): whoever moves **second** wins **100%** — confirms turn-order crush, not AI asymmetry.

**Authoritative verdict:** NEEDS FURTHER TESTING (G2 fail). **Ladder action:** drop until geometry/facing redesigned.

---

## Comparative notes

**D2 capture activity vs 16-bead reference (~11.7):** 10-bead 12.0 ✓ · 8-bead 9.1 · 7-bead 8.6 · 6-bead 6.0 · 5-bead 5.2.

**Fairness:** 5-bead (D1 P2 dominance) and 8-bead (D2 second-mover crush) fail G2 at canonical N=30 — investigated and trustworthy.

---

## Who continues to human / product testing?

### Sholo Guti ladder

| Continue? | Boards |
|-----------|--------|
| **Yes — schedule human playtest** | **10-bead**, **7-bead**, **Sholo 6-bead (3×5)** |
| **No — G2 investigated, structural fairness failure** | **8-bead**, **5-bead** |
| **Reference only** | **16-bead** |

**Recommended order:** 10-bead, then 7-bead, then Sholo 6-bead.

### Cursor Index 4×4

| Continue? | Boards |
|-----------|--------|
| **Blocked — protocol decision pending** | **Cursor Index 4**, **Cursor Index 6** |

Informal human play of HTML shells is **not** a Lab KEEP signal.

---

## Technical Verification vs Gameplay / UX Review

| | Technical Verification (Lab) | Gameplay / UX Review (human) |
|--|---------------------------|------------------------------|
| **Sholo 10, 7, 6** | NEEDS FURTHER TESTING — eligible | Not started |
| **Sholo 8, 5** | NEEDS FURTHER TESTING — **G2 fail, do not promote** | N/A until redesign |
| **Cursor Index 4, 6** | **NOT YET VERIFIED** (protocol STOP) | Smoke PASS only |
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
| `CURSOR_INDEX_VERIFY_SMOKE.json` | Cursor Index playable smoke (not Lab verdict) |

---

*SmartBeads Lab — fresh canonical evaluation 2026-08-14. No rules, geometry, AI strength, thresholds, or 16-bead reference modified.*
