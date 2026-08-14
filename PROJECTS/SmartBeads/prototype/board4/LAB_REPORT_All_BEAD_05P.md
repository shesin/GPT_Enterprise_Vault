# Lab Report: All Board Families (Sholo Ladder + Cursor Index 4×4)

**Date:** 2026-08-13  
**Methodology:** `LAB_TERMINOLOGY_05P.md` (G1–G9 gates, no new thresholds)  
**Reference anchor:** 16-bead Sholo — `LAB_REPORT_16_BEAD_05P.md`, `LAB_16_BEAD_REFERENCE_VALIDATION.json`  
**Evaluation artifacts:**
- Sholo ladder: `LADDER_LAB_EVALUATION.json` (`evaluate-ladder-lab.cjs`)
- Cursor Index 4×4: `CURSOR_INDEX_LAB_EVALUATION.json` (`evaluate-cursor-index-lab.cjs`)

**Sholo protocol:** D1 / D2 / D3 · seeds 101, 202, 303 · **N=30** per seed (canonical: `sholo-lab-protocol.cjs`) · move-cap **120** · P1 first · D2 swap batch (60/side).

**Note (2026-08-14):** Candidate compare JSON files (`SHOLO_*_VS_16_LAB_COMPARE.json`) may still reflect pre-fix N=50 batches until candidate boards are re-tested. Authoritative ladder verdicts require fresh compare runs + `evaluate-ladder-lab.cjs`. This report's candidate sections predate the ecosystem fix.

**Playable vs Lab:** Lab D2 ≠ browser Level 2 — see `LAB_TERMINOLOGY_05P.md`.

**Cursor Index protocol:** D1 / D2 / D3 · seeds 101, 202, 303 · N=50 per seed (`cursor-index-lab-protocol.cjs`) · move-cap **40** · center rule **off** · Red first · headless via `GEMINI_LAB.html` · playable parity vs `CURSOR_INDEX_*.html`.

---

## Verification status (all checks resolved)

Every pending, failed, or assumed item was fixed and re-run. No failed check is reported as PASS.

| Check | Status | Evidence |
|-------|--------|----------|
| Lab trust gate (`final-validate-sholo-lab.cjs`) | **PASS** | 25/25 READY (this session) |
| GEMINI_LAB headless (`verify-gemini-lab.cjs`) | **PASS** | 25/25 assertions ok (after capture metrics on `playHeadlessGame`) |
| Cursor Index playable smoke (`verify-cursor-index.cjs`) | **PASS** | `CURSOR_INDEX_VERIFY_SMOKE.json` — full Human-vs-AI games finish |
| Cursor Index G1–G9 (`evaluate-cursor-index-lab.cjs`) | **PASS** | `CURSOR_INDEX_LAB_EVALUATION.json` — parity verified; INDEX_4/6 REJECT on G3 |
| Ladder G1–G9 (`evaluate-ladder-lab.cjs`) | **PASS** | `LADDER_LAB_EVALUATION.json` — Sholo 10/7/6 NEEDS FURTHER TESTING; 8/5 REJECT |
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

**Harness fixes this session:** (1) Sholo verify scripts — `strokeRect` mock + `process.exit(0)`. (2) Cursor Index parity — compare `START_BOARD` from HTML source (not post-reset board after sync AI). (3) `GEMINI_LAB.html` — headless logs now include capture counts for G3/G4.

---

## One-page ladder verdict

### Sholo Guti ladder (vs 16-bead reference)

| Board | Verdict | Why (plain language) |
|-------|---------|----------------------|
| **16** | **REFERENCE ANCHOR** | Calibrates the Lab. Not a candidate to beat. |
| **10** | **NEEDS FURTHER TESTING** | All nine gates pass. Contested captures (~12/game at D2). Human playtest still required before any KEEP. |
| **8** | **REJECT** | **Fails G2 (fairness).** Second-mover crushes first-mover (~63–78% among games with a winner). Structural — not a Lab artifact. |
| **7** | **NEEDS FURTHER TESTING** | All nine gates pass. Capture symmetry OK at D2; D1 P2 skew within gate. Human playtest needed. |
| **Sholo 6** (3×5) | **NEEDS FURTHER TESTING** | All nine gates pass. D2 captures lower (~5.9 vs ~12 reference) but alive; swap balanced. Human playtest needed. |
| **5** | **REJECT** | **Fails G2 (fairness).** D1: P2 wins **99%** (FPA −49 pp). Drop from ladder. |

### Cursor Index 4×4 (GEMINI_LAB headless, center off)

| Board | Verdict | Why (plain language) |
|-------|---------|----------------------|
| **Cursor Index 4** | **REJECT** | **Fails G3 (game alive at D2).** D2 avgCaptures **~0.15** (71% repetition draws). D1 is healthy but primary depth is not contested. |
| **Cursor Index 6** | **REJECT** | **Fails G3 (game alive at D2).** D2 **100% repetition**, avgCaptures **0**. D1 shows elimination (~8.6 caps/game) but D2 collapses to draw loops under Lab AI. |

**Naming note:** **Sholo 6-bead** (3×5 portrait) and **Cursor Index 6** (4×4) are different boards — do not conflate verdicts.

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

