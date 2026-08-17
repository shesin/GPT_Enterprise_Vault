# SmartBeads Lab Terminology (05P)

Plain-language definitions for every Lab and board-testing term used in SmartBeads reports.

**Read this before interpreting any Lab number.**

This document covers **headless board Lab only**. Match timers, turn shot clocks, BGM, undo, and UI polish are **product features** — tested separately; their code correctness does **not** prove the timer values are good for humans.

---

## How to use this document

Each term includes:

1. **What it means**
2. **Why we measure it**
3. **What useful information it gives us**
4. **What it does NOT prove**

---

## Core Lab concepts

### Headless Lab

| | |
|---|---|
| **Means** | Games run in Node.js with no browser, canvas, or human. Two AIs play using the same move rules as the playable HTML. |
| **Why** | Batch hundreds of games quickly with fixed settings so results are comparable. |
| **Useful for** | Detecting broken geometry, stuck games, capture bugs, and rough balance signals under fixed AI. |
| **Does NOT prove** | That humans will enjoy the game, that UI timers feel fair, or that AI strength matches human skill. |

### Standard 16-bead Sholo Guti (reference board)

| | |
|---|---|
| **Means** | The traditional 37-intersection board, 16 vs 16 beads, implemented in `SHOLO_GUTI.html` and `sholo-guti-fullturn-engine.cjs`. |
| **Why** | Calibration reference. All candidate boards are compared against this ruleset and Lab protocol. |
| **Useful for** | Proving the Lab instrument works before testing new geometries. |
| **Does NOT prove** | That smaller slice boards (10/8/7/6/5) are good product choices. |

### Seed

| | |
|---|---|
| **Means** | A number that fixes AI random tie-breaks so the same seed produces the same game sequence. |
| **Why** | Reproducibility — another run with the same seed must match. |
| **Useful for** | Debugging, regression checks, comparing code changes. |
| **Does NOT prove** | That one seed’s outcome is typical; always use multiple seeds. |

### N (games per seed)

| | |
|---|---|
| **Means** | How many games are played for each seed at each depth setting. |
| **Why** | Sample size — too small N gives noisy percentages. |
| **Useful for** | Judging stability of a metric across runs. |
| **Does NOT prove** | Statistical certainty by itself; N=30 is validation-sized, not final product sign-off. |

### Move-cap (Lab safety stop)

| | |
|---|---|
| **Means** | Lab-only turn limit (default **120**). When reached, the game is recorded as a draw with reason `move_cap_lab_safety`. |
| **Why** | Prevents infinite games in batch testing. |
| **Useful for** | Seeing whether games finish naturally before the harness stops them. High move-cap % = games were still contested when stopped. |
| **Does NOT prove** | A “bad board.” Move-cap is **not** a traditional Sholo rule. High move-cap % under honest AI often means attrition, not breakage. |

### Reproducibility

| | |
|---|---|
| **Means** | Running the same depth + seed + N twice yields identical game fingerprints. |
| **Why** | If results drift without code changes, the instrument is untrustworthy. |
| **Useful for** | Trust gate before any board-quality verdict. |
| **Does NOT prove** | That metrics are meaningful — only that the harness is deterministic. |

### Branch limit

| | |
|---|---|
| **Means** | Cap on how many complete-turn continuations the AI explores per decision (root branch / reply branch / chain depth max 8). |
| **Why** | Full game tree is too large; limits keep batch runs feasible. |
| **Useful for** | Knowing AI may miss deep tactics — reported in `SEARCH_LIMITS` and `describeSearchSemantics`. |
| **Does NOT prove** | Perfect play. Truncation can change outcomes vs unlimited search. |

---

## Players and outcomes

### P1 / P2

| | |
|---|---|
| **Means** | Lab labels for the two sides. P1 moves first in baseline batches unless noted. In playables, P1 is typically Ivory (human bottom). |
| **Why** | Consistent reporting of wins, captures, and first-player effects. |
| **Useful for** | Win rates and capture balance between sides. |
| **Does NOT prove** | Physical bead colour mapping in every HTML file without checking that playable. |

### Elimination

| | |
|---|---|
| **Means** | One side captured all opposing beads → that side wins. |
| **Why** | Primary traditional win condition. |
| **Useful for** | Whether games can finish decisively under Lab AI. |
| **Does NOT prove** | “Better board.” Low elimination % with high captures can still be healthy attrition. |

