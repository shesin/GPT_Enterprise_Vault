# Smart Bead Chess — GPT Project Audit (4th cycle)

Date: 2026-08-27 (test runner audit appended 2026-09-03)  
Scope: Production `src/` (not prototype)  
Status: FAILURE RECORD + corrective actions (permanent)

Enforcement text for Cursor agents lives in `.cursor/rules/smartbeads-core.mdc`, `smartbeads-rules.mdc`, and `VISION/CURSOR_PROMPT_01.md` — not duplicated here.

---

## Test catalog & how to run (2026-09-03)

**Repo root:** `d:\Business Idea\Gpt_Enterprise_Vault`  
**Verified:** **566 tests**, **50 Jest suites** — PASS via batched runner (2026-09-08: `test:jest:fast` + slow HonestAi batches).

### Commands (use these — do not use bare `jest PROJECTS/SmartBeads`)

| Command | What it runs | Time |
|---------|----------------|------|
| `npm run test:jest:fast` | Jest only — skips slow AI search suites | ~40 s |
| `npm run test:jest` | **All 566 Jest tests** (6 batches, live output, hard timeouts) | ~7 min |
| `npm test` | Full Jest + Playwright browser gates (`m2-2step-npm-gate.mjs`) | Jest ~7 min + browser |
| `node PROJECTS/SmartBeads/scripts/run-jest-batched.mjs --batch=<id>` | One batch only | see below |

**Batch ids:** `seven-board` · `engine-parity` · `feature-session` · `web-shell-layout` · `slow-ai-tiers` · `slow-ai-search`

**Runner script:** `PROJECTS/SmartBeads/scripts/run-jest-batched.mjs` — explicit file lists, `maxWorkers: 1`, per-batch timeout (kills if hung). Replaces broken broad `npx jest` invocations that hung 30+ min with no output on Windows.

### Jest — what each group tests

| Batch / area | Key files | What it proves |
|--------------|-----------|----------------|
| **7-board core** | `allBoards.smoke.test.ts`, `Board*.test.ts` (×7), `FeatureSession.turnControl.test.ts`, `v1GeometryCaptureAudit.test.ts` | All 7 product boards: legal select, Medium AI reply, reset/New game, capture geometry, turn control |
| **Engine + parity** | `SmartBeadsEngine*.test.ts`, `BoardCatalog.test.ts`, `*PrototypeParity.test.ts` (×7), `SelfPlayRunner`, `HumanVsAiRunner` | Engine rules, catalog defaults, prototype geometry parity per board |
| **Feature / settings** | `GameFeatureSettings`, `FeatureSession.*`, `clockPolicy`, `aiTurnPath`, `HonestAi.test`, `spectate`, `CoachVideoScript.test`, `CoachVideoPlayer.test`, `CoachVoice.test`, `FeatureSession.coach.test` | Timers, center rules, resignation, AI level UI, **Watch AI** (spectate), **Coach** Video 1 (watch-only, **7-bead · 4×5**, ~1:53) |
| **Shell / layout / audio** | `PlayController`, `playerBarShell`, `hubShell`, `viewportFit`, `creamCampRendersLower`, `CanvasBoardRenderer.moveFeedback`, `SoundEffects` | Settings DOM, cream-on-bottom, moveFeedback (turn colour → STATUS / PENDING), capture pulse, layout contracts |
| **Slow AI — tiers** | `HonestAi.difficultyTiers.test.ts` | Easy/Medium/Hard behaviour, Medium soft-miss, 8×4×6 and 16 gates (~7 min alone) |
| **Slow AI — search** | `HonestAi.searchCompletion.test.ts` | Expert (level 3) depth-2 completion on all 7 boards + 16 midgame |

### Browser gates (Playwright — not Jest)

| Script | What it proves |
|--------|----------------|
| `m2-2step-observe.mjs` | 16-bead two-click slide (A41→A42 occupancy) |
| `m2-capture-geometry-browser.mjs` | Real canvas clicks: captures, junction hops, Finish, inert opponent beads — all 7 boards |
| `m2-2step-npm-gate.mjs` | Boots Vite if needed; runs both gates above (chained by `npm test`) |
| `verify-coach-browser.mjs` | Coach panel + scrub max + intro copy at `?coach=start` |
| `m2-*-browser-verify.mjs` | Per-board visual/gameplay checks |
| `lab-ai-difficulty-eval.mjs` | HonestAi lab eval (not prototype `.cjs`) |

