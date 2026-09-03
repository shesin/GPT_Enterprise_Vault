# SmartBeads Project Status

## Purpose

This document records **what is built and verified** for SmartBeads.  
Pending and roadmap work lives in **`GPT_PROJECT_PENDING_01P.md`** only.

Target: 01P (~1 page)

---

## Current Phase

**V1 Production App Integration & Verification — 7 Locked Boards (`VISION_05P.md`)**

The production codebase is fully implemented in clean TypeScript (`src/`), with zero runtime dependencies on legacy prototypes (`prototype/`).

---

## 7 Locked V1 Boards Status

All 7 production boards are registered in `BoardConfig.ts`, selectable in `BoardCatalog.ts`, and covered by Jest + headless browser gates (**506 tests**, 44 suites — Jest verified 2026-09-03 via `npm run test:jest`; browser gates UNCONFIRMED this session):

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
- **Capture Optionality:** Players (and AI) can voluntarily stop multi-jump sequences at any hop via "Finish".
- **Game Termination & Victory:** Elimination wins, stalemate wins, and capture-count victories on all V1 boards (`maxPlies: null` — no ply-cap endings in shipped boards). Center tiebreak at match-timer expiry lives in `FeatureSession.evaluateScoreAndEnd` (not core engine elimination path).

### 2. Turn Interaction & UI Protocol (`FeatureSession.ts` & `CanvasBoardRenderer.ts`)
- **Inert Opponent Beads:** Only active player beads glow and are clickable. Opponent beads are 100% inert in all states (idle, selected, mid-chain).
- **Prominent Selection Ring:** Selected active bead is highlighted with an unmistakable glowing red/orange double-ring.
- **Target Highlighting:** Legal landing squares and selected cream bead use **amber/orange** rings. Lime last-move rings: **black beads and empty squares only** (not cream). **TESTED** (`CanvasBoardRenderer.moveFeedback.test.ts`).
- **Audio & Sound Effects (`SoundEffects.ts`):** Pure sweet acoustic instrument audio suite (Concert harp & celesta glissando kickoff, soft wooden piece settle, luscious rosewood marimba strike C5, rising major triad pitch scaling on multi-jumps, ascending 4-note marimba & celesta flourish C5-E5-G5-C6 on 3+ hops, triumphant marimba victory celebration, gentle comforting kalimba defeat resolution, and peaceful twin chime draw). Zero harshness, zero white noise. Default BGM set to "Cool Puzzle Groovin' 2".
- **Start Screen Overlay & First-Tap Unlock (Option B):** Gold-accented start card over board (mode select + **▶ START GAME**) unlocks browser AudioContext and BGM. **Start** always opens with human (cream / RED); AI must not move first. **New game / Play again** alternates opener (game 2 → AI in PvE). **Board switch** returns to start overlay with human first (does not consume alternation counter). Match then runs with animated kickoff banner and fanfare.
- **Production play shell layout (2026-08):** Four-column shell — left play panel (AI top, match `mm:ss` centre, human bottom, shot rings, capture/centre/beads), board-only centre column, settings right, optional ad column. Bottom controls: single nowrap row (Resign · Sound · Undo · New game). Viewport height-first sizing on `.shell`; 16-bead bump (`shell--board-16`, max frame height 860px); verified at 1366×768 and 1280×720 @ 100% zoom.
- **Cream-camp orientation:** Jest gate `creamCampRendersLower.test.ts` — on every V1 board, cream (RED) beads average lower on canvas than ebony (BLUE). Board6 starting camps aligned to bottom convention.
- **End-of-Game Celebration & Clear Outcome Statements:** Balanced celebratory sparkles (`★`, `✦`, `✧`) across all outcomes (Victory, Defeat, and Draw), clear result statements (*"CONGRATULATIONS! YOU WON!"*, *"WELL PLAYED! BETTER LUCK NEXT TIME"*, *"WELL PLAYED! IT'S A DRAW"*), clear bead capture differential display (e.g., *"You won by 3 beads (8 vs 5)"*), and a clean *"↻ PLAY AGAIN"* action button.
- **Selection Safety & Highlight:** Clicking an immobile own bead safely deselects; prominent glowing red/orange double-ring locks onto the selected piece.
- **16-Bead Visual Layout:** Central 5×5 grid is rendered as a prominent 472px square matching 10-bead width with compact 59px-high wing caps (560×796 canvas, 0.70 aspect ratio).
- **Unified Center Plates:** Consistent glowing amber square plates render under center nodes for all 7 boards.
- **Last-move highlight:** See Target Highlighting above. **TESTED** (same suite).
- **Capture ripple:** Brief golden expanding pulse at captured node on jump (`drawGoldenCapturePulse`). **TESTED / FUNCTIONAL** (same test suite; no screen shake).
- **Shot-clock ring (UI):** Per-player SVG countdown ring on left panel when shot clock is on (`play-shell.css` `.shot-ring`). Match timer remains centre **mm:ss** text — radial **match** rings are pending (HvH only; see pending doc).

