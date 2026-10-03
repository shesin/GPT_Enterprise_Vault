# Smart Bead Chess — GPT Project Audit (4th cycle)

Date: 2026-08-27 (test runner audit appended 2026-09-03)  
Scope: Production `src/` (not prototype)  
Status: FAILURE RECORD + corrective actions (permanent)

Enforcement text for Cursor agents lives in `.cursor/rules/smartbeads-core.mdc`, `smartbeads-rules.mdc`, and `VISION/CURSOR_PROMPT_01.md` — not duplicated here.

---

## Trust rules and disaster ledger (written 2026-10-02 — Shekhar: "docs and code are what you are auditing, how can you trust them")

### Trust rules (apply to every audit, every agent)
1. **Docs, code comments, existing tests, CI-green and earlier audit conclusions are CLAIMS under audit, never evidence.** The disasters live exactly there. An audit may not write "OK" because a doc, a comment, a test name or a previous audit says so.
2. **Evidence that counts, in this order:** (a) behaviour observed in a real browser with real clicks (and, for rules, an independent reference); (b) a test that was seen FAILING on the old code and PASSING on the new; (c) measured numbers with the sample size and the machine state written next to them. Everything else is marked UNCONFIRMED.
3. **A "finite" or "completes eventually" result is not a result.** Ask: how long, how often, on the worst input, with two features switched on together.
4. **Test the combinations, not the features:** Undo x clock, Undo x AI to move, centre rule x stalemate, timer x phone layout, settings x running game.
5. **The auditor is also a claim.** This audit's own slips are recorded below (rings "every turn", sound buffers "4 of 8", "11 files unformatted"): each was caught only by running the thing.
6. **No audit closes a finding without a regression guard** at the level where the bug lived (unit test, or a scenario in `scripts/m3-flow-gate.mjs`).