**Prerequisite:** Vite on **5173** (hub). Gates use `/index.html`.

### Why prior runs hung (fixed 2026-09-03)

1. `jest PROJECTS/SmartBeads` ran slow AI tests in parallel — CPU thrash, no visible progress.
2. `HonestAi.difficultyTiers` alone takes **~7 min**; bundling under a 3 min timeout looked like a hang.
3. PowerShell `Out-File` buffered all output until Jest exited — empty logs for 20+ min.
4. **Fix:** `jest.config.cjs` (`maxWorkers: 1`, `testTimeout: 120s`) + batched runner with kill-on-timeout.

---

## Purpose

This file documents an **absolute failure of AI process** on SmartBeads: major, human-obvious bugs and unapproved features remained after multiple “audits,” while Jest stayed green and status docs claimed confidence.

Humans found basic defects in minutes. Prior AI audits listed gaps but did **not** add failing behavioral tests and fixes. That pattern must never repeat.

---

## What the human ordered (this cycle)

1. **Remove 3-fold repetition entirely** from production FeatureSession (not only delete a test). It was never approved for V1 Rules/VISION. *(Superseded 2026-09-11 — re-approved DECISIONS §4; engine owner `SmartBeadsEngine`; see Failure class A2.)*
2. **Explain how unapproved features entered** and write strict Cursor enforcement so agents never add product rules without approval.
3. **Explain how major bugs survived 3 prior audits** and write strict enforcement against audit-without-fix behavior.
4. Soften **Medium** so Hard feels tougher (especially on 8-bead); Easy already OK on 6×3×5.
5. **Verify shot clock** during AI think (AI moves too fast for human to see freeze — agent must prove clocks tick).
6. Explain “16 + one small board” smoke (own beads, capture + Finish, New game / Play again).
7. **No open issues**: finish testing on all boards; if a feature cannot be tested, remove it or justify why.

---

## Absolute failure summary

### Failure class A — Unapproved product feature shipped

**3-fold repetition draw** was ported from prototype Lab/HTML into production `FeatureSession` without:

- Explicit human product approval
- Entry in `GPT_PROJECT_DECISIONS_05P.md` as a locked product decision
- A “keep vs remove” decision offered to the human first

How it got in: agents treated prototype completeness (Lab matrix, INDEX HTML, chess-like draw rules) as license to copy into production. That violates human ownership of gameplay and Medium/Major approval gates.

**Corrective action this cycle (2026-08):** feature **removed** from production session code and tests. Prototype may still contain it; production must not.

> **Superseded 2026-09-11 (human playtest):** Removal caused **infinite AI ping-pong** in Watch AI vs AI with no termination. **Re-approved** in `GPT_PROJECT_DECISIONS_05P.md` §4 · implemented in `SmartBeadsEngine` · Jest `FeatureSession.repetition.test.ts`. **Lesson:** never remove a prototype termination safeguard without a human **keep vs remove** decision **and** a live-loop test. See RULES § Code–Doc Integrity.

### Failure class A2 — Remove safeguard without replacement (2026-09-11)

**Pattern:** Audit ordered “remove unapproved rule” while all V1 boards have `maxPlies: null` and production had **no** repetition draw → Watch AI could loop for minutes. Docs still said “removed = safe.”

**Mandatory fix class:** code + DECISIONS + STATUS/MAP + tests/scripts that reference the behaviour — same change set, same PR.

### Failure class B — Audits that create false confidence

Prior audits repeatedly:

- Grepped for “hangs” and asserted `path.length > 0`
- Ran Easy-only or Lab-only smoke
- Used prototype `.cjs` AI as a stand-in for production `HonestAi.ts`
- Wrote gap lists (“Hard on 16 not gated,” “PvP clock untested”) **without** adding failing Jest + fixing code
- Left shipped UI features half-wired (center On but AI ignore; timers freeze on `aiThinking`; Hard silent-downgrade to Easy)

