# Board Discovery Report (research only)

**Date:** 2026-08-16  
**Status:** DISCOVERY / RECOMMENDATION ONLY  
**Do not implement. Do not run Lab batches. Do not declare KEEP / REJECT / PASS.**

This file is an evidence-based shortlist of **new** geometries worth testing. It is not a product decision, not a Web verdict, and not a change to human KEEP status.

**Sources (repository, not memory):**
- 16-bead reference: `WEB_REPORT_16_BEAD_05P.md`, `sholo-guti-fullturn-engine.cjs` (37 nodes)
- Ladder G1–G9: `WEB_REPORT_All_BEAD_05P.md`, `LADDER_LAB_EVALUATION.json`
- Cursor Index 4×4: `CURSOR_INDEX_6_B_LAB_EVAL.json`, `CURSOR_INDEX_4_LAB_EVAL.json`
- Feature Test / centre study: `WEB_FEATURE_TEST_05P.md`, `FEATURE_TEST_CENTRE_RULE_EVALUATION.json`
- Vision slice rule: `VISION_05P.md` (“literal board slices from the proven full board”)
- Failed-board trust audits: `SHOLO_8_BEAD_FAIRNESS_TRUST.json`, 3×5 sketch layouts in `SHOLO_3x5_BEAD_LAYOUTS.html`

---

## What the evidence actually says

### 16-bead reference (anchor)

Traditional Sholo Guti: **Alquerque 5×5 + left/right triangles**, 37 intersections, 16 vs 16.

Start pattern that matters: each side occupies **two files of the square plus its wing**; the **centre file of the 5×5 is empty**. Sides face each other across that buffer. Captures jump over an adjacent enemy into an empty node beyond — they do **not** start with a jump already lined up through the empty file (jump requires jumping an enemy, not empty space).

D2 profile (N=30/seed, seeds 101/202/303, move-cap 120): avgCaptures **11.7**, avgLength **~120**, elimination **0%**, move-cap **98.9%**. That is the measurement profile of a healthy long game under honest 1-reply search — not a defect.

### Boards that survived G1–G9 (Web) and human KEEP

| Board | Geometry | Occupancy | Facing pattern |
|-------|----------|-----------|----------------|
| 16-bead | 5×5 + wings | 32/37 | Empty **centre file** + wings |
| 10-bead | 5×5 Alquerque | 20/25 = 80% | Empty **centre file**, 2 files each |
| 7-bead | 4×5 hourglass 5+2+2+5 | 14/20 = 70% | Pinch / limited contact |
| 6-bead 3×5 | 3×5 top–bottom | 12/15 = 80% | Empty **middle rank** |
| 4×4 6-bead | 4×4 full box crosses | 12/16 = 75% | Empty **2×2 centre** |

D2 capture-per-starting-bead (both sides): 16-bead **0.37** · 10-bead **0.60** · 7-bead **0.61** · 6-bead 3×5 **0.50** · 4×4 6-bead **0.55**. Smaller KEEP boards are *more* capture-dense per bead than the reference, not less.

### Boards that failed G2 (do not repeat)

| Board | What was actually tested | Why it failed |
|-------|--------------------------|---------------|
| **8-bead** | 4×5, **full two ranks each**, empty middle rank | D2: P1 opens, second mover wins **67.8%** of all games (P1 **0%**). Capture skew P2 7.6 vs P1 1.5. Swap proves second-mover dominance. Trust audit: structural, not harness. |
| **5-bead 3×5 sketch** | Incomplete ranks (full row 1 + outer row 2) | D1: second mover wins **100%** (P1 **0%** / P2 **100%**) |
| **4-bead 3×5 sketch** | Outer columns only, holes in the centre file of each camp | D1: second mover wins **100%** |
| **Cursor Index 4** | 4×4, 4 vs 4, **two fully empty middle ranks** | D1: second mover **85.6%** vs first mover **14.4%** |

### Two design lessons (not slogans)

1. **Empty centre *file* (odd width) is the 16/10 success pattern.** Even-width chops cannot keep a symmetric centre file. Vision’s “remove one column from 5×5 → 4×5 8-bead” is exactly the board that G2 rejected. Do not test that geometry again.