### Stalemate

| | |
|---|---|
| **Means** | Side to move has no legal move → opponent wins. |
| **Why** | Legitimate tactical win in Sholo Guti. |
| **Useful for** | Detecting blocked positions and rule implementation correctness. |
| **Does NOT prove** | Design flaw — can be rare and still valid. |

### Repetition (draw)

| | |
|---|---|
| **Means** | Same board + side-to-move occurred 3 times → draw. |
| **Why** | Standard draw rule in the Lab engine. |
| **Useful for** | Cycle detection and long-game behaviour. |
| **Does NOT prove** | Broken AI — repetition draws are **legitimate** outcomes. |

### Draw

| | |
|---|---|
| **Means** | No winner: repetition draw or move-cap Lab stop. |
| **Why** | Splitting draws avoids mislabelling move-cap stops as “bad games.” |
| **Useful for** | `drawPct`, `repetitionDrawPct`, `moveCapDrawPct` separately. |
| **Does NOT prove** | Board is broken. Draws are valid. |

### Games with a winner (`elimOrStalematePct` / legacy `forcedWinPct`)

| | |
|---|---|
| **Means** | Percent ending by elimination **or** stalemate (someone won). |
| **Why** | Measures how often Lab AI reaches a rule-based winner before move-cap. |
| **Useful for** | Game-ending profile under fixed AI and move-cap. |
| **Does NOT prove** | Fun or balance. **Never call this “decisive.”** |

### First-player advantage (FPA)

| | |
|---|---|
| **Means** | Among games with a winner, what % did the first player win, minus 50 pp. |
| **Why** | Fairness signal — large skew may indicate board or AI asymmetry. |
| **Useful for** | Flagging boards where going first dominates. |
| **Does NOT prove** | Human-perceived fairness if sample has almost no winners (FPA undefined). |

---

## AI depth (D1 / D2 / D3)

### Complete turn

| | |
|---|---|
| **Means** | One player’s full turn: optional slide, or one or more capture hops (Capture Optionality — may stop after any legal hop). |
| **Why** | Matches human Sholo rules; old hop-by-hop search was misleading. |
| **Useful for** | Honest AI depth labels. |
| **Does NOT prove** | Human move structure in timed UI. |

### D1 (Easy / greedy)

| | |
|---|---|
| **Means** | AI picks best immediate complete turn (captures weighted); **0** opponent reply plies searched. |
| **Why** | Sanity baseline — fast, tactical. |
| **Useful for** | Smoke tests, very short games, capture presence. |
| **Does NOT prove** | Medium/Hard playable strength. |

### D2 (Medium / primary Lab depth)

| | |
|---|---|
| **Means** | AI searches **1 full opponent turn** reply after each candidate turn. |
| **Why** | Primary comparison depth (`PRIMARY_DEPTH = 2`) under `comparisonProtocol`. |
| **Useful for** | Contested play: captures, length, win/draw split, FPA when winners exist. |
| **Does NOT prove** | Deep strategy. On 16-bead, D2 often hits move-cap before elimination — that is a **measurement profile**, not broken rules. |

### D3 (Hard / secondary Lab depth)

| | |
|---|---|
| **Means** | AI searches **2 full opponent turn** replies. |
| **Why** | Longer-horizon attrition check. |
| **Useful for** | `avgCaptures`, `avgLength`, move-cap and repetition rates. |
| **Does NOT prove** | Ranking boards by D3 elimination % alone — **explicitly blocked** by comparison guards. |

---

## Metrics (batch summaries)

### eliminationPct

| | |
|---|---|
| **Means** | % of games won by capturing all enemy beads. |
| **Why** | Natural finish rate under Lab settings. |
| **Useful for** | GAME ENDING ruler dimension. |
| **Does NOT prove** | Higher is better. |

### avgCaptures / avgLength

| | |
|---|---|
| **Means** | Mean total captures and turns per game in the batch. |
| **Useful for** | ALIVENESS and CAPTURE DYNAMICS rulers. |
| **Does NOT prove** | Optimal pacing for humans. |

### moveCapDrawPct / repetitionDrawPct

| | |
|---|---|
| **Means** | % of games ending by Lab move-cap or repetition rule. |
| **Useful for** | Separating artificial stops from natural endings. |
| **Does NOT prove** | Board rejection by itself. |

### p1WinPct / p2WinPct

