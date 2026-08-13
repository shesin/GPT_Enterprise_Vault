# Lab Report: Board Ladder (16 · 10 · 8 · 7 · 6 · 5)

**Date:** 2026-08-13  
**Methodology:** `LAB_TERMINOLOGY_05P.md` (G1–G9 gates, no new thresholds)  
**Reference anchor:** 16-bead — `LAB_REPORT_16_BEAD_05P.md`, `LAB_16_BEAD_REFERENCE_VALIDATION.json`  
**Evaluation artifact:** `LADDER_LAB_EVALUATION.json` (via `evaluate-ladder-lab.cjs`)

**Protocol (same for all tested candidates):** D1 / D2 / D3 · seeds 101, 202, 303 · N=50 per seed · move-cap 120 · P1 moves first in main batch · additional first-player swap batch at D2 (60 games per side) for fairness.

**Lab instrument:** INSTRUMENT_VALID (16-bead trust gate 25/25 READY).

---

## One-page ladder verdict

| Board | Verdict | Why (plain language) |
|-------|---------|----------------------|
| **16** | **REFERENCE ANCHOR** | Calibrates the Lab. Not a candidate to beat. |
| **10** | **NEEDS FURTHER TESTING** | All nine gates pass. Contested captures (~12/game at D2). No structural breakage. Human playtest still required before any KEEP. |
| **8** | **REJECT** | **Fails G2 (fairness).** When P1 moves first, P2 wins 72% of games at D2 and captures ~6× more material. Swap test confirms whoever moves **second** wins ~63–78%. Structural second-player bias — not acceptable for the ladder. |
| **7** | **NEEDS FURTHER TESTING** | All nine gates pass. Capture symmetry OK at D2; D1 shows P2 winning more (81%) but within ±35 pp FPA rule. Shorter D1 games (~18 turns). Human playtest needed — watch side balance in real play. |
| **6** | **NOT TESTED** | No validated headless Lab engine in repository. Playable HTML exists; Lab parity not run. |
| **5** | **NOT TESTED** | No validated headless Lab engine in repository. Playable HTML exists; Lab parity not run. |

**No board receives KEEP** in this report — KEEP requires human playtest sign-off per methodology. None were human-tested here.

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
| D3 | 16.2 | 106 | 21% | 79% | More attrition than D2; elimination possible but not “better” because % is higher |

**First-player bias (explicit):**

- D1: P1 wins 36%, P2 wins 64% (FPA −14 pp) — within ±35 pp gate.
- D2 batch (P1 first): among 16 games with a winner, first player won 94% — **small sample** (only 16 winners).
- **Swap test (D2, 60 games each):** avgCaptures 11.85 vs 11.60 — **within ±3** reference band. Side capture volumes balanced.

### Gates G1–G9

| Gate | Result |
|------|--------|
| G1 Breakage | PASS |
| G2 Fairness | PASS |
| G3 Aliveness | PASS |
| G4 Captures matter | PASS |
| G5 Elimination possible | PASS (D1 100%) |
| G6 Draws legitimate | PASS (move-cap reported, not penalised) |
| G7 Reasonable length | PASS |
| G8 AI reliability / stability | PASS (reproducible; D3 > D2 captures) |
| G9 Same protocol | PASS |

**Why not KEEP yet:** Gates pass → eligible for human/product testing. No comparative human verdict vs 7-bead or 16-bead. Lab alone cannot KEEP.

**Why not REJECT:** Structurally sound; captures and length healthy vs reference.

---

## 8-bead — REJECT

**Sources:** `sholo-8-bead-fullturn-engine.cjs`, `SHOLO_GUTI_8_BEAD_WITH_FEATURE.html`, `SHOLO_8_VS_16_LAB_COMPARE.json`  
**Geometry:** Verified — 4×5, 8 vs 8, N=20.

### Metrics (plain language)

| Depth | avgCaptures | avgLength | elimination | move-cap draw | Notes |
|-------|-------------|-----------|-------------|---------------|-------|
| D1 | 12.9 | 21 | 100% | 0% | Fast eliminations; P2 wins 68% at D1 |
| D2 | 9.0 | 67 | **72%** | 28% | High elimination **not** a KEEP reason — paired with extreme side skew |
| D3 | 12.9 | 94 | 43% | 57% | P2 still dominates wins (42% vs P1 1%) |

**First-player bias (major problem — REJECT driver):**

- D2 with P1 first: **P1 wins 0%, P2 wins 72%**. P1 avg captures **1.3** vs P2 **7.6** (>2× rule violated).
- Swap when P2 moves first: **P1 wins 78%, P2 wins 0%** — bias flips entirely with first move.
- Interpretation: **second player crushes first player** under Lab AI on this geometry. Not a timer issue; structural fairness failure.

