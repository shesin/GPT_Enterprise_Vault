# Smart Bead Chess — Project Status

## Purpose

This document records **what is built and verified** for **Smart Bead Chess** ([smartbeadchess.com](https://smartbeadchess.com)).  
Repo folder `PROJECTS/SmartBeads/` and code names (e.g. `SmartBeadsEngine`) are internal — unchanged.  
Pending and roadmap work lives in **`GPT_PROJECT_PENDING_01P.md`** only (human-owned — agents do not edit).  
**Locked game & product decisions** → **`GPT_PROJECT_DECISIONS_05P.md`** (single owner).

Target: 01P (~1 page)

---

## Current Phase

**V1 Production App Integration & Verification — 7 Locked Boards (`VISION_05P.md`)**

The production codebase is fully implemented in clean TypeScript (`src/`), with zero runtime dependencies on legacy prototypes (`prototype/`).

---

## 7 Locked V1 Boards Status

All 7 production boards are registered in `BoardConfig.ts`, selectable in `BoardCatalog.ts`, and covered by Jest + headless browser gates (**591 tests**, 52 suites — Jest verified 2026-09-11 via `test:jest`; browser gates **automated pass** 2026-09-11 via `m2-2step-npm-gate.mjs`; human browser **UNCONFIRMED**):

| # | Board Variant | Geometry & Architecture | Status |
|---|---|---|---|
| 1 | **16-bead · 5×5 + wings** | 37-node Alquerque + 2 triangular wings (`Board16Sholo.ts`). Compact wing caps aligned with columns `c2` to `c4` with 50% row height; prominent 5×5 central playing area (472px width by 472px height on 560×796 canvas). All straight & diagonal apex junction captures verified. Single amber center plate. | **VERIFIED CLEAN** |
| 2 | **6-bead · 4×4** | 16-node full box-cross lattice (`Board6.ts`). Quad amber center scoring plates (2×2 box). **Production convention:** cream (RED) camps on bottom ranks. Default center Off (Cumulative/Endgame selectable). | **VERIFIED CLEAN** |
| 3 | **6-bead · 3×5** | 15-node Alquerque top-bottom camp lattice (`Board6x3x5.ts`). Single amber center plate (Node 7). Default center Off (Cumulative/Endgame selectable). | **VERIFIED CLEAN** |
| 4 | **10-bead · 5×5** | 25-node Alquerque with empty center file (`Board10x5.ts`). Single amber center plate (Node 12). Default center off. | **VERIFIED CLEAN** |
| 5 | **12-bead · 6×5** | 30-node Alquerque stretch (`Board12x6x5.ts`). Dual amber center plates (Nodes 12, 17). Default center off. | **VERIFIED CLEAN** |
| 6 | **8-bead · 4×6** | 24-node waist lattice (`Board8x4x6.ts`). Quad amber center scoring plates (Nodes 9, 10, 13, 14). Default center Off (Cumulative/Endgame selectable). | **VERIFIED CLEAN** |
| 7 | **7-bead · 4×5** | 20-node lattice (5+2+2+5 camps) (`Board7.ts`). Dual amber center scoring plates (Nodes 9, 10). Default center Off (Cumulative/Endgame selectable). | **VERIFIED CLEAN** |

---

## What Has Been Achieved

### 1. Core Engine (`SmartBeadsEngine.ts`)
- **Turn Enforcement:** Strict player turn ownership and validation.
- **Orthogonal & Diagonal Movement:** Slide moves governed by reciprocal board connection graphs.
- **Collinear Jump Captures:** Short jump capture routes governed by strict collinearity algorithms (`sameDir`).
- **Multi-Jump Chains:** Consecutive capture chaining with live state tracking (`chainPieceId`).
- **Capture Optionality:** Players can voluntarily stop multi-jump sequences via **Finish capture** (controls row, hidden until mid-chain). Tap elsewhere does not end chain. **TESTED** (`FeatureSession.turnControl`, `processRegressionGuards`). Human browser **UNCONFIRMED**.
- **Game Termination & Victory:** Elimination wins, stalemate wins, and capture-count victories on all V1 boards (`maxPlies: null` — no product move-limit on shipped boards). **3-fold repetition draw** + **120-ply engine safety cap** (`safety_cap`) on unlimited mode. Center tiebreak at **timer** expiry lives in `FeatureSession.evaluateScoreAndEnd` (not core engine elimination path).

### 2. Turn Interaction & UI Protocol (`FeatureSession.ts` & `CanvasBoardRenderer.ts`)
- **Inert Opponent Beads:** Opponent beads are 100% inert (not clickable).
- **Turn bead highlighting:** Locked → `GPT_PROJECT_DECISIONS_05P.md` §7–§8. Draw path: `drawCanvasBoard`. **Jest OK (2026-09-11).** **Human browser UNCONFIRMED** for every-turn change.
- **Audio & Sound Effects (`SoundEffects.ts`):** Eight production WAV files only — repo-root `public/audio/sfx_*.wav` (loaded at runtime via `SoundManifest.ts`; not embedded in JS). **Default SFX off** for new sessions (toggle persists in localStorage). Orphan Kenney/voice/sample copies removed 2026-09-08. **TESTED** (`SoundEffects.test.ts` — event dispatch; decode UNCONFIRMED in Jest).
- **Start Screen Overlay & First-Tap Unlock (Option B):** Gold-accented start card over board (mode select + **▶ START GAME**) unlocks browser AudioContext and BGM. **Start** always opens with human (cream / RED); AI must not move first. **New game / Play again** alternates opener (game 2 → AI in PvE). **Board switch** returns to start overlay with human first (does not consume alternation counter). Match then runs with animated kickoff banner and fanfare.
- **Production play shell layout (2026-08):** Four-column shell — left play panel (AI top, match `mm:ss` centre, human bottom, shot rings, capture/centre/beads), board-only centre column, settings right, optional ad column. Bottom controls: single nowrap row (Resign · **Finish capture** · Sound · Undo · New game). Finish capture hidden until mid-chain optional jump. Viewport height-first sizing on `.shell`; 16-bead bump (`shell--board-16`, max frame height 860px); verified at 1366×768 and 1280×720 @ 100% zoom.
- **Cream-camp orientation:** Jest gate `creamCampRendersLower.test.ts` — on every V1 board, cream (RED) beads average lower on canvas than ebony (BLUE). Board6 starting camps aligned to bottom convention.
- **End-of-Game Celebration & Clear Outcome Statements:** Balanced celebratory sparkles (`★`, `✦`, `✧`) across all outcomes (Victory, Defeat, and Draw), clear result statements (*"CONGRATULATIONS! YOU WON!"*, *"WELL PLAYED! BETTER LUCK NEXT TIME"*, *"WELL PLAYED! IT'S A DRAW"*), clear bead capture differential display (e.g., *"You won by 3 beads (8 vs 5)"*), and a clean *"↻ PLAY AGAIN"* action button. **2026-09-09:** user-facing end reasons use **cream/black bead** labels (not P1/P2/RED/BLUE); modal skips redundant “won on captures” when score line already states margin. **TESTED** (`FeatureSession.featureRules`). Human browser **UNCONFIRMED**.
- **Selection safety:** Clicking an immobile own bead safely deselects; no stale selection lock.
- **16-Bead Visual Layout:** Central 5×5 grid is rendered as a prominent 472px square matching 10-bead width with compact 59px-high wing caps (560×796 canvas, 0.70 aspect ratio).
- **Unified Center Marks:** A thin ring in the board's own Classic-gold line tone renders under each center-scoring node, consistently across all 7 boards (`drawCenterRing`, `CanvasBoardRenderer.ts`). Deliberately subtle — reads as part of the board, not a bright accent competing with the gold move-hint aura or the orange/lime turn rings.
- **Capture ripple:** Brief golden expanding pulse at captured node on jump (`drawGoldenCapturePulse`). **TESTED / FUNCTIONAL** (same test suite; no screen shake).
- **Shot-clock ring (UI):** Per-player SVG countdown ring on left panel when shot clock is on (`play-shell.css` `.shot-ring`). **Timer** remains centre **mm:ss** text — radial timer rings are pending (HvH tournament only; see pending doc).

### 3. PvE & AI Opponent (`HonestAi.ts`, `PlayController.ts`)
- **Levels 1–3 (player-facing target):** Casual (0 reply) · Standard (1 reply) · Expert (depth-2). **TESTED** (`HonestAi.searchCompletion.test.ts` — all 7 boards, opening + 16 midgame).
- **Depth-2 (Expert):** Full search required; extends think time up to ~45s on large boards rather than falling back to depth-1. Board-aware budgets (`thinkBudgetForLevel(level, variant)`).
- **Still in code but improper UI:** levels **4–5** (Super Expert / +) — same depth as 3, extra time only. **Pending removal** per human direction (UI → 1–2–3 only).
- **Easy / Medium / Hard:** unchanged contract; center + **timer** in eval on levels 2–3 when rules on; Easy center tie-break among equal captures. **TESTED** (`HonestAi.difficultyTiers.test.ts`).
- **3-fold repetition draw:** **OK (Jest, 2026-09-11)** — `SmartBeadsEngine` ends match on third identical position (occupancies + side to move). **DECISIONS §4** · **UNCONFIRMED** human browser.

### 4. Match Controls & Features (`BoardCatalog.ts`, `FeatureSession.ts`)
- **Settings UI (2026-09):** Game mode + board on **hub page 1 only** (`#hub-mode-select`, board tile grid). Page 2 settings: **AI level**, **Watch AI level**, **Timer**, **Tournament timer** (HvH only), Turn shot clock, Center rule — each timer/center row has **?** help toggle.
- **Play shell themes (2026-09-14, board set replaced 2026-09-21):** Lovable OKLCH **Look preview** — **two rows, current:** **Light theme** (4 light-canvas "Matched" boards — Seaglass/Powder Lilac/Celadon Jade/Alabaster Pearl, ids 23/24/25/26 — each paired with its own darker same-hue side panel, not charcoal) · **Dark theme** (5 complete boards — Classic Green/Wood Classic/Ocean Blue/Purple Night/Warm Walnut, ids 1/2/3/6/14 — paired with charcoal). The original charcoal-paired "Light theme" row (Sandy Beige/Seaglass/Powder Lilac/Celadon Jade/Alabaster Pearl, ids 4/15/16/17/18) was removed entirely 2026-09-21 once every board in it had a Matched replacement. Hub **Choose your look** (`#hub-play-theme-setting`) before play; board settings mirror (`#play-theme-setting`, locked after first move). Storage `sb-play-board-look` + `sb-play-side-look-v3` source of truth; `syncPlayLookFromStorageIfDrifted` repairs drift; `syncThemeSwatchActive` clears stale `is-active` before setting one swatch. **Board grid lines:** `CanvasBoardRenderer` uses locked **Classic gold** from `boardLineGoldThemes` (not per-theme OKLCH `lineColor` — fixes vanishing lines on Warm Walnut / light boards). **TESTED** (Jest + Playwright incl. `m2-walnut-130s-verify.mjs` 130s). **Human browser UNCONFIRMED**.
- **Black bead rendering (2026-09-13):** Lamp-lit specular + bright rim on ebony beads (colour stops unchanged); readable on dark board themes. **TESTED** (`CanvasBoardRenderer.moveFeedback`). **Human browser UNCONFIRMED**.
- **Move hint aura (2026-09-13, simplified to Off/On 2026-09-21):** Board settings `#move-hint-aura-select` — just **Off** / **On** (default On); the colour itself is fully automatic per board (Gold on dark boards, Black Gold on light-canvas Matched boards where plain Gold lacks contrast) — "Original (orange/lime)" and the separate manual Gold/Black Gold choice were both dropped. **TESTED** (`moveHintAuraThemes`, `CanvasBoardRenderer.moveFeedback`). **Human browser UNCONFIRMED**.
- **Bead set (simplified to fully automatic 2026-09-21):** No manual picker — bead set is chosen entirely by board: Black & White for Wood Classic and Warm Walnut (wood-toned dark boards, where Wooden & White beads would blend in), Wooden & White for the other 3 dark boards, Black & Wooden for the 4 light-canvas Matched boards. **TESTED** (`beadSetThemes`). **Human browser UNCONFIRMED**.
- **Result modal dismiss (2026-09-12):** **View board** closes congrats/draw overlay; final position stays until **Play again** / **New game**. **TESTED** (shell guards). **Human browser UNCONFIRMED**.
- **New game control (2026-09-12):** Below-board **New game** resets match (same as **Play again**); gold styling without resign red border. **TESTED** (`processRegressionGuards`). **Human browser UNCONFIRMED**.
- **Game Modes:** PvP (local 2-player) and PvE (vs AI) — chosen on start overlay, not duplicated in Settings.
- **Default Feature Settings:**
  - `centerRule: 'off'` default on all 7 boards (End-Game/Cumulative selectable per board catalog).
  - `timer: 'off'`, `tournamentTimer: 'off'`, and `shotClock: 'off'` across all 7 games.
  - `timerOptions` include **`'3'`** on all 7 boards (user-selectable; default stays **off**).
- **Timer vs tournament timer:** **Timer** = shared clock (all modes); expiry → captures → centre → beads → draw. **Tournament timer** = HvH only per-player chess clocks; expiry → flag fall (instant loss); centre forced off. Mutually exclusive in UI.
- **Center scoring contract:** End-Game/Cumulative tiebreak in `evaluateScoreAndEnd()` on **timer** expiry; cumulative accrual each completed turn; Medium/Hard AI eval + timer urgency via `planAiTurnPath`. Independent of timer on/off for center rule storage (except tournament timer forces centre off).
- **Clocks during AI:** shot/timer tick while Ebony thinks (`shellTimerShouldSkip`); shot expiry on BLUE awards Ivory.
- **Resignation Protocol:** → `GPT_PROJECT_DECISIONS_05P.md` §3. **TESTED** (`FeatureSession.resignation`). Human browser **UNCONFIRMED**.
- **Alternating opener (local):** Start overlay → human (cream) first; **New game / Play again** alternates opener in PvE. **FUNCTIONAL** (Jest + browser policy checks).

### 5. Test & Quality Gates
- **Jest (658 tests, 59 suites as of 2026-09-22 audit):** run via `npm run test:jest` or `npm run test:jest:fast` — batched runner: `scripts/run-jest-batched.mjs` (audit coverage gate, fails if any test file on disk isn't wired into a batch). CI (`.github/workflows/ci.yml`, added 2026-09-22) runs `typecheck` + `test:jest:fast` on every push/PR to main.
- **Coverage:** AI tiers (incl. Medium soft-miss + 8x4x6/16 gates), center/timers, all-7-board smoke, first-ply occupancy, shell layout contracts (`playerBarShell`, `viewportFit`, `creamCampRendersLower`), move feedback (`CanvasBoardRenderer.moveFeedback`), **process regression guards** (`processRegressionGuards` — cross-surface sync, turn-start flash WHEN), Finish capture on all boards via session tests, shot clock during AI, PvP chess-clock tick, Expert depth-2 search completion (all 7 boards).
- **Playwright Browser Gates:** Real canvas mouse-click tests for two-click landing captures across all 7 boards, junction hops, and inert-bead safety (`npm test` chains `m2-2step-npm-gate.mjs` on `index.html?play=1`; board reset via `__SB_TEST__.enterFromHub`). **Automated pass** 2026-09-11.
- **Production HonestAi Lab:** `scripts/lab-ai-difficulty-eval.mjs` (TypeScript HonestAi — not prototype `.cjs`).
- **Failure audit:** `GPT_PROJECT_AUDIT_05P.md`; gates in `VISION/CURSOR_PROMPT_01.md`; hooks in `.cursor/rules/smartbeads-core.mdc` + `instruction-fidelity.mdc` § Process.
- **Type safety (2026-09-14):** `tsc --noEmit` (whole project) found **85 real type errors** invisible to Jest, since Jest transpiles without type-checking. All fixed; `typecheck` now runs automatically before `npm test` / `test:jest` / `test:jest:fast` (npm `pre*` hooks) so this can't silently reaccumulate. Two were live bugs, not just typing noise:
  - Two `FeatureSession.turnControl.test.ts` tests ("clears all-bead flash... (chain)", "mid-chain: tap another own bead...") built their capture-chain fixture from a field (`Move.over`) that doesn't exist on `getLegalMoves()` results — the chain-finder always came back empty, both tests hit an early return and passed while asserting nothing. Rewritten to read `board.jumpPaths` (which does carry `over`), fixed a related setup bug (only one hop's victim was being placed, so a genuine chain never formed), and added `expect.hasAssertions()` so a future regression of this kind fails loudly instead of passing silently.
  - `HonestAi.ts`'s per-board think-time table keyed the 7-bead board as `'7x4x5'` instead of the real id `'7'` — Expert AI silently never got its intended 1.05× budget on that board. Fixed.
  - `HumanVsAiRunner.ts`'s `buildGameSummary()` built a `GameResult` missing `redCaptures`/`blueCaptures` — added, and the CLI summary now prints them.
- **Full audit (2026-09-14):** five parallel deep-dive passes — AI search/eval, capture-chain & board geometry (all 7 boards), timer/clock state machine, a systematic scan for more silently-dead tests, and the theme/storage drift code. One confirmed live bug, one confirmed dead-code cleanup, two test-coverage gaps closed; AI eval, board geometry, and the rest of the test suite checked out clean (all traced to real test runs, not read-only guesses):
  - **Fixed — real bug:** `FeatureSession.timerTick()` could end the game **twice in the same tick** if two independent clock layers (shot clock vs. tournament timer, or shot clock vs. shared timer) expired together — the second block ran unconditionally and silently overwrote the first one's winner/reason (confirmed: displayed reason flipped from "Shot clock expired." to "... ran out of time." when both hit 0 together). Fixed with an early return after the shot-clock block ends the game; regression test added (fails on old code with the exact wrong-reason string, passes on the fix).
  - **Fixed — dead code:** `playShellThemes.ts`'s `coalesceStoredLookState()` read a legacy side-theme value from storage but never used it — every return path hardcoded the side look instead. ~25 lines of now-pointless legacy migration (`readStoredSideLookIdRaw`, `migrateLegacySideLookId`) removed; was harmless today only because a downstream function independently re-forces the same value.
  - **Documented, not removed:** `HonestAi.ts`'s per-side-clock (`usePerSideClocks`) eval branch is confirmed unreachable in the shipped product today (tournament timer is pvp-only; the AI never moves in pvp) — kept as a seam for a possible future "AI under tournament rules" mode, now with a comment explaining why it's untested rather than leaving it looking like an oversight.
  - **Strengthened tests:** the PvP tournament-timer test now also asserts the opponent's clock is untouched (previously only checked the moving side); `HonestAi.repetitionSteer.test.ts` now also calls the real `selectAiTurnPath` entry point and confirms the AI actually avoids the repeated position, not just that the underlying penalty function computes a bigger number in isolation.
  - **Checked clean:** AI difficulty-tier gating, depth-2 search completion, all 7 boards' `jumpPaths` geometry (including the 16-bead board's wing-junction hops, confirmed intentional against the original reference engine via parity test), multi-jump chain continuation, and a full re-scan of all 60 test files for the same silently-dead-test pattern found earlier — no further instances.

---

## Integrity — code vs claim

**Rule:** If it ships in code or UI, it must be **tested and true** — or listed here until fixed or removed. Agents must not repeat the depth-2 failure (half-working while docs claimed “Expert completes”).

| Item | Verdict |
|------|---------|
| **AI levels 4–5** | **Fix/remove (UI done)** — Settings + coach show **1–2–3** only; HonestAi still accepts 4–5 if passed in code |
| **Watch AI / spectate UX** | **OK (Jest, 2026-09-09)** — **Watch AI vs AI** mode; `previewScriptedSelection` before hops; turn-start flash until first preview each turn; **3-fold repetition draw** ends ping-pong loops (2026-09-11). **UNCONFIRMED** human browser |
| **3-fold repetition draw** | **OK (Jest, 2026-09-11)** — engine `repetition` end reason; spectate + PvE + PvP. **UNCONFIRMED** human browser |
| **Coach (teaching mode)** | **OK (2026-09-09)** — Video 1 on **7-bead · 4×5** (~**1:53**): moves, captures, Finish capture demo; **WIN / RESIGN / DRAW** endings use **`previewScriptedSelection`** (same rings as live pick). Left panel intro + bullets; play/pause/scrub; watch-only; `?coach=start`. Video 2 (timers/centre) **pending**. **Coach browser smoke:** CONFIRMED (`verify-coach-browser.mjs` 2026-09-06). **Human full watch-through:** UNCONFIRMED |
| **Settings game mode** | **OK (2026-09-11)** — hub page 1 `#hub-mode-select` only; not on board settings panel |
| **Engine safety cap** | **OK (Jest, 2026-09-11)** — unlimited boards draw at 120 plies (`safety_cap`). **UNCONFIRMED** human browser |
| **AI repetition steer** | **OK (Jest, 2026-09-11)** — HonestAi soft penalty on repeat positions. **UNCONFIRMED** human browser |
| **AI level control** | **OK (Jest)** — `playerBarShell` + `GameFeatureSettings`; **UNCONFIRMED** human browser sign-off |
| **Expert think time** | **Inform** — can block UI up to ~45s on 16; needs “thinking…” or cap |
| **Center** (Off / End-game / Cumulative) | **OK** — Jest + AI eval + timer urgency on levels 2–3 |
| **SFX bundle** | **OK (2026-09-08)** — eight WAV in repo-root `public/audio/` only; main JS ~74 kB (was ~601 kB with embed) |
| **Resignation** | **OK (Jest)** — **DECISIONS §3**. Modal a11y + shell button. **UNCONFIRMED** human browser |
| **BGM Play button** | **OK (2026-09-11)** — **DECISIONS §10**. **UNCONFIRMED** human browser |
| **Shot clock** | **OK** — ticks during AI; expiry tested |
| **Timer** | **OK** — shared clock; expiry → capture/centre/beads; **mm:ss text only** |
| **Tournament timer** | **OK (Jest)** — HvH chess clocks; flag fall = loss; centre off; **UNCONFIRMED** human browser |
| **Engine** (moves, captures, chains) | **OK** — Jest + browser gates (automated pass 2026-09-11) |
| **Finish capture (optional chain stop)** | **OK (Jest)** — controls row, `finishChain` ends turn, coach demo; human browser **UNCONFIRMED** |
| **Turn bead highlighting** | **OK (Jest, 2026-09-11)** — see **DECISIONS §7–§8**. **Human browser UNCONFIRMED** |
| **Settings ? help** | **OK (Jest, 2026-09-09)** — Timer, Tournament timer, Turn shot clock, Center rule rows in `index.html`. **UNCONFIRMED** human browser |
| **End-game user copy** | **OK (Jest, 2026-09-09)** — cream/black bead labels; no P1/P2 in timer/resign reasons. **UNCONFIRMED** congratulations modal on screen |
| **Recent colour / panel edits** | **Partial (updated 2026-09-21)** — 9 complete OKLCH looks (5 base + 4 light-canvas Matched) + side-only charcoal; bead set fully automatic per board (no picker); board look persistence fix. **UNCONFIRMED** full browser sign-off |
| **Play shell themes (board settings)** | **OK (Jest, updated 2026-09-21)** — 9 unified complete (5 base + 4 Matched) + side-only charcoal; board canvas from stored board id. **UNCONFIRMED** human browser |
| **Move hint aura** | **OK (Jest, 2026-09-13, simplified 2026-09-21)** — Off / On only, colour auto-resolved per board. **UNCONFIRMED** human browser |
| **SFX / BGM defaults** | **OK (code, 2026-09-13)** — SFX muted on first load; BGM select empty until user picks. **UNCONFIRMED** human browser |
| **Result modal View board** | **OK (Jest, 2026-09-12)** — dismiss keeps final board. **UNCONFIRMED** human browser |
| **Production deploy smartbeadchess.com** | **Partial (2026-09-12)** — domain live; requires full `dist/` upload (`index.html` + `assets/` + `audio/`). **UNCONFIRMED** styled load on live site |
| **Board render crash on captured black bead** | **Fixed (Jest + agent-run browser match, 2026-09-14)** — capture fade animation shrank a black (ebony) bead to radius 0; the rim-stroke draw (`radius - 0.5`) then called canvas `arc()` with a negative radius, throwing `IndexSizeError` mid-frame. Because that draw call never reached its matching `ctx.restore()`, the leaked transparency/shadow state carried into later frames — seen as grid lines fading and colour smearing across the board the longer a match ran (reported after Cursor's two prior attempts on line/theme code did not fix it). Fix: radius clamped to 0 on the rim strokes, plus a full alpha/shadow reset at the top of every board redraw so a future draw error can't leak state the same way. Regression test added (`CanvasBoardRenderer.moveFeedback.test.ts` — confirmed it fails on the old code with the exact same error, passes on the fix). Agent verified live: full AI-vs-AI match with captures on both sides, zero recurrences. **UNCONFIRMED** — not yet watched on Shekhar's own screen |

| **Chess.com-style hub (Page 1)** | **OK (Jest + agent browser check, 2026-09-20)** — **DECISIONS §13**. Left rail order, Review slide-out, centre section order, board/mode tile order, fixed Pearl+Gold palette (verified it stays fixed after clicking other look swatches). `hubShell.test.ts` passes; full suite 642/642. **UNCONFIRMED** — not yet watched on Shekhar's own screen |

Update this table when code ≠ claim. Do not mark **VERIFIED CLEAN** for rows marked Fix/remove or UNCONFIRMED.

---

## Launch (local)

Run from: `d:\Business Idea\Gpt_Enterprise_Vault`

```powershell
cd "d:\Business Idea\Gpt_Enterprise_Vault"
npx.cmd vite
```

Open: **http://localhost:5173/**

- **Page 1** — setup: board, game mode, **Start game**, **Coach lesson**
- **Page 2** — live board (same URL; opens after you choose on page 1)
- **Coach shortcut:** `http://localhost:5173/?coach=start`
- **Production (when deployed):** **https://smartbeadchess.com** — build: `npx vite build`; upload all of `dist/` to Hostinger `public_html` (not `index.html` alone).

Leave the terminal running while you play. If port 5173 is busy, close the old terminal and run again.

---

## Test suite

From repo root (PowerShell):

```
Step 1  npx.cmd npm run test:jest:fast     → no browser
Step 2  npm.cmd test                       → browser auto; Vite auto on 5173
Step 3  npx.cmd vite                       → your eyes on coach / play (5173)
```

Details: batched runner `scripts/run-jest-batched.mjs` (see **`GPT_PROJECT_AUDIT_05P.md`** § Test catalog for audit history only).

**Dev only (not normal play):** automated browser gates boot Vite on 5173 and open `index.html?play=1` — you do not need a second local command or port 5174.