| | |
|---|---|
| **Means** | % of all games won by P1 or P2. |
| **Useful for** | Side balance under AI (with first-player context). |
| **Does NOT prove** | Human win rates. |

---

## Board-quality ruler (every future board)

The Lab must answer these seven questions. **More elimination ≠ better.**

| Ruler | Question | Primary metrics |
|-------|----------|-----------------|
| **BREAKAGE** | Does the game break, crash, or get stuck? | Crash-free batches, legal `endReason`, parity checks |
| **FAIRNESS** | Meaningful P1/P2 advantage? | FPA, first-player swap, p1/p2 win and capture balance |
| **ALIVENESS** | Meaningful interactions and captures? | `avgCaptures`, `avgLength`, opening move count |
| **GAME ENDING** | Natural endings vs Lab safety stop? | `eliminationPct`, stalemate, `moveCapDrawPct`, `repetitionDrawPct` |
| **CAPTURE DYNAMICS** | Healthy chains vs abnormal collapse? | Chain optional stop/continue enumerated, capture variance |
| **AI RELIABILITY** | Stable across depths/seeds vs AI-limited? | D1/D2/D3 differ, reproducibility, branch limits documented |
| **STABILITY** | Similar behaviour across seeds? | Per-seed summaries, reproducibility |

Verdict labels for a **board** (not the instrument):

- **GOOD** — Passes breakage checks; healthy aliveness; endings are explainable; no parity mismatch.
- **NEEDS FURTHER TESTING** — Instrument OK but human play, larger N, or longer move-cap needed before product use.
- **BROKEN** — Parity failure, crashes, illegal moves, or stuck states.

These describe **board health**. They do **not** by themselves answer the product question *“which board in the ladder should we keep?”* — see **Board selection criteria** below.

---

## Board selection criteria (ladder: 16 / 10 / 8 / 7 / 6 / 5 / 4)

**The question this section answers:**

> *Why should we keep this board rather than the other candidates?*

The seven rulers diagnose health. **Board selection** adds mandatory gates, comparative evidence against the **16-bead reference**, and explicit **KEEP / REJECT / NEEDS FURTHER TESTING** labels for the product ladder.

**Rules of this methodology**

- **No composite score.** Do not rank boards by a single number or weighted formula.
- **No “higher elimination = better.”** Elimination must be *possible*; dominance by elimination % is not a KEEP reason.
- **Draws are legitimate.** High move-cap % or repetition % alone is **not** REJECT.
- **Same protocol for every board.** D1/D2/D3, seeds 101/202/303, move-cap 120, honest depths, geometry guards — identical to 16-bead baseline unless a human explicitly changes protocol for all boards.
- **16-bead is the anchor, not a competitor.** It calibrates the instrument and supplies **reference bands**. Candidates are compared *to* it and *to each other* in prose, not declared winners by default.

### Three selection verdicts

| Verdict | Plain meaning | Typical next step |
|---------|---------------|-------------------|
| **PASS** | All mandatory gates passed. Board is **structurally sound** and safe to keep in the test pool. | Continue comparative Lab runs; schedule human playtest. |
| **REJECT** | At least one **automatic REJECT trigger** fired. Clear structural or gameplay weakness under Lab. | Remove from ladder unless geometry/rules are fixed and re-tested. |
| **NEEDS FURTHER TESTING** | Gates passed (or inconclusive fairness only), but **KEEP evidence is incomplete** — ambiguous vs reference, thin sample, or Lab-only with no human check. | Larger N, optional longer move-cap experiment, human playtest, then re-decide. |
| **KEEP** | **Product decision** — not Lab-only. All PASS gates, no REJECT triggers, comparative rationale documented, **human playtest completed**. | Shortlist for product; may still lose to another KEEP candidate after ladder review. |

**PASS ≠ KEEP.** PASS means “keep testing.” KEEP means “we are willing to ship this geometry pending final human ladder choice.”

### Feature Test (product settings — after KEEP)

**Separate from board selection.** Once a board has **human-confirmed KEEP** (not Web NEEDS FURTHER TESTING alone), run **`evaluate-feature-test-lab.cjs`** on entries in **`FEATURE_TEST_KEEP_REGISTRY.json`**.