### Disaster ledger — shipped defects that several audits walked past
| Defect | How it hid | Found by |
|---|---|---|
| AI waited up to 45 s, restarted its search from zero up to 6 times, then ran with no limit | STATUS/PENDING described "up to ~45 s" as a feature; the test only checked that the search finishes; tails sampled on 120 positions | AI pass 2 (13,759 positions, per-function cost) |
| AI level 3 (Expert) lost to level 2 in timed centre games | Centre weight 28 applied from move 1; audits measured only centre-off ladders | AI pass 1 (centre-aware vs blind games) |
| AI froze the whole page while thinking | No worker; frame gaps never measured | AI pass 1 |
| Undo reopened a game lost on time and refunded the clock | Undo tested alone, clocks tested alone | § 13 (browser) |
| Undo left the game frozen when the AI was to move (needed New game) | No test drove Undo after the AI's opening move | § 13 (browser) |
| Centre rule overrode a stalemate win | Tests used timer-expiry positions only | § 13 (test built from the engine's own stalemate) |
| Shared match timer invisible on phones; board squashed on short screens | Desktop-only checks; phone layout verified on one board, no timer | § 13 (375x812, 740x360) |
| Raw engine codes and false "Tied in captures" text in the result box | Nobody forced a safety-cap or repetition end in the UI | § 13 |
| CI failing on 31 unformatted files, lint "non-blocking" for errors that no longer existed | Nobody read the CI | § 13 |
| One draw error killed the render loop for good; blocked storage broke drawing; no global handler | No fault injection | § 12 / § 13 |
| Idle redraw 33 times per second | CPU never measured at rest | § 12 |
| AI took a repetition draw while far ahead (a draw scored as a win in the search) | Repetition test covered only a position seen once; equivalence tests checked move lists, never what the search does with a finished game | AI audit 3 (brute-force oracle + valuation of game-ending moves) |
| Any one request could kill the online server for every player (3 paths) | Server tests sent only well-formed traffic; async handlers were `void`-called with no catch; no process-level handler | Rest-of-code audit 2026-10-03 (hostile input to a real process) |
| Earlier cycles: repetition rule removed -> infinite Watch-AI loop; render crash on a captured bead; 85 hidden type errors; double game-over on one tick; two silently dead tests; Hard silently downgraded to Easy; timers frozen during AI think | "Jest green" and gap lists without failing tests | 4th and 5th cycles |

### Record of this audit's own errors (so the next auditor distrusts it too)
- Section 12 first said the turn-start rings pulse every turn; they exist only from game start to the first pick (read the code again, then measured).
- A truncated file listing looked like "only 4 of 8 sounds decoded"; a network capture showed all 8 (no bug).
- An older line said "11 files not formatted"; the command said 31.
- The first fix for the Prettier change broke a test that matched source text (`HonestAi.testAudit.test.ts`): tests that read source code are claims too.
---

## Audit register and plan (maintained from 2026-10-02 — read this BEFORE planning any audit)

**Rule.** Every audit starts by reading this register, names the lens it uses and the lenses it does NOT cover, and ends by adding its row below. A new audit must pick at least one lens that no earlier audit has used, or re-run an old lens on code that changed since. "Audit everything" is not a lens: it produced shallow passes.

Audits do catch serious problems (the 2026-10-01 AI audits found a 45-second search; the whole-code audit found Undo reopening lost games). The register exists so the next one aims where nothing has looked yet. The automated net (gates run on every push) is the second half: it keeps a fixed problem from coming back; it does not replace audits.

### A. What each audit looked at, and what it found

| # | Date | Lens (what it examined) | Serious finds | Could not see |
|---|------|--------------------------|---------------|---------------|
| 1 | 2026-08-27 (4th cycle) | Failure record: prototype rules ported without approval, audits that create false confidence | Unapproved repetition rule; "audits" that only grepped; half-wired features | Behaviour in a real browser |
| 2 | 2026-09-14/15 (5th cycle) | Five risk areas at depth: render corruption, AI tiers, timers, dead tests, type safety | Render crash on captured bead; 85 hidden type errors; double game-over on one tick; two dead tests | Accessibility, phone, audio, anything not sampled |
| 3 | 2026-09-22 / 23 / 29 | Type strictness, file split; board fairness numbers; dead-code and doc-mismatch scan of `src/` | 505 index-access errors; stale docs; non-clean `tsc` | User flows; interaction between features |
| 4 | 2026-09-29/30 (A18/A19) | Evaluation of AI level 4 and the 16-bead layout | Tooling defects in lab scripts | Everything outside the AI/boards |
| 5 | 2026-10-01 AI pass 1 | AI strength ladder, centre rule vs material, page freeze, caps | Centre weight made Expert lose; AI froze the page; draws that were wins | Worst-case time per move (sampled 120 positions) |
| 6 | 2026-10-01 AI pass 2 | Worst-case time per function, 13,759 positions, adversarial search, CPU throttle | 45 s retry loop, restart from zero up to 6 times, engine copying history | Anything not the AI |
| 7 | 2026-10-01 § 12 | Four named questions: idle CPU, innerHTML, error handling, memory | Idle redraw, render loop dies on one error | Everything else |
| 8 | 2026-10-01 § 13 | Whole code except the AI, driven in a real browser: feature interactions, clocks, Undo, result text, phone, CI, storage | Undo reopens lost games and refunds clocks; stuck game after Undo; stalemate overridden; timer invisible on phone; board distorted; CI red | Real phones; Firefox; long sessions; security of a hosted version |
| 9 | 2026-10-02 § 15 | UI look and portal: hub first screen, legal/trust pages, third-party content, fonts, contrast in 9 looks, dialogs, metadata | No privacy/terms/credits; music hot-linked without credit; Play buttons below the fold on phones; Walnut contrast | Real devices, Lighthouse, real screen reader, brand/design judgement |
| 10 | 2026-10-03 AI audit 3 | Independent brute-force minimax oracle vs the search (705 checks, boards 6 / 6x3x5 / 7 / 8x4x6, 0 differences); how the search values a move that ends the game | Search ignored `gameOver`/`winner`: a draw by repetition or tied cap scored +900 (a win) for the AI and -900 for the opponent; Medium/Expert took the repetition draw in 51 of 60 positions while 2+ captures ahead (18 of 25 with 3+ pieces ahead, applied on a real engine). FIXED: `evaluate` values finished games by result (draw 0), no-move nodes on a finished game use it; guard `HonestAi.terminalValue.test.ts` (seen failing, then passing; after the fix 0 of 60 and 0 of 25). Full Jest 8 batches PASS | Oracle on 10x5 / 12x6x5 / 16 and the reply-list caps; chain-stop lines skip end-of-turn bookkeeping in the search (UNCONFIRMED); worker in a production browser; real phones; human play |
| 11 | 2026-10-03 rest-of-code audit | (a) Independent rules reference (written from VISION/DECISIONS, from raw board geometry) vs the engine: ~307k steps of random full games, ~0.5M single moves from sparse and dense positions incl. 97 stalemates, all 7 boards; geometry sanity on all boards. (b) Online server attacked with hostile input against a real process. (c) Built production site served by the real server, inspected in a real browser (headers, weight, links, labels, premium flag, test hooks, privacy text vs behaviour) | Rules: 0 mismatches (CLEAN). Server: 3 single requests each killed the whole process for every player (`GET /%`, an unparsable request line, a WebSocket frame holding JSON `null`; an oversized WebSocket frame was a 4th path). Anonymous client filled all 2000 room slots in ~2 s (blocks everyone up to 3 h; busy was a 400). Room codes guessable at ~3,000/s with no limit (seat theft in waiting rooms). No cache/nosniff headers. 6 controls had no accessible name (label without `for`). FIXED: crash paths, body must be an object, 503 when full, nosniff + immutable cache for hashed assets, labels; guards `server/__tests__/app.hostile.test.ts` (12 tests, run against the old code the run hung and had to be killed; real-process probe re-run: alive) and `indexA11y.test.ts` (seen failing, then passing) | NOT FIXED (needs a decision): rate limits per IP (needs hosting/proxy setup); Privacy page does not mention online play; `sound-preview.html` ships in `public/`; 10 font @font-face rules point at 4 unique files (same bytes downloaded per weight); no compression/range support/CSP/frame policy; empty board variant `'5'` in BoardConfig; resignation offer never answered blocks a game with no clocks; no opponent-disconnected notice; real phones, Firefox, long sessions |

### B. Defect class x lens (which lens finds which class)

| Defect class | Needs this lens | Covered by | Gap today |
|---|---|---|---|
| Wrong rule / wrong winner | Rule review against VISION + tests built from real positions | #2, #8 (stalemate) | Chain, repetition and safety-cap rules were read, not fuzzed against an independent reference |
| Feature A x feature B (Undo x clock x AI) | Scenario matrix in a real browser | #8, now `m3-flow-gate.mjs` | Matrix covers 14 scenarios; grow it with every new feature |
| Time / speed | Worst case, thousands of cases, throttle | #6 | Non-AI code paths measured only lightly (render loop, clocks) |
| Layout / phone / viewport | Real browser at 5+ viewports | #8 | Real devices, iOS Safari quirks, notch/safe-area, keyboard |
| Robustness (storage, errors, offline, autoplay) | Fault injection | #7, #8 | Offline, slow network, blocked audio |
| Memory / long session | Soak run (hours), hidden tab | #7 (60 games) | Hours-long session; hidden-tab clock (PENDING W5) |
| Docs / CI / config drift | Mechanical scan | #3, #8 | Re-run after every doc-heavy change |
| Security | Input paths, dependencies, hosting headers | #7 (innerHTML, npm audit) | Accounts, payments, ads, multiplayer server do not exist yet: audit them when built |
| Accessibility | Keyboard-only, real screen reader | #8 (partial) | Board unplayable without mouse/touch (PENDING W3) |
| Cross-browser | Same gates in Chromium, WebKit, Firefox | `m3-flow-gate.mjs`: Chromium 14/14, WebKit 14/14 | Firefox does not launch on the dev PC ("spawn UNKNOWN"): UNCONFIRMED |

### C. Plan for the next audits (in this order; pick by what changed)

1. **Real-device audit (before any store release):** two Android phones + one iPhone, the PENDING A12/B6 list, plus the m3 scenarios by hand. Nothing else can replace it.
2. **Rule-fuzz audit:** an independent reference implementation of the rules (a few dozen lines, written from VISION, not from the engine) compared with the engine on 100k random positions and moves: captures, chains, stalemate, repetition, safety cap. Finds rule bugs the example-based tests cannot.
3. **Soak and hidden-tab audit:** a 2-hour Watch-AI run plus a 10-minute hidden-tab clock test (W5); measure heap, intervals, frame gaps.
4. **Hosting and delivery audit (when the site is deployed):** https only, headers, caching of `dist/`, font and BGM failures offline, blocked third-party calls, ads script. Redo the security lens on the real URL.
5. **Account / multiplayer / payments audit:** only when A7/A9 exist (auth, rate limits, cheating, data deletion).
6. **Accessibility audit with a real screen reader and keyboard-only play** once W3 is built.
7. **Content audit:** coach video script and voice against the real rules; every UI string for wording consistency ("side" vs "bead").

### D. The standing net (runs without anyone asking)

On every push (`.github/workflows/ci.yml`): `tsc`, Prettier, ESLint, fast Jest, and the `browser-gates` job (real Chromium: all-board capture gates + the 14-scenario flow gate). Locally: `npm test` (all Jest + the same gates), `SB_BROWSER=webkit node PROJECTS/SmartBeads/scripts/m3-flow-gate.mjs` for Safari's engine. **Rule for every bug fix from now on:** the fix ships with a failing-then-passing test at the level where the bug lived (unit if it is logic, `m3-flow-gate` scenario if it is an interaction or layout). A bug fixed without such a test is not closed.

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
| **Slow AI — search** | `HonestAi.searchLatency.test.ts` | Expert and Standard return a legal move under 3 s on all 7 boards (opening) + 16 midgame (one full search, no time limit) |
| **AI exactness + fuzz** (feature batch) | `HonestAi.turnEndsEquivalence.test.ts`, `HonestAi.fuzz.test.ts`, `HonestAi.speedEquivalence.test.ts`, `HonestAi.testAudit.test.ts` | Search turn ends == replay on the plain engine (repetition draws included); legal, deterministic, never-throw AI on random positions of all boards; golden picks; `HonestAi.ts` has no clock/budget |

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

- `HonestAi.ts`'s `usePerSideClocks` eval branch (`timerUrgency`, `timerEvalAdjust`) is confirmed unreachable in the shipped product today (tournament timer is pvp-only; the AI never moves in pvp mode) — kept in place as a plausible seam for a future "AI under tournament rules" mode rather than deleted, since deletion would touch ~8 test fixtures for a purely cosmetic gain. Now documented in-code so it doesn't read as an oversight. **Superseded 2026-10-01:** the branch was removed (only 3 test fixtures needed changing); see § "AI review 2026-10-01".

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
3. **Alternative comparison (Tier B, prototype-engine)** — worked through all 3 `LAB_EVALUATION_*.json` files in `prototype/board4/`, matching each shipped board's bead count to its pooled/rejected alternative(s) (12-bead had 3 alternatives, 8-bead had 3, 10-bead and 7-bead had partial data, 6-bead had none evaluated at all). No alternative showed a materially better signal than its shipped counterpart — several are `REJECT` (fairness-failed under the prototype engine), the rest are underpowered (winner counts as low as 1–7 out of 90) or, in two cases, never resolved a single game. Explicitly flagged in `GPT_PROJECT_CLOSED_ISSUES_05P.md` that this side of the comparison is prototype-engine-sourced and not blended with the Tier A production numbers.
4. **Verification:** `npx tsc --noEmit -p tsconfig.json` → 0 errors (repo-wide baseline). Board-relevant Jest: 15 suites / 203 tests green (`Board6`/`Board6x3x5`/`Board10x5`/`Board12x6x5`/`Board8x4x6`/`Board7` + their `*PrototypeParity` suites, `BoardCatalog.test.ts`, `allBoards.smoke.test.ts`, `v1GeometryCaptureAudit.test.ts`) — full suite not run since no production code changed (only a new standalone script + doc updates). Live browser smoke pass via `npm run web:smartbeads` for all 6 boards: board renders, a move applied, AI response observed (5 of 6 boards produced an AI capture within the smoke sequence; `6x3x5`'s short sequence didn't happen to trigger one, capture path already covered by its `PrototypeParity` Jest suite), zero console errors on any board.
5. **Minor script-quality fix in the same pass** — `lab-board-fairness-eval.mjs`'s `fpaMeetsWinnerThreshold` had a redundant `gamesWithWinner >= 20 ? true : gamesWithWinner >= 10` ternary (both branches reduce to the same `>= 10` check); simplified before treating the script as done, per the ongoing-audit-duty rule against landing known-redundant logic.

Full detail, per-board verdict table, and the alternative-comparison table are in `GPT_PROJECT_CLOSED_ISSUES_05P.md` (moved 2026-09-28 from PENDING §8b, which was rewritten that cycle, not just appended to). No catalog change made — none was warranted; the locked V1 board set stands per `VISION_05P.md`.

---

## Engineering work log (2026-09-29, Claude) — PENDING A2, dead-code/doc-mismatch sweep extended to rest of `src/`

Scope: the 5th cycle covered rendering/layout/theme + AI eval/timers/dead-tests in depth; this pass extended the same method to the areas it hadn't touched — `config/`, `core/`, `models/`, `playtest/web/audio/`, and a full repo-wide automated scan (not just the sampled areas).

1. **Real bug found: `tsc --noEmit` was not clean** — `GameFeatureSettings.test.ts:59` passed `coachBlueLevel: 5` as a plain number literal against the `AiLevel = 1 | 2 | 3` type. The test's *intent* is legitimate (exercises `clampUiAiLevel` defensively clamping a stale/legacy stored value down to 3) — the type was tightened since the test was written and the fixture was never updated to match, exactly the "invalid test fixture value" class of bug the 5th cycle warned about recurring. **Fixed:** `5 as unknown as AiLevel` with an inline comment explaining the intentional out-of-range value; `AiLevel` type imported. **Verified:** `tsc --noEmit` → 0 errors; `GameFeatureSettings.test.ts` → 8/8 passing; full suite → 671/671 passing (all 6 batches, exit 0).
2. **Automated dead-code scan, two methods, both clean:** (a) every `export function/const/class/interface/type` in `src/` (excl. tests) checked for total repo-wide occurrence count ≤1 (i.e. never referenced anywhere outside its own declaration) — zero hits. (b) every non-test `.ts` file checked for whether any other file imports/references it by basename — only `playtest/web/main.ts` came back unreferenced, confirmed as the legitimate Vite entry point (`index.html:356`), not dead code. No exported symbol or file removed — none warranted it.
3. **Doc-mismatch found and fixed (STATUS + DECISIONS):** both docs still described AI levels 4–5 as "in code pending removal" / "HonestAi still accepts 4–5 if passed in code." Grepped `HonestAi.ts` and the `AiLevel` type definition directly — confirmed zero level-4/5 code paths remain anywhere (the type is a hard `1 | 2 | 3` with no bypass cast). The removal had actually completed since those doc rows were written; they were just never updated. Fixed both: `GPT_PROJECT_STATUS_01P.md` § Integrity row → `VERIFIED CLEAN`; `GPT_PROJECT_DECISIONS_05P.md` §10 → "fully removed."
4. **Spot-checked, confirmed clean (no bug found):** `SoundManifest.ts`'s 8-entry `SFX_URLS` map against actual files in `public/audio/` — exact match, 8/8. `BoardCatalog.ts` default settings (`centerRule: 'off'`, all timers `'off'`) against `GPT_PROJECT_DECISIONS_05P.md` §5/§6 — matches on every board checked.

**Verified, not just claimed:** every finding above traced to an actual grep/type-check/test-run result before being reported, per Rule - Audit Completeness — no gap-list-only findings.

---

## A18 / A19 — full evaluation record (2026-09-29/30, Claude; report only, no repo code changed)

All runs used scratch copies of the repo (committed state) outside the vault; nothing in the repo was modified. Lab = prototype `.cjs` engines; production = `SmartBeadsEngine` + `HonestAi`.

### A19 — 16-bead board: X in every cell (current) vs standard 4 big X's (diagonals only where row+col is even)
**Trigger:** Shekhar, 2026-09-29: "standard 16-bead board has 4 cross, we have 16." Confirmed by his Alquerque drawing. Web search (Wikipedia, AlignIt, GameRules, Roll the Dice, bead16.com) confirmed 37 points, 16 pieces per side, any-direction movement, but gave NO per-node diagonal map; AlignIt says diagonal steps are legal only where a diagonal is drawn. So the standard layout rests on Shekhar's drawing + Alquerque convention, not on a published source.

**Current code:** `Board16Sholo.ts` and `prototype/board4/sholo-guti-fullturn-engine.cjs:83` link both diagonals in all 16 cells → 25 diagonal grid nodes, 32 diagonal edges, 92 edges, 128 jumpPaths. Ported from the prototype; `Board16PrototypeParity.test.ts` compares against that same prototype, so it inherited the geometry.
**Standard:** 76 edges, 112 jumpPaths, 13 diagonal grid nodes / 16 diagonal edges. Wing junctions A20/A24 are even points so they stay consistent.

**Geometry (scratch):** opening moves per side 13 → 9; nodes with ≤3 links 14 → 22; 11 stuck pieces per side at start on both; no trapped wing pieces.
**Full tests, candidate vs baseline (tsc + 59 files / 6 batches):** baseline all green (655 tests); candidate 1 expected failure (`Board16Sholo.test.ts` "13 opening legal slides" → 9). Board16PrototypeParity passes only with the prototype patched too. Renderer draws from `board.connections`, so lines follow the geometry automatically.
**Fairness:**
- Lab engine (D1 greedy, 500 games per opener): first-mover win 43.1% current vs 49.0% standard.
- Production engine (level 1, 2000 games each, 1224 decided, 39% draws at 120 plies): 46.2% vs 56.0%. RED wins 49.5% vs 49.0% (no colour bias).
- The two engines disagree → no proven fairness gain; on production the standard board flips the bias to the first mover (6.0 vs 3.8 points from 50/50).
- D2: 100% move-cap draws on both (lab and production) → no signal. D3 lab (90 games): 7–8 decided, rest draws.
- Prototype D2 captures/game 11.7–12.7 (current) vs 8.6–9.1 (standard).
**Speed:** production depth-3-reply search on 16-bead ~22% faster on standard (avg 271 vs 349 ms; all 14 positions full depth).
**Official lab gate (`final-validate-sholo-lab.cjs`):** NOT READY on unmodified main (`parity_node_coords`; `primary_D2_play_signal` 9.92 vs ≥10 at N=25) although the committed SHOLO_LAB_FINAL_TRUST.json (2026-08-14) says READY. Candidate adds 3 failures: `parity_edges` (playable HTML 92 vs 76), `parity_opening_move_count` (13 vs 9), first-player check. The playable HTMLs (SHOLO_GUTI.html, ..._WITH_FEATURE.html) would also need changing.
**Tooling defect found:** `evaluate-ladder-lab.cjs` requires `sholo-8-bead-fullturn-engine.cjs`, which does not exist (crashes). **Resolved 2026-10-01:** script retired (deleted) and trust file marked STALE — see CLOSED_ISSUES § "Lab-script defects — CLOSED".
**Other boards:** all 6 other boards use the same all-cells-crossed loop. They are our own designs, not traditional boards; 6-bead 3×5 is a recorded human KEEP and already near the G2 limit (D1 first mover 20% / second 80%, −30pp vs ±35pp). 12-bead is 6 rows × 5 cols, so an alternating pattern cannot be 180°-symmetric (the rotation flips row+col parity) and would create a first/second-mover bias. Decision: no other board is altered.
**Not tested:** human play, browser/phone check, D3 swap, production D2/D3 decisive fairness.
**Verdict (Shekhar, 2026-09-30): CLOSED, no change to the 16-bead board.**

### A18 — AI level 4 (depth-3 = 3 opponent replies), current geometry
Production `HonestAi` with a level-4 shim (`aiOpponentReplyPlies` level ≥4 → 3) in a scratch copy, Expert think budget per board.
**Single-position timing (avg / max; positions; over budget; over 45s):** 6x4 0.3/0.8s (20; 0; 0) · 6x3x5 0.1/0.3s (21; 0; 0) · 7x4x5 0.7/1.2s (18; 0; 0) · 8x4x6 1.4/3.2s (24; 0; 0) · 10x5 2.8/15.4s (22; 3; 0) · 16 3.8/10.4s (28; 4; 0) · 12x6x5 12.1/59.3s (27; 14; 2). Every position reached full depth 3.
**Strength, level 4 vs level 3, alternating colour and opener:** 6x4 32 games 23W/0L/9D, L4 ahead on pieces 28, avg +2.81, worst L4 move 0.6s · 10x5 12 games 4W/0L/8D, ahead 11, +3.08, worst 7.8s · 16-bead 7 games (stopped, partial) 1W/0L/6D, ahead 7, +4.43, worst L4 move 66s (three games >39s).
**Finding:** isolated-position timing understated real play on 16-bead (max 10s vs 66s in games). Level 4 is stronger than level 3 and never lost, but is too slow on 10-, 12- and 16-bead.
**Decision (Shekhar, 2026-09-30):** no level 4 for big boards; small boards only (6x4, 6x3x5, 7x4x5, 8x4x6). Level 4 stays ON HOLD until those boards are tested properly (see PENDING A18).

### A18 — AI level 4 extensive small-board run (2026-10-01, Claude; report only, no repo code changed)
Scratch copy of committed repo outside the vault; level 4 = 3 opponent replies via shim (`aiOpponentReplyPlies` level ≥4 → 3), Expert think budget per board. 100 games per board, level 4 vs level 3, alternating colour, 2 seeded random opening turns; 200 capture-biased/random mid-game positions per board. 1,200 jobs, 5 in parallel (timings inflated by load; over-budget positions re-timed one at a time). 0 hangs, 0 errors, every position reached full depth 3.

| Board | L4 W/L/D | Piece margin | Worst L4 game move | Over budget | Verdict |
|---|---|---|---|---|---|
| 6x4 | 68/8/24 | +1.97 | 1.6s (budget 3.2s) | 0 | GO |
| 6x3x5 | 46/3/51 | +1.65 | 1.2s (3.2s) | 0 | GO |
| 7x4x5 | 62/2/36 | +2.55 | 2.8s (3.4s) | 0 positions after serial re-time (11 flagged under load, worst 2.2s alone) | GO |
| 8x4x6 | 41/1/58 | +2.20 | 25.8s under load (3.5s) | 10 of 117 flagged positions still over budget when timed alone, worst 9s | NO-GO |

**Why 8x4x6 is NO-GO:** Expert never exceeds the budget there (worst 2.1s); level 4 does (under load 23% of moves, 118 over 10s). The AI search runs on the main thread (no Worker in PlayController/aiTurnRunner), so a long move freezes the page. Strength is not the issue (41W/1L). Level 4 is not downgraded when slow: the search extends time to full depth 3, and moves get faster late in the game.
**Losses:** level 4 lost 14 of 400 games, all genuine eliminations, replayed deterministically. Pass bar used: no more losses than wins, within budget, full depth, no hangs.
**Not covered:** human playtest, phone timing, serial re-run of 8-bead games, AI clock use with a game timer on. Verdicts are machine-verified only; PENDING A18 unchanged until Shekhar decides.
**Closed (Shekhar, 2026-10-01):** level 4 dropped on all boards, including 7x4x5, because device speed varies and no timing risk is accepted. A18 moved to CLOSED_ISSUES; PENDING A18 removed. The two broken lab scripts noted earlier stay open as their own note in PENDING and are not part of this closure.

## AI review 2026-10-01 (Claude; Shekhar asked for a deep AI audit and fixes; level 4 / A18 was closed first)

All lab runs used a scratch copy inside the vault (`PROJECTS/SmartBeads/_lab_scratch_ai/`, hidden from git via `.git/info/exclude`, no test files copied). Production `HonestAi` + real `FeatureSession`/`SmartBeadsEngine`; both sides play 2 seeded random opening turns, colours alternate. Raw results (`results_*.jsonl`) stay in that folder.

### 1. Ladder (centre off, no timer)
Expert (L3) vs Standard (L2), 520 games: 486 W / 2 L / 32 D (6x4 99/0, 6x3x5 97/1, 7x4x5 97/0, 8x4x6 95/1, 10x5 54/0, 12x6x5 25/0, 16 19/0). Standard vs Casual 169/180 wins; Expert vs Casual 60/60. No inversion on any board. In this setting Expert does not lose to Standard.

### 2. Flat 120-turn cap drew games the AI was winning (FIXED)
Every draw in section 1 was `safety_cap`; on 16-bead 9 of 11 draws had Expert ahead ~7.3 v 3.1 pieces. Uncapped, 40 games (10 each on 16, 12x6x5, 10x5, 8x4x6): all 40 ended by elimination, none drawn. Game length (turns) uncapped: 16-bead 92-186 (median 138); 12x6x5 53-131 (76); 10x5 42-249 (65); 8x4x6 32-78 (45). **Fix (Shekhar, 2026-10-01):** cap kept; 120 turns total on 6x4 / 6x3x5 / 7x4x5, 240 (120 per side) on 8x4x6 / 10x5 / 12x6x5 / 16; at the cap more captures wins, centre rule (when on) breaks a captures tie, else draw. `engineSafetyCapForVariant`, `FeatureSession.maybeApplyCenterTiebreakAfterEngineEnd`. DECISIONS (line "Engine safety cap") updated.

### 3. AI search froze the page (FIXED)
`PlayController.runAutomatedTurn` called the synchronous search on the main thread; no Web Worker existed. Expert think times seen serially on big boards (other jobs were running, so inflated): 16-bead worst 41.0 s (12 of 669 moves over the 4.96 s budget), 12x6x5 9.8 s (9/401 over 4.16 s), 8x4x6 18.5 s (5/242 over 3.52 s), 10x5 2.2 s (0/419). **Fix:** `feature/aiSearchWorker.ts` + `AiSearchClient` + `main.ts` (`?worker` import, `vite-worker.d.ts`); `bootstrapPlayShell(onReady, { aiSearchClient })`; tests/Node keep the synchronous path. Verified in the browser (dev server and a production `vite build`): worker created and replying, game progressing, longest frame gap 54-90 ms during Expert-vs-Expert 16-bead. Worker failure falls back to the same full-strength search on the main thread, logged. The existing comment "clocks must keep running during AI think" is now actually true. **Not changed in this step:** the search itself still retried up to 45 s then ran unbounded (superseded: removed in section 10) — the page no longer froze, but a pathological position could still make the AI think for a long time. Phone / Android WebView not tested. *(Second pass 2026-10-01, section 10: the retry loop below was removed.)*

### 4. Silent first-legal-move fallback (FIXED)
`PlayController` and `planAiTurnPath` swallowed search errors and played the first legal move. Now `emergencyLegalPath` logs `[AI] search failed…` (no log when there are genuinely no legal moves). Tested.

### 5. Centre rule made Expert LOSE material (FIXED)
`CENTER_EVAL_WEIGHT = 28` (about half a piece) was applied from move 1 although the centre rule only breaks a captures tie. Real `FeatureSession` games, timer 2 min at 6 s/turn:
- Centre-aware vs centre-blind Expert (aware wins / blind wins): 7-bead 5/24, 16-bead 0/15, 12x6x5 1/12. Centre-only awareness reproduces it; timer-only awareness is neutral (7: 6/6, 16: 7/9, 12: 6/5).
- Expert vs Standard, both aware, centre endgame: 7-bead 18-11 (centre OFF baseline 25-0); 8x4x6 17-2, 12x6x5 13-3, 16 11-3.
- Weight sweep (aware/blind, centre-only): 28 → 5/24 on 7; 8 → 5/16; 3 → 9/11; 1 → 15/6 (7 endgame), 27/3 (7 cumulative), 19/11 (6x3x5 cumulative), 8/8 on 16 and 12x6x5; 0 → parity (harness check: 6/6, 8/8).
- At weight 1, Expert vs Standard: 7-bead 25-2, 8x4x6 16-3, 12x6x5 12-2, 16 7-8 (n=16; centre-off baseline 8-5).
- No timer, centre on, long games: Expert 58/58 at weights 28 and 3.
- One-turn-left decision test (clock leaves exactly one turn, 50-100 positions per board/rule): aware vs blind essentially identical at weight 1 and 28 (a handful of positions differ either way).
**Fix:** `CENTER_EVAL_WEIGHT = 1` (tie-breaker); the timer-urgency boost near expiry is unchanged. Guarded by `HonestAi.test.ts` ("centre rule never outweighs material"); mutation-checked (fails at 28). Samples are small (16-30 games per cell); the 7-bead effect is large and consistent across runs.

### 6. Dead per-side clock code (REMOVED)
`usePerSideClocks`, `redRemainingSec`, `blueRemainingSec` in `AiTimerContext` / `timerUrgency` / `timerEvalAdjust` / `aiTimerFromSession` were unreachable (tournament timer is pvp-only, AI never moves in pvp). Removed with 3 test fixtures; an unused `aiPlayer` parameter of `timerUrgency` removed too. This supersedes the earlier "kept as a seam" note.

### 7. Regression guard added
`HonestAi.ladderStrength.test.ts` (slow batch `slow-ai-ladder`): 12 games per board, Expert vs Standard on 6x4 / 6x3x5 / 7x4x5 (must win >=75%, lose <=1) and Standard vs Casual on 6x4.

### 8. AI took too long on big boards (FIXED without changing a single move)
Shekhar: over 5 s is unacceptable, a phone is slower still, and the AI must not play a random/weaker move to save time. Profiling (16-bead mid-game, 98.7% of samples in the search process): ~55% of the time was engine bookkeeping (`getJumpMovesFrom` 23%, `getLegalMoves` 15%, array `find` scans 13%, per-leaf engine construction + repetition keys 12%, board cloning 12%). The reply search also started every candidate move from scratch (no best-so-far bound) and tried moves in arbitrary order. **Exact-preserving fixes:** (1) `cloneBoardDefinition` shares the never-mutated `connections`/`jumpPaths` arrays; per-geometry indexes for neighbours, jump-by-origin and jump-by-ends (`getConnectedIds`, `getJumpPathsFrom`, `findJumpPath`) and a direct-index `requireIntersection`; (2) `mobility` counts moves without building an engine per leaf; (3) `generateTurnEnds` reuses one scratch engine; (4) captures searched first at every level; (5) at the root each move's reply search gets alpha = (best score so far - that move's score adjustments - 1e-6), so a move that cannot tie or beat the best is cut off while ties are still searched exactly; ties keep their original order so seeded picks are unchanged.
**Proof of "same moves":** 49 seeded full games (Expert vs Standard and Expert vs Expert, 7 boards) hash-identical move logs before vs after; 354 seeded mid-game positions (8x4x6, 12x6x5, 16) picked the same first and last tie-break move. **Speed (desktop, nothing else running), Expert L3:** total think time per game set 4.2x-11.0x less; heavy tail (120 positions per board) p99 / max: 16-bead 1985 / 2262 ms -> 124 / 160 ms, 12x6x5 1879 / 2449 -> 143 / 146, 8x4x6 822 / 842 -> 62 / 68; nothing over 3 s before or after on this PC. (Earlier 10 s / 41 s figures were taken while other jobs were running on the same CPU and are not reproducible without load.) Permanent guard: `HonestAi.speedEquivalence.test.ts` (golden picks recorded from commit 7126494, mobility == engine move count on seeded positions, geometry indexes == naive scans). The 45 s retry loop and the unbounded final attempt were still there at this step (removed in section 10; still no time-cap/best-so-far fallback). Phone speed was unmeasured here (emulated in section 10).