Green Jest + “audit complete” language while humans rediscovered P0 bugs in ~5 minutes is **pathetic process failure**, not a documentation nit.

**Living gap list (agents must maintain):** `PROJECTS/SmartBeads/GPT_PROJECT_STATUS_01P.md` § Integrity — code vs claim. Update when shipped behaviour ≠ docs/UI; never hide incomplete features (depth-2 pattern).

### Failure class C — Leaving “open issues” for the human

Statements like:

- “Hard strength on 16 — Extra coverage / Lab breadth”
- “PvP chess-clock shell test — low urgency unless you play with timers”

…are unacceptable when the human has repeatedly said: **agent owns full automated coverage; no open issues; if you cannot test, remove the feature.**

---

## What prior “3 audits” actually did (pattern)

Typical prior audit output:

1. Inventory features and boards
2. Spot gaps in coverage
3. Stop at a report
4. Claim technical verification (Jest green) as if product were healthy

What they did **not** do:

1. Write a failing behavioral test that would catch Easy≠Easy, clock freeze, center ignored, silent Hard→Easy
2. Fix until that test passes
3. Close every listed gap on **all 7 boards** or delete the unverified feature

---

## Corrective work in this cycle (code)

- 3-fold removed from production `FeatureSession` + tests *(superseded 2026-09-11 — restored in `SmartBeadsEngine`)*
- Medium ~20% capture-aware soft-miss; Hard 0%; Easy unchanged (~30%)
- Strength gates include **8x4x6** (human-reported Medium≈Hard) and Hard coverage on **16**
- `shellTimerShouldSkip` — clocks tick during `aiThinking`/`animating`; Jest proves shot clock can expire on BLUE for Ivory win
- All 7 product boards: own-bead select, Medium AI reply, reset/New game; Finish on 16 + 6×3×5
- PvP match-timer chess-clock tick asserted

---

## Explainers for human playtest items

### “16 + one small board” smoke

Meaning of the pass criteria:

- Only **own** (current-player) beads selectable; opponent beads inert
- Capture works; optional multi-jump **Finish** ends the turn
- **New game / Play again** resets to a playable opening

Automated now for **all 7** product boards (select + reset + AI reply), plus explicit Finish cases on **16** and **6×3×5**.

### Shot clock during AI

AI often replies in <1s, so humans cannot see a freeze. Agent verification:

- Policy: `shellTimerShouldSkip` ignores `aiThinking`/`animating`
- Session ticks while BLUE to move reduce shot remaining
- Expiry on BLUE awards RED (Ivory) without requiring AI to move

### Medium vs Hard on 8-bead

Human: Easy OK on 6×3×5; Medium≈Hard on 8-bead. Fix: Medium soft-miss ~20%; Hard stays full depth-2; gate Hard > Medium on **8x4x6**.

---

## Failure class D — Scope creep & inference (2026-09-03)

**Pattern:** Human gives a one-line product ask. Agent expands it into defaults, “best” labels, docs, and tests — wasting hours undoing work.

**Example:** “Put 3 minute timer for all boards” → agent set `defaultSettings.timer: '3'` and changed `timerBest`. Correct: add `'3'` to `timerOptions` only; default stays `'off'`.

**Why `.mdc` alone failed:**

1. Rules were **passive bullets** — easy to skim, not a hard stop before edit tools.
2. **Inference bias** — “timer” read as “default timer,” not “dropdown option.”
3. **Helpfulness bias** — “while I’m here” doc/test/default edits without approval.
4. **Duplication** — same rule in long `CURSOR_PROMPT_01.md` and short `.mdc`; neither enforced procedurally.

**Corrective action (2026-09-03):**

- `.cursor/rules/instruction-fidelity.mdc` — **STOP gate** (quote ask, approval, file list, out-of-scope) before any edit; **literal parse** table + timer anti-pattern.
- `.cursor/rules/smartbeads-core.mdc` — STOP gate first; option ≠ default ≠ best label.

Agents must run the STOP gate in the **user-visible message** before calling edit tools. If the gate fails, do not edit.

---

## Corrective work (2026-09-04)

