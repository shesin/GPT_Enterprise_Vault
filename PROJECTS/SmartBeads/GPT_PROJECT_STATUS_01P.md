# SmartBeads Project Status

## Purpose

This document records the authoritative implementation status of SmartBeads.
It provides a concise, structured snapshot of what has been achieved across all 7 boards and what is currently pending.

Target: 01P (~1 page)

---

## Current Phase

**V1 Production App Integration & Verification — 7 Locked Boards (`VISION_05P.md`)**

The production codebase is fully implemented in clean TypeScript (`src/`), with zero runtime dependencies on legacy prototypes (`prototype/`).

---

## 7 Locked V1 Boards Status

All 7 production boards are registered in `BoardConfig.ts`, selectable in `BoardCatalog.ts`, and verified via automated test suites (**455 Jest tests**, 36 suites) and headless browser click gates (Playwright):

| # | Board Variant | Geometry & Architecture | Status |
|---|---|---|---|
| 1 | **16-bead · 5×5 + wings** | 37-node Alquerque + 2 triangular wings (`Board16Sholo.ts`). Compact wing caps aligned with columns `c2` to `c4` with 50% row height; prominent 5×5 central playing area (472px width by 472px height on 560×796 canvas). All straight & diagonal apex junction captures verified. Single amber center plate. | **VERIFIED CLEAN** |
| 2 | **6-bead · 4×4** | 16-node full box-cross lattice (`Board6.ts`). Quad amber center scoring plates (2×2 box). Default center Off (Cumulative/Endgame selectable). | **VERIFIED CLEAN** |
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
- **Game Termination & Victory:** Elimination wins, stalemate wins, capture-count victories, center-hold tiebreaks, and ply-limit handling.

### 2. Turn Interaction & UI Protocol (`FeatureSession.ts` & `CanvasBoardRenderer.ts`)
- **Inert Opponent Beads:** Only active player beads glow and are clickable. Opponent beads are 100% inert in all states (idle, selected, mid-chain).
- **Prominent Selection Ring:** Selected active bead is highlighted with an unmistakable glowing red/orange double-ring.
- **Target Highlighting:** Clicking an active piece highlights empty landing spots exclusively in emerald green; clicking the empty landing executes the capture/slide.
- **Audio & Sound Effects (`SoundEffects.ts`):** Pure sweet acoustic instrument audio suite (Concert harp & celesta glissando kickoff, soft wooden piece settle, luscious rosewood marimba strike C5, rising major triad pitch scaling on multi-jumps, ascending 4-note marimba & celesta flourish C5-E5-G5-C6 on 3+ hops, triumphant marimba victory celebration, gentle comforting kalimba defeat resolution, and peaceful twin chime draw). Zero harshness, zero white noise. Default BGM set to "Cool Puzzle Groovin' 2".
- **Start Screen Overlay & First-Tap Unlock (Option B):** Clean gold-accented "▶ START GAME" button card over board to unlock browser AudioContext & start default BGM on initial page load. Subsequent board switches and new games start instantly with the animated kickoff banner and fanfare without requiring another start click.
- **End-of-Game Celebration & Clear Outcome Statements:** Balanced celebratory sparkles (`★`, `✦`, `✧`) across all outcomes (Victory, Defeat, and Draw), clear result statements (*"CONGRATULATIONS! YOU WON!"*, *"WELL PLAYED! BETTER LUCK NEXT TIME"*, *"WELL PLAYED! IT'S A DRAW"*), clear bead capture differential display (e.g., *"You won by 3 beads (8 vs 5)"*), and a clean *"↻ PLAY AGAIN"* action button.
- **Selection Safety & Highlight:** Clicking an immobile own bead safely deselects; prominent glowing red/orange double-ring locks onto the selected piece.
- **16-Bead Visual Layout:** Central 5×5 grid is rendered as a prominent 472px square matching 10-bead width with compact 59px-high wing caps (560×796 canvas, 0.70 aspect ratio).
- **Unified Center Plates:** Consistent glowing amber square plates render under center nodes for all 7 boards.