2. **Holes in starting ranks on 3×5 are not a “smaller 6-bead.”** The failed 4-bead and 5-bead sketches punched gaps in the camps. Greedy D1 always punished the player who had to step first. The *true* one-file slice of 16/10 is **5 vs 5, one file each, empty centre file** — that board was never built.

3. **On 4×4, 6-bead with empty 2×2 works; 4-bead with two empty ranks does not.** Full box crosses beat long rays on D1 fairness (INDEX_6_B vs INDEX_6). Any new 4×4 candidate should keep full box crosses and the empty 2×2, not INDEX_4’s empty belt.

4. **Occupancy % alone does not predict fairness.** 10-bead and failed 8-bead are both ~80% occupied. The difference is *where* the empty nodes sit and whether the first move is a forced feed.

---

## Explicitly out of scope (do not put on the shortlist)

- Re-testing 8-bead on 4×5 full ranks
- Re-testing 4/5-bead 3×5 incomplete-rank sketches
- Re-testing Cursor Index 4 (two empty middle ranks)
- Another 7-bead on 4×5 hourglass (already KEEP)
- Another 6-bead on 3×5 top–bottom or 4×4 6-bead (already KEEP)
- 9-bead on 4×5 (same even-width trap as 8-bead)
- 3-bead (dropped; would be a thinner version of a twice-failed 4-bead family)
- Changing centre rule, timers, or resignation — those are Feature Test / human decisions, not new boards

---

## Shortlist (6 candidates)

Proposed Lab order if a human later approves implementation: **C1 → C2 → C3 → C4**, then C5/C6. C1 and C3 test the two highest-value holes (missing true 16-slice mini; 8-bead redesign on the successful parent).

---

### C1 — MINI — 5-bead, 3×5, left–right (true 1-file slice)

**1. Geometry / bead count**

- Lattice: **3 columns × 5 rows** (15 nodes), Alquerque 8-neighbour links (same graph family as KEEP 6-bead 3×5 and 10-bead, minus width).
- Beads: **5 vs 5**.
- Start (P1 left file, P2 right file, centre file empty):

```text
1 . 2
1 . 2
1 . 2
1 . 2
1 . 2
```

- Occupancy: 10/15 ≈ 67%.
- Centre: amber on the middle node of the empty file (row 3), consistent with existing 3×5 playable.
- Opening captures: **none** — camps are not adjacent; the empty file is a buffer (same principle as 10-bead). First moves are slides into the centre file.

**2. Learns from**

- **Success:** 16-bead and 10-bead empty centre file; KEEP 6-bead 3×5 (this lattice is already certified alive).
- **Failure:** 5-bead 3×5 *sketch* (incomplete top–bottom ranks, D1 0/100). This is not that board.

**3. Why the evidence suggests it may be good**

Vision asked for literal slices of the full board. 10-bead is “two files each.” The missing half is “one file each.” That is 5 beads, not the 4-bead sketch that was tested. KEEP 6-bead proves 3×5 can pass G1–G9 when camps are full ranks with a buffer. This candidate uses the *other* successful buffer (a file, not a rank).

**4. What is new**

Same 3×5 lattice as KEEP 6-bead, but **facing direction and occupancy are different**: left–right 5 vs 5 vs top–bottom 6 vs 6. Never Lab-tested.

**5. Expected risk / weakness**

- One-file armies have **no reserve rank**. A single breakthrough may collapse faster than 10-bead (D2 elim on 6-bead 3×5 is already 34.4%).
- D1 may still skew (7-bead D1 is already 20/80 and only just inside G2). Thin armies can make greedy play brutal.
- Capture-per-bead may run high; games may feel small.

**6. Why it deserves Lab testing**

It is the smallest **faithful** 16-bead slice that has not been tested. If it fails G2, that is a real answer to “can a 1-file Sholo exist?” If it passes, it is the strongest mini-ladder candidate in the traditional family.

---

### C2 — MINI — 5-bead, 4×4 full box cross (interpolation of proven 6 vs failed 4)

**1. Geometry / bead count**

- Lattice: **4×4**, **full box crosses** (X in every 2×2) — the selected KEEP 4×4 geometry, not rays.
- Beads: **5 vs 5**.
- Start (180° rotational symmetry; keep empty 2×2 centre `[5,6,9,10]`). **Implemented** empties back-rank 1 and 14, not corners 3/12 (those allow an opening jump — see corrections below):

