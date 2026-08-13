# Lab Report: 16-Bead Sholo Guti (Reference Baseline)

**Date:** 2026-08-13  
**Board:** Standard 16-bead Sholo Guti (37 intersections, 16 vs 16)  
**Sources:** `SHOLO_GUTI.html`, `sholo-guti-fullturn-engine.cjs`  
**Validation:** `validate-lab-16-bead-reference.cjs` → `LAB_16_BEAD_REFERENCE_VALIDATION.json`  
**Terminology:** `LAB_TERMINOLOGY_05P.md` (read first)

---

## Executive summary

| Item | Result |
|------|--------|
| **Lab instrument** | **INSTRUMENT_VALID** (trust gate 25/25 READY + crash-free batches) |
| **16-bead board verdict** | **GOOD** |

The standard 16-bead game is a **healthy reference board** for Lab calibration. Rules, geometry, captures, and honest AI depths behave as designed. Primary-depth (D2) batches mostly reach the **120-turn Lab move-cap** before elimination — that is an expected **measurement profile** under honest 1-reply search, not evidence the board is broken.

**Product timers, shot clocks, and BGM were not evaluated in this report** (see § Product vs Lab).

---

## 1. Instrument validation (Step 2)

### What was checked

| Check | Result | Plain meaning |
|-------|--------|----------------|
| Playable ↔ Lab parity (N=37, edges, coords, start counts) | PASS | Headless engine matches `SHOLO_GUTI.html` |
| Opening legal move count (P1) | PASS | 13 opening moves — same in playable and Lab |
| Capture chains (optional stop + continue) | PASS | Capture Optionality honoured in turn enumeration |
| D1 / D2 / D3 semantics | PASS | Greedy / 1-reply / 2-reply — not capped or faked |
| P1 and P2 capture preference | PASS | Both sides prefer captures when available |
| Reproducibility (D2, seed 101) | PASS | Identical fingerprints on repeat |
| Crash-free batches (40 games × D1/D2/D3) | PASS | No throws; all legal `endReason` values |
| Comparison guards | PASS | D3 elimination ranking blocked; D2 allowed |
| Move-cap sensitivity | PASS | Longer cap → longer games (instrument responds) |

**Trust gate:** `final-validate-sholo-lab.cjs` — **25/25 READY** (re-run 2026-08-13).

**Note:** Older script `validate-sholo-fullturn-lab.cjs` reported NOT READY on outdated thresholds (expects 30% “games with a winner” at D2). That script was **not** used for this verdict. Its failure is a **documentation/threshold mismatch**, not a parity or engine bug. See Remaining Work.

---

## 2. Baseline batch (16-bead only)

**Protocol:** D1/D2/D3 × seeds 101/202/303 × **N=30** × move-cap **120** × P1 first → **270 games**  
**Does NOT prove:** Human enjoyment, optimal timer values, or candidate-board ranking.

### D1 — greedy (sanity)

| Metric | Value | Plain explanation |
|--------|-------|-------------------|
| Games with a winner | **100%** | Every game ended by elimination (no move-cap stops) |
| avgLength | **54.2** turns | Short tactical games — expected for greedy AI |
| avgCaptures | **27.6** | Heavy capture activity |
| P1 win / P2 win | **52% / 48%** | Roughly balanced |
| First-player advantage | **+2.2 pp** | Negligible skew among winners |

**Conclusion:** Board supports fast, capture-rich endings under greedy AI. Good sanity signal.

### D2 — primary Lab depth (1 opponent reply)

| Metric | Value | Plain explanation |
|--------|-------|-------------------|
| Elimination | **0%** | No all-bead wins in this sample |
| Stalemate | **1.1%** | One game blocked with no legal move |
| Move-cap draw | **98.9%** | Harness stopped game at turn 120 while still contested |
| avgLength | **119.9** turns | Games run until move-cap |
| avgCaptures | **11.7** | Material still exchanged — not frozen |
| Games with a winner | **1.1%** | Too few to trust FPA |

**Conclusion:** Under honest D2 + 120 move-cap, 16-bead attrition dominates. **High move-cap % does not mean broken board** — it means the Lab stop arrived before elimination in this AI regime. Use D2 for **captures, length, and draw split**, not elimination ranking alone.

### D3 — secondary depth (2 opponent replies)

| Metric | Value | Plain explanation |
|--------|-------|-------------------|
| Elimination | **4.4%** | Some natural wins appear with deeper search |
| Move-cap draw | **95.6%** | Still mostly harness stops |
| avgLength | **119.2** turns | Long games |
| avgCaptures | **24.1** | Higher attrition than D2 — depth responds |
| P1 / P2 wins (of all games) | **1.1% / 3.3%** | Tiny winner sample |

**Conclusion:** D3 shows more capture volume than D2 (24 vs 12 avg) — **AI reliability** ruler satisfied (depths behave differently). Do **not** rank boards by D3 elimination % alone (comparison guard).

---

## 3. Board-quality ruler (16-bead)

| Ruler | Assessment | Evidence |
|-------|------------|----------|
| **BREAKAGE** | **PASS** | No crashes; legal endings; parity 25/25; no stuck zero-turn games |
| **FAIRNESS** | **PASS (Lab)** | D1 FPA ≈ +2 pp; first-player swap capture volume 12.69 vs 12.81 (within 3) |
| **ALIVENESS** | **PASS** | D2 avg 11.7 captures; D3 avg 24.1; D1 avg 27.6 |
| **GAME ENDING** | **PASS (rules)** / **Lab note** | Elimination/stalemate/repetition all implemented; D2 mostly move-cap under current settings |
| **CAPTURE DYNAMICS** | **PASS** | Optional chain stop/continue enumerated; no abnormal instant collapse |
| **AI RELIABILITY** | **PASS** | D1/D2/D3 regimes differ; reproducible; branch limits documented |
| **STABILITY** | **PASS** | D1 per-seed elimination 100% across 101/202/303; metrics partition correctly |