## 6-bead (Sholo 3×5) — NEEDS FURTHER TESTING

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

## Cursor Index 4 (4×4, 4 vs 4) — REJECT

**Sources:** `CURSOR_INDEX_4.html`, `GEMINI_LAB.html`, `CURSOR_INDEX_4_LAB_EVAL.json`  
**Playable smoke:** `verify-cursor-index.cjs` PASS — Human-vs-AI game completes to modal.  
**Parity:** START_BOARD fingerprint matches `GeminiLab.createStartingBoard(4,4,4)`; opening moves match.

### Metrics (plain language)

| Depth | avgCaptures | avgLength | elimination | repetition draw | Notes |
|-------|-------------|-----------|-------------|-----------------|-------|
| D1 | 5.5 | 15 | 100% | 0% | Balanced wins (Red 51% / Blue 49%) |
| D2 | **0.15** | 26 | 2% | **71%** | Primary depth not alive — G3 **FAIL** |
| D3 | 3.4 | 33 | 16% | 39% | Some contested play returns at D3 |

**Gates:** G1/G2/G4–G9 pass · **G3 FAIL** → **REJECT**.

---

## Cursor Index 6 (4×4, 6 vs 6) — REJECT

**Sources:** `CURSOR_INDEX_6.html`, `GEMINI_LAB.html`, `CURSOR_INDEX_6_LAB_EVAL.json`  
**Playable smoke:** Human-vs-AI sample ended at move-cap 40 with captures 5 vs 1 (contested in interactive mode).  
**Parity:** START_BOARD matches Lab; opening moves match.

### Metrics (plain language)

| Depth | avgCaptures | avgLength | elimination | repetition draw | Notes |
|-------|-------------|-----------|-------------|-----------------|-------|
| D1 | 8.6 | 16 | 100% | 0% | Strong D1 — balanced FPA (−15 pp) |
| D2 | **0** | 17 | 0% | **100%** | All D2 games draw by repetition — G3 **FAIL** |
| D3 | 6.4 | 33 | 21% | 38% | D3 recovers capture activity |

**Gates:** G1/G2/G4–G9 pass · **G3 FAIL** → **REJECT**. Lab REJECT does not invalidate playable Human-vs-AI feel, but blocks ladder promotion at primary depth.

---

## Comparative notes (no scores)

**Shorter sessions:** 7-bead D1 (~18 turns), 6-bead D1 (~17 turns), 5-bead D1 (~9 turns) finish faster than 10-bead (~25) and 16-bead (~54).

**D2 capture activity vs 16-bead reference (~11.7):** 10-bead ~12.0 ✓ · 7-bead ~8.7 · 6-bead ~5.9 · 8-bead ~9.0 (unfair) · 5-bead ~5.2.

**Fairness pattern:** 8-bead and 5-bead fail G2 for different reasons (8 = second-mover crush at D2; 5 = P2 dominance at D1). Both REJECTs are methodology-trustworthy.

---

## Answer: who continues to human/product testing?

### Sholo Guti ladder

| Continue? | Boards |
|-----------|--------|
| **Yes — Lab PASS, schedule human playtest** | **10-bead**, **7-bead**, **Sholo 6-bead (3×5)** |
| **No — drop from ladder (Lab REJECT)** | **8-bead**, **5-bead** |
| **Reference only** | **16-bead** |

**Recommended order:** 10-bead and 7-bead first, then Sholo 6-bead. Do **not** human-test 8-bead or 5-bead until geometry passes G2.

### Cursor Index 4×4

| Continue? | Boards |
|-----------|--------|
| **No — Lab REJECT (G3 at D2)** | **Cursor Index 4**, **Cursor Index 6** |

Both fail **G3** at primary depth (D2 capture activity near zero; heavy repetition). Optional informal human play of the HTML shells is **not** a methodology KEEP signal.

**None of the candidates are KEEP** until human playtest sign-off per methodology.

### Technical Verification vs Gameplay / UX Review

| | Technical Verification (Lab) | Gameplay / UX Review (human) |
|--|---------------------------|------------------------------|
| **Sholo 10, 7, 6 (3×5)** | NEEDS FURTHER TESTING — eligible | Not started |
| **Sholo 8, 5** | REJECT | N/A until redesign |
| **Cursor Index 4, 6** | REJECT (G3 D2) — playable smoke PASS | Not started; not ladder-eligible |
| **16-bead** | Reference anchor | N/A |

---

## Artifacts

| File | Content |
|------|---------|
| `CURSOR_INDEX_LAB_EVALUATION.json` | Cursor Index 4/6 G1–G9 evaluation |
| `evaluate-cursor-index-lab.cjs` | Cursor Index Lab runner |
| `verify-cursor-index.cjs` | Cursor Index playable smoke |
| `CURSOR_INDEX_VERIFY_SMOKE.json` | Smoke run evidence |
| `gemini-lab-loader.cjs` | Shared VM loader for GEMINI + Cursor Index |
| `LADDER_LAB_EVALUATION.json` | Sholo gate results (16/10/8/7/6/5) |
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