```text
1 . 1 1
1 . . 1
2 . . 2
2 2 . 2
```

- Occupancy: 10/16 = 62.5%.
- Centre: same four amber nodes as KEEP 4×4 6-bead.

**2. Learns from**

- **Success:** 4×4 6-bead full box cross — G1–G9 pass; D1 first/second **43.3% / 56.7%**; D2 near even among winners; human KEEP.
- **Failure:** Cursor Index 4 — 4 vs 4 with **two empty middle ranks**; D1 second mover 85.6%.
- **Selection evidence:** full box cross beat long rays on D1 fairness and D3 first-mover extremity.

**3. Why the evidence suggests it may be good**

On this exact lattice, moving from 4 beads (REJECT) to 6 beads (KEEP) fixed G2. Five beads is the only untested occupancy between those two, while **keeping the empty 2×2** that 6-bead uses (INDEX_4 emptied an entire belt). GEMINI notes 4-bead 4×4 had too much empty space; this start is closer to 6-bead than to INDEX_4.

**4. What is new**

Not a Sholo column-slice. It is the missing occupancy on the **Cursor Index** family. Start is not INDEX_4 and not 6-bead.

**5. Expected risk / weakness**

- More empty nodes than 6-bead (6 empty vs 4) — may drift toward INDEX_4’s “too much space / second-mover” regime.
- Wing files still touch vertically (same as KEEP 6-bead) — acceptable there, unproven at 5.
- D3 on 4×4 6-bead already shows strong first-mover elimination (68.9% P1 / 0% P2 on the selected geometry). Five beads may worsen that; D3 is not a G2 input but matters for human review.

**6. Why it deserves Lab testing**

The project’s best mini is 4×4 6-bead. The project’s failed mini on the same size is 4-bead. Five beads is the only way to learn whether 6 is the floor or whether a smaller 4×4 still holds.

---

### C3 — BIG — 8-bead, 5×5 Alquerque, thinned 10-bead (redesign of REJECT 8)

**1. Geometry / bead count**

- Lattice: **5×5 Alquerque** (same graph as KEEP 10-bead / 16-bead square). **Not 4×5.**
- Beads: **8 vs 8**.
- Start: 10-bead two-file camps, minus the **outer-file far corners** (preserve the inner fighting line):

```text
. 1 . 2 .
1 1 . 2 2
1 1 . 2 2
1 1 . 2 2
. 1 . 2 .
```

- Occupancy: 16/25 = 64%.
- Centre: empty centre file; amber on the middle node (index 12), same as 10-bead.

**2. Learns from**

- **Failure:** 8-bead 4×5 full ranks — second-mover engine at D2. Do not reuse that lattice.
- **Success:** 10-bead on this exact 5×5 graph — G1–G9 pass; D2 avgCaptures **12.0** (matches 16-bead ~11.7).
- Vision’s column-chop instruction is what produced the failed board; this candidate follows the *parent* (5×5 + empty file), not the failed chop.

**3. Why the evidence suggests it may be good**

8-bead is the hole between KEEP 7 and KEEP 10. The failure was the **4×5 even-width, rank-facing squeeze**, not the number 8. Putting 8 beads on the board that already works at 10, while keeping the empty centre file, is the only 8-bead hypothesis that does not repeat a known G2 collapse.

**4. What is new**

Same lattice as 10-bead, **different occupancy and a thinned rear**. Never tested. Not the removed 8-bead playable.

**5. Expected risk / weakness**

- More empty space than 10-bead (9 empty vs 5). Could reintroduce INDEX_4-style second-mover if the opening into the centre file is too free.
- 10-bead Feature Test: centre End-Game vs Cumulative was **inconclusive**, with first-player advantage about **+18 pp** at move-cap. Thinning may not fix that; it may worsen stalling.
- If Lab later wants a tighter 8, an alternate start (thin the *inner* file ends instead) should be a **separate** candidate — do not mix starts in one batch.

**6. Why it deserves Lab testing**

Without this test, “8-bead is bad” is an overfit to one failed slice. The ladder cannot honestly skip 8 until the successful parent has been tried at 8.

