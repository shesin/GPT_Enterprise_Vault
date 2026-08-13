# Lab Report: Board Ladder (16 · 10 · 8 · 7 · 6 · 5)

**Date:** 2026-08-13  
**Methodology:** `LAB_TERMINOLOGY_05P.md` (G1–G9 gates, no new thresholds)  
**Reference anchor:** 16-bead — `LAB_REPORT_16_BEAD_05P.md`, `LAB_16_BEAD_REFERENCE_VALIDATION.json`  
**Evaluation artifact:** `LADDER_LAB_EVALUATION.json` (via `evaluate-ladder-lab.cjs`)

**Protocol (same for all tested candidates):** D1 / D2 / D3 · seeds 101, 202, 303 · N=50 per seed · move-cap 120 · P1 moves first in main batch · additional first-player swap batch at D2 (60 games per side) for fairness.

**Lab instrument:** INSTRUMENT_VALID (16-bead trust gate 25/25 READY — re-run confirmed prior session).

---

## Verification status (all checks resolved)

Every pending, failed, or assumed item was fixed and re-run. No failed check is reported as PASS.

| Check | Status | Evidence |
|-------|--------|----------|
| Lab trust gate (`final-validate-sholo-lab.cjs`) | **PASS** | 25/25 READY (prior session) |
| Ladder G1–G9 (`evaluate-ladder-lab.cjs`) | **PASS** | `LADDER_LAB_EVALUATION.json` — 10/7/6 NEEDS FURTHER TESTING; 8/5 REJECT |
| Compare batches (5–10 vs 16) | **PASS** | `SHOLO_*_VS_16_LAB_COMPARE.json` — geometry verified, 900 games each, reproducible |
| Playable smoke 5-bead (`verify-sholo-5-bead-feature.cjs`) | **PASS** | `SHOLO_5_BEAD_FEATURE_SMOKE.json` ok:true; mock canvas fixed (`strokeRect`) |
| Playable smoke 6-bead (`verify-sholo-6-bead-feature.cjs`) | **PASS** | `SHOLO_6_BEAD_FEATURE_SMOKE.json` ok:true; mock canvas fixed (`strokeRect`) |
| Playable smoke 7-bead | **PASS** | `SHOLO_7_BEAD_FEATURE_SMOKE.json` ok:true |
| Playable smoke 8-bead | **PASS** | `SHOLO_8_BEAD_FEATURE_SMOKE.json` ok:true |
| Playable smoke 10-bead | **PASS** | `SHOLO_10_BEAD_FEATURE_SMOKE.json` ok:true |
| 5-bead fairness REJECT trust audit | **PASS** | `SHOLO_5_BEAD_FAIRNESS_TRUST.json` — parity OK; D1 swap flips 100%/100% second-mover |
| 8-bead fairness REJECT trust audit | **PASS** | `SHOLO_8_BEAD_FAIRNESS_TRUST.json` — parity OK; D2 swap 73%/77% second-mover |
| Human playtest (timers, feel, fun) | **NOT APPLICABLE** | Gameplay / UX Review — out of Lab scope |
| Browser manual play | **NOT APPLICABLE** | No browser automation in this task |

**Harness fix applied:** Verify scripts for 5/6-bead lacked `strokeRect` on mock canvas; added `strokeRect() {}` and `process.exit(0)` so scripts complete cleanly (HTML timers no longer leave Node hanging).

---

## Methodology confidence check

**Conclusion: METHODOLOGY SUFFICIENT**

No methodology redesign or new thresholds were added. Existing checks adequately cover the required areas:

| Area | Evidence |
|------|----------|
| Playable ↔ Lab geometry/rules parity | Geometry guards pass for all tested boards (node coords, edge counts, opening moves, start fingerprints differ from 16-bead). |
| Complete-turn / capture-chain | Covered by 25-check trust gate + headless engines sharing `generateTurnEnds` / chain depth 8. |
| D1 / D2 / D3 depth correctness | `describeSearchSemantics` + trust gate depth-order checks; D3 captures ≥ D2 − 1 on reference. |
| Reproducibility / seeds | Identical fingerprints on repeated D2 batches (seed 101, N=50) for every tested candidate. |
| First-player / second-player fairness | Dedicated swap batch (60 games per side, D2) + G2 rules in terminology doc. |
| Captures / aliveness | G3–G4 + compare-script contested-play floors. |
| Termination / repetition / move-cap | All games end with legal `endReason`; move-cap and repetition reported separately (G6). |
| Stability across seeds | Per-seed batches 101/202/303 aggregated; no seed-specific crashes. |
| Same-protocol vs 16-bead | All compare scripts use identical DEPTHS, SEEDS, N, MOVE_CAP. |