### 9. Centre rule only with a timer (Shekhar decision)
Implemented: `normalizeTimerSettings` forces centre Off without a match timer; settings screen disables the dropdown. Session tests that exercised centre without a timer now use a timer. No further centre testing requested.

### Verification (before the speed-up and centre-timer changes; re-run result stated at the end of this section)
`tsc --noEmit` 0 errors; all 7 Jest batches PASS (678 tests, 61+ files incl. slow tiers/ladder/search-completion); ESLint 0 errors (1 pre-existing unused-import warning in `HonestAi.difficultyTiers.test.ts`); `vite build` OK. **UNCONFIRMED:** the Playwright live gates in `npm test` (`m2-2step-npm-gate.mjs`) cannot run here — Playwright's browser is not installed (`npx playwright install` needed, a download, not done). No commit or push made.

**Re-run after sections 8-9 (speed-up + centre needs a timer):** `tsc --noEmit` 0 errors; ESLint 0 errors; all 7 Jest batches PASS, 704 tests (slow AI tier batch 249 s -> 24 s, ladder guard 62 s -> 14 s because of the speed-up). Browser check of the settings screen (dev server): timer Off -> Centre dropdown disabled and Off; timer 5 -> enabled; Centre = End-Game kept; timer back to Off -> Centre reset to Off and disabled. Prettier reports 11 files not formatted repo-wide (18 before these changes); none of the new files. Uncommitted at the time of writing.

