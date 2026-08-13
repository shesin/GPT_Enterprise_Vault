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

## Instrument vs board verdict

| Verdict type | Meaning |
|--------------|---------|
| **INSTRUMENT_VALID** | Lab matches playable 16-bead rules; honest D1/D2/D3; reproducible; crash-free. Safe to compare **same-protocol** candidate boards. |
| **INSTRUMENT_INVALID** | Parity mismatch, fake depth, crash, or reproducibility failure. **Stop** — no board-quality verdict until fixed. |
| **Board GOOD / NEEDS FURTHER TESTING / BROKEN** | Applies to a **geometry**, using the seven rulers above. |

---

## Related files

| File | Role |
|------|------|
| `sholo-guti-fullturn-engine.cjs` | 16-bead headless engine |
| `sholo-lab-metrics.cjs` | Aggregation + comparison guards + `TERM_GLOSSARY` |
| `final-validate-sholo-lab.cjs` | 25-check trust gate |
| `validate-lab-16-bead-reference.cjs` | Reference validation + baseline batch |
| `LAB_REPORT_16_BEAD_05P.md` | 16-bead baseline board-quality report |

---

*Target: 05P. Canonical for SmartBeads board Lab reports.*