### Gates G1–G9

| Gate | Result |
|------|--------|
| G1 Breakage | PASS |
| **G2 Fairness** | **FAIL** |
| G3–G9 | PASS |

**Note:** Older compare script emitted `KEEP` based on capture volume alone. **G2 failure overrides** — methodology requires REJECT.

**Why REJECT:** Clear second-player / side dominance. Drop from ladder until geometry or facing is revisited and re-validated.

---

## 7-bead — NEEDS FURTHER TESTING

**Sources:** `sholo-7-bead-fullturn-engine.cjs`, `SHOLO_GUTI_7_BEAD_WITH_FEATURE.html`, `SHOLO_7_VS_16_LAB_COMPARE.json`  
**Geometry:** Verified — 4×5 column layout, 7 vs 7.

### Metrics (plain language)

| Depth | avgCaptures | avgLength | elimination | move-cap draw | Notes |
|-------|-------------|-----------|-------------|---------------|-------|
| D1 | 11.7 | 18 | 100% | 0% | Very short D1 games; P2 wins 81% (FPA −31 pp — within gate) |
| D2 | 8.7 | 113 | 12% | 88% | Slightly below 16-bead capture reference (~12) but alive |
| D3 | 11.2 | 102 | 37% | 63% | More natural endings than 16-bead at D3; still many move-cap draws |

**First-player bias (explicit):**

- D2 swap: avgCaptures **8.37 vs 8.85** — within ±3. Side wins small sample (9 vs 8 winners) — inconclusive but not structurally broken like 8-bead.
- D3 FPA among winners −35 pp — borderline; flag for human testing.

### Gates G1–G9

All **PASS**.

**Why NEEDS FURTHER TESTING:** Structurally eligible for human sessions. D1 P2 skew and short games need human feel check. No written comparative advantage vs 10-bead yet.

**Why not REJECT:** No gate failure; captures and endings plausible.

---

## 6-bead & 5-bead — NOT TESTED

Playables exist (`SHOLO_GUTI_6_BEAD_WITH_FEATURE.html`, `SHOLO_GUTI_5_BEAD_WITH_FEATURE.html`) but **no headless full-turn Lab engine** is in the repository. Per task rules: marked NOT TESTED, not built in this pass.

---

## Comparative notes (no scores)

**Shorter sessions:** 7-bead D1 (~18 turns) and 8-bead D1 (~21 turns) finish faster than 10-bead (~25) and 16-bead (~54). Only meaningful if fairness holds — 8-bead fails that test.

**D2 capture activity vs 16-bead reference (~11.7):** 10-bead ~12.0 ✓ · 7-bead ~8.7 (acceptable) · 8-bead ~9.0 (OK captures but unfair).

**Move-cap dominance:** 10-bead and 7-bead resemble 16-bead at D2 (high move-cap %). That is **not** automatically bad.

**Elimination % at D2:** 8-bead highest (72%) — **not** a KEEP signal because of fairness failure.

---

## Answer: who continues to human/product testing?

| Continue? | Boards |
|-----------|--------|
| **Yes — Lab PASS, schedule human playtest** | **10-bead**, **7-bead** |
| **No — drop from ladder (Lab REJECT)** | **8-bead** |
| **Not yet — build/validate Lab engine first** | **6-bead**, **5-bead** |
| **Reference only (not a ladder pick)** | **16-bead** |

**Recommended order for human sessions:** 10-bead and 7-bead in parallel short playtests focusing on **fairness feel**, session length, and capture satisfaction. Do **not** human-test 8-bead until geometry/facing is redesigned and passes G2.

**None of the candidates are KEEP** until a human reports a clear reason to prefer one over 16-bead traditional play or over each other.

---

## Artifacts

| File | Content |
|------|---------|
| `LADDER_LAB_EVALUATION.json` | Gate results + metrics + swap batches |
| `evaluate-ladder-lab.cjs` | Applies G1–G9 from terminology doc |
| `SHOLO_10_VS_16_LAB_COMPARE.json` | 10-bead protocol batch |
| `SHOLO_8_VS_16_LAB_COMPARE.json` | 8-bead protocol batch |
| `SHOLO_7_VS_16_LAB_COMPARE.json` | 7-bead protocol batch |
| `LAB_16_BEAD_REFERENCE_VALIDATION.json` | 16-bead anchor |

---

*SmartBeads Lab ladder evaluation — methodology not redesigned; no rules or geometry changed.*