### 10. Deep AI audit, second pass (2026-10-01, Claude; Shekhar: "systematic, evidence-based, every function")

**Why it was needed.** The first pass measured strength but not worst-case time, and left three structural flaws: one search restarted from zero up to six times, "budgets" that were not budgets, and an engine that copied the whole game history for every node. All are fixed below; every speed change was proved to keep the same moves.

**Rules held (Shekhar):** an AI move must not need more than 3 s on any device; no random move, no "best so far", no lower depth, no weaker play to save time; speed only from making the SAME search faster.

#### 10.1 Every function in the AI path (purpose / worst-case cost / failure modes)
| Function | What it does | Cost / risk found |
|---|---|---|
| `evaluate`, `mobility`, `countPieces`, `centerScoreForPlayer`, `timerUrgency`, `centerEvalWeight`, `timerEvalAdjust` (HonestAi) | Static score: material 48 + mobility 1.5 + centre (weight 1, plus timer boost) + timer adjust | Pure, no throws, one pass over the board per call (~4 µs on 16-bead). `mobility` == engine move count (tested). Found: unused `aiPlayer` parameter in `centerEvalWeight` (REMOVED). `evaluate` keeps an unused `_variant` argument that many callers pass (left, harmless). |
| `aiOpponentReplyPlies`, `replyBranchForLevel` | Level -> reply depth (0/1/2) and list cap (60/64/80) | Cap measured, see 10.4 |
| `walkTurnEnds` / `generateTurnEnds` | All ways to end a turn: root slide/jump, then jump chains | Found: "unbounded" really stopped at roots+512 ends (now the named constant `UNCAPPED_EXTRA_ENDS`); chains limited to 8 hops (`MAX_CHAIN_HOPS`, see 10.4); a root-list deadline (`Date.now()+budget`) could silently truncate the root options (REMOVED with the budgets). One scratch engine per board is reused (not re-entrant; documented). |
| `capturesFirst`, `capturesFirstIndexes` | Stable captures-first ordering | Order only; cannot change a result |
| `minimaxTurns`, `leafSearch` | Alpha-beta over whole turns; last ply evaluated in place and generation stops at the cutoff | Exact. Found: every leaf cloned a snapshot (REMOVED) |
| `scoreRootEnd`, `endScore` | Root scoring (+0.05 per capture tie-break, soft repetition penalty) | Root alpha bound is exact (a tie is searched fully) |
| `searchBestAtExactDepth` | Scores every root move, returns the tied best set | Found: restarted the whole search up to 6 windows (4960..45000 ms, ~123 s if every window timed out) and then ran unlimited anyway; result identical to one search (FIXED: one pass, no clock) |
| `selectAiTurnPath` | Level dispatch; Casual ~30% soft-miss, Standard ~20% soft-miss, Expert 0% | `budgetMs` option and numeric overload REMOVED (dead) |
| `bestCapturePool`, `softMissPath`, `steerCapturePoolByRepetition`, `pickRandomEnd` | Casual / soft-miss paths | Linear; no throws |
| `shouldAcceptResignationDraw` | Accept a resigned draw when eval <= 0 | Pure |
| `thinkBudgetForLevel`, `BOARD_THINK_MULTIPLIER`, `MAX_DEPTH2_SEARCH_MS`, `probeSearchCompletion`, `SearchCompletionReport` | Think budgets (3200 ms x board factor, all above 3 s) and a "did depth 2 finish" probe | Found: budgets only fed the restart windows, so they meant nothing. REMOVED with the loop. |
| `aiTurnRunner` (`buildAiPlanRequest`, `emergencyLegalPath`, `planAiTurnPath`, `runAiTurn`) | Builds the plan request, logged emergency fallback | `budgetMs` removed from the request. Fallback is logged, never silent. |
| `aiSearch`, `AiSearchClient`, `aiSearchWorker` | Same search in a Web Worker; `cancel()` terminates it | Worker crash -> logged retry on main thread (tested, `aiSearchWorker.test.ts`) |
| `PlayController` `runAutomatedTurn` / `continueAutomatedTurn` / `cancelAiWork` | Schedule, plan, animate, cancel on Undo / New game / board or setting change | Stale runs are dropped by `aiRunId`; no leak found |
| `SmartBeadsEngine` (as used by the AI) | Rules | Found: each snapshot copied the full repetition history (O(game length)), each move re-checked legality by building the move list, each turn end built key strings and a full legal-move list for the stalemate test. FIXED, see 10.2 |