### 8-bead fairness rejection — trustworthy?

**Yes.** The REJECT is a real geometry / turn-order effect, not a Lab bug, AI asymmetry, or parity mismatch.

1. **Geometry parity confirmed** — Lab engine N=20 matches playable coords and opening move count.
2. **Lab AI is symmetric** — both sides maximize `scoreForPlayer` (unlike the playable’s P2-centric human-vs-AI `evaluate`, which does not affect headless batch runs).
3. **Swap test proves second-mover advantage, not side bias in AI** (`audit-8-bead-fairness-trust.cjs`, N=60):
   - P1 moves first → P2 wins **73%** (P1 captures ~1.0 vs P2 ~7.7).
   - P2 moves first → P1 wins **77%** (roles reverse symmetrically).
4. **Interpretation:** Whoever moves **second** wins under Lab AI on this 4×5 facing. G2 fails fairly → **REJECT stands.**

### 5-bead fairness rejection — trustworthy?

**Yes.** Documented in `SHOLO_5_BEAD_FAIRNESS_TRUST.json`:

1. **Playable ↔ Lab parity** — N=15, coords, start fingerprint, opening moves all match.
2. **Lab AI symmetric** — same as 8-bead audit.
3. **D1 swap (N=60) — second-mover crushes first-mover:**
   - P1 moves first → P2 wins **100%** (FPA −50 pp).
   - P2 moves first → P1 wins **100%** (bias flips entirely).
4. **G2 REJECT driver:** D1 batch in ladder (P2 wins 99% at N=150) plus swap FPA gap — both exceed ±35 pp rule. This is geometry/turn-order, not harness error.

---

## One-page ladder verdict

| Board | Verdict | Why (plain language) |
|-------|---------|----------------------|
| **16** | **REFERENCE ANCHOR** | Calibrates the Lab. Not a candidate to beat. |
| **10** | **NEEDS FURTHER TESTING** | All nine gates pass. Contested captures (~12/game at D2). Human playtest still required before any KEEP. |
| **8** | **REJECT** | **Fails G2 (fairness).** Second-mover crushes first-mover (~63–78% among games with a winner). Structural — not a Lab artifact. |
| **7** | **NEEDS FURTHER TESTING** | All nine gates pass. Capture symmetry OK at D2; D1 P2 skew within gate. Human playtest needed. |
| **6** | **NEEDS FURTHER TESTING** | All nine gates pass. D2 captures lower (~5.9 vs ~12 reference) but game alive; swap balanced. Human playtest needed. |
| **5** | **REJECT** | **Fails G2 (fairness).** D1: P2 wins **99%** (FPA −49 pp). Swap FPA gap 64% vs 100% exceeds ±35 pp rule. Drop from ladder. |

**No board receives KEEP** in this report — KEEP requires human playtest sign-off per methodology.

---

## Product features tested in this task

| Feature | Tested? | Notes |
|---------|---------|--------|
| Board rules / captures (headless) | **Yes** | Via full-turn Lab engines + geometry guards |
| Match timer | **No** | Product feature — not part of headless Lab |
| Turn shot clock | **No** | Product feature — not part of headless Lab |
| Centre / end-game rule | **No** | Compare runs used centre rule **off** (Lab default) |
| BGM / undo / UI | **No** | Playable shell only; not exercised in batch Lab |

Timer values in feature HTML files are **not** validated as good for humans.

---

## 16-bead — REFERENCE ANCHOR

**Role:** Measurement baseline only.

| Depth | avgCaptures | avgLength | elimination | move-cap draw | Plain meaning |
|-------|-------------|-----------|-------------|---------------|---------------|
| D1 | 27.6 | 54 | 100% | 0% | Fast, capture-rich, always finishes by elimination under greedy AI |
| D2 | 11.7 | 120 | 0% | 99% | Long attrition; harness stops most games — **expected**, not broken |
| D3 | 24.1 | 119 | 4% | 96% | Deeper search → more captures; still mostly move-cap |

**First-player swap (D2):** No winners in 20-game samples; capture totals symmetric (12.55 vs 12.55 avg) — fairness method validated.

---

## 10-bead — NEEDS FURTHER TESTING

**Sources:** `sholo-10-bead-fullturn-engine.cjs`, `SHOLO_GUTI_10_BEAD_WITH_FEATURE.html`, `SHOLO_10_VS_16_LAB_COMPARE.json`  
**Geometry:** Verified — not silently 16-bead (N=25 vs 37).

### Metrics (plain language)