### 3. PvE & AI Opponent (`HonestAi.ts`, `PlayController.ts`)
- **Levels 1–3 (player-facing target):** Casual (0 reply) · Standard (1 reply) · Expert (depth-2). **TESTED** (`HonestAi.searchCompletion.test.ts` — all 7 boards, opening + 16 midgame).
- **Depth-2 (Expert):** Full search required; extends think time up to ~45s on large boards rather than falling back to depth-1. Board-aware budgets (`thinkBudgetForLevel(level, variant)`).
- **Still in code but improper UI:** levels **4–5** (Super Expert / +) — same depth as 3, extra time only. **Pending removal** per human direction (UI → 1–2–3 only).
- **Easy / Medium:** unchanged contract; center eval on 2–3 when rule on. **TESTED** (`HonestAi.difficultyTiers.test.ts`).
- **3-fold repetition:** removed from production. See `GPT_PROJECT_AUDIT_05P.md`.

### 4. Match Controls & Features (`BoardCatalog.ts`, `FeatureSession.ts`)
- **Settings UI (2026-09):** Game mode on **start screen only** (`#start-mode-select`). Settings panel: Board, **AI level** (1–3, same block style as Match timer), Coach AI (URL spectate only), Match timer, Turn shot clock, Center rule.
- **Game Modes:** PvP (local 2-player) and PvE (vs AI) — chosen on start overlay, not duplicated in Settings.
- **Default Feature Settings:**
  - `centerRule: 'off'` default on all 7 boards (End-Game/Cumulative selectable per board catalog).
  - `matchTimer: 'off'` and `shotClock: 'off'` across all 7 games.
- **Center scoring contract:** End-Game/Cumulative tiebreak in `evaluateScoreAndEnd()` and on engine game-over when captures are tied; cumulative accrual each completed turn; Medium/Hard AI eval via `planAiTurnPath`. Independent of match timer on/off.
- **Clocks during AI:** shot/match timers tick while Ebony thinks (`shellTimerShouldSkip`); shot expiry on BLUE awards Ivory.
- **Resignation Protocol:** Either player can resign during their turn. If the opponent accepts, the match ends in a Draw; if the opponent declines, the resigning player loses (matches `Rule - Resignation` in `GPT_PROJECT_RULES_01P.md`).
- **Alternating opener (local):** Start overlay → human (cream) first; **New game / Play again** alternates opener in PvE. **FUNCTIONAL** (Jest + browser policy checks).