#### 10.2 What was changed (all exact, same moves)
1. One search, no windows, no clock (`HonestAi.ts`). `budgetMs` / `thinkBudgetForLevel` / `probeSearchCompletion` deleted; tests, scripts (`lab-*.mjs`) and docs updated.
2. Engine "search mode" (`SmartBeadsEngine.ts`): repetition history is the shared game history plus a short numeric path (`SearchSnapshot`, `loadForSearch`, `exportSearchSnapshot`); repetition counts use an exact numeric position encoding with a hash pre-filter against the game history; `applyLegalMoveWithUndo` / `undoLastMove` instead of reloading a cloned board per move; `applyLegalMove` skips the legality re-check for moves taken from `getLegalMoves()`; `hasLegalMove` (early exit) replaces `getLegalMoves().length`; `countPieces` without allocation. The normal game engine path (`exportSnapshot`, `loadSnapshot`, `applyMove`) is unchanged for the app; in search mode `exportSnapshot` throws on purpose.
3. Last search ply evaluated in place; one scratch engine per board; moves generated in the same order as before.

**Proof of "same moves".** (a) 49 seeded full games (Expert vs Standard / Expert, 7 boards): move-log hash, turn count and winner identical to commit 7126494 for all 49, after each step. (b) Differential test against the original code (commit 7126494): ~118,000 turn-end lists (3 turns deep) on all 7 boards, every path, board, captures, game-over reason compared, 0 mismatches, including about 1,560 turn ends that end the game by 3-fold repetition. (c) Permanent guards: `HonestAi.turnEndsEquivalence.test.ts` (every search turn end == replay on the plain engine, repetition draws included), `HonestAi.speedEquivalence.test.ts` (golden picks), `HonestAi.fuzz.test.ts`, `HonestAi.searchLatency.test.ts`, `HonestAi.testAudit.test.ts` (fails if `HonestAi.ts` ever gets a clock or budget again).

#### 10.3 Worst-case time (Expert, level 3; idle machine, one board at a time)
Desktop, Node, seeded positions (random, capture-biased, long capture-biased; positions where the game was already over are skipped):

| Board | Positions | p50 ms | p99 ms | p99.9 ms | max ms | max before this pass | max x5 (slow phone) |
|---|---|---|---|---|---|---|---|
| 6x4 | 4,925 | 1.1 | 3.7 | 6.2 | 12.9 | 48 | 0.06 s |
| 6x3x5 | 5,198 | 1.0 | 4.1 | 8.0 | 11.0 | 47 | 0.05 s |
| 7x4x5 | 5,740 | 2.1 | 9.1 | 16.0 | 23.4 | 106 | 0.12 s |
| 8x4x6 | 6,586 | 3.1 | 9.6 | 14.8 | 26.5 | 139 | 0.13 s |
| 10x5 | 7,431 | 3.8 | 10.5 | 15.7 | 28.7 | 154 | 0.14 s |
| 12x6x5 | 9,968 | 6.0 | 16.8 | 27.0 | 45.2 | 291 | 0.23 s |
| 16 | 13,759 | 5.6 | 18.0 | 28.5 | 46.4 | 517 | 0.23 s |

("max before" = same method on the code as pushed at 2d62ccf. Full games: total Expert think time over the 49 oracle games 626 s at commit 7126494 -> 10.3 s now; slowest single move in them 4357 ms -> 51 ms.)

Adversarial search (hill-climb: mutate a position toward the slowest Expert move, 100-150 restarts x 100-120 steps per board; re-timed 3x): 16-bead 27 ms (one 92 ms reading did not repeat), 12x6x5 56 ms (a position with 179 root move-ends), 10x5 39 ms (89 root ends), 8x4x6 11 ms.

Real Chrome (installed Chrome, headless, CDP CPU throttling; same seeded positions; a throttled run is slower than "rate x desktop" because the engine is JIT-compiled):

| Board | Throttle | Positions | p50 ms | p99 ms | max ms |
|---|---|---|---|---|---|
| 16 | none | 5,898 | 3.9 | 12.4 | 23 |
| 16 | 4x | 1,176 | 39 | 122 | 212 |
| 16 | 6x | 1,176 | 69 | 226 | 336 |
| 12x6x5 | 4x | 862 | 38 | 105 | 163 |
| 12x6x5 | 6x | 862 | 66 | 177 | 268 |

Acceptance (< 3 s at 5x slowdown, i.e. < ~0.6 s desktop): met on all 7 boards (worst measured: 16-bead 336 ms at 6x throttle, about 9x under 3 s). Browser: a real Expert game on 16-bead (human move, AI capture reply, Undo, New game) and Watch AI vs AI ran with the worker, 0 errors, longest main-thread pause 105 ms.

**Not a proof.** The numbers come from tens of thousands of positions plus adversarial search, not from a formal bound. In theory the work grows with (root move-ends) x (reply list <= 80) x (reply list <= 80); alpha-beta cuts almost all of it, and the largest root list seen was 306 move-ends (old code, ~0.3 s then; it is far cheaper now).

#### 10.4 Caps measured (flaws C and D)
- **Reply list cap (80 / 64 / 60), flaw C.** Of about 4.3 million turn ends in 226,000 lists (full unpruned 3-turn tree from 118-300 positions on each of 6 boards; 6x3x5 not scanned), lists of 80 or more occurred on 16-bead (largest 134, 9 of 46,402 lists), 8x4x6 (86) and 12x6x5 (84). Capped vs uncapped Expert picks (first and last tie-break) on 12,844 seeded positions (16, 12x6x5, 8x4x6, 10x5, 7x4x5): **0 differences**. Standard (cap 64): 0 differences on 3,550 positions (16, 12x6x5; with a fixed rng of 0 the Standard path takes its soft-miss branch, so only the 0.999 pick exercised the search). Uncapped search costs about 2x the average time (16-bead max 110 ms). Not material -> cap kept (it also bounds the cost).
- **Chain depth (8 hops), flaw D.** Longest capture chain seen: 7 hops (16-bead, 12x6x5), 0 of the 4.3 million turn ends reached 9. The limit is a safety bound only; kept and named.

