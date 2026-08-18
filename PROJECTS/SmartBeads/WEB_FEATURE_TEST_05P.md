# Web Feature Test Report

**Date:** 2026-08-15  
**Evaluator:** `prototype/board4/evaluate-feature-test-lab.cjs`  
**Registry:** `prototype/board4/FEATURE_TEST_KEEP_REGISTRY.json`  
**Artifact:** `prototype/board4/FEATURE_TEST_EVALUATION.json`  
**Methodology:** `sholo-lab-protocol.cjs` — D1/D2/D3 · seeds 101, 202, 303 · **N=30**/seed · move-cap **120** · certified fullturn engines (4×4 feature options in `cursor-index-fullturn-engine.cjs`).

**Scope:** Human-confirmed **KEEP** boards only. **Resignation** not tested (`not yet decided`).

**Centre-rule study artifact:** `FEATURE_TEST_CENTRE_RULE_EVALUATION.json` · evaluator `evaluate-centre-rule-feature-test.cjs`

---

## Human-confirmed KEEP boards (2026-08-15)

| ID | Playable | Sign-off |
|----|----------|----------|
| `INDEX_6_ACTIVE` | `SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html` | human playtest confirmed 2026-08-15 |
| `LADDER_10` | `SHOLO_GUTI_10_BEAD_WITH_FEATURE.html` | human playtest confirmed 2026-08-15 |
| `LADDER_7` | `SHOLO_GUTI_7_BEAD_WITH_FEATURE.html` | human playtest confirmed 2026-08-15 |
| `LADDER_6_3x5` | `SHOLO_GUTI_6_BEAD_WITH_FEATURE.html` | human playtest confirmed 2026-08-15 |

**Reference excluded:** `SHOLO_GUTI_WITH_FEATURE.html` (16-bead REFERENCE ANCHOR).

---

## Feature Test status

| Field | Value |
|-------|-------|
| **Status** | **COMPLETE** |
| **Boards tested** | **4** |
| **Web board G1–G9 verdicts** | **Unchanged** (human KEEP is product sign-off, not a re-run of `evaluate-ladder-lab.cjs`) |

---

## Tests / N / seeds / depths

| Phase | N | Seeds | Depths | Move-cap |
|-------|---|-------|--------|----------|
| Setting comparison (centre, max-move) | 30/seed (90/variant) | 101, 202, 303 | **D2 primary** | 120 |
| Recommended-settings verification | 30/seed (270/board) | 101, 202, 303 | D1, D2, D3 | 120 |
| Timer budget probe | 15 samples/depth | — | D2, D3 | 3-turn probe |

**Engine paths:** 4×4 → `cursor-index-fullturn-engine.cjs` (`fullBoxCross` + centre/max-move options). 10/7/6-bead → `sholo-*-fullturn-engine.cjs` (centre **off** on certified path; UI endgame is tiebreak-only).

---

## Per-board centre rule & cumulative capture (End-Game vs Cumulative)

**Methodology:** D2 · seeds 101, 202, 303 · **N=30**/seed · **90 games/rule** · move-cap **120** · certified fullturn engines + `sholo-centre-lab.cjs` (4×4 via `cursor-index-fullturn-engine.cjs`).

**Important:** Recommendations are **per board**. The 4×4 result does **not** transfer to 10/7/6-bead. **Product UI (2026-08-15 evening):** all four KEEP playables now ship **Off · Cumulative · End-Game** in the Center rule dropdown (6/7/10-bead cumulative added this session).

| Board | Centre node? | Proof | End-Game (D2) | Cumulative (D2) | Recommended | Confidence |
|-------|--------------|-------|---------------|-----------------|-------------|------------|
| **4×4 6-bead** | **YES** (4 nodes: 5,6,9,10) | `CENTER_IDX` in playable | avgCapt 6.6 · elim 14.4% · F/SP 1.8 pp · avgLen 116 | avgCapt 6.6 · elim 14.4% · F/SP **−5.6 pp** · avgLen 116 | **End-Game** | **moderate** |
| **10-bead** | **YES** (1 node: index 12) | `y===4 && x===4` | avgCapt 12.0 · elim 8.9% · F/SP **18.2 pp** | avgCapt 12.0 · elim 8.9% · F/SP 17.8 pp | **INSUFFICIENT_EVIDENCE** | **low** |
| **7-bead** | **YES** (2 nodes: 9,10) | centre line row 3 | avgCapt 8.6 · elim 12.2% · F/SP −2.9 pp | avgCapt 8.6 · elim 12.2% · F/SP **0 pp** | **Cumulative** | **moderate** |
| **6-bead 3×5** | **YES** (1 node: index 7) | single amber row 3 | avgCapt 6.0 · elim **34.4%** · F/SP 2.9 pp | avgCapt 6.0 · elim 34.4% · F/SP 1.1 pp | **Cumulative** | **low** |

### Measurable comparison notes

- **Contest rate** (avgCaptures, capture/bead) is **identical** between End-Game and Cumulative on every board — centre rules only change **move-cap / tiebreak resolution**, not D2 search or mid-game captures.
- **4×4:** Cumulative worsens balance at move-cap (P2 wins 56% vs 44% among resolved games; F/SP −5.6 pp). End-Game keeps F/SP near even (+1.8 pp). Same elim rate.
- **10-bead:** Both rules show **high F/SP (~18 pp)** at move-cap resolution — neither rule fixes balance. Composite scores within noise (Δ −0.48).
- **7-bead:** Cumulative improves balance (F/SP 0 pp vs −2.9 pp endgame) with identical contest metrics — supports cumulative **if** product adds the mode.
- **6-bead 3×5:** Higher elimination (34.4%) than 4×4 on same bead count; cumulative slightly better balance (F/SP 1.1 vs 2.9 pp) but small composite margin.