| # | Feature | Lab output |
|---|---------|------------|
| 1 | Centre rule | AI recommendation from measurable batches (D1/D2/D3, N=30, seeds 101/202/303) |
| 2 | Cumulative capture rule | AI recommendation (same protocol) |
| 3 | End condition — max moves / unlimited | AI recommendation (same protocol) |
| 4 | Match timer | **Technically viable range only** — no final minutes value |
| 5 | Shot clock | **Technically viable range only** — no final seconds value |

**Out of scope:** resignation (`not yet decided`). **16-bead** is REFERENCE ANCHOR — not a KEEP Feature Test target. Report: **`WEB_FEATURE_TEST_05P.md`**.

### Mandatory gates (all must pass for PASS)

Each gate is evaluated at **primary depth D2** unless noted. Use 16-bead reference bands where indicated.

| # | Gate | What we check | PASS signal | Does NOT prove |
|---|------|---------------|-------------|----------------|
| G1 | **No breakage** | Parity playable↔Lab engine; crash-free batch; legal `endReason`; no zero-turn stuck states | Same checks as trust gate + geometry guards for this board | Human UX |
| G2 | **No meaningful side bias** | First-player fairness | See **Fairness rule** below | Perfect human balance |
| G3 | **Game alive** | Movement and captures throughout | D2 `avgCaptures` and `avgLength` show contested play; D1 not frozen | Optimal pacing |
| G4 | **Captures matter** | Captures change material, games not trivial | D1 shows captures and (usually) eliminations or long contest; not near-zero capture both depths | Every game must end in elimination |
| G5 | **Elimination possible** | Win condition reachable | D1 and/or D3 shows elimination > 0% in validation sample, **or** D1 avgCaptures shows material exchange leading toward eliminations | Higher elimination % is better |
| G6 | **Draws legitimate** | Repetition and move-cap not scored as failure | Report `repetitionDrawPct` and `moveCapDrawPct` separately; do not REJECT for draws alone | Board is fun |
| G7 | **Reasonable length for this board** | Games not instant collapse or absurd grind | D2 `avgLength` not trivially tiny (< 5); profile explainable vs 16-bead reference (see **Length rule**) | Exact turn count target |
| G8 | **Understandable across depths/seeds** | D1/D2/D3 differ predictably; per-seed not wildly contradictory | Reproducible; D3 avgCaptures ≥ D2 or longer horizon explained; no single-seed outlier driving verdict | Statistical proof |
| G9 | **Same validated protocol** | Compare script uses same N, seeds, move-cap, depths as reference | Geometry verified not silent 16-bead; `comparisonProtocol` documented | — |

#### Fairness rule (G2) — no invented FPA threshold

Use the method already proven on 16-bead (`final-validate-sholo-lab.cjs`):

- **When games with a winner exist (D2 or D1 sample):** first-player win rate among winners should not diverge wildly between “P1 moves first” and “P2 moves first” batches — use the same **±35 pp** symmetry check as the trust gate, or report FPA and flag for human review if sample is tiny (< 10 winners).
- **When almost no winners (common at D2 on 16-bead):** compare **avgCaptures** between first-P1 and first-P2 batches — reference allowed **±3 captures** on 16-bead; candidates should be **within the same absolute band** unless bead count explains a difference.
- **Automatic REJECT for fairness:** P1 wins ~100% of all games at D2 with large N, **or** first-player capture volume double second-player with no bead-layout explanation.
- **D1 greedy bound (implemented in `sholo-lab-gates.cjs`):** `|firstPlayerAdvantagePp| > 35` with ≥30 winners fails G2. Example: 7-bead D1 20%/80% (FPA −30) **PASS**; 4/5-bead D1 0%/100% (FPA −50) **REJECT**. D2 remains the primary contested depth. Swap FPA comparison applies only when **both** swap arms have ≥10 winners.

#### Length rule (G7) — anchored to 16-bead, not a universal turn cap

From validated 16-bead reference (`LAB_16_BEAD_REFERENCE_VALIDATION.json`):

| Depth | 16-bead reference (anchor) | How to judge a candidate |
|-------|---------------------------|---------------------------|
| D1 | avgLength ~54, avgCaptures ~28, 100% elimination | Smaller boards may be shorter; REJECT only if D1 avgLength < 8 **and** avgCaptures < 2 |
| D2 | avgLength ~120 (move-cap), avgCaptures ~12, ~99% move-cap | Same move-cap stop is **normal**; REJECT if D2 avgLength < 5 (instant termination) |
| D3 | avgLength ~119, avgCaptures ~24 | Use for attrition comparison, not elimination ranking |