#### 10.5 Rules, evaluation and clocks
- Evaluation unchanged by this pass, so the ladder and the centre-on results from sections 1 and 5 stand (moves proved identical on 49 games + 12,844 capped/uncapped positions). Ladder guard `HonestAi.ladderStrength.test.ts` re-run green (see Verification).
- Clocks: the match / shot / tournament timers keep running during AI think (`clockPolicy.ts`). Shot clock options are Off / 60 / 90 / 120 s and the AI now needs well under 0.4 s even at 6x throttle, so the shot clock cannot cost the AI the game; on a shared match timer both sides pay the same (tiny) think time.
- The evaluation reads the match-timer value once when the search starts (it does not tick during the 5-50 ms search); no issue.

#### 10.6 Checked / found / fixed / UNCONFIRMED
- **Checked:** every function listed in 10.1; worst-case time on 7 boards (desktop, adversarial, Chrome throttled); equivalence to the original code; caps (C) and chain depth (D); property/fuzz (legal, deterministic, never throws, null only when no moves); browser PvE flow, Undo, New game, Watch AI vs AI; docs vs code.
- **Found and FIXED:** A restart loop (one search now); B budgets meaningless and above 3 s (removed); root list deadline could truncate silently (removed); hidden `roots+512` cap (named); engine copying history / cloning per leaf / rebuilding legal-move lists (search mode); unused `aiPlayer` parameter; docs saying "up to ~45 s" (STATUS, PENDING, PROJECT_MAP, `pveTiming.ts` comment) corrected. Caps C and D measured and kept.
- **Not a flaw but worth knowing:** a hand-built position with a huge number of capture chains could still be slower than anything tested (no formal bound).
- **UNCONFIRMED:** real phones (ARM CPUs, thermal throttling, Android WebView) - only emulated by Chrome's CPU throttle; the Playwright live gates in `npm test` (Playwright's browser is not installed here); Resign, Coach lessons and "change a setting during an AI move" in a real browser (covered by Jest; an AI move now takes milliseconds, so there is almost no window to interrupt); Watch AI vs AI was checked on 6x4 only, with `requestAnimationFrame` replaced by a timer because the app window was minimized and not painting (the AI search itself was also checked directly through the worker: 98 ms, legal move).

#### 10.7 Final verification of this pass (final code)
`tsc --noEmit` 0 errors; ESLint 0 errors / 0 warnings; Jest batch audit: 64 test files, each in exactly one batch; all 7 batches PASS, 708 tests (feature batch now includes the new exactness and fuzz tests; slow tiers 13.6 s, ladder 9.7 s, search-latency 5.8 s); `vite build` OK (worker chunk `aiSearchWorker` 27.9 kB); oracle 49/49 identical to commit 7126494. **UNCONFIRMED:** Playwright live gates in `npm test` (browser not installed), real-phone speed.

### 11. Why earlier audits missed the time problem, and the standing audit checklist
**Why missed:** (1) audits measured strength (win rates), never the slowest single move per board; (2) the "45 s ceiling" was documented as a feature and the test only checked that the search finishes, not how long it takes — docs and tests were read as truth instead of questioned; (3) tails were sampled on only 120 positions (0.16 s reported on 16-bead; 13,759 positions gave 517 ms for the same code); (4) some timings were taken while other jobs ran.
**Why Expert is slower than Standard:** Expert searches 2 opponent replies, Standard 1; cost multiplies per ply (roughly 10-30x per move). By design; it became a defect only because of engine overhead and the restart loop.
**Standing checklist for any change or audit:**
1. Grep for `Date.now` / `performance.now` / `setTimeout` / `setInterval` / retries / caps / budgets / `catch` — each needs a stated reason (`HonestAi.testAudit.test.ts` enforces no clock in the AI).
2. Measure the worst case, not the average, on at least 5,000 cases on an idle machine, plus an adversarial search and a CPU-throttled run (method: section 10.3).
3. Prove behaviour is unchanged before claiming a speed-up (oracle games, differential and equivalence tests).
4. Read every doc claim against the code.
5. Never accept a "completes eventually" test for anything user-facing — assert time.

### 12. Extra points: idle CPU, innerHTML/security, error handling, memory (2026-10-01, Claude; report only, no repo code changed)
- 12.1 Idle redraw (CONFIRMED, small): loopPulse (PlayController.ts:1339) calls drawBoard every frame unless a move animates. With a piece selected: 135 redraws / 4 s, canvas pixel-identical, ~38 ms/s main thread at ~33 fps (about double at 60 Hz). The pulse is visible only while the match-start rings are pending (they are armed at game start and cleared on the first pick, not every turn) with nothing selected, or during a capture pulse. FIXED in § 13 (item 9): redraw only then, plus a 1 s idle repaint that keeps the cross-tab look sync.
- 12.2 innerHTML: 14 hits; 12 are `= ''`; 2 constant strings (PlayController:636, selectPopulators:16); 1 dynamic (PlayController:473 coach panel) from the constant COACH_VIDEO script via escapeHtml. No URL/storage value reaches innerHTML (playTheme is checked by isLookSwatchId; play/coach compared to literals). No risk found. npm audit: 7 (2 moderate, 5 high), all dev-only (vite/esbuild, js-yaml, nanoid, brace-expansion, browserslist, baseline-browser-mapping); `npm audit --omit=dev` = 0.
- 12.3 Error handling (CONFIRMED gap): no window.onerror / unhandledrejection handler. AI failures fall back and log to console only. A throw inside drawBoard (simulated with localStorage.getItem throwing) stops the render loop permanently (70 -> 0 fps, no recovery) because drawBoard runs before the next requestAnimationFrame; the player sees a frozen board and no message. Several localStorage reads are unguarded (beadSetThemes, moveHintAuraThemes, playShellThemes:474+, PlayHub:229). FIXED in § 13 (items 10-11): the next frame is requested first, the unguarded reads (beadSetThemes, moveHintAuraThemes x3, PlayHub x2; playShellThemes and SoundEffects were already guarded) go through `safeStorage.ts`, and one global handler logs and shows "Something went wrong. Reload" once.
- 12.4 Memory: 60 New games + 60 board switches: heap 4.6 -> 5.0 MB, DOM nodes constant (367), 1 canvas, 0 listeners added, 0 live intervals, 0 workers created, frame rate did not multiply (no stacked loops). UNCONFIRMED: Play-vs-AI worker churn and a long game (run ended on the hub screen; no forced GC available).

### 13. Whole-code audit, everything except the AI search (2026-10-01, Claude; Shekhar: "complete it properly, no blunders")

**Why this section exists.** Section 12 answered four pointed questions and stopped there; the request was a whole-code audit. This section applies the section 11 checklist to the rest of the code, in a real browser, and ends with the explicit checked / found / fixed / UNCONFIRMED list (13.5).

**13.1 Method and inventory.** Read in full: `PlayController.ts` (2,098 lines), `FeatureSession.ts`, `GameFeatureSettings.ts`, `clockPolicy.ts`, `pveTiming.ts`, `undoController.ts`, `resignationController.ts`, `SoundEffects.ts`, `timerDisplay.ts`, the engine end rules (`completeTurn`, `tryEndAtPlyOrSafetyLimit`, `resolveTurnEnd`, `evaluatePlyLimitWinner`), `vite.config.ts`, CI, `package.json` scripts, `index.html`, the phone CSS. Grep sweep of `src` (non-test): `setTimeout` 7, `setInterval` 4, `requestAnimationFrame` 6, `Date.now` 1 (a sound-event timestamp), `performance.now` 4, `localStorage` 31, `fetch` / `new Audio` / `new Worker` 2, `any` / `@ts-ignore` / `eslint-disable` 0, TODO / FIXME / HACK 0, `catch` 27, `console.` 33, `while` 3. Verdicts: every timer is either cleared (`clearInterval`, `cancelAnimationFrame`, `clearTimeout`) or guarded by `aiRunId`; the seven `.catch(() => {})` on BGM `play()` only tolerate the autoplay block (fine); the other catches are storage / audio tolerance, now with a single helper for storage. The real Chrome pane was driven with real clicks and the session test hook; where the pane was hidden (no `requestAnimationFrame`) a timer shim was used. Everything below was observed, not assumed; code-read-only claims are marked.