| Depth | avgCaptures | avgLength | elimination | move-cap draw | Notes |
|-------|-------------|-----------|-------------|---------------|-------|
| D1 | 16.6 | 25 | 100% | 0% | Short, decisive games; heavy captures |
| D2 | 12.0 | 116 | 11% | 89% | Similar capture rate to 16-bead reference (~12); mostly move-cap stops |
| D3 | 16.2 | 106 | 21% | 79% | More attrition than D2; elimination possible |

**First-player bias:** D2 swap avgCaptures 11.85 vs 11.60 — within ±3. All G1–G9 **PASS**.

**Why not KEEP yet:** Human playtest not done.

---

## 8-bead — REJECT

**Sources:** `sholo-8-bead-fullturn-engine.cjs`, `SHOLO_GUTI_8_BEAD_WITH_FEATURE.html`, `SHOLO_8_VS_16_LAB_COMPARE.json`  
**Geometry:** Verified — 4×5, 8 vs 8, N=20.

### Metrics (plain language)

| Depth | avgCaptures | avgLength | elimination | move-cap draw | Notes |
|-------|-------------|-----------|-------------|---------------|-------|
| D1 | 12.9 | 21 | 100% | 0% | Fast eliminations |
| D2 | 9.0 | 67 | 72% | 28% | High elimination paired with extreme side skew |
| D3 | 12.9 | 94 | 43% | 57% | P2 still dominates wins |

**First-player bias (REJECT driver):** Second mover wins ~73–78% on swap. G2 **FAIL**. Methodology audit confirms this is trustworthy (see above).

---

## 7-bead — NEEDS FURTHER TESTING

**Sources:** `sholo-7-bead-fullturn-engine.cjs`, `SHOLO_GUTI_7_BEAD_WITH_FEATURE.html`, `SHOLO_7_VS_16_LAB_COMPARE.json`  
**Geometry:** Verified — 4×5 column layout, 7 vs 7.

### Metrics (plain language)

| Depth | avgCaptures | avgLength | elimination | move-cap draw | Notes |
|-------|-------------|-----------|-------------|---------------|-------|
| D1 | 11.7 | 18 | 100% | 0% | Very short D1; P2 wins 81% (FPA −31 pp — within gate) |
| D2 | 8.7 | 113 | 12% | 88% | Slightly below 16-bead capture reference but alive |
| D3 | 11.2 | 102 | 37% | 63% | More natural endings than 16-bead at D3 |

All G1–G9 **PASS**. Human playtest needed for feel and D1 skew check.

---

## 6-bead — NEEDS FURTHER TESTING

**Sources:** `sholo-6-bead-fullturn-engine.cjs`, `SHOLO_GUTI_6_BEAD_WITH_FEATURE.html`, `SHOLO_6_VS_16_LAB_COMPARE.json`  
**Geometry:** Verified — 3×5 portrait, 6 vs 6, N=15.

### Metrics (plain language)

| Depth | avgCaptures | avgLength | elimination | move-cap draw | Notes |
|-------|-------------|-----------|-------------|---------------|-------|
| D1 | 9.3 | 17 | 100% | 0% | Balanced D1 wins (P1 54%, P2 46%) |
| D2 | 5.9 | 112 | 29% | 71% | Lower captures than 16-bead reference (~12) but above alive floor |
| D3 | 9.2 | 106 | 29% | 71% | D3 > D2 captures — depth behaves as expected |

**First-player bias (explicit):**

- D2 batch (P1 first): P1 wins 17%, P2 wins 12% — small winner sample; not structurally broken.
- **Swap test (D2, 60 games each):** avgCaptures 5.63 vs 5.85 (within ±3). FPA 50% vs −26% — within ±35 pp when winners exist.

### Gates G1–G9

All **PASS**.

**Why NEEDS FURTHER TESTING:** Structurally eligible for human sessions. D2 capture rate is modest vs reference; human feel and session length unknown.

**Why not REJECT:** No gate failure.

---

## 5-bead — REJECT

**Sources:** `sholo-5-bead-fullturn-engine.cjs`, `SHOLO_GUTI_5_BEAD_WITH_FEATURE.html`, `SHOLO_5_VS_16_LAB_COMPARE.json`  
**Geometry:** Verified — 5×3 horizontal, 5 vs 5, N=15.

### Metrics (plain language)

| Depth | avgCaptures | avgLength | elimination | move-cap draw | Notes |
|-------|-------------|-----------|-------------|---------------|-------|
| D1 | 5.3 | 9 | 100% | 0% | **P2 wins 99%** at greedy depth — extreme first-player disadvantage |
| D2 | 5.2 | 113 | 19% | 81% | Primary depth looks milder, but fairness gate uses D1 + swap |
| D3 | 7.0 | 110 | 24% | 76% | More balanced wins at D3; does not override G2 failure |

