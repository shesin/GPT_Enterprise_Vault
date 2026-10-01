# Smart Bead Chess — Closed Issues & Investigation History (05P)

## What this file is

Findings, completed investigations, resolved audits, and evidence that used to bloat `GPT_PROJECT_PENDING_01P.md`. Nothing here is open work — it's the record of what was checked, decided, or fixed, and why. If a locked game/product decision belongs in `GPT_PROJECT_DECISIONS_05P.md` instead, it's staged here under its own heading until that file's own approval gate (`Go — DECISIONS`) is given.

Target: up to 5 pages.

---

## PENDING A2 done: match-clock ring + session score counter (2026-09-29)

Was PENDING item A2 (UI polish backlog), remaining 2 sub-items after the 3rd ("left panel dedup") was found already-shipped and removed separately (see next entry below).

1. **Match timer progress ring (HvH only) + low-time pulse.** Added `.match-ring` SVG markup beside `#timer-mmss-p1`/`#timer-mmss-p2` in `index.html`, following the existing shot-clock ring's exact visual pattern (same geometry/CSS variable approach). New `updateMatchRing()` in `timerDisplay.ts`; wired into `PlayController.ts`'s `updateUI()`, gated strictly behind `tournamentActive` (HvH only) — the PvE/shared-timer branches explicitly force the ring off, so PvE timer UI/behaviour is untouched per the standing PvE-frozen rule. Low-time pulse (`.low-time` class → `match-ring-pulse` keyframes) triggers at ≤5s remaining, reusing the same threshold already used for the existing audio warning cue (no new magic number). Verified: `tsc --noEmit` clean, full suite 671/671, live browser check (ring renders, tracks the tournament clock, low-time class/animation confirmed wired via direct DOM inspection).
2. **Session score counter across rematches.** New `sessionScore` state (module-level, outside `session` since `session` itself gets replaced on every `resetGame()`) tallies wins per side; increments once per game-over transition (reusing the existing `lastGameOverPlayed` one-shot flag). Displayed as a "Session" row (hidden until ≥1 decisive game), shown via new `renderSessionScore()` helper. Persists across `resetGame()` (both "New game" and "Play again" call the same function in this codebase — confirmed by reading the code, not assumed); resets on `returnToHub()` and `prepareBoardSwitch()` (leaving the match or changing board). Draws don't count toward either side (design choice — ambiguous which side a draw would credit).
   - **Real bug found and fixed during live verification, not just claimed:** the render call was positioned earlier in `updateUI()` than the win-detection/increment code, so on the exact tick a game ended, the DOM would still show the pre-increment count; since the AI-turn/timer interval can stop ticking once the game is over, `updateUI()` might never run again, permanently freezing the display at the stale count. Watched this happen live (closure state correctly held `BLUE: 1` while the DOM still showed `0W`), traced it to the ordering bug, fixed by extracting a `renderSessionScore()` helper called both in its original spot and again immediately after the increment. Re-verified live: works correctly across 2 fresh AI-vs-AI matches (1 draw — correctly no-op; 1 decisive win — row appeared showing `1W`, persisted through a "Play again" rematch).
   - Also found and fixed in the same pass: the `hidden` HTML attribute alone didn't hide the new row, because `.play-block-row { display: flex }` (an author-defined class, same CSS specificity) overrides the browser's default `[hidden] { display: none }` UA rule. Added an explicit `.session-score-row[hidden] { display: none; }` override.

---

## PENDING A2 sub-item stale: "left panel / settings dedup" already shipped (2026-09-29)

Was one of 3 bullets under PENDING A2 (UI polish backlog). Checked `index.html`'s Page 2 board settings panel against the Page 1 hub mode-select: no duplicate mode/account chrome exists — confirmed by grep (no duplicate IDs) and an existing regression test, `playerBarShell.test.ts:21,28` (`not.toContain('id="start-mode-select"')`, `not.toContain('id="game-mode-select"')`, `toContain('id="hub-mode-select"')`). `GPT_PROJECT_STATUS_01P.md:117` already records this as done 2026-09-11 ("Settings game mode | OK — hub page 1 `#hub-mode-select` only; not on board settings panel"). The PENDING bullet was simply never removed after the fix shipped. Removed from PENDING A2; no code change needed.