### 3. PvE & AI Opponent (`HonestAi.ts`, `PlayController.ts`)
- **Complete-Turn Search:** Generates and evaluates full multi-jump sequences rather than single hops.
- **Pacing & Timing:** Level-based think budgets (Easy ~250ms, Medium ~800ms, Hard ~2800ms).
- **Difficulty contract (Jest + production Lab `lab-ai-difficulty-eval.mjs`):**
  - **Easy:** 0 opponent lookahead; ~70% max-capture greedy (no positional eval); ~30% soft-miss (still captures when possible, not silly pure-random).
  - **Medium:** 1 opponent complete-turn reply + full eval **including center when Cumulative/Endgame is on**; ~20% soft-miss so Medium feels softer than Hard (esp. 8-bead).
  - **Hard:** 2 opponent complete-turn replies + full eval including center; **0% soft-miss**; ~2.8s think budget so depth-2 completes.
  - Strength gates: Medium > Easy and Hard ≥ Medium on 6×3×5; Hard > Medium head-to-head on **8x4x6**; Hard coverage on **16**.
- **3-fold repetition:** removed from production (never approved for V1). See `GPT_PROJECT_AUDIT_05P.md`.

### 4. Match Controls & Features (`BoardCatalog.ts`, `FeatureSession.ts`)
- **Game Modes:** PvP (local 2-player) and PvE (vs AI).
- **Default Feature Settings:**
  - `centerRule: 'off'` default on all 7 boards (Cumulative/Endgame remain selectable on 6/7/8 where offered).
  - `matchTimer: 'off'` and `shotClock: 'off'` across all 7 games.
- **Clocks during AI:** shot/match timers tick while Ebony thinks (`shellTimerShouldSkip`); shot expiry on BLUE awards Ivory.
- **Resignation Protocol:** Either player can resign during their turn. If the opponent accepts, the match ends in a Draw; if the opponent declines, the resigning player loses (matches `Rule - Resignation` in `GPT_PROJECT_RULES_01P.md`).

### 5. Test & Quality Gates
- **Jest:** AI tiers (incl. Medium soft-miss + 8x4x6/16 gates), center/timers, ply_limit, all-7-board smoke (own beads / AI reply / reset), Finish on 16+6×3×5, shot clock during AI, PvP chess-clock tick.
- **Playwright Browser Gates:** Real canvas mouse-click tests for two-click landing captures across all 7 boards, junction hops, and inert-bead safety.
- **Production HonestAi Lab:** `scripts/lab-ai-difficulty-eval.mjs` (TypeScript HonestAi — not prototype `.cjs`).
- **Failure audit:** `GPT_PROJECT_AUDIT_05P.md`; strict gate detail in `VISION/CURSOR_PROMPT_01.md`; one-line reminders in `.cursor/rules/smartbeads-core.mdc`.

---

## What Is Pending

### Pending Tasks for Web Games

- **Visual Move Highlight & Jump Trail:**
  - Distinct highlight rings on last move start and destination nodes; connecting visual trail showing captured jump paths.
- **Circular Match Timer Progress Rings:**
  - Symmetrical radial countdown timer rings on player panels (defaults: 90 min for 16, 12, 10-bead; 60 min for 8, 7, 6-bead; low-time pulse warning).
- **Capture Reward Feedback:**
  - Subtle golden glowing ripple at captured intersections on canvas (clean, elegant visual juice without screen shake).
- **Alternating First Player:**
  - Fairness toggle on "Play Again" to alternate starting piece color across consecutive matches; session score counter.
- **1 to 2-Minute Audiovisual Onboarding Tutorial:**
  - Fast interactive guide explaining (1) Slide, (2) Jump & Multi-jump, (3) Center scoring, and (4) Timers.
- **Mobile Viewport Scaling & Touch Hitbox Optimization:**
  - Fluid canvas scaling for mobile browsers, enlarged tap targets for responsive thumb control.
- **Production Packaging & Deployment:**
  - Add `vite build` production script, generate static assets bundle, and deploy to live URL (Vercel/Netlify).

---

## Human Playtesting Method

To play and test the current V1 production release:
1. Run the local dev server from npx.cmd vite:
   ```powershell
   npx.cmd vite
   or
   npm run web:smartbeads
   ```
2. Open `http://localhost:5173/` or 5174 in your browser.
3. Select any of the 7 locked boards from the board dropdown to verify gameplay, AI response, and rules.