**Establishing new numeric bands:** If the ladder adds a board size far from 16-bead, run PASS protocol first, then compare **capture-per-bead** (avgCaptures / starting beads) and **length ratio** to 16-bead — document the ratio in the board report. Do not copy 16-bead percentages as targets.

#### Aliveness floor (G3/G4) — from shared gate module, not compare scripts

`sholo-lab-gates.cjs` (used only by `evaluate-ladder-lab.cjs` and `evaluate-cursor-index-lab.cjs`) encodes evidence-based **REJECT triggers**:

- **REJECT:** D1 and D2 both avgCaptures < 2 — no contested play.
- **REJECT:** D2 avgLength < 5 — games end almost immediately.

Compare scripts (`compare-sholo-*-vs-16-lab.cjs`) emit **metrics and geometry evidence only**. They must **not** emit KEEP / REJECT / NEEDS FURTHER TESTING. Run `evaluate-ladder-lab.cjs` for the authoritative G1–G9 **selectionVerdict**.

**G2 fairness failure** → authoritative evaluator emits **REJECT** with reject trigger `g2_fairness_fail` (not NEEDS FURTHER TESTING).

These are **structural failure** detectors, not “quality scores.”

### Evidence REQUIRED before calling a board **KEEP**

All of the following must be true:

1. **INSTRUMENT_VALID** for the Lab (16-bead reference validated).
2. **PASS** on all nine mandatory gates for this candidate.
3. **Geometry verified** — Lab engine matches playable; not silently 16-bead (`geometryVerifiedNotSilent16Bead`).
4. **Same-protocol compare vs 16-bead** completed and archived (JSON + report section).
5. **Comparative rationale written in plain language:** why this board over at least one other ladder member (e.g. shorter game with similar capture activity, better D1 fairness, fewer move-cap-only endings than reference *if* that matters to product — stated explicitly, not assumed).
6. **Human playtest** — at least one session on the feature playable, confirming captures feel meaningful and games do not feel broken. Lab cannot satisfy this alone.
7. **Ladder review** — if multiple boards are KEEP, human chooses among them; Lab does not auto-pick one winner.

### Evidence that automatically prevents **KEEP** (REJECT triggers)

Any one of these → **REJECT** (stop ladder promotion; fix or abandon):

| Trigger | Detection |
|---------|-----------|
| Parity / geometry guard failure | playable N, coords, or start ≠ Lab engine |
| Crash, illegal `endReason`, or stuck game in validation batch | exception or zero-turn loop |
| Near-zero contest | D1 **and** D2 avgCaptures < 2 |
| Instant games | D2 avgLength < 5 |
| Broken opening | 0 legal opening moves for either side |
| Silent wrong board | candidate metrics identical to 16-bead fingerprint / wrong N |
| Extreme side dominance | measurable P1/P2 win skew > 35 pp between first-player swaps **or** ~100% one-side wins at D2 with adequate sample |
| D1 sanity failure | no eliminations and avgCaptures < 2 at D1 |

**NEEDS FURTHER TESTING** (not REJECT, but blocks KEEP) when:

- Gates pass but N < 30 per seed and metrics flip verdict between seeds.
- Compare vs 16-bead is ambiguous (similar capture profile, no written comparative advantage).
- Only headless Lab complete — human playtest missing.
- Fairness inconclusive (too few winners, capture symmetry borderline) — extend sample or run first-player swap batch.
- Both candidate and 16-bead show D2 move-cap dominance — optional **paired** longer move-cap run on candidate **and** reference together (same cap, both boards) before claiming “finishes faster.”

### How to compare the ladder (16 vs 10 vs 8 vs 7 vs 6 vs 5 vs 4)

Use a **decision table**, not a leaderboard:

1. Run **validate-lab-16-bead-reference** (once per instrument change).
2. For each candidate: geometry guards + same-protocol compare batch (metrics only) → run **evaluate-ladder-lab.cjs** for PASS / REJECT / NEEDS FURTHER TESTING.
3. Eliminate all **REJECT** boards from KEEP consideration.
4. Among **PASS** boards, compare **relative strengths** in prose:
   - **Session length** (D1 avgLength, D2 move-cap profile)
   - **Capture activity** (D2 avgCaptures, capture-per-bead)
   - **Fairness** (D1 FPA or capture symmetry)
   - **Natural endings** (elimination possible at D1/D3; stalemate/repetition rates)
   - **Product fit** (human playtest notes — timers, board size, teachability)