- **SFX bundle:** Removed ~529k-char `SoundAssets.ts` base64 embed; runtime loads eight WAV files from `public/audio/` via `SoundManifest.ts`. Production JS chunk **~74 kB** (was **~601 kB**).
- **HonestAi:** Timer + center passed into eval (Medium/Hard); Easy center tie-break among equal captures; shot clock intentionally omitted.
- **Resign modal:** Dashed “Agree” / solid “Decline” + `aria-label` — not red/green-only.
- **Agent rules:** `.cursor/rules/smartbeads-core.mdc` — no stale residue; static assets in `public/`; do not edit `VISION/CLAUDE_TEST_REPORT_05.md`.
- **Docs synced:** `GPT_PROJECT_STATUS_01P.md`, `PROJECT_MAP_05P.md`, test count **508 / 44 suites**.

---

## Corrective work (2026-09-07)

- **Turn bead highlighting:** Rule and gaps → `GPT_PROJECT_PENDING_01P.md` § Turn colour UI; shipped/test facts → `GPT_PROJECT_STATUS_01P.md`. **TESTED** `CanvasBoardRenderer.moveFeedback.test.ts` (10 cases; was 7).
- **Docs synced:** `GPT_PROJECT_STATUS_01P.md`, `PROJECT_MAP_05P.md`, `VISION/CURSOR_PROMPT_01.md`; test count **511 / 44 suites**.

---

## 5th cycle — Full engineering audit (2026-09-14/15, Claude)

Trigger: human reported board grid lines fading and colour smearing across the board during play — a symptom Cursor had already attempted to fix twice (theme-drift commits) without success. Investigation of that single symptom expanded, on explicit human instruction ("audit everything... complete audit... nothing left out"), into a full multi-pass audit: TypeScript compilation across the whole project, then five parallel deep-dive passes (AI eval, board/capture-chain geometry, timer state machine, a systematic scan for silently-dead tests, and the theme/storage drift code). Every finding below was verified against a real test run or independently traced/reproduced before being reported or fixed — no gap-list-only findings, per Failure class B above.

### Confirmed bugs found and fixed