---

## 4. Product vs Lab (Step 4)

| Area | Headless Lab | Human playable |
|------|--------------|----------------|
| Board rules & captures | **Measured** | Must match Lab (parity verified) |
| Match timer (min) | **Not measured** | Separate product test |
| Turn shot clock (sec) | **Not measured** | Separate product test |
| BGM, undo, UI | **Not measured** | Separate product test |

Timer code correctness **does not** prove timer values are good for humans.

---

## 5. Board verdict

### **16-BEAD BOARD: GOOD**

**Why GOOD**

1. **Instrument-validated reference** — playable and Lab engine agree on geometry, start position, and opening moves.
2. **No breakage** — 270 baseline games + 120 crash-check games completed without illegal or stuck states.
3. **Alive, contested play** — captures throughout at all depths; D1 shows natural eliminations; D3 shows deeper attrition.
4. **Legitimate endings** — elimination, stalemate, repetition, and move-cap are all handled correctly.
5. **Fair enough for Lab** — D1 balance near 50/50; capture symmetry when swapping first player under D2 move-cap regime.

**Caveats (not downgrades to BROKEN)**

- D2 + move-cap 120 rarely produces winners on 16-bead — use this profile when comparing **candidate boards**, not as a demand for high elimination %.
- FPA at D2 is **undefined** in this sample (almost no winners) — fairness for product may need **human play** or longer move-cap experiments.
- Branch limits mean AI is not perfect — documented in `SEARCH_LIMITS`.

**Not BROKEN** — no parity mismatch, crashes, or rule violations were found.

**Not NEEDS FURTHER TESTING for the board itself** — this *is* the reference. Further testing applies to **candidate slices** and **human UX**, not to re-proving 16-bead rules.

---

## 6. Template for future board reports

Each candidate report (10/8/7/6/5/4…) should follow this structure:

1. Terminology reference (`LAB_TERMINOLOGY_05P.md`)
2. Geometry guards vs 16-bead (not silent reuse)
3. Instrument checks for that board’s engine
4. Baseline batch under same protocol (D1/D2/D3, seeds, N, move-cap)
5. Seven ruler assessments
6. **Mandatory gate checklist (G1–G9)** → PASS / REJECT / NEEDS FURTHER TESTING
7. **Comparative rationale** vs 16-bead reference bands (and vs other ladder members if known)
8. **Selection verdict:** PASS / REJECT / NEEDS FURTHER TESTING / KEEP (KEEP only after human playtest)
9. Explicit separation of Lab vs product features

See **Board selection criteria** in `LAB_TERMINOLOGY_05P.md` for KEEP requirements and automatic REJECT triggers.

---

## 7. Board selection criteria applied (16-bead as reference anchor)

16-bead is **not** a ladder candidate to KEEP or REJECT — it **anchors** the methodology. This section shows how the nine gates read against measured reference data so future compares have a fixed baseline.

| Gate | 16-bead result | Role for ladder |
|------|----------------|-----------------|
| G1 No breakage | PASS — 25/25 trust, crash-free | Instrument trusted; candidates must match this bar |
| G2 No side bias | PASS — D1 FPA +2.2 pp; D2 capture symmetry 12.69 vs 12.81 when first swapped | Fairness method validated; use same rules on candidates |
| G3 Game alive | PASS — D2 avgCaptures 11.7 | **Floor reference:** candidates far below ~12 at D2 need explanation |
| G4 Captures matter | PASS — D1 avgCaptures 27.6 | **Floor reference:** near-zero at D1+D2 → REJECT on any board |
| G5 Elimination possible | PASS — D1 100% elimination; D3 4.4% | Elimination exists; D2 0% is **not** failure on reference |
| G6 Draws legitimate | PASS — move-cap/repetition reported separately | High D2 move-cap % on reference is **expected** |
| G7 Reasonable length | PASS — D1 ~54 turns; D2 at move-cap | Instant D2 (< 5 turns) on a candidate would REJECT |
| G8 Depth/seed stability | PASS — reproducible; D3 captures > D2 | Candidates must reproduce and not hinge on one seed |
| G9 Same protocol | PASS — defines the protocol | All ladder compares use identical settings |

**16-bead selection label:** **REFERENCE ANCHOR** (not PASS/KEEP — it is the calibration board).

**What candidates must show to beat “do nothing / stay on 16-bead”:** Written comparative advantage at PASS gates **plus** human playtest — e.g. similar capture activity in fewer turns, better teachability, or fairness — **not** higher D2 elimination % alone.

**Reference bands** (copy into candidate reports for side-by-side tables):

- D1: avgCaptures **27.6**, avgLength **54.2**, elimination **100%**
- D2: avgCaptures **11.7**, avgLength **119.9**, moveCapDraw **98.9%**
- D3: avgCaptures **24.1**, avgLength **119.2**, elimination **4.4%**

---

## 8. Raw artifacts

| File | Purpose |
|------|---------|
| `LAB_16_BEAD_REFERENCE_VALIDATION.json` | Full validation + baseline numbers |
| `SHOLO_LAB_FINAL_TRUST.json` | 25-check trust gate detail |
| `LAB_TERMINOLOGY_05P.md` | Glossary + board-quality ruler |

---

*SmartBeads Lab — 16-bead reference baseline. Candidate boards use Board selection criteria in LAB_TERMINOLOGY_05P.md.*