**13.2 Found and FIXED (each with a test or a browser observation).**
1. **Undo reopened a game lost on time and refunded the clock.** Browser: the shared timer ran out (game over, 0:00), Undo was still enabled, one click and the game resumed with 113 s on the clock. The tournament clocks were refunded the same way (snapshots carried the clocks) and a game lost on the shot clock could be reopened. Fix: `loadSnapshot(snap, { keepClocks: true })` on Undo (clocks keep what is left, full shot clock for the side to move); `FeatureSession.endedByClock()`; Undo is disabled and ignored after a clock loss. `undoController.test.ts` (7 tests; 4 failed before the fix).
2. **Stuck game after Undo.** Browser: New game (the AI opens), click Undo: the position is back with the AI to move and nobody scheduled (`aiThinking` false, `canHumanAct` false, Undo disabled) until New game. Fix: `UndoDeps.resumeAutomatedPlay` (the shell schedules the AI again). Verified again in the browser (the AI replays its opening, human to move) and by a test.
3. **The centre rule overrode a stalemate win.** `maybeApplyCenterTiebreakAfterEngineEnd` ran for every engine ending with tied captures. A test built from the engine's own stalemate position (16-bead, centre End-game, timer on) got RED (centre) instead of BLUE (stalemate; VISION: the side to move with no move loses). Fix: only `safety_cap` goes to the centre tiebreak. DECISIONS § 4 updated (Shekhar to confirm).
4. **Result text.** (a) `safety_cap` and `safety_cap_captures` appeared raw ("safety_cap — captures tied — Black won on center."); (b) "Timer expired. draw." and "piece-count tiebreak." read as fragments; (c) every drawn game said "Tied in captures (a vs b beads)", also for repetition or an agreed resignation with unequal captures. Fix: new `feature/resultText.ts` (moved out of the `PlayController` closure so it can be tested): "Move limit reached", "Draw by threefold repetition", "Draw (4 vs 1 captures)", "Timer expired. Draw.", "Won on beads left.". `resultText.test.ts` (6) plus 3 new `FeatureSession.featureRules` tests (all 3 failed before).
5. **Phone: the shared match timer was invisible.** Browser 375x812 with a 5-minute timer: `#timer-mmss-p1/p2` were 0x0 (only the shot ring showed). Cause: the phone CSS hid the timer row whenever `.match-ring` was off, and the ring is only on in tournament mode. Fix: hide the row only when the timer text is off (`.match-timer-mmss.off`). After: 72x29 px, "04:59". Before, a player could lose on time on a phone with no visible clock. The layout is tight but nothing is cut at 375x812 (cream bar bottom 684 px, controls top 711 px).
6. **Phone: the board was distorted on short screens.** Browser 740x360 (landscape): canvas 694x115 css for a 560x900 bitmap (aspect 6.0 instead of 0.62; stretched ovals); also 315x335 for 16-bead at 360x580. Cause: `.board-frame { width: 100% }` while the height was clamped by the 200 px of chrome. Fix (phone block only): `width: min(100%, var(--frame-w))`, centred, and a 300 px floor for the board area so the page scrolls instead of squashing. After: 157x271 (aspect 0.58, round beads), 16-bead at 360x580 undistorted, 375x812 unchanged (330x548). Landscape still needs a real layout: PENDING W1.
7. **17 of the 20 BGM tracks used `http://`** (mixed-content risk on an https site; `play().catch(() => {})` hides the failure). All 20 URLs checked: HTTP 200, `audio/mpeg` over https. Fix: the 17 URLs switched to https.
8. **CI.** `npm run format:check` (a required CI step) failed on 31 files (an older audit line said 11); the lint step was marked non-blocking for "25 pre-existing errors" that no longer exist (ESLint 0 errors). Fix: Prettier applied to `src` and `SHARED` (formatting only, including a few AI-path files such as `HonestAi.ts` and `aiSearch.ts`; tsc, ESLint and all tests re-run, the AI golden-pick and equivalence tests pass unchanged), lint made blocking, the stale CI comments corrected. `npm run format:check` and `npm run lint` now exit 0. The GitHub run itself is UNCONFIRMED (no `gh` / network here). Side effect found and fixed: `HonestAi.testAudit.test.ts` matched Prettier-sensitive source text and failed after formatting; its regex was loosened.
9. **Idle CPU and a render loop that died on one error** (sections 12.1 and 12.3). Idle: 135 redraws in 4 s (33/s, canvas pixel-identical) became 8 in 4 s with a piece selected; at match start the rings still pulse (62 draws/s, pixels change). Loop: `requestAnimationFrame` is now requested before drawing; with `clearRect` forced to throw for 1.5 s the loop kept running (67 frames/s afterwards) and exactly one error bar appeared.
10. **Blocked localStorage broke drawing** (`getItem` throwing: 70 -> 0 fps, no recovery). Five unguarded sites (`beadSetThemes`, `moveHintAuraThemes` x3, `PlayHub` x2) now go through `layout/safeStorage.ts`. `blockedStorage.test.ts` (2; both failed before).
11. **No global error handler.** `globalErrorBanner.ts` (installed in `main.ts`): `error` and `unhandledrejection` are logged and the player sees one "Something went wrong. Reload" bar (shown once; browser-verified).
12. Smaller, all fixed: `prefers-reduced-motion` was not honoured anywhere (CSS rule plus the canvas ring pulse); `aria-live="polite"` on the two `mm:ss` timers made screen readers speak every second (removed); `PLAY_BOARD_LOOK_STORAGE_KEY` was defined in three files "to avoid a cycle" (now one leaf module); `SoundEffects.dispatchedEvents` grew without limit for the whole session (capped at 200); new `timerDisplay.test.ts` (4 tests) for the previously untested clock rendering.

**13.3 Checked, no defect found (evidence).**
- Clock accuracy: 9 ticks for 9.02 s of wall time, with the main thread blocked for 2.1 s (visible tab). Expiry precedence shot > tournament > shared is covered by `clockPolicy.test.ts`; all three timers expiring in one tick keep the first reason.
- Memory / leaks (section 12.4): no listener, interval or canvas growth across New game and board switches; not repeated after the fixes (the fixes add no listeners or loops: one `error` and one `unhandledrejection` listener, once).
- Every board x every mode: 7 boards x {Play vs AI, Play with a Friend, Watch AI vs AI} = 21 launches from the hub, 0 console errors, 0 uncaught errors.
- Flows: Play vs AI, human move + AI reply (worker), Undo; PvE resign (AI declined, result and session score correct); PvP resign offer, decline (win) and agree (draw); Play again; hub to board and back; Watch AI vs AI to the end on 6x4 (compressed timers; ended by the timer with the correct winner text, modal shown, `aiThinking` false). Sound: all 8 SFX WAV files are fetched once each (no decode loop; an early reading of `preloadAudioBuffers` as "4 of 8 decoded" was a misread of a truncated listing).
- Phone widths: 375x812, 360x580 (16-bead too), 740x360: no horizontal overflow; hub at 375: none.
- Docs vs code: every backticked file or script path in the 13 docs was resolved against the repository; the ones that do not exist are the retired lab scripts and removed Web REJECT playables, already recorded as retired in CLOSED_ISSUES (commits cfda4ad, af932a5). Stale statements corrected: STATUS Jest count (658 -> 730) and CI description, DECISIONS § 4, PROJECT_MAP (4 new files). Not re-read line by line: the long lab documents (BOARD_DISCOVERY, LAB_TERMINOLOGY, WEB_REPORT_*): only their file references were checked.
- `tsc --noEmit` 0 errors; ESLint 0 errors / 0 warnings (src + SHARED); Prettier clean; Jest audit (every test file in exactly one batch): 68 files.

**13.4 Not fixed, with the exact reason (all in PENDING W1-W8).** W1 landscape layout is a design job; W2 a setting change mid-game silently restarts the game (a confirm dialog would break the Playwright gates, needs a decision); W3 keyboard play (the board is a canvas); W4 tap targets 24-34 px high (gear 30x24, Resign / Sound / New game 30-31, hub swatches 22-34); W5 clocks count one per tick (hidden-tab slow-down UNCONFIRMED, needs a 5-minute hidden-tab run); W6 `__SB_TEST__`, `sb-test-resign-ai` and `sb-premium` ship in production (the Playwright gates use them); W7 repo clean-up (`SHARED/engine` 4 unused stubs, root `black-shade-samples.html`, `hub-theme-mockup.html`, `sound-preview.html` identical to the copy in `public/`, `PROJECT_SNAPSHOT.txt` from 2026-08-20): nothing deleted without approval; W8 test-coverage holes (`resignationController`, `startBannerController`, `boardSettingsPanel`, `PlayHub`; `processRegressionGuards.test.ts` asserts on source text). Minor, unchanged: the resign offer says "Black side" while the result says "Black bead"; a finished game keeps a no-op 1 s interval until New game; `shellTimerShouldSkip` ignores two of its three arguments (kept, tested).

**13.5 Checked / found / fixed / UNCONFIRMED.**
- **Checked:** everything in 13.1 and 13.3.
- **Found:** 11 confirmed flaws (13.2 items 1-11), 4 smaller ones (item 12) and 8 open items (W1-W8).
- **Fixed:** all of 13.2, each with a failing-then-passing test (items 1, 3, 4, 10) or a browser measurement before and after (items 2, 5, 6, 9, 11).
- **UNCONFIRMED:** real phones (only Chrome emulation); the GitHub Actions run; the Playwright live gates in `npm test` (browser not installed); the hidden-tab clock slow-down (W5); behaviour with a real screen reader; the Android WebView; and whether Shekhar accepts the two rule decisions in DECISIONS § 4 (Undo never refunds time, stalemate stays decisive).

**13.6 Final verification (final code).** `tsc --noEmit` exit 0; `npm run lint` exit 0; `npm run format:check` exit 0; `node PROJECTS/SmartBeads/scripts/run-jest-batched.mjs`: 7 of 7 batches PASS, 730 tests (708 before this section); `vite build` into a scratch folder OK (main 131 kB, worker 28 kB); browser re-checks after the last code change: 21 launches with 0 errors, the Undo-stuck repro fixed, idle redraw 8 per 4 s.

