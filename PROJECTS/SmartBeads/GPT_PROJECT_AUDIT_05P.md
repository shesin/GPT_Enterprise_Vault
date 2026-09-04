# SmartBeads — GPT Project Audit (4th cycle)

Date: 2026-08-27 (test runner audit appended 2026-09-03)  
Scope: Production `src/` (not prototype)  
Status: FAILURE RECORD + corrective actions (permanent)

Enforcement text for Cursor agents lives in `.cursor/rules/smartbeads-core.mdc`, `smartbeads-rules.mdc`, and `VISION/CURSOR_PROMPT_01.md` — not duplicated here.

---

## Test catalog & how to run (2026-09-03)

**Repo root:** `d:\Business Idea\Gpt_Enterprise_Vault`  
**Verified:** **508 tests**, **44 Jest suites** — partial PASS via batched runner (2026-09-04); full slow-AI batches UNCONFIRMED this session.

### Commands (use these — do not use bare `jest PROJECTS/SmartBeads`)

| Command | What it runs | Time |
|---------|----------------|------|
| `npm run test:jest:fast` | Jest only — skips slow AI search suites | ~40 s |
| `npm run test:jest` | **All 508 Jest tests** (6 batches, live output, hard timeouts) | ~7 min |
| `npm test` | Full Jest + Playwright browser gates (`m2-2step-npm-gate.mjs`) | Jest ~7 min + browser |
| `node PROJECTS/SmartBeads/scripts/run-jest-batched.mjs --batch=<id>` | One batch only | see below |

**Batch ids:** `seven-board` · `engine-parity` · `feature-session` · `web-shell-layout` · `slow-ai-tiers` · `slow-ai-search`

**Runner script:** `PROJECTS/SmartBeads/scripts/run-jest-batched.mjs` — explicit file lists, `maxWorkers: 1`, per-batch timeout (kills if hung). Replaces broken broad `npx jest` invocations that hung 30+ min with no output on Windows.

### Jest — what each group tests

| Batch / area | Key files | What it proves |
|--------------|-----------|----------------|
| **7-board core** | `allBoards.smoke.test.ts`, `Board*.test.ts` (×7), `FeatureSession.turnControl.test.ts`, `v1GeometryCaptureAudit.test.ts` | All 7 product boards: legal select, Medium AI reply, reset/New game, capture geometry, turn control |
| **Engine + parity** | `SmartBeadsEngine*.test.ts`, `BoardCatalog.test.ts`, `*PrototypeParity.test.ts` (×7), `SelfPlayRunner`, `HumanVsAiRunner` | Engine rules, catalog defaults, prototype geometry parity per board |
| **Feature / settings** | `GameFeatureSettings`, `FeatureSession.*`, `clockPolicy`, `aiTurnPath`, `HonestAi.test`, `spectate` | Timers, center rules, resignation, AI level UI, coach/spectate hooks |
| **Shell / layout / audio** | `PlayController`, `playerBarShell`, `hubShell`, `viewportFit`, `creamCampRendersLower`, `CanvasBoardRenderer.moveFeedback`, `SoundEffects` | Settings DOM, cream-on-bottom, last-move rings, capture pulse, layout contracts |
| **Slow AI — tiers** | `HonestAi.difficultyTiers.test.ts` | Easy/Medium/Hard behaviour, Medium soft-miss, 8×4×6 and 16 gates (~7 min alone) |
| **Slow AI — search** | `HonestAi.searchCompletion.test.ts` | Expert (level 3) depth-2 completion on all 7 boards + 16 midgame |

### Browser gates (Playwright — not Jest)

| Script | What it proves |
|--------|----------------|
| `m2-2step-observe.mjs` | 16-bead two-click slide (A41→A42 occupancy) |
| `m2-capture-geometry-browser.mjs` | Real canvas clicks: captures, junction hops, Finish, inert opponent beads — all 7 boards |
| `m2-2step-npm-gate.mjs` | Boots Vite if needed; runs both gates above (chained by `npm test`) |
| `m2-*-browser-verify.mjs` | Per-board visual/gameplay checks |
| `lab-ai-difficulty-eval.mjs` | HonestAi lab eval (not prototype `.cjs`) |

**Prerequisite:** Vite on **5173** (hub) or pass `SMARTBEADS_PLAY_URL` for play shell. Gates use `/play-board.html`.

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

1. **Remove 3-fold repetition entirely** from production FeatureSession (not only delete a test). It was never approved for V1 Rules/VISION.
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
- Entry in `GPT_PROJECT_RULES_01P.md` / `VISION_05P.md` as a V1 rule
- A “keep vs remove” decision offered to the human first

How it got in: agents treated prototype completeness (Lab matrix, INDEX HTML, chess-like draw rules) as license to copy into production. That violates human ownership of gameplay and Medium/Major approval gates.

**Corrective action this cycle:** feature **removed** from production session code and tests. Prototype may still contain it; production must not.

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

- 3-fold removed from production `FeatureSession` + tests
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

**Example:** “Put 3 minute timer for all boards” → agent set `defaultSettings.matchTimer: '3'` and changed `matchTimerBest`. Correct: add `'3'` to `matchTimerOptions` only; default stays `'off'`.

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
- **HonestAi:** Match timer + center passed into eval (Medium/Hard); Easy center tie-break among equal captures; shot clock intentionally omitted.
- **Resign modal:** Dashed “Agree” / solid “Decline” + `aria-label` — not red/green-only.
- **Agent rules:** `.cursor/rules/smartbeads-core.mdc` — no stale residue; static assets in `public/`; do not edit `VISION/CLAUDE_TEST_REPORT_05.md`.
- **Docs synced:** `GPT_PROJECT_STATUS_01P.md`, `PROJECT_MAP_05P.md`, test count **508 / 44 suites**.

---

## Recommendation

Do not soft-pedal language in future status docs. Prefer failing tests over narrative confidence. When adding a new failure cycle, append a dated section here or create `GPT_PROJECT_AUDIT_06P.md` — do not scatter audits in subfolders.
