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

All 7 production boards are registered in `BoardConfig.ts`, selectable in `BoardCatalog.ts`, and verified via automated test suites (391 Jest unit tests) and headless browser click gates (Playwright):

| # | Board Variant | Geometry & Architecture | Status |
|---|---|---|---|
| 1 | **16-bead · 5×5 + wings** | 37-node Alquerque + 2 triangular wings (`Board16Sholo.ts`). Compact wing caps aligned with columns `c2` to `c4` with 50% row height; prominent 5×5 central playing area (472px width by 472px height on 560×796 canvas). All straight & diagonal apex junction captures verified. Single amber center plate. | **VERIFIED CLEAN** |
| 2 | **6-bead · 4×4** | 16-node full box-cross lattice (`Board6.ts`). Quad amber center scoring plates (2×2 box). Default endgame center scoring. | **VERIFIED CLEAN** |
| 3 | **6-bead · 3×5** | 15-node Alquerque top-bottom camp lattice (`Board6x3x5.ts`). Single amber center plate (Node 7). Default endgame center scoring. | **VERIFIED CLEAN** |
| 4 | **10-bead · 5×5** | 25-node Alquerque with empty center file (`Board10x5.ts`). Single amber center plate (Node 12). Default center off. | **VERIFIED CLEAN** |
| 5 | **12-bead · 6×5** | 30-node Alquerque stretch (`Board12x6x5.ts`). Dual amber center plates (Nodes 12, 17). Default center off. | **VERIFIED CLEAN** |
| 6 | **8-bead · 4×6** | 24-node waist lattice (`Board8x4x6.ts`). Quad amber center scoring plates (Nodes 9, 10, 13, 14). Default endgame center scoring. | **VERIFIED CLEAN** |
| 7 | **7-bead · 4×5** | 20-node lattice (5+2+2+5 camps) (`Board7.ts`). Dual amber center scoring plates (Nodes 9, 10). Default endgame center scoring. | **VERIFIED CLEAN** |

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
- **Target Highlighting:** Clicking an active piece highlights empty landing spots exclusively; clicking the empty landing executes the capture/slide.
- **Selection Safety:** Clicking an immobile own bead safely deselects without leaving accidental armed states.
- **16-Bead Visual Layout:** Central 5×5 grid is rendered as a prominent 472px square matching 10-bead width with compact 59px-high wing caps (560×796 canvas, 0.70 aspect ratio).
- **Unified Center Plates:** Consistent glowing amber square plates render under center nodes for all 7 boards.

### 3. PvE & AI Opponent (`HonestAi.ts`, `PlayController.ts`)
- **Complete-Turn Search:** Generates and evaluates full multi-jump sequences rather than single hops.
- **Pacing & Timing:** 800ms think budget with fallback mechanisms to guarantee the UI never hangs on "AI is thinking...".
- **Difficulty Levels:** Easy, Medium, and Hard.

### 4. Match Controls & Features (`BoardCatalog.ts`, `FeatureSession.ts`)
- **Game Modes:** PvP (local 2-player) and PvE (vs AI).
- **Default Feature Settings:**
  - `centerRule: 'endgame'` on 6 (4×4), 6 (3×5), 7 (4×5), and 8 (4×6).
  - `centerRule: 'off'` on 10 (5×5), 12 (6×5), and 16 (5×5).
  - `matchTimer: 'off'` and `shotClock: 'off'` across all 7 games.
- **Resignation Protocol:** Either player can resign during their turn. If the opponent accepts, the match ends in a Draw; if the opponent declines, the resigning player loses (matches `Rule - Resignation` in `GPT_PROJECT_RULES_01P.md`).

### 5. Test & Quality Gates
- **Jest Test Suite:** 391 unit tests passing across 31 test suites (100% deterministic).
- **Playwright Browser Gates:** Real canvas mouse-click tests for two-click landing captures across all 7 boards, junction hops, and inert-bead safety.

---

## What Is Pending


### Complete Launch Path (Web → Android → Platform)

```text
Phase 1 (Current)          Phase 2 (Immediate)           Phase 3 (Core Commercial)          Phase 4 (Future)
Web Playtesting & QA  ──►  Web Polish & Audio     ──►    Android App Packaging      ──►     V2 Online Ecosystem
(7 Locked Boards)          (SFX, Viewport, Log)          (Engine Wrap, Native UI)           (Multiplayer, PGN, AI Coach)

## Pending — Web Game Launch (Phase 1 & 2)

| Task | Responsible | Time | Notes |
|---|---|---|---|
| Human playtest, all 7 boards | Shekhar | 2–4 hrs | Run `npm run web:smartbeads`, play each of the 7 boards. Only human-verifiable step — no AI can sign off on feel/balance. |
| Fix bugs found in playtest (if any) | Shekhar decides, Developer AI implements | Unknown until found | Repro steps required as a failing test case before any fix — no vague bug reports. |
| Add `vite build` production script | Developer AI | 15–30 min | App currently only runs in dev mode; this adds the command to package it into static files for hosting. |
| Choose hosting (Vercel/Netlify/other) | Shekhar | Decision | Where the website will live. Vercel/Netlify are simplest free-tier options for a static app. |
| Deploy + smoke-test live URL | Developer AI deploys, Shekhar confirms | 30 min | Confirm the live link plays the same as local dev. |

## Pending — Android App (V1 Launch)

| Task | Responsible | Time | Notes |
|---|---|---|---|
| Confirm approach: Capacitor wrap | Shekhar | Decision — Confirmed | Wraps existing web app in native shell. Native WebView bridge rejected. |
| Install/configure Capacitor, add Android platform | Developer AI | 1–2 hrs | Turns web app into installable Android project. |
| Touch-input verification on real device/emulator | Developer AI builds, Shekhar confirms | 2–4 hrs | Confirms taps land accurately on beads/nodes, especially on crowded boards like 16-bead. |
| Screen-size/responsiveness pass for phones | Developer AI builds, Shekhar confirms | 1–3 hrs | Board and panel must fit and be readable on phone screens. |
| App icon, splash screen, package ID | Shekhar provides assets/name, Developer AI wires in | 1 hr | Branding for home screen and store listing. |
| Signed release .aab (keystore + Gradle) | Developer AI; Shekhar backs up keystore | 1–2 hrs | Keystore loss = cannot update app under same listing again. Shekhar must keep personal backup. |
| Google Play Console: dev account, listing, privacy policy, content rating | Shekhar | 2–4 hrs | Business/legal steps only Shekhar can do. |
| Google review queue | Google | 1–3 days | Outside anyone's control. |

Excluded from V1 Android scope: haptic feedback, offline local match persistence, native WebView bridge (rejected in favor of Capacitor).

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