5. **KEEP** only boards with explicit comparative advantage **and** human sign-off.
6. If two boards both PASS and human likes both → **NEEDS FURTHER TESTING** head-to-head human sessions, not another Lab score.

**Why keep board X rather than Y?** The report must answer in one short paragraph per pair considered, citing gate results and metrics — never “score 7.2 vs 6.8.”

### Reference bands from 16-bead (calibration anchor)

Use these **measured** values from `LAB_16_BEAD_REFERENCE_VALIDATION.json` (2026-08-13) when interpreting candidates — they are **not targets to beat**:

| Metric | D1 | D2 | D3 |
|--------|----|----|-----|
| avgCaptures | 27.6 | 11.7 | 24.1 |
| avgLength | 54.2 | 119.9 | 119.2 |
| eliminationPct | 100% | 0% | 4.4% |
| moveCapDrawPct | 0% | 98.9% | 95.6% |
| Games with a winner | 100% | 1.1% | 4.4% |

**Interpretation:** 16-bead at D2 is **supposed to** hit move-cap often under honest AI. A candidate with **higher** D2 elimination % is not automatically better — ask whether eliminations are **healthy** (reasonable length, captures along the way) or **collapsed** (very short blowouts). A candidate with **lower** D2 avgCaptures than ~12 may be dead — gate G3/G4.

---

## Product features (NOT board Lab)

### Match timer

| | |
|---|---|
| **Means** | Product setting: clock for entire match (minutes). |
| **Lab scope** | **Out of scope** for headless board Lab. |
| **Verify separately** | Code reads config and decrements clock in playable HTML. |
| **Does NOT prove** | 20/30/40 min (or any values) are right for humans. |

### Turn shot clock

| | |
|---|---|
| **Means** | Product setting: per-turn seconds limit. |
| **Lab scope** | **Out of scope** for headless board Lab. |
| **Verify separately** | Code applies shot limit in playable. |
| **Does NOT prove** | 5/10/15 sec (or any values) are right for humans. |

### BGM / undo / move highlight / UI

| | |
|---|---|
| **Means** | Playable shell features. |
| **Lab scope** | Not measured by headless engine. |
| **Does NOT prove** | Board quality. |

---

## Playable Level 1/2/3 vs Lab D1/D2/D3 (certification)

Rules and geometry must match between browser playable and headless Lab. **AI depth labels are not interchangeable.**

| | Browser playable (`SHOLO_GUTI.html`) | Headless Lab (`sholo-guti-fullturn-engine.cjs`) |
|---|--------------------------------------|--------------------------------------------------|
| Role | Human P1 vs AI P2 only | Symmetric AI-vs-AI batch |
| Level 1 / D1 | Greedy max-captures; no opponent reply search | Greedy complete turn + light eval; 0 reply plies |
| Level 2 / D2 | Static eval after own turn only (**0** opponent replies) | **1** opponent complete-turn reply |
| Level 3 / D3 | One opponent complete-turn reply | **2** opponent complete-turn replies |
| Randomness | Unseeded `Math.random()` tie-breaks | Seeded per game |
| Repetition / move-cap | None in interactive play | 3-fold repetition draw + move-cap 120 |

**Reporting rule:** Never imply Lab D2 metrics describe browser Level 2 human-vs-AI strength or game length. Canonical source: `sholo-lab-protocol.cjs` → `PLAYABLE_VS_LAB_DEPTH`.

---

## Authoritative verdict path (certification)

| Script | May emit board verdict? |
|--------|-------------------------|
| `evaluate-ladder-lab.cjs` | **Yes** — sole Sholo ladder `selectionVerdict` |
| `evaluate-cursor-index-lab.cjs` | **Yes** — sole Cursor Index `selectionVerdict` |
| `compare-sholo-*-vs-16-lab.cjs` | **No** — metrics, diffs, geometry guards only |
| `sholo-lab-gates.cjs` | Internal gate logic only (imported by evaluators) |

Run `audit-lab-verdict-paths.cjs` after instrument changes to confirm no second verdict path exists.

---

## Canonical Sholo protocol (N, seeds, depths)

Single source: **`sholo-lab-protocol.cjs`**