### Hypothesis (capture fraction)

| Board | Beads/side | capture/bead (both rules) |
|-------|------------|---------------------------|
| 4×4 | 6 | 0.55 |
| 10-bead | 10 | 0.60 |
| 7-bead | 7 | 0.61 |
| 6-bead 3×5 | 6 | 0.50 |

Cumulative vs End-Game **does** diverge by board on **balance at resolution**, not on raw capture volume — consistent with centre tiebreak affecting different board sizes differently.

---

## Results by feature (full Feature Test)

### 1. Centre rule — per-board (authoritative)

See table above. **Do not use a single global centre setting across boards.**

### 2. Cumulative capture rule — per-board

| Board | Product UI has cumulative? | Product UI has end-game? | Lab recommendation |
|-------|---------------------------|-------------------------|-------------------|
| **4×4** | **Yes** | **Yes** | **End-Game** preferred over cumulative |
| **10-bead** | **Yes** (added 2026-08-15) | **Yes** | **No recommendation** — insufficient evidence |
| **7-bead** | **Yes** (added 2026-08-15) | **Yes** | **Cumulative** — human playtest to confirm |
| **6-bead 3×5** | **Yes** (added 2026-08-15) | **Yes** | **Cumulative** — low confidence; human playtest |

### 3. End condition (max moves / unlimited)

| Board | D2 compared | AI recommendation |
|-------|-------------|-------------------|
| **4×4** | 20 / 40 / 60 / unlimited | **Unlimited (0)** — D2 baseline avgLength ~116; limits 20/40/60 cut before natural contest |
| **10 / 7 / 6** | n/a | **Unlimited** (no max-move UI; Lab move-cap 120 for batches only) |

### 4. Match timer — technically viable range (no final value)

| Board | UI options (min) | Viable range (technical floor) |
|-------|------------------|--------------------------------|
| **4×4** | off, 3, 5, 8 min | **3, 5, 8** min per player (all ≥ floor ~1 min) |
| **10-bead** | off, 10, 20, 30 min | **10, 20, 30** |
| **7-bead** | off, 5, 10, 15 min | **5, 10, 15** |
| **6-bead 3×5** | off, 3, 5, 8 min | **3, 5, 8** |

### 5. Shot clock — technically viable range (no final value)

| Board | UI options (sec) | Viable range (D2/D3 search completes) |
|-------|------------------|----------------------------------------|
| **4×4** | off, 10, 20, 30 | **10, 20, 30** (p95 D3 probe ~24 ms — all UI values viable) |
| **10-bead** | off, 20, 30, 50 | **20, 30, 50** |
| **7-bead** | off, 15, 25, 35 | **15, 25, 35** |
| **6-bead 3×5** | off, 10, 20, 30 | **10, 20, 30** |

### Resignation

**Not tested** — not yet decided.

---

## AI recommendations summary (features 1–3)

| Board | Centre / cumulative rule | Max moves |
|-------|---------------------------|-----------|
| **4×4 6-bead** | **End-Game** (not cumulative) | **Unlimited** |
| **10-bead** | **End-Game or Cumulative** — Lab inconclusive; both show high F/SP at move-cap | n/a |
| **7-bead** | **Cumulative** (Lab); End-Game also in UI | n/a |
| **6-bead 3×5** | **Cumulative** (Lab, low confidence); End-Game also in UI | n/a |

---

## What still needs human decision

1. **Match timer** — pick final minutes per board from viable range above.  
2. **Shot clock** — pick final seconds per board from viable range above.  
3. **Resignation** — rule not yet decided.  
4. **10-bead centre rule** — Lab could not distinguish endgame vs cumulative; both show ~18 pp F/SP at move-cap — human playtest required.  
5. **7-bead / 6-bead / 10-bead centre rule default** — Cumulative and End-Game are both in product UI; pick default per board after human playtest (Lab: 7/6 favour cumulative; 10 inconclusive).

**Recommended defaults (2026-08-17 review — do not implement until human confirms):** 4×4 **End-Game**; 7-bead **Cumulative**; 6-bead 3×5 **Cumulative** (low confidence); 10-bead still human choice. Do not add short max-move 20/40/60. Optional later (not KEEP): long stall-resolution (~80–100 turns) on 7-bead / 4×4 only. 7-bead D1 20/80 is **KEEP** — not a Lab recheck.

---

## Cross-references

| Document | Role |
|----------|------|
| `FEATURE_TEST_KEEP_REGISTRY.json` | Human KEEP gate |
| `FEATURE_TEST_EVALUATION.json` | Full per-board metrics |
| `FEATURE_TEST_CENTRE_RULE_EVALUATION.json` | End-Game vs Cumulative per-board study |
| `WEB_REPORT_All_BEAD_05P.md` | Web G1–G9 ladder verdicts |
| `GPT_PROJECT_STATUS_01P.md` | KEEP + Feature Test milestone |

---

*Feature Test complete 2026-08-15 — four human-confirmed KEEP boards.*