### 5. Test & Quality Gates
- **Jest (506 tests, 44 suites):** run via `npm run test:jest` or `npm run test:jest:fast` — see **`GPT_PROJECT_AUDIT_05P.md`** § Test catalog. Batched runner: `scripts/run-jest-batched.mjs`.
- **Coverage:** AI tiers (incl. Medium soft-miss + 8x4x6/16 gates), center/timers, all-7-board smoke, first-ply occupancy, shell layout contracts (`playerBarShell`, `viewportFit`, `creamCampRendersLower`), move feedback (`CanvasBoardRenderer.moveFeedback` — last-move rings + capture pulse), Finish on 16+6×3×5, shot clock during AI, PvP chess-clock tick, Expert depth-2 search completion (all 7 boards).
- **Playwright Browser Gates:** Real canvas mouse-click tests for two-click landing captures across all 7 boards, junction hops, and inert-bead safety (`npm test` chains `m2-2step-npm-gate.mjs`).
- **Production HonestAi Lab:** `scripts/lab-ai-difficulty-eval.mjs` (TypeScript HonestAi — not prototype `.cjs`).
- **Failure audit:** `GPT_PROJECT_AUDIT_05P.md`; gates in `VISION/CURSOR_PROMPT_01.md`; hooks in `.cursor/rules/smartbeads-core.mdc` + `instruction-fidelity.mdc`.

---

## Integrity — code vs claim

**Rule:** If it ships in code or UI, it must be **tested and true** — or listed here until fixed or removed. Agents must not repeat the depth-2 failure (half-working while docs claimed “Expert completes”).

| Item | Verdict |
|------|---------|
| **AI levels 4–5** | **Fix/remove (UI done)** — Settings + coach show **1–2–3** only; HonestAi still accepts 4–5 if passed in code |
| **Coach / spectate UX** | **Partial** — coach levels 1–3; still **`?coach=1` URL**; not main-board mode picker yet |
| **Settings game mode** | **OK (2026-09)** — removed from right panel; start screen only |
| **AI level control** | **OK (Jest)** — `playerBarShell` + `GameFeatureSettings`; **UNCONFIRMED** human browser sign-off |
| **Expert think time** | **Inform** — can block UI up to ~45s on 16; needs “thinking…” or cap |
| **Center** (Off / End-game / Cumulative) | **OK** — Jest + AI eval on levels 2–3 |
| **Shot clock** | **OK** — ticks during AI; expiry tested |
| **Match timer** | **OK** — ticks + center tiebreak tested; **mm:ss text only** (no radial ring — incomplete UI) |
| **Engine** (moves, captures, chains) | **OK** — Jest + browser gates |
| **Recent colour / panel edits** | **UNCONFIRMED** — not human browser-verified after 2026-09 session |

Update this table when code ≠ claim. Do not mark **VERIFIED CLEAN** for rows marked Fix/remove or UNCONFIRMED.

---

## Human Playtesting Method

## Commands (npx)

Run from: `d:\Business Idea\Gpt_Enterprise_Vault`

**Tests**
```powershell
npm run test:jest:fast   # 474 Jest tests, ~40s
npm run test:jest        # all 506 Jest tests, ~7 min
npm test                 # Jest + browser gates
```
Details: **`GPT_PROJECT_AUDIT_05P.md`** § Test catalog.

**5173 — Hub (new home page)**
```powershell
cd "d:\Business Idea\Gpt_Enterprise_Vault"
npx vite
```  
Open: **http://localhost:5173/**

**5174 — All 7 boards (direct play)**  
```powershell
cd "d:\Business Idea\Gpt_Enterprise_Vault"
npx vite --mode play
```  
Open: **http://localhost:5174/**

---

## Steps next time

1. Open **two** terminals (or two tabs in Cursor).
2. In **both**, go to the project folder:
   ```powershell
   cd "d:\Business Idea\Gpt_Enterprise_Vault"
   ```
3. **Terminal 1** — hub:
   ```powershell
   npx vite
   ```
4. **Terminal 2** — 7 boards:
   ```powershell
   npx vite --mode play
   ```
5. Wait until each shows `Local: http://localhost:5173/` or `5174/`.
6. Open the URL in your browser.
7. **Leave both terminals running** while you play. Closing a terminal stops that server.

---

## Which URL to use

| Port | Use for |
|------|---------|
| **5173** | Hub → pick board → Human vs AI |
| **5174** | Jump straight to all 7 boards (Settings → Board) |

---

**Note:** If a port is busy, close the old terminal or stop the process using that port, then run the command again.