### 14. Follow-up the same day (2026-10-02, Claude; Shekhar: "decide yourself, do what is needed")
- **Decisions taken:** Undo stays (the three Undo defects are fixed and covered); Undo is switched off in tournament (chess-clock) games, where taking moves back defeats the clocks; changing a setting while a game is under way now asks first (Cancel restores the dropdown and the game carries on). DECISIONS § 4 updated.
- **Why the UI had no automated tests, and what changed:** the engine and the AI were unit-testable pure code and got heavy tests; `PlayController` is a 2,100-line closure over the DOM, the Playwright gates that could cover it were not installed on this PC and ran only two capture scenarios, and CI never ran them. Now: Playwright Chromium and WebKit installed; new `scripts/m3-flow-gate.mjs` (14 real-click scenarios: Undo x clocks, Undo x AI, setting-change confirm, tournament Undo, phone timer and overflow, landscape shape, idle redraw, render-loop survival, blocked storage, PvE/PvP resign, 7 boards x 3 modes); chained into `npm test` and into a `browser-gates` CI job. Mutation check: with the Undo guards and the confirm removed the gate failed 3 of 14, restored it passes 14 of 14. Stability: the whole gate chain passed 3 of 3 consecutive runs (178 confirmations each). WebKit 14/14. Firefox does not launch on this PC (spawn UNKNOWN): UNCONFIRMED.
- **Legacy browser scripts:** the other 20 `m2-*-verify` scripts are not part of `npm test`; 3 of the 3 tried at the previous commit already failed (stale selectors, old opener assumptions), so they are not a regression. PENDING W9.
- **Dead files deleted:** root `sound-preview.html` (identical copy in `public/`), `black-shade-samples.html`, `PROJECT_SNAPSHOT.txt`.

### 15. UI look and portal audit (2026-10-02, Claude; Shekhar: "deep audit of the UI look, portal etc.; report issues, suggestions, improvements")

**Lens (new, register row 9):** how the product looks and reads as a portal: hub page, first-run experience, visual identity, themes and contrast, wording, legal and trust pages, third-party content, metadata, focus and dialogs, phone/tablet first screen. **Not covered:** real devices, Lighthouse score, a real screen reader, a designer's judgement of brand and typography beyond what is measurable, low-end phone speed (all UNCONFIRMED). Method: real browser at 1280x720, 768x1024, 375x812; computed styles; contrast measured for 12 text roles in all 9 looks; fonts, network and HTML inspected; CSS and markup read. No code changed in this section; every item is a finding or suggestion.

**15.1 Issues (ordered by how much they matter for launch).**
1. **No legal or trust pages (HIGH, blocks store and ads).** There is no privacy policy, terms, contact, cookie / ad-consent or data note anywhere; "Help & Support" and "Player Profile" are disabled buttons. Google Play, any ad network and Google Fonts (item 4) need them. Suggest: a small footer on hub and game (Privacy, Terms, Contact, Credits) linking real pages before the first store submission.
2. **Third-party music, no credit (HIGH, legal and reliability).** 20 BGM tracks are hot-linked from `soundimage.org`; the product shows no credit line and the repo holds no licence note. Soundimage's licence asks for visible credit; hot-linking also means the music silently disappears the day that site changes or is down (the code swallows the failure). Suggest: read the licence, show "Music: Eric Matyas, soundimage.org" in an About/Credits spot, and host the licensed files yourself (or use your own tracks).
3. **Phone first screen hides the main action (HIGH, conversion).** At 375x812 the "Choose to play with" buttons start 200-360 px BELOW the first screen (Play vs AI at y=1008 on an 812 px screen). The header takes about 180 px (two wrapped nav rows plus two buttons), a pinned ad takes about 120 px, and the look preview shows an empty rectangle. At 768x1024 the same buttons are also below the fold. Suggest: a compact header (logo + menu), a default board already selected with one big "Play vs AI" button visible without scrolling, board look moved into an "Appearance" section.
4. **Fonts are loaded from Google at run time (MEDIUM, privacy and resilience).** `fonts.googleapis.com` is called on every visit (IP sent to Google; some EU regulators treat this as a violation without consent) and, if blocked or offline, the page falls back to system fonts. Suggest: self-host the three families as woff2 files with `font-display: swap`.
5. **Board tiles do not use the app font (MEDIUM, visual consistency).** `.hub-board-tile` renders in Segoe UI / system-ui while everything else is IBM Plex Sans / Cinzel, so the tiles look different on Mac and Android. Suggest: `font: inherit` on the tile buttons.
6. **Stars on board tiles are unexplained (MEDIUM, clarity and accessibility).** One to three stars appear on five tiles with no legend or tooltip, and are `aria-hidden`, so a screen-reader user never learns the tiles differ. Suggest: a one-line legend ("★ recommended for beginners" or whatever they mean) or remove them; add the meaning to the tile's accessible name.
7. **Mode help text contradicts the page (LOW-MEDIUM).** The "?" text says "Pick board and difficulty on the board page" but the board is picked on this page; difficulty is on the next page. Rewrite.
8. **Warm Walnut look fails text contrast (MEDIUM).** Measured WCAG contrast for small labels, values, headings and tiny text is 3.3-3.5:1 (needs 4.5:1). The other 8 looks measure 5.3:1 or better for every role checked (labels, values, names, selects, Resign, New game, Sound). Suggest: lighten the label colour in the Walnut palette.
9. **Dialogs do not manage focus (MEDIUM, keyboard and screen reader).** The result and resign dialogs are `role="dialog" aria-modal="true"` but opening one does not move focus into it, Tab can still reach the page behind, and Escape does nothing (Escape only closes the settings panel). Suggest: focus the primary button on open, trap Tab inside, Escape = "View board" / close, return focus afterwards.
10. **No way back to the hub from a game (MEDIUM, navigation).** The only route is changing the board dropdown, which jumps to the hub. Suggest a visible "Menu / Home" control in the game controls.
11. **Empty look preview (LOW-MEDIUM).** The hub's "Choose board look" shows a blank rectangle until a swatch is clicked, in the most valuable screen area. Suggest: render the selected board with beads as the default preview.
12. **Portal looks unfinished (LOW).** Of the hub navigation, Community, Tournament and Review open "coming soon" notices, Help & Support and Player Profile are disabled, "Play with a Friend (Online)" is greyed. A first-time visitor sees five dead ends. Suggest: hide what is not built, or show one honest "Coming soon" card.
13. **No page metadata (LOW, discoverability).** No favicon, meta description, Open Graph / Twitter card, theme-color, apple-touch-icon, manifest or `<noscript>` message; the tab shows a blank icon and a shared link has no preview. Quick win before any marketing.
14. **Ad placeholder style (LOW, for later).** The placeholder is a bright white box on a dark UI; real creatives will clash and will need a consent flow (item 1). The phone layout reserves 58-120 px at the bottom for it.
15. **Sound is off by default and nothing says so (LOW).** The game starts muted (button "Off" at the bottom) with no first-run hint, so most players never hear the sound effects. Suggest a one-time "Sound on?" prompt or a visible toggle on the hub.
16. **Game screen space (LOW).** At 1280x720 the left panels leave a large empty gap between the Black and Cream panels and the board uses about half of the window height. Suggest tightening the side panels or enlarging the board; a design call.
17. Already logged in PENDING: phone landscape (W1), keyboard play (W3), tap targets under 44 px (W4), test hooks and premium flag in production (W6).

**15.2 What looks good (measured, not assumed).** Consistent green-and-gold identity; 8 of 9 looks pass AA contrast for every role checked; no horizontal overflow at 375, 360 or 768 px; clear mode names and wording on the hub; all dialogs have labelled titles and descriptions; result and resign wording is now readable; the hub and the game share one theme system.

**15.3 UNCONFIRMED.** Lighthouse performance and accessibility scores; load time on a low-end phone on mobile data; behaviour with a real screen reader; how the looks render on real OLED/low-brightness phones; whether the star meaning (item 6) is what Shekhar intended.

### 16. UI audit follow-up (2026-10-02, Claude; Shekhar: "go")
- **Built and verified:** U1-U4, U6-U10, U12 (list in PENDING U1-U12). New real-browser scenarios in `scripts/m3-flow-gate.mjs` (now 19; Chromium 19/19, WebKit 19/19): dialog focus and Escape, Menu button, start page on 375x812 and 360x640 shows the Play button without scrolling, star legend and star text, no request to Google, and the contrast of small panel text in all 9 looks. Each was seen failing when the matching fix was removed (old Walnut colours: 3.30 / 3.47:1; dialog focus removed; Play buttons moved down).
- **Corrections to § 15:** item 5 (tile font) was wrong: `play-hub.css` sets the whole start page to the system font stack on purpose, the game shell uses IBM Plex Sans. Item 11 (live board in the look preview) is declined because Shekhar removed those lines on 2026-09-24 (comment in `play-hub.css`).
- **A trap found while testing (recorded because it hides failures):** the look swatches only work on the start page; on the direct-play page (`?play=1`) they do nothing, so a first version of the contrast scenario passed with the old Walnut colours. It now drives the real start page and checks that all 9 looks were applied. Also: after another source changes the saved look, an open game picks it up within 1 s (the idle repaint), not instantly.
- **Not done, owner decisions:** see PENDING U1-U12 "Still open".

### Not done / open
- Whole-code audit leftovers: PENDING W1-W8 (landscape layout, setting-change confirm, keyboard play, tap targets, clock vs wall time, production test hooks, repo clean-up, test holes); see § 13.4.
- Human playtest of the changed AI feel (centre rule, timed games); Android WebView / phone check of the worker.
- ~~Search retry still unbounded after 45 s~~ RESOLVED in section 10: one search, no clock; worst measured Expert move 46 ms desktop / 336 ms at 6x CPU throttle.
- The two broken lab scripts remain open in PENDING.
- No other flaw found in these conditions; "no flaw at all" cannot be proven by any finite test.

---

## Recommendation

Do not soft-pedal language in future status docs. Prefer failing tests over narrative confidence. When adding a new failure cycle, append a dated section here or create `GPT_PROJECT_AUDIT_06P.md` — do not scatter audits in subfolders.