**Lab completion (2026-08-16):** `complete-c3-lab.cjs` → `C3_LAB_COMPLETE.json`. Full D1/D2/D3 at **N=100/seed**; D1/D2 from `C3_LAB_CONFIRMATION.json`; D3 fresh. **All G1–G9 pass** · `labValidationComplete: true`. **Human playtest only** — no further Lab work. Artifacts: `C3_LAB_EVAL.json` (N=30 discovery) · `C3_LAB_CONFIRMATION.json` (D1/D2 N=100) · `C3_LAB_COMPLETE.json` (authoritative close).

---

### C4 — BIG — 12-bead, 16-bead mini-wings (interpolation 10 → 16)

**1. Geometry / bead count**

- Lattice: **5×5 Alquerque + 4 wing nodes** from the 16-bead parent (not invented nodes).
- Add the equator wing pair on each side, using the existing 16-bead IDs and edges:
  - Left: `LIM` (−1,4) and `LM` (−2,4), linked as in `sholo-guti-fullturn-engine.cjs` (`A20–LIM–LM`)
  - Right: `RIM` (9,4) and `RM` (10,4), linked `A24–RIM–RM`
- Nodes: **29** (25 + 4).
- Beads: **12 vs 12** — 10-bead square occupancy **plus one bead on each of the two wing nodes per side**.
- Occupancy: 24/29 ≈ 83%.
- Centre: same empty centre file / middle node as 10-bead.

**2. Learns from**

- **Success:** 10-bead (square only) and 16-bead (square + full 6-node triangles).
- Vision: smaller games should be **subgraphs of the proven full board**, not new invented grids.
- 16-bead D1 is already fair (P1 52% / P2 48%, FPA +2.2 pp). Wings are part of that fairness, not decoration.

**3. Why the evidence suggests it may be good**

The only KEEP “big slice” is 10-bead (wings fully removed). The reference is 16-bead (wings fully present). Nothing in between has been tested. Mini-wings restore the distinctive Sholo side-pockets without jumping straight to 16. Occupancy stays in the band of boards that passed (70–80%+), unlike filling the 5×5 centre file (which would be 24/25 and almost blocked).

**4. What is new**

29-node board. Not 10-bead, not 16-bead, not a rectangle stretch. Literal subgraph of the certified parent.

**5. Expected risk / weakness**

- Wing beads can become “dead pockets” or, conversely, instant side-entry captures. Unknown without Lab.
- Closer to 16-bead D2 profile (long, move-cap heavy) than to 10-bead’s 8.9% D2 elimination. May feel slow.
- More nodes than 10-bead — search cost / branch caps matter; certify engine parity before verdicts.

**6. Why it deserves Lab testing**

It is the only candidate that asks the product question the ladder still cannot answer: **do the traditional wings earn their keep if you add just a little of them back?**

---

### C5 — ADDITIONAL MINI — 4-bead, 3×4, left–right (smallest faithful slice)

**1. Geometry / bead count**

- Lattice: **3 columns × 4 rows** (12 nodes), Alquerque 8-neighbour. **New size** (no 3×4 exists).
- Beads: **4 vs 4**.
- Start:

```text
1 . 2
1 . 2
1 . 2
1 . 2
```

- Occupancy: 8/12 ≈ 67% (same occupancy ratio as C1).
- Centre: empty file; amber on one of the two middle-file nodes (specify row 2 or both as a 2-node centre line before any Lab run).

**2. Learns from**

- Same 16/10 file-buffer as C1, one rank shorter.
- Failed 4-bead 3×5 sketch and INDEX_4 — both were *different* geometries (holes in ranks / two empty ranks). This tests whether **4 beads can work when the failure modes already seen are removed**.

**3. Why the evidence suggests it may be good**

Project goal is the **smallest** balanced Sholo. Both prior 4-bead tests failed for identified reasons. A 1-file slice on 4 ranks is the smallest geometry that still copies 16-bead’s facing pattern. If C1 (5-bead 5 ranks) works, C5 asks whether the fifth rank is necessary.

**4. What is new**

3×4 lattice never existed. Not a repeat of 4-bead sketches.

**5. Expected risk / weakness — this is the highest-risk candidate**