1. **Board-wide render corruption on captured black bead** (`CanvasBoardRenderer.ts`) — capture fade-out animation shrank a black bead to radius 0; the rim-stroke draw then called canvas `arc()` with a negative radius, throwing `IndexSizeError` mid-frame. Because that draw call never reached its matching `ctx.restore()`, the leaked transparency/shadow state carried into every later frame — this, not a theme/colour bug, was the actual cause of the reported vanishing-lines/colour-smear symptom. Fixed: radius clamped to 0; full alpha/shadow reset added at the top of every board redraw as a safety net. Regression test added and confirmed it reproduces the exact browser error on the old code.
2. **Two silently-dead tests** (`FeatureSession.turnControl.test.ts`, "clears all-bead flash... (chain)" and "mid-chain: tap another own bead...") — built their capture-chain fixture from `Move.over`, a field that doesn't exist on `getLegalMoves()` results (chain geometry only lives on `board.jumpPaths`). The chain-finder always came back empty, so both tests hit an early `return` before their real assertions and passed while checking nothing. A second bug was found in the same setup while fixing it (only one hop's victim bead was being placed, so a genuine 2-hop chain never formed even with the field fixed). Rewritten correctly; `expect.hasAssertions()` added so this exact failure mode can't recur silently.
3. **AI config typo** (`HonestAi.ts`) — per-board think-time table keyed the 7-bead board as `'7x4x5'` instead of the real id `'7'` (see `BoardConfig.ts`'s `BoardVariant` type) — Expert AI silently never got its intended 1.05× budget on that board.
4. **Missing data** (`HumanVsAiRunner.ts`) — `buildGameSummary()` built a `GameResult` missing `redCaptures`/`blueCaptures`.
5. **85 TypeScript errors, project-wide** — invisible because nothing had ever run `tsc`; Jest transpiles without type-checking. Included one type-utility typo (`Parameters<>` vs `ConstructorParameters<>`) cascading into ~24 errors in one test file, an invalid test fixture value (`shotClock: '10'`, not a real product option — worked only because the parser is permissive), several stale test fixtures out of sync with current types, and two TS-provable dead/unreachable branches. All fixed to match current types without changing test intent.
6. **Double game-over race** (`FeatureSession.timerTick()`) — shot clock, tournament timer, and shared match timer are independent settings that can be active together; if two expired on the *same tick*, the function ran all applicable blocks unconditionally, and the second `endGameByFeature()` call silently overwrote the first's winner/reason. Confirmed with an exact repro: displayed reason flipped from "Shot clock expired." to "... ran out of time." when both hit 0 together. Fixed with an early return after the shot-clock block ends the game; regression test confirmed it fails on the old code with that exact wrong string.
7. **Dead code** (`playShellThemes.ts`, `coalesceStoredLookState()`) — computed a legacy side-theme value from storage on every call and never used it on any return path (~25 lines of now-pointless legacy migration removed: `readStoredSideLookIdRaw`, `migrateLegacySideLookId`). Confirmed harmless only because a separate downstream function independently re-forces the same value; zero test coverage existed on the dead path.
8. **Missing test registration** — `moveHintAuraThemes.test.ts` existed and passed standalone but was never added to `run-jest-batched.mjs`'s file lists, so it silently never ran under `npm run test:jest` / `test:jest:fast`.

### Documented, not changed (judgment call — flagging per Rule - Doubt)

- `HonestAi.ts`'s `usePerSideClocks` eval branch (`timerUrgency`, `timerEvalAdjust`) is confirmed unreachable in the shipped product today (tournament timer is pvp-only; the AI never moves in pvp mode) — kept in place as a plausible seam for a future "AI under tournament rules" mode rather than deleted, since deletion would touch ~8 test fixtures for a purely cosmetic gain. Now documented in-code so it doesn't read as an oversight.

### Weak tests strengthened (passed, but wouldn't have caught a real regression)

- PvP tournament-timer test only asserted the moving side's clock changed — now also asserts the opponent's clock is untouched.
- `HonestAi.repetitionSteer.test.ts` only called the isolated penalty-scoring function directly — now also calls the real `selectAiTurnPath` entry point and confirms the AI actually avoids the repeated position.

### Checked thoroughly, confirmed clean (no bug found, not just assumed)

AI difficulty-tier gating (Easy/Medium/Hard soft-miss rates), depth-2 (Expert) search completion on all 7 boards, capture-route (`jumpPaths`) geometric consistency on all 7 boards including the 16-bead board's wing-junction hops (traced back to the original reference prototype engine and confirmed intentional via the existing parity test, not a bug), multi-jump chain continuation logic, tournament-timer-forces-centre-off enforcement (both directions), `shellTimerShouldSkip` genuinely ignoring `aiThinking`/`animating`, the theme-drift auto-correction settling in one pass with no flicker loop, and a full re-scan of all 60 test files for more instances of the silently-dead-test pattern (#2 above) — none found beyond the two already known.

### Process note — what made this cycle different

Every finding was verified against actual execution (a Jest run, a live AI-vs-AI browser match, or an independently reproduced trace/script) before being reported as a finding, and every fix shipped with a test proven to fail on the old code and pass on the new — directly following Rule - Human Oracle and Rule - Audit Completeness above, rather than repeating the gap-list pattern in Failure class B.

### Residual risk — carried to PENDING (see report to human, 2026-09-15)

- **Correction (2026-09-15):** the "P2 win" congratulations-modal bug reported above as "reproduced again" was not, on closer inspection, an actual bug reproduction. Re-read `getDisplayedWinner()`/`getDisplayedReason()` and both `endGameByFeature()` call sites (`evaluateScoreAndEnd()` for timer expiry, `maybeApplyCenterTiebreakAfterEngineEnd()` for engine-natural endings) — winner and reason are always set together, from the same source, in every branch; no P1/P2 strings exist anywhere in the current modal code (matches the 2026-09-09 STATUS fix). Re-ran 4 consecutive live Watch-AI matches on the 16-bead board — title and reason text agreed every time. The original "contradiction" seen earlier in this session was most likely a misreading of two differently-worded-but-consistent strings (a match participant's nickname, e.g. "Watch AI · Expert", vs. a bead-colour phrase, e.g. "Cream bead") as if they disagreed, not a real defect. Not marking this fixed (nothing was changed), but also no longer standing behind the earlier "confirmed reproduction" claim — it should not have been asserted without this level of verification. If the human still sees this in the live product, please paste the exact modal text so it can be traced precisely rather than re-guessed.
- `tsconfig.json` does not enable `noUnusedLocals`/`noUnusedParameters` — the exact class of dead-code bug found by hand in item 7 above will not be caught automatically by the new `tsc` pretest gate until this is turned on (not enabled here — would likely surface a fresh batch of warnings needing its own triage pass, a human call).
- Human-browser confirmation is still outstanding for everything fixed in this cycle (render crash fix, timer race fix, rewritten chain tests) — Jest-verified and, where practical, agent-browser-verified, but not yet seen on the human's own screen.
- This cycle sampled five high-risk areas at depth; it did not exhaustively review every line (e.g. accessibility, mobile/touch handling, BGM/audio edge cases, coach-video script content were not in scope).

---

## Engineering work log (2026-09-22, Claude)

Not a fresh bug-hunting audit cycle — two explicitly-scoped continuation tasks, each independently verified. Recorded here per the Recommendation below rather than left undocumented.

1. **`noUncheckedIndexedAccess` migration completed** — the TS strictness flag (deferred at the end of the 5th cycle, item carried to PENDING) surfaced 505 errors project-wide when first enabled; all were fixed file-by-file across `src/boards/*`, `src/playtest/web/**`, and `src/simulation/*`. Genuinely safe-by-construction array/object index access (fixed-size fixtures, loop counters bounded by the same array's `.length`, guarded lengths) got a `!` non-null assertion; the 7 board geometry files route through a new shared `at()` helper (`src/boards/arrayAccess.ts`) that throws with a clear message if the invariant is ever violated. One source-scanning regression-guard test (`processRegressionGuards.test.ts`) needed its regex updated to tolerate the added `!`. **Verified:** `tsc --noEmit -p tsconfig.json` → 0 errors (from 505); full Jest suite → 658/658 passing. Commit `ce854b3`.
2. **`PlayController.ts` split (partial, by design)** — extracted the genuinely decoupled pieces of the ~2481-line file into 5 focused modules: `feature/aiTurnRunner.ts` (AI turn planning/execution), `layout/boardSettingsPanel.ts` (board-dependent settings `<select>` syncing), `feature/startBannerController.ts` (celebration/banner effects), `layout/selectPopulators.ts`, `render/timerDisplay.ts`. File went from 2481 → 2049 lines. The remaining ~1900 lines of `bootstrapPlayShell` is one closure sharing ~20 mutable variables (`session`, `anim`, `animating`, `aiThinking`, `timerId`, `undoStack`, etc.) across ~70 functions — deliberately **not** attempted this pass; fully modularizing it means converting it to a stateful controller (class or explicit context object) threaded through every extracted piece, a materially larger and higher-risk rewrite of the core game controller that deserves its own scoped check-in rather than being folded into an "extract the easy parts" pass. Another regression-guard test needed updating (function moved out of `PlayController.ts`, so the source-scan regex had to point at the new file). **Verified:** `tsc --noEmit` clean, `eslint --max-warnings=0` clean, full Jest suite 658/658 passing. Commit `ebeaa90`.

Human-browser confirmation is outstanding for both (as with prior cycles) — these are non-UI-behavior-changing refactors (types and module boundaries only, no logic changes), verified by type-checker, linter, and the full existing test suite, not by a new browser pass.

---

## Engineering work log (2026-09-23, Claude)

Full 6-board V1 board-selection verification cycle (excl. `16`, called out by human as "standard"), requested per PENDING §8b. Not a code-change cycle — an evidence-gathering/verification cycle producing a new reusable Lab script and a full doc rewrite.

1. **New script: `PROJECTS/SmartBeads/scripts/lab-board-fairness-eval.mjs`** — generalizes the single-board pattern in `lab-ai-difficulty-eval.mjs` into a reusable production-HonestAi Lab harness across all 6 shipped `ProductBoardId`s, at AI levels 1/2/3 (D1/D2/D3), both sides at the same level per match (board-fairness read), BLUE always first. Uses the real `SmartBeadsEngine` + `HonestAi.selectAiTurnPath` + `thinkBudgetForLevel` (the exact function production PvE uses for think-time budgeting) — never the prototype `.cjs` engines, per `GPT_PROJECT_RULES_01P.md` "Rule - Behavioral Gates". This was a required fix, not a nice-to-have: every existing `LAB_EVALUATION_*.json` in `prototype/board4/` (and the 2026-09-22 preliminary §8b comparison built on them) used the prototype engine, which the Rule explicitly disallows as a substitute for production board-selection verification.
2. **Full production-grade self-play run** — D1=90 games, D2=100 games (primary depth per `VISION_05P.md`), D3=24 games (secondary, intentionally smaller sample — VISION: never rank boards by D3) per board; 1,284 games total across the 6 boards, seeded/reproducible RNG. Runtime ~30 minutes total (6x4/6x3x5 boards a few seconds each; 12x6x5 — the largest — took ~19 minutes for D2+D3 alone). Raw output: `PROJECTS/SmartBeads/prototype/board4/PRODUCTION_LAB_FAIRNESS_2026-09-23.json`. Result: all 6 boards pass the project's own D2 fairness gate (`|FPA| > 35pp` per VISION) with FPA ranging −20pp to +18.3pp, all with ≥85 games-with-winner (well above the ≥10-winner meaningful-read threshold); all 6 resolve 85–97% of D2 games by elimination (no board dominated by move-cap or ever hitting a stalemate ending across all 1,284 games). No genuine Lab or gameplay failure found on any board.
3. **Alternative comparison (Tier B, prototype-engine)** — worked through all 3 `LAB_EVALUATION_*.json` files in `prototype/board4/`, matching each shipped board's bead count to its pooled/rejected alternative(s) (12-bead had 3 alternatives, 8-bead had 3, 10-bead and 7-bead had partial data, 6-bead had none evaluated at all). No alternative showed a materially better signal than its shipped counterpart — several are `REJECT` (fairness-failed under the prototype engine), the rest are underpowered (winner counts as low as 1–7 out of 90) or, in two cases, never resolved a single game. Explicitly flagged in PENDING §8b that this side of the comparison is prototype-engine-sourced and not blended with the Tier A production numbers.
4. **Verification:** `npx tsc --noEmit -p tsconfig.json` → 0 errors (repo-wide baseline). Board-relevant Jest: 15 suites / 203 tests green (`Board6`/`Board6x3x5`/`Board10x5`/`Board12x6x5`/`Board8x4x6`/`Board7` + their `*PrototypeParity` suites, `BoardCatalog.test.ts`, `allBoards.smoke.test.ts`, `v1GeometryCaptureAudit.test.ts`) — full suite not run since no production code changed (only a new standalone script + doc updates). Live browser smoke pass via `npm run web:smartbeads` for all 6 boards: board renders, a move applied, AI response observed (5 of 6 boards produced an AI capture within the smoke sequence; `6x3x5`'s short sequence didn't happen to trigger one, capture path already covered by its `PrototypeParity` Jest suite), zero console errors on any board.
5. **Minor script-quality fix in the same pass** — `lab-board-fairness-eval.mjs`'s `fpaMeetsWinnerThreshold` had a redundant `gamesWithWinner >= 20 ? true : gamesWithWinner >= 10` ternary (both branches reduce to the same `>= 10` check); simplified before treating the script as done, per the ongoing-audit-duty rule against landing known-redundant logic.

Full detail, per-board verdict table, and the alternative-comparison table are in `GPT_PROJECT_PENDING_01P.md` §8b (rewritten this cycle, not just appended to). No catalog change made — none was warranted; the locked V1 board set stands per `VISION_05P.md`.

---

## Recommendation

Do not soft-pedal language in future status docs. Prefer failing tests over narrative confidence. When adding a new failure cycle, append a dated section here or create `GPT_PROJECT_AUDIT_06P.md` — do not scatter audits in subfolders.