---

## Dead-code / doc-mismatch sweep extended to rest of `src/` (2026-09-29)

Was PENDING item A2 (web checklist, "Engineering hygiene"). Full detail and evidence in `GPT_PROJECT_AUDIT_05P.md` (2026-09-29 entry). Summary: `tsc --noEmit` had a real error (stale test fixture, fixed), two independent automated dead-code scans of all of `src/` came back clean, and one real doc-vs-code mismatch was found and fixed (AI levels 4–5 removal was actually complete but STATUS/DECISIONS still described it as pending — both corrected). Full suite verified 671/671 passing after the fix.

---

## `vite build` production script added (2026-09-29)

Was PENDING item A1 (web checklist). `package.json` had only `web:smartbeads` (`vite`, dev server — hot-reload, unoptimized, no build artifact). No `build` or `preview` script existed, so there was nothing to actually deploy.

**Fix:** added `"build:smartbeads": "vite build"` and `"preview:smartbeads": "vite preview"`.

**Verified (not just claimed):** ran the build — 57 modules transformed, produced `dist/index.html` + hashed `assets/main-*.css` (44KB) / `.js` (132KB). Started the preview server, confirmed HTTP 200, then loaded it in the browser: hub renders correctly, clicked "Play vs AI" → board and live PvE session both load correctly from the production build, zero console errors either screen.

**Not covered by this fix:** actually uploading `dist/` to the live host (smartbeadchess.com) — that's still open, tracked under PENDING A17/A19 (hosting purchase/deploy) since it needs host credentials this agent doesn't have.

---

## Resolved UI note (2026-09-24)

Light board side panels — same-hue instead of charcoal: originally parked 2026-09-19, overtaken the same day by a bigger decision to remove the charcoal side-only option entirely, for every board. Every board now pairs with its own same-hue side panel by default — no charcoal left to replace, no remaining work.

---

## Board selection re-review (2026-09-22 preliminary, 2026-09-23 full production-grade pass)

Human asked: are all 6 non-16 shipped boards good on 3 criteria — (1) not breaking, (2) 1st/2nd-player bias, (3) playable/good — and does any pooled/rejected alternative look better. **Conclusion: no board swapped, removed, or promoted.** `VISION_05P.md` locks the board set unless a genuine Lab or gameplay failure is found; this review found none that changes the set.

**Evidence tiers:** Tier A = production-grade (`HonestAi.ts` + `SmartBeadsEngine`, this pass). Tier B = prototype `.cjs` engine, pre-existing data, not comparable to Tier A — a lead for follow-up testing only, not proof.

### Per-board verdict (Tier A, production HonestAi)

| Board | Not breaking | D2 fairness (primary) | D2 playability | Concern? |
|---|---|---|---|---|
| `6x4` (6-bead·4×4) | tsc clean, Jest green, browser clean | FPA −17.5pp (40/57/3, 97 winners) | 97% elimination, 3% repetition-draw | None |
| `6x3x5` (6-bead·3×5) | tsc clean, Jest green, browser clean | FPA −19.6pp (39/58/3, 97 winners) | 97% elimination, 3% repetition-draw | None |
| `10x5` (10-bead·5×5) | tsc clean, Jest green, browser clean | FPA −20pp (36/54/10, 90 winners) | 90% elimination, 4% repetition, 6% move-cap | None |
| `12x6x5` (12-bead·6×5) | tsc clean, Jest green, browser clean | FPA −17.6pp (35/50/15, 85 winners) | 85% elimination, 14% move-cap | Lowest resolve rate of the 6 — expected (largest/slowest board), not a flag |
| `8x4x6` (8-bead·4×6) | tsc clean, Jest green, browser clean | FPA −19.6pp (37/55/8, 92 winners) | 92% elimination, 8% move-cap | None |
| `7x4x5` (7-bead·4×5) | tsc clean, Jest green, browser clean | FPA **+18.3pp** (55/38/7, 93 winners) — only board favoring P1 | 93% elimination, 2% move-cap | See root-cause note below — not a failure |