- Prior 4-bead D1 avgLength was **8.0** (on the G7 cliff) and **0/100** fairness. Short armies may still collapse under greedy search.
- No reserve, only 4 ranks — opening into the centre file may be a forced tactic for D1.
- **Do not treat a C5 G2 fail as proof that all 4-bead games are impossible** unless C1 also failed; C1 is the fairer 1-file test.

**6. Why it deserves Lab testing**

Only if the human wants the smallest-possible question answered. Otherwise run C1 first and skip C5 until C1 passes G2.

---

### C6 — ADDITIONAL BIG — 12-bead, 6×5 Alquerque (10-bead + one rank)

**1. Geometry / bead count**

- Lattice: **5 columns × 6 rows** (30 nodes), Alquerque 8-neighbour. **New size.**
- Beads: **12 vs 12** = two files × 6 ranks each, empty centre file:

```text
1 1 . 2 2
1 1 . 2 2
1 1 . 2 2
1 1 . 2 2
1 1 . 2 2
1 1 . 2 2
```

- Occupancy: 24/30 = 80% — **identical ratio to KEEP 10-bead** (20/25).
- Centre: empty file; amber on the two middle-file nodes between ranks 3–4, or the single node nearest the equator — decide before Lab, do not leave ambiguous.

**2. Learns from**

- KEEP 10-bead is this pattern on 5 ranks. C6 is the same pattern on 6 ranks.
- Distinct from C4 (mini-wings). C4 adds traditional side geometry; C6 stretches the square.

**3. Why the evidence suggests it may be good**

Same occupancy, same facing, same empty file as the best big slice. Capture-per-bead on 10-bead D2 is 0.60 vs 16-bead 0.37; an extra rank should move the profile *toward* 16-bead (longer, more attrition) without inventing wings. If 10-bead’s weakness is move-cap first-player skew (~18 pp in the centre study), C6 is where we learn whether that is “5×5 too small to resolve” or “the two-file pattern itself.”

**4. What is new**

6-row Alquerque is **not** a subgraph of the 5-row 16-bead parent. It is a scale-up, not a slice. That is a real novelty — and a tradition cost (see risk).

**5. Expected risk / weakness**

- **Board Fidelity / vision:** not a literal slice of the 37-point board. Weaker tradition claim than C4.
- 10-bead already stalls at D2 (91% move-cap). Extra rank likely **increases** move-cap % and may worsen first-player skew at resolution.
- Larger search tree; D3 batches will be slower.

**6. Why it deserves Lab testing**

It is the cleanest “bigger 10-bead” experiment. Run it **after** C4 if the question is tradition; run it **instead of** C4 only if the human prefers a rectangle over wings. Do not treat C4 and C6 as the same 12-bead board.

---

## How these map to the ladder holes

| Bead count | Existing | Proposed test |
|------------|----------|-----------------|
| 4 | REJECT (3×5 sketch + INDEX_4) | **C5** 3×4 left–right |
| 5 | REJECT (3×5 sketch only) | **C1** 3×5 left–right · **C2** 4×4 |
| 6 | KEEP (3×5 and 4×4) | none |
| 7 | KEEP (4×5 hourglass) | none |
| 8 | REJECT (4×5 full ranks) | **C3** 5×5 thinned 10-bead |
| 9 | never tested | not shortlisted (too close to C3; test C3 first) |
| 10 | KEEP | none |
| 12 | never tested | **C4** mini-wings · **C6** 6×5 stretch |
| 16 | REFERENCE | none |

---

## Design corrections before implementation (2026-08-16)

Human approved C1–C4 to build. Draft diagrams were re-checked against 16-bead connectivity, G2 failures, and KEEP playable graphs. Two corrections were applied **before coding**:

### C2 — opening-jump flaw (draft rejected)

Draft start emptied corners 3 and 12 for 180° symmetry:

```text
1 1 1 .
1 . . 1
2 . . 2
. 2 2 2
```

On 4×4 full box crosses, P1 at 4 can **jump over P2 at 8 onto empty 12** on the first move. That is the same class of opening tactic that produced D1 100% second-mover wins on the 4/5-bead 3×5 sketches. KEEP 4×4 6-bead does not have this jump because 12 is occupied.

**Implemented start** (still 180° symmetric, still empty 2×2 centre `[5,6,9,10]`): empty **back-rank** cells 1 and 14, keep corners occupied:

```text
1 . 1 1
1 . . 1
2 . . 2
2 2 . 2
```

Smoke confirmed **0 opening captures**.

### C4 — dangling outer-wing tip (draft rejected)

Draft added equator pair `LIM+LM` / `RIM+RM`. On the full 16-bead graph, `LM` has three neighbours (`LT`, `LB`, `LIM`). In a 2-node subgraph, `LM` would have **degree 1** — a cul-de-sac that is not how that node works on the parent.

**Implemented wings:** 16-bead **inner-wing triangles** only:

- Left: `LIT` + `LIM` linked to `A20` (all degree 2)
- Right: `RIT` + `RIM` linked to `A24` (all degree 2)

Still 12 vs 12, still a literal 16-bead subgraph, still 2 extra nodes per side. Slight top-of-equator bias (LIT is above LIM); left–right mirror symmetry is preserved.

### C1 and C3 — no geometry correction

- **C1:** left file / empty centre file / right file. Camps are not adjacent; no opening captures. Centre = single middle node of the empty file (same rule as KEEP 6-bead 3×5 / 10-bead). Display rotated so Ivory plays from the bottom (10-bead convention).
- **C3:** 10-bead two-file start minus outer-file far corners. Centre file empty; no opening captures. Not the REJECT 4×5 8-bead.

---

## Second design-review pass (2026-08-16, before Lab)

Re-examined C1–C4 against the 16-bead reference, KEEP 10/7/6/4×4, G2 rejects (3×5 4/5-bead sketches, 4×5 8-bead, Cursor Index 4), opening-feed vs KEEP sisters, connectivity/degree, centre occupancy, and feature-shell requirements.

**No playable geometry was changed.** Alternatives that looked tempting repeat a known G2 pattern or destroy the hypothesis being tested.

### C1 — survives

- Same 3×5 Alquerque graph as KEEP 6-bead; occupancy is the missing **1-file** slice (left / empty centre file / right), not the REJECT sketch (top–bottom with holes in row 2).
- Opening captures **0**. Camps are not adjacent. Centre = middle node of the empty file (KEEP 6/10 rule).
- Opening-feed (P1 slide that gives P2 an immediate capture): **84.6%** (11/13) — **identical to KEEP 10-bead**, which passed G2. The “slide into buffer → through-jump” pattern is the 16/10 success pattern, not a C1 defect.
- No reserve file is the hypothesis. Adding a second file would make this 10-bead on 3 columns (impossible) or abandon the 1-file test.

### C2 — survives

- Lattice and empty 2×2 centre match KEEP 4×4 6-bead, not Index 4’s empty belt.
- Implemented start (empty 1 and 14) still has **0 opening captures** and 180° symmetry. The rejected corner holes (3/12) remain rejected.
- Alternate back-rank holes (empty 2 and 13) were compared: **same** opening count (11), **same** feed **72.7%** (8/11), **same** 0 opening captures. KEEP 6 is 60% feed only because it still has full back ranks (6 vs 6). Switching 1/14 → 2/13 is not a structural improvement.
- Emptying wing-contact cells 4/11 would *remove* the vertical camp touch that KEEP 6 passed with — a different hypothesis, not a closer interpolation.
- Feed 72.7% is in the KEEP band (4×4 6-bead 60%, 7-bead 46%, 6-bead 3×5 71%). Not Index 4 / sketch class.

### C3 — survives

- 5×5 Alquerque + empty centre file = KEEP 10 parent, **not** the REJECT 4×5 even-width chop.
- Thinning outer-file **far corners** keeps the inner fighting line intact (opposite of punching holes in the front rank). Opening captures **0**.
- Opening-feed **57.9%** (11/19) is *safer* than KEEP 10 (84.6%) because empty corners are retreats, not a new forced-feed. Extra empty nodes sit at the rear, not in Index 4’s middle belt.
- Thinning inner-file ends instead would be a **separate** candidate; mixing starts in one Lab batch would confound the result.

### C4 — survives (bias accepted, not “fixed”)