- N per seed: **30**
- Seeds: 101, 202, 303
- Depths: 1, 2, 3
- Move-cap: 120
- Games per board: **270**
- Games per compare run (candidate + reference): **540**

Reference validation, compare scripts, and `evaluate-ladder-lab.cjs` G9 must all read this module. No hardcoded competing N values.

**Cursor Index 4×4 (2026-08-15):** Uses the **same** `sholo-lab-protocol.cjs` batch (N=30, move-cap 120, seeds 101/202/303, D1/D2/D3) via `evaluate-cursor-index-lab.cjs`. Legacy `cursor-index-lab-protocol.cjs` (N=50, move-cap 40) is **not** the authoritative path for current playables.

---

## Instrument vs board verdict

| Verdict type | Meaning |
|--------------|---------|
| **INSTRUMENT_VALID** | Lab matches playable 16-bead rules; honest D1/D2/D3; reproducible; crash-free. Safe to compare **same-protocol** candidate boards. |
| **INSTRUMENT_INVALID** | Parity mismatch, fake depth, crash, or reproducibility failure. **Stop** — no board-quality verdict until fixed. |
| **Board GOOD / NEEDS FURTHER TESTING / BROKEN** | Applies to a **geometry**, using the seven rulers above. |
| **Board PASS / REJECT / NEEDS FURTHER TESTING / KEEP** | Ladder selection — see **Board selection criteria**. |

---

## Related files

**Web reports (SmartBeads root):**

| File | Role |
|------|------|
| `LAB_TERMINOLOGY_05P.md` | Glossary + board-quality ruler (this file) |
| `WEB_REPORT_16_BEAD_05P.md` | 16-bead baseline board-quality report |
| `WEB_REPORT_All_BEAD_05P.md` | All-board ladder + Cursor Index verdicts |
| `WEB_FEATURE_TEST_05P.md` | Feature Test (KEEP boards only) — settings & timer viable ranges |
| `BOARD_DISCOVERY_05P.md` | Discovery shortlist + C1–C4 / Baro Lab outcomes |

**Lab harness (`prototype/board4/`):**

| File | Role |
|------|------|
| `sholo-guti-fullturn-engine.cjs` | 16-bead headless engine |
| `sholo-lab-metrics.cjs` | Aggregation + comparison guards + `TERM_GLOSSARY` |
| `final-validate-sholo-lab.cjs` | 25-check trust gate |
| `validate-lab-16-bead-reference.cjs` | Reference validation + baseline batch |
| `sholo-lab-protocol.cjs` | Canonical N/seeds/depths + playable-vs-Lab depth documentation |
| `sholo-lab-gates.cjs` | Shared G1–G9 gate logic + authoritative `ladderVerdict()` |
| `evaluate-ladder-lab.cjs` | Authoritative Sholo ladder G1–G9 **selectionVerdict** |
| `evaluate-cursor-index-lab.cjs` | Authoritative Cursor Index G1–G9 **selectionVerdict** (active playable; audit in combined JSON) |
| `cursor-index-fullturn-engine.cjs` | 4×4 headless engine (`rays` audit / `fullBoxCross` active) |
| `CURSOR_INDEX_LAB_EVALUATION.json` | Combined Cursor Index verdicts + audit trail |
| `CURSOR_INDEX_6_LAB_EVAL.json` | INDEX_6 rays audit (2026-08-15) |
| `CURSOR_INDEX_6_B_LAB_EVAL.json` | INDEX_6_B cross audit (2026-08-15) |
| `verify-cursor-index.cjs` | Playable smoke — active `SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html` only |
| `audit-lab-verdict-paths.cjs` | Static audit — one verdict path per family |
| `compare-sholo-*-vs-16-lab.cjs` | Same-protocol candidate compare — **metrics only** (no board verdict) |
| `evaluate-feature-test-lab.cjs` | Feature Test evaluator — **KEEP boards only** |
| `FEATURE_TEST_KEEP_REGISTRY.json` | Human-confirmed KEEP gate |
| `FEATURE_TEST_EVALUATION.json` | Feature Test artifact |
| `evaluate-c1-c4-lab.cjs` / `complete-c3-lab.cjs` / `evaluate-12-bead-baro-lab.cjs` | Discovery G1–G9 (do not change KEEP/REJECT on existing boards) |

---

*Target: 05P. Canonical for SmartBeads board Lab reports.*