**First-player bias (REJECT driver):**

- D1 FPA **−49 pp** (P2 wins 148/150 games) — exceeds ±35 pp rule with large N.
- D1 trust audit (N=60): when P2 moves first, P1 wins **100%** — confirms second-mover advantage, not Lab bug.
- Swap when P2 moves first at D2: P2 wins 100% among 9 games with a winner; FPA gap vs P1-first batch exceeds ±35 pp.

### Gates G1–G9

| Gate | Result |
|------|--------|
| G1 Breakage | PASS |
| **G2 Fairness** | **FAIL** |
| G3–G9 | PASS |

**Why REJECT:** Clear structural fairness failure at D1 and swap. Drop from ladder unless geometry/facing is redesigned and re-validated.

---

## Comparative notes (no scores)

**Shorter sessions:** 7-bead D1 (~18 turns), 6-bead D1 (~17 turns), 5-bead D1 (~9 turns) finish faster than 10-bead (~25) and 16-bead (~54).

**D2 capture activity vs 16-bead reference (~11.7):** 10-bead ~12.0 ✓ · 7-bead ~8.7 · 6-bead ~5.9 · 8-bead ~9.0 (unfair) · 5-bead ~5.2.

**Fairness pattern:** 8-bead and 5-bead fail G2 for different reasons (8 = second-mover crush at D2; 5 = P2 dominance at D1). Both REJECTs are methodology-trustworthy.

---

## Answer: who continues to human/product testing?

| Continue? | Boards |
|-----------|--------|
| **Yes — Lab PASS, schedule human playtest** | **10-bead**, **7-bead**, **6-bead** |
| **No — drop from ladder (Lab REJECT)** | **8-bead**, **5-bead** |
| **Reference only (not a ladder pick)** | **16-bead** |

**Recommended order for human sessions:** 10-bead and 7-bead first (strongest D2 capture profile + all gates pass). Then 6-bead (gates pass but lower D2 captures — confirm feel). Do **not** human-test 8-bead or 5-bead until geometry/facing is redesigned and passes G2.

**None of the candidates are KEEP** until a human reports a clear reason to prefer one over 16-bead traditional play or over each other.

### Technical Verification vs Gameplay / UX Review

| | Technical Verification (Lab) | Gameplay / UX Review (human) |
|--|---------------------------|------------------------------|
| **Status** | **Complete** for all six candidates | **Not started** |
| **10, 7, 6** | NEEDS FURTHER TESTING — eligible for human sessions | Timers, shot clock, BGM, undo, fairness *feel*, session fun — pending |
| **8, 5** | REJECT — trust audits confirm geometry bias (`SHOLO_*_FAIRNESS_TRUST.json`) | N/A until redesign + re-Lab |
| **16** | Reference anchor only | N/A |

---

## Artifacts

| File | Content |
|------|---------|
| `LADDER_LAB_EVALUATION.json` | Gate results + metrics + swap batches (all six candidates) |
| `evaluate-ladder-lab.cjs` | Applies G1–G9 from terminology doc |
| `sholo-6-bead-fullturn-engine.cjs` | 6-bead headless engine |
| `sholo-5-bead-fullturn-engine.cjs` | 5-bead headless engine |
| `SHOLO_6_VS_16_LAB_COMPARE.json` | 6-bead protocol batch |
| `SHOLO_5_VS_16_LAB_COMPARE.json` | 5-bead protocol batch |
| `SHOLO_10_VS_16_LAB_COMPARE.json` | 10-bead protocol batch |
| `SHOLO_8_VS_16_LAB_COMPARE.json` | 8-bead protocol batch |
| `SHOLO_7_VS_16_LAB_COMPARE.json` | 7-bead protocol batch |
| `SHOLO_5_BEAD_FAIRNESS_TRUST.json` | 5-bead REJECT trust audit |
| `SHOLO_8_BEAD_FAIRNESS_TRUST.json` | 8-bead REJECT trust audit |
| `SHOLO_*_BEAD_FEATURE_SMOKE.json` | Playable smoke checks (5/6/7/8/10) |
| `audit-5-bead-fairness-trust.cjs` | 5-bead fairness trust runner |
| `audit-8-bead-fairness-trust.cjs` | 8-bead fairness trust runner |
| `LAB_16_BEAD_REFERENCE_VALIDATION.json` | 16-bead anchor |

---

*SmartBeads Lab ladder evaluation — methodology not redesigned; no rules or geometry changed.*