- Inner-wing triangles LIT+LIM–A20 / RIT+RIM–A24 remain the only **2-node** 16-bead wing pair with all degrees ≥ 2.
- Vertically symmetric pair LIT+LIB omits LIM: both become **degree-1** pendants on A20, and LIT–A20–LIB is **not collinear**, so they cannot jump through A20. That is worse than the LM cul-de-sac already rejected.
- Occupying LIT+LIB while leaving LIM on the graph as an empty hole is the wing analogue of the REJECT 5-bead sketch (hole in a starting line). Do not do that.
- Full inner columns (LIT+LIM+LIB) are **13 vs 13**, not C4.
- Top-of-equator bias remains a **confound** (this tests half-height inner triangles, not “wings in general”), but it does **not** break P1/P2 fairness: left–right mirror maps LIT/LIM onto RIT/RIM. 16-bead wing beads also start locked inside an own-colour triangle; C4 copies that.
- Opening-feed **84.6%**, same as KEEP 10, as expected: wing beads have no legal opening move until A20/A24 steps away.

### Lab protocol (unchanged, comparable)

D1/D2/D3 · seeds **101/202/303** · **N=30**/seed · move-cap **120**. Do not raise N for these candidates. Borderline later → confirmation batch, not a protocol change.

---

## Playables built (2026-08-16)

Smoke: `prototype/board4/verify-sholo-c1-c4-feature.cjs` → `SHOLO_C1_C4_FEATURE_SMOKE.json` — **allOk true**. Lab later: **C1/C2/C4 REJECT (G2)** · **C3 G1–G9 PASS** at N=100 (`C3_LAB_COMPLETE.json`) · human playtest remaining for C3 only.

| ID | File | Lab |
|----|------|-----|
| C1 | `SHOLO_GUTI_5_BEAD_3x5_LR_WITH_FEATURE.html` | REJECT G2 |
| C2 | `SHOLO_GUTI_5_BEAD_4x4_WITH_FEATURE.html` | REJECT G2 |
| C3 | `SHOLO_GUTI_8_BEAD_5x5_WITH_FEATURE.html` | G1–G9 PASS · human playtest |
| C4 | `SHOLO_GUTI_12_BEAD_MINIWING_WITH_FEATURE.html` | REJECT G2 |

---

## Baro Guti 12-bead — traditional candidate (2026-08-16)

**Distinct from C4 (mini-wings) and C6 (6×5 stretch).** User-requested **traditional/proven** 12-bead = **Baro Guti / Bara Guti / Alquerque 12** on the **5×5** lattice (Murray 1951; Ludii Bára Guti; OMerkel Alquerque README; regional Bead 12 apps).

### Geometry (exact)

- **Lattice:** 5×5 Alquerque, 25 nodes, 72 edges (same graph as KEEP 10-bead).
- **Beads:** 12 vs 12 — classic rank camps, **not** the SmartBeads empty-centre-file pattern.

```text
1 1 1 1 1   (rows 0–1: P1 full)
1 1 1 1 1
2 2 . 1 1   (row 2: P2 a3 b3 · centre A22 empty · P1 d3 e3)
2 2 2 2 2   (rows 3–4: P2 full)
2 2 2 2 2
```

- **Centre rule:** single amber node A22 (x=4,y=4) — starts empty; Off / Cumulative / End-Game applicable.
- **Opening:** 4 legal P1 slides; **zero opening captures** (smoke verified).

### Files

| Role | File |
|------|------|
| Playable | `SHOLO_GUTI_12_BEAD_BARO_WITH_FEATURE.html` |
| Lab engine | `sholo-12-bead-baro-fullturn-engine.cjs` |
| Smoke | `verify-sholo-12-bead-baro-feature.cjs` → `SHOLO_12_BARO_FEATURE_SMOKE.json` |
| Lab | `evaluate-12-bead-baro-lab.cjs` → `BARO_12_LAB_EVALUATION.json` |

### Lab verdict: **REJECT (G2)**

Protocol: D1/D2/D3 · seeds 101/202/303 · N=30/seed · move-cap 120 · parity **pass**.

| Depth | P1 win% | P2 win% | FPA | elim% | move-cap% | avg caps |
|-------|---------|---------|-----|-------|-----------|----------|
| D1 | 0 | 100 | **−50 pp** | 100 | 0 | 16.0 |
| D2 | 0 | 27.8 | **−50 pp** | 27.8 | 72.2 | 15.9 |
| D3 | 1.1 | 37.8 | **−47.1 pp** | 38.9 | 61.1 | 19.8 |