Repo-wide `tsc --noEmit` — 0 errors. 15 Jest suites / 203 tests green. No stalemate endings in any of 1,284 self-play games (D1+D2+D3 × 6 boards) — every draw was repetition or the engine's 120-ply safety cap.

### Cross-board pattern

- **D1 (not primary):** BLUE(P1) favored on 4/6 boards — expected, no search means first-mover tempo dominates.
- **D2 (primary):** consistent RED(P2) edge of −17.5 to −20pp on 5/6 boards, despite different geometries — points to a trait of the 1-reply-ply search/eval itself, not per-board geometry. All 5 comfortably inside the ±35pp gate. `7x4x5` is the outlier (+18.3pp, P1 favored) — also the only odd-bead-count board of the 6, a plausible geometry explanation, not proven.
- **D3 (secondary, never ranked):** noisy as expected, not used for any verdict.

### Alternatives comparison (Tier B, leads only)

Across all 6 boards, no pooled/rejected alternative showed a materially better fairness/playability signal than its shipped counterpart. Where a fairness read was possible at all under the prototype engine, it was either a `REJECT` or drawn from a winner count below the project's own ≥10 threshold. 6-bead has no alternative data at all. Nothing rises to a "genuine Lab or gameplay failure."

### 16-bead comparison (2026-09-23, added on request)

| Rank | Board | D2 FPA | D2 resolve rate | Move-cap | Note |
|---|---|---|---|---|---|
| 1 | `6x4` | −17.5pp | 97% | 0% | Best of all 7 |
| 2 | `6x3x5` | −19.6pp | 97% | 0% | |
| 3 | `7x4x5` | +18.3pp | 93% | 2% | Only board favoring P1 |
| 4 (tie) | `12x6x5` | −17.6pp | 85% | 14% | |
| 4 (tie) | `8x4x6` | −19.6pp | 92% | 8% | |
| 6 | `10x5` | −20pp | 90% | 6% | Weakest of the 6 |
| **7** | **`16`** | **−42.9pp** | **21%** | not broken out (79% draw) | **Outside ±35pp gate — worst of all 7** |

`16` D2 (n=100): Blue 6 / Red 15 / Draw 79. Only 21/100 games had a winner — below the ≥10-per-side confidence bar on the Blue side (6 winners), though Red (15) clears it. Direction (unfair, unresolved) is clear regardless of exact magnitude.

**Decision (2026-09-23, human):** does not block launch — ship with all 7 boards as-is. Real signal will come from the Review feature once it ships, not a formal pre-launch test. Revisit only if player reviews actually surface a fairness complaint on `16`.

---

## Engineering hygiene — completed refactor (2026-09-22)

`PlayController.ts` closure split: first pass (commit `ebeaa90`) extracted AI turn runner, board settings panel, start banner controller, select populators, timer display — 2481 → 2049 lines. Second pass same day extracted `feature/resignationController.ts` and `feature/undoController.ts` — now 1993 lines. Remaining pieces (coach video playback, move animation/execution, result-modal rendering) judged too entangled to extract safely — coach video's `syncCoachVideoCue` duplicates result-rendering logic and shares mutable state (`anim`, `animating`, `turnCaptures`, `session`) with the main game loop; a clean extraction needs a shared result-renderer helper first, as its own scoped follow-up. `tsc` clean, targeted Jest files green, full suite + browser smoke (new game, move, undo, resign) confirmed.

---

## AI level 4 — investigation history (2026-09-26 to 2026-09-28)