**G2 failure:** extreme **second-mover advantage** — among decisive games at D2, P2 won **25/25** when P1 opened; first-player swap confirms whoever moves **second** wins all decisive games (13/13 and 12/12). G1, G3–G9 pass.

**Compare D2 vs reference family:**

| Board | FPA D2 | capture/bead D2 | elim% D2 |
|-------|--------|-----------------|----------|
| 16-bead REF | +50 pp* | 0.37 | 0 |
| KEEP 10-bead | +50 pp* | 0.60 | 8.9 |
| **Baro 12** | **−50 pp** | **0.66** | **27.8** |

\*Among games with a winner; most reference/10-bead D2 games are move-cap draws.

Traditional pedigree did **not** imply Lab pass. Rank-camp occupancy on 5×5 behaves unlike the KEEP empty-centre-file slice. **Do not promote.** C6 (6×5 stretch) was tested as **D4** in round 2 — NFT, heavy D2 stall.

---

## Discovery round 2 — D1–D5 (2026-08-17)

Built + Lab: `generate-discovery-round2.cjs` · `evaluate-d1-d5-lab.cjs` → `D1_D5_LAB_EVALUATION.json`.

| ID | Beads | Lattice | Verdict |
|----|-------|---------|---------|
| D1 | 9 | 5×5 one-corner thin | **REJECT G2** |
| D2 | 7 | 5×5 thin hourglass | **NEEDS FURTHER TESTING** |
| D3 | 5 | 3×5 rear-wing thin | **REJECT G2** |
| D4 | 12 | 6×5 two-file (= C6) | **NEEDS FURTHER TESTING** |
| D5 | 4 | 3×5 rear corners | **NEEDS FURTHER TESTING** |

---

## Final round — F1b–F5b (2026-08-17)

Built 7 of 11 proposed; skipped **C5, F3a, F5a, F4a**. Lab: `evaluate-final-round-lab.cjs` → `FINAL_ROUND_LAB_EVALUATION.json`.

| ID | Beads | Lattice | Verdict |
|----|-------|---------|---------|
| F1b | 5 | 4×3 hourglass | **REJECT G2** |
| F2b | 7 | 4×4 dense cross | **NEEDS FURTHER TESTING** — best new board |
| F3b | 8 | 5×4 two-file | **REJECT G2** |
| F1a | 8 | 4×6 hourglass | **NEEDS FURTHER TESTING** |
| F2a | 12 | 5×7 C3 corners | **NEEDS FURTHER TESTING** |
| F4b | 10 | 4×6 hourglass | **REJECT G2** |
| F5b | 12 | 4×7 hourglass | **REJECT G2** |

Combined non-REJECT ranking: `ALL_NON_REJECT_LAB_RANKING.json` · full tables in `WEB_REPORT_All_BEAD_05P.md`.

---

## What Lab must measure if a human later approves builds

Same certified protocol as the 16-bead anchor — no new gates:

- D1 / D2 / D3 · seeds **101, 202, 303** · **N=30**/seed · move-cap **120**
- Authoritative verdict only from `evaluate-ladder-lab.cjs` (or Cursor Index evaluator for C2)
- Geometry guards: node count, start fingerprint, not silently 16-bead
- Report G2 in plain language: who opened, who won more, exact P1/P2 %, depth
- Capture-per-bead vs 16-bead D2 (~0.37) and vs the sister KEEP board (10-bead 0.60 or 4×4 6-bead 0.55)
- Do **not** pick centre rule, timers, or resignation in the same experiment

**This report does not claim any candidate will pass.** It claims each one is a *different* hypothesis from boards already rejected, grounded in what passed.

---

## Cursor prompt (optional human edit)

If adding a line to `CURSOR_PROMPT_01.md`, the useful constraint is:

> New ladder boards must be subgraphs or occupancy variants of a G1–G9 survivor (16-bead, 10-bead 5×5, 4×4 full box cross, or 3×5). Do not re-chop 5×5 to even width (4×5 8-bead already G2-failed). Do not punch holes in 3×5 starting ranks (4/5-bead sketches already G2-failed). Discovery before build: see `BOARD_DISCOVERY_05P.md`.

Do not add that text unless the human approves an edit to `CURSOR_PROMPT_01.md`.