Proposal: 4th AI difficulty above Expert with genuine depth-3 opponent-reply search. Not a reuse of the removed 2026-09-25 "fake depth" Super Expert approach.

**Code-inspection findings (2026-09-27):**
- Nice-to-have, not a must — nothing broken in levels 1-3 today.
- Cost multiplies per extra ply, not linearly — `replyBranchForLevel` returns a flat cap of 80 for any level ≥3; naive reuse at depth-3 was assumed to mean ~80× more positions than depth-2.
- The 45s `MAX_DEPTH2_SEARCH_MS` ceiling is a worst-case, not typical — Expert's real starting budget is ~3.2s, escalated via 1.6× retries only when needed.
- Actual level-4 think time needed to be measured before implementation, not assumed.

**Measurement (2026-09-28):** Ran depth-3 search timing across all 7 boards, 2 branch caps (80, 24), 2 position styles (developed midgame + capture-heavy), 28 runs total. Every run completed under 3.1s — well inside the 45s ceiling. Cap 80 vs 24 made almost no measured difference (actual branching per position stayed at 5-21, nowhere near either cap).

**Correction to the original assumption:** the investigation initially assumed 16-bead was the worst-case board (matching `BOARD_THINK_MULTIPLIER`, which ranks boards by piece count). Measured data contradicted this — `12x6x5` was consistently the slowest board (worst 3.0s vs 16-bead's 1.6s), confirmed independently via each board's canonical opening-move count (12x6x5: 16 legal moves; 16-bead: 13, despite 16-bead having far more total pieces — 37 vs 30). Depth-3 cost is dominated by branching factor cubed, a different property than piece count. Any future per-board depth-3 budget should be calibrated fresh, not inherited from `BOARD_THINK_MULTIPLIER`.

**Caveat:** this is a small, hand-built sample (2 positions × 7 boards), not a fuzzed/exhaustive search — evidence the concern may be overstated, not proof the worst case is safe.

**Serious bug found and fixed (2026-09-28):** `searchBestAtExactDepth`'s budget-escalation loop (`HonestAi.ts:604-629`, prior to fix) could hang indefinitely if a search ever failed to complete within one full `maxBudget` window — the retry-budget calculation pins at the cap and the loop's exit condition never goes false once pinned, meaning the "give up and return `ends[0]`" fallback code was unreachable dead code in that scenario. **This affected Expert (level 3) today, independent of level 4** — a genuine freeze with no move ever returned, worse than the originally-flagged risk of "falls back to a weak move." Confirmed via a scaled-down reproduction of the loop logic (mirrored, not the real file, to observe the pin pattern safely), then fixed:
```js
const nextBudgetMs = Math.min(maxBudget, Math.round(budgetMs * 1.6));
if (nextBudgetMs === budgetMs) break;
budgetMs = nextBudgetMs;
```
Verified against the real file: full `HonestAi` test suite, 41/41 pass, no regressions.

**Status:** CLOSED 2026-10-01 — level 4 dropped completely (see "A18 — AI level 4 — CLOSED, dropped completely" below).

---

## Resolved: timer-lock contradiction (2026-09-28)

The old PENDING doc had two conflicting statements about the board-fixed HvH timer table — one calling it locked, one calling it "still needs further discussion." **Human confirmed 2026-09-28: locked.** Written into `GPT_PROJECT_DECISIONS_05P.md` §13a along with the other 2026-09-15/18 locked decisions that used to sit in PENDING's old §13.

---

## A19 — 16-bead board diagonals (X in every cell vs standard 4 big X's) — CLOSED, no change (2026-09-30)

Shekhar raised that the standard 16-bead board has 4 big X's (diagonals at r+c-even points only) while the code has an X in every cell. Evaluated in a scratch copy; full record in `GPT_PROJECT_AUDIT_05P.md` § "A18 / A19 — full evaluation record".

**Closed with no change. Reasons:** (1) the fairness gain did not reproduce on the production engine (first-mover win 46.2% current vs 56.0% standard; lab engine said the opposite) — no proven improvement; (2) high cost and risk: the change makes a new, uncertified board — opening moves 13→9, playable HTMLs and prototype engine would need changing, official trust gate gains 3 failures, lab results and ★ tiers would need re-labelling; (3) the standard layout is confirmed only by Shekhar's drawing, no published source found; (4) no other board can be altered (own designs; 12-bead cannot be made 180°-symmetric). Reopen only if a real board source shows the current layout is wrong and Shekhar orders it.

---

## A18 — AI level 4 — CLOSED, dropped completely (2026-10-01)

Level 4 (3 opponent replies, depth 3) was evaluated on the small boards. Strength was fine, but timing was not safe enough: on 8x4x6 it exceeded the think budget, and the AI search runs on the main thread, so a slow move freezes the page. 7x4x5 passed on this PC, but its margin on slower devices is unknown, and no risk was accepted. **Decision (Shekhar, 2026-10-01): drop level 4 on all boards, no implementation, A18 closed.** Nothing was changed in `src/`. Full run, numbers, and reasons: `GPT_PROJECT_AUDIT_05P.md` § "A18 — AI level 4 extensive small-board run (2026-10-01)". The earlier hang-bug fix in `searchBestAtExactDepth` stays in place.

---

## Lab-script defects — CLOSED (2026-10-01)

Found during A18. **`evaluate-ladder-lab.cjs`** (old Sholo G1–G9 verdict script, prototype only, not part of the game) crashed because it required a file that never existed (`sholo-8-bead-fullturn-engine.cjs`). **Retired by Shekhar's order (2026-10-01): deleted**, and every reference was updated or marked RETIRED (`LAB_TERMINOLOGY_05P.md`, `BOARD_DISCOVERY_05P.md`, `WEB_REPORT_*`, `WEB_FEATURE_TEST_05P.md`, `LAB_CAPABILITY_STATUS.json`, `sholo-lab-gates.cjs` comment, `audit-lab-verdict-paths.cjs` — its Sholo evaluator list is now empty and the audit still reports CODE_PATHS_OK). Existing `LADDER_LAB_EVALUATION.json` and the `*_COMPARE.json` files are kept as historical evidence (some still name the retired script in a text field). **`SHOLO_LAB_FINAL_TRUST.json`** said READY (2026-08-14) while `final-validate-sholo-lab.cjs` reports NOT READY on current main (`parity_node_coords`; `primary_D2_play_signal` 9.92 vs ≥10 at N=25): the file is now marked `"verdict": "STALE"` with a note (re-run `final-validate-sholo-lab.cjs` to regenerate; `record-sholo-16-feature-baseline.cjs` correctly refuses a non-READY trust file). Detail: `GPT_PROJECT_AUDIT_05P.md` § "A18 / A19 — full evaluation record".

---

## A20 — AI deep audit, second pass — CLOSED (2026-10-01)

Shekhar asked for a systematic audit of every function in the AI path and a hard limit of 3 s per AI move on any device, with no random / "best so far" / shallower / weaker move. Result (full evidence: `GPT_PROJECT_AUDIT_05P.md` § 10): the search restart loop (up to 6 windows, then unlimited) and the meaningless 3.2-5 s "budgets" were removed — one search, no clock, and `HonestAi.testAudit.test.ts` fails if a clock is ever added; the engine got an exact "search mode" (shared repetition history, numeric position keys, apply/undo, no per-leaf snapshots). Same moves as commit 7126494 on 49/49 seeded games and ~118,000 compared turn-end lists. Worst Expert move: 46 ms desktop (16-bead, 13,759 positions), 336 ms with Chrome CPU throttled 6x. Branch cap (80/64/60) and chain limit (8 hops) measured immaterial (0 pick differences in 12,844 Expert positions; longest chain 7) and kept. **UNCONFIRMED:** real phone hardware; Playwright live gates; Resign / Coach / setting-change-during-think in a real browser.
