# SmartBeads Project Map

## Structure

```text
SmartBeads/
│
├── src/                               # SmartBeads source code (production)
│   ├── boards/                        # Physical BoardDefinition variants
│   │   ├── Board4.ts                  # 4-bead · 4×4 orthogonal (lab)
│   │   ├── Board5.ts                  # Stub — future variant
│   │   ├── Board6.ts                  # 6-bead · 4×4 full box cross (V1 #2)
│   │   ├── Board6x3x5.ts              # 6-bead · 3×5 top–bottom (V1 #3)
│   │   ├── Board10x5.ts               # 10-bead · 5×5 two-file (V1 #4)
│   │   ├── Board12x6x5.ts             # 12-bead · 6×5 two-file rank (V1 #5)
│   │   ├── Board8x4x6.ts              # 8-bead · 4×6 (V1 #6)
│   │   ├── Board7.ts                  # 7-bead · 4×5 (V1 #7)
│   │   ├── Board16Sholo.ts            # 16-bead · 5×5 + wings (V1 #1 reference; collinear wing & junction geometry)
│   │   └── __tests__/                 # Board geometry + prototype parity tests
│   ├── config/
│   │   ├── BoardConfig.ts             # BoardVariant → BoardDefinition registry
│   │   └── BoardCatalog.ts            # Locked V1 product catalog + play defaults
│   ├── core/
│   │   ├── SmartBeadsEngine.ts        # Gameplay engine (slides, captures, chains, termination)
│   │   └── __tests__/
│   │       ├── SmartBeadsEngine.test.ts
│   │       └── SmartBeadsEngine16.test.ts
│   ├── playtest/                      # Developer playtest interfaces
│   │   ├── HumanVsAiRunner.ts         # CLI playtest interface
│   │   ├── web/
│   │   │   ├── main.ts                # Vite entry — bootstraps shared play shell
│   │   │   ├── PlayController.ts      # 4-column play shell + left panel + starter policy + canvas input
│   │   │   ├── play-shell.css         # Feature shell layout, viewport fit, shell--board-16
│   │   │   ├── BoardRenderer.ts       # Legacy SVG renderer (CLI / fallback)
│   │   │   ├── feature/
│   │   │   │   ├── FeatureSession.ts  # Session; interpretClick = landing (opponent beads inert)
│   │   │   │   ├── GameFeatureSettings.ts
│   │   │   │   ├── HonestAi.ts        # Easy/Medium/Hard contract; center-aware eval
│   │   │   │   ├── clockPolicy.ts     # Shell timers tick during AI think
│   │   │   │   ├── aiTurnPath.ts
│   │   │   │   ├── firstMoveInvariants.ts  # Isolated human-ply occupancy
│   │   │   │   ├── pveTiming.ts       # Slide/jump anim, AI reply delay, think budget
│   │   │   │   ├── centerScoring.ts
│   │   │   │   └── __tests__/         # firstMove, turnControl, resignation, difficulty,
│   │   │   │                          #   featureRules, clockPolicy, allBoards.smoke
│   │   │   ├── audio/
│   │   │   │   ├── SoundEffects.ts    # Procedural sweet-acoustic SFX + BGM
│   │   │   │   ├── SoundAssets.ts
│   │   │   │   └── assets/            # Optional sample/voice assets
│   │   │   ├── layout/
│   │   │   │   ├── boardProjection.ts
│   │   │   │   ├── boardVisualProfile.ts
│   │   │   │   ├── canvasDisplay.ts   # --board-aspect on .shell; fitCanvasToFrame
│   │   │   │   ├── prototypeProjectionOracle.ts
│   │   │   │   └── __tests__/         # prototypeVisualParity, creamCampRendersLower
│   │   │   ├── render/
│   │   │   │   └── CanvasBoardRenderer.ts
│   │   │   └── __tests__/             # PlayController, playerBarShell, viewportFit,
│   │   │                              #   productionPve16, v1ProductionSanity, v1GeometryCaptureAudit
│   │   └── __tests__/
│   │       └── HumanVsAiRunner.test.ts
│   ├── simulation/                    # Automated self-play simulation runner
│   │   ├── SelfPlayRunner.ts
│   │   └── __tests__/
│   │       └── SelfPlayRunner.test.ts
│   └── models/
│       └── GameState.ts               # BoardDefinition + GameState
│
├── scripts/                           # Browser verification (repo: PROJECTS/SmartBeads/scripts/)
│   ├── m1-browser-verify.mjs
│   ├── m2-browser-verify.mjs          # 16-bead feature shell
│   ├── m2-2step-observe.mjs           # two-click occupancy gate (all V1 boards; 16 = A41→A42)
│   ├── m2-2step-npm-gate.mjs          # boots Vite once, runs both live gates for `npm test`
│   ├── m2-capture-geometry-browser.mjs # real-click captures, 16 junction both ways, chain, optional stop
│   ├── m2-gameplay-verify.mjs         # prototype-pixel + isolated first ply
│   ├── m2-all-boards-visual-verify.mjs
│   ├── lib/live-ply.mjs               # live snapshot / isolated ply helpers
│   ├── lib/project-node.mjs           # Playwright canvas click by node
│   ├── m2-6x4-browser-verify.mjs
│   ├── m2-6x3x5-browser-verify.mjs
│   ├── m2-10x5-browser-verify.mjs
│   ├── m2-12x6x5-browser-verify.mjs
│   ├── m2-8x4x6-browser-verify.mjs
│   ├── m2-7x4x5-browser-verify.mjs
│   ├── m2-catalog-settings-verify.mjs
│   └── lab-ai-difficulty-eval.mjs     # Production HonestAi Lab (not prototype .cjs)
│
├── prototype/                         # Design/UX prototypes (outside production src/)
│   └── board4/                        # Standalone HTML gameplay lab for Board4-scale boards
│
├── GPT_PROJECT_AUDIT_05P.md           # 4th-cycle AI process failure audit (supporting)
├── BOARD_DISCOVERY_05P.md             # New-board shortlist + discovery Lab outcomes
├── LAB_TERMINOLOGY_05P.md             # Web glossary, gates G1–G9, board-quality ruler
├── WEB_REPORT_16_BEAD_05P.md          # 16-bead reference baseline report
├── WEB_REPORT_All_BEAD_05P.md         # All-board ladder + Cursor Index verdicts
├── WEB_FEATURE_TEST_05P.md            # Feature Test (KEEP boards only) — settings & timer ranges
├── PROJECT_MAP_05P.md                 # Project structure and navigation
├── GPT_PROJECT_RULES_01P.md           # Permanent engineering and design principles
├── GPT_PROJECT_STATUS_01P.md          # Milestone status (shipped only)
└── GPT_PROJECT_PENDING_01P.md         # Pending & roadmap (single list)
```

Repo-root `index.html` is the Vite entry for the production play shell (`npm run web:smartbeads`): **left play panel · board · settings · ad**. Do not confuse it with `prototype/board4/index.html`.

## File Responsibilities

### Repo-root index.html & src/playtest/web/

Browser-based **shared play shell** rendered via Vite + TypeScript + canvas (`npm run web:smartbeads`). Board selection reads `BoardCatalog.ts`; only catalog entries with `playable: true` appear in the UI. Authoritative entry is the repository root `index.html`, not anything under `prototype/`.

- **`main.ts`** — calls `bootstrapPlayShell()`.
- **`PlayController.ts`** — left play panel (AI/human blocks, shot rings, match mm:ss), settings panel, timers, undo, honest AI, board `<select>`, start overlay (mode + START GAME), starter policy (human on Start; alternate on New game), result modal; canvas clicks through `FeatureSession.interpretClick`.
- **`feature/FeatureSession.ts`** — wraps `SmartBeadsEngine` with per-board `GameFeatureSettings`; turn interaction enforces selectable own beads, inert opponent beads, and landing-square capture execution. No 3-fold repetition in production.
- **`feature/HonestAi.ts`** — Easy (~30% soft-miss, capture-greedy), Medium (~20% soft-miss + 1-ply), Hard (0% soft-miss + 2-ply); center valued when rule is on.
- **`feature/clockPolicy.ts`** — shell interval must tick during `aiThinking` / animation.
- **`audio/SoundEffects.ts`** — procedural SFX, start overlay unlock, end celebration audio.
- **`feature/firstMoveInvariants.ts`** — isolated human-ply occupancy (session/app contract; Jest + live shell).
- **`feature/pveTiming.ts`** — human animation vs AI reply delay; tests must sample the human ply first.
- **`render/CanvasBoardRenderer.ts`** — draws any board with layout coordinates on canvas. Board lines are stroked straight from `board.connections`, so a drawn line is always a legal slide; `v1GeometryCaptureAudit.test.ts` pins that with a recording 2D context.

### prototype/board4/

Standalone HTML gameplay laboratory. Lives outside `src/` per the Prototype Classification rule: may skip full architectural review, must not share code with the production engine, and is not part of the Vite TypeScript playtest path.

- **`unrejected games/`** — **Left-out NFT playables only** (5 on disk): Web-pass discovery boards **not** in the locked V1 seven. Locked product playables stay in **`board4/`** root.
- **`playable-dir.cjs`** — Resolves playables: `unrejected games/` first, else `board4/` root (locked V1 + ladder).
- **cursor-index-fullturn-engine.cjs** — Headless 4×4 engine (`geometry`: `rays` | `fullBoxCross`; active playable uses `fullBoxCross`).
- **SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html** — Prototype reference for production `Board6.ts` (6-bead · 4×4).
- **SHOLO_GUTI_6_BEAD_WITH_FEATURE.html** — Prototype reference for production `Board6x3x5.ts` (6-bead · 3×5).
- **SHOLO_GUTI_10_BEAD_WITH_FEATURE.html** — Prototype reference for production `Board10x5.ts` (10-bead · 5×5).
- **SHOLO_GUTI_12_BEAD_6x5_WITH_FEATURE.html** — Prototype reference for production `Board12x6x5.ts` (12-bead · 6×5).
- **SHOLO_GUTI_8_BEAD_4x6_HOURGLASS_WITH_FEATURE.html** — Prototype reference for production `Board8x4x6.ts` (8-bead · 4×6).
- **SHOLO_GUTI_7_BEAD_WITH_FEATURE.html** — Prototype reference for production `Board7.ts` (7-bead · 4×5).
- **SHOLO_GUTI_WITH_FEATURE.html** — Prototype reference for production `Board16Sholo.ts` (16-bead).
- **sholo-guti-fullturn-engine.cjs** — Headless full-turn engine for 16-bead reference parity tests.
- **evaluate-feature-test-lab.cjs** / **FEATURE_TEST_KEEP_REGISTRY.json** — Feature Test (human-confirmed KEEP only). Report: **`WEB_FEATURE_TEST_05P.md`**.
- **GEMINI_GAME_ARCHITECTURE_05P.md** — Background reference for 4×4 variants; code is authoritative if they disagree.

### src/models/GameState.ts

Authoritative board model: intersections, connections, optional jumpPaths / center nodes / maxPlies / terminationProfile, captures, Move schema, and board cloning.

### src/boards/

BoardDefinition variants. Each file owns geometry, starting layout, center nodes, and match config for one physical board.

| Module | V1 # | Status |
|---|---|---|
| `Board16Sholo.ts` | 1 · 16-bead 5×5 | **Production playable** |
| `Board6.ts` | 2 · 6-bead 4×4 | **Production playable** (cream camps bottom) |
| `Board6x3x5.ts` | 3 · 6-bead 3×5 | **Production playable** |
| `Board10x5.ts` | 4 · 10-bead 5×5 | **Production playable** |
| `Board12x6x5.ts` | 5 · 12-bead 6×5 | **Production playable** |
| `Board8x4x6.ts` | 6 · 8-bead 4×6 | **Production playable** |
| `Board7.ts` | 7 · 7-bead 4×5 | **Production playable** |
| `Board4.ts` | — | Lab orthogonal 4×4 (4-bead) |
| `Board5.ts` | — | Stub |

### src/config/

- **`BoardConfig.ts`** — maps `BoardVariant` (`4` / `5` / `6` / `6x3x5` / `10x5` / `12x6x5` / `8x4x6` / `7` / `16`) → `BoardDefinition`.
- **`BoardCatalog.ts`** — locked V1 seven product entries, per-board play defaults (centre rule, match timer, shot clock) and option lists; `playable` / `productVisible` flags.

### src/core/SmartBeadsEngine.ts

Coordinates gameplay for any registered board variant: slides, optional captures, multi-jump chains, voluntary `endTurn`, elimination/stalemate (`sholo_guti`), and ply limits (`ply_limit`).

### src/playtest/

Interactive CLI runner (`HumanVsAiRunner.ts`) and web feature shell (`web/`) for developer playtesting and engine validation.

**Production PvE path:** `SmartBeadsEngine` → `FeatureSession` → `HonestAi.selectAiTurnPath` → `PlayController.runAiTurn` (the browser loop is the animated twin). Jest for that path: `src/playtest/web/__tests__/v1ProductionSanity.test.ts` (all seven V1 boards: every `jumpPath` captures, unique-over click, Easy games), `v1GeometryCaptureAudit.test.ts` (geometry, slides, captures, multi-jump, optional stop, illegal hops, renderer-vs-legality on all seven), plus `productionPve16.test.ts` and `PlayController.test.ts`. `HumanVsAiRunner` uses `executeAiRandomMove`, not HonestAi.

**Live browser evidence** is separate from Jest and runs in `npm test`: `m2-2step-observe.mjs` (two-click occupancy) and `m2-capture-geometry-browser.mjs` (real-click captures and the 16-bead junction). `window.__SB_TEST__` exposes the session through a getter — it must never capture the session by value, because `switchBoard`/`resetGame` rebind it.

### src/simulation/

`SelfPlayRunner.ts` runs **Board4 random legal moves** (`executeAiRandomMove`). A 100-game JSON report from `npm run sim:board4` is not production 16-bead PvE and does not execute HonestAi.

**Lab `.cjs` engines** under `prototype/board4/` certify geometry/balance on per-board copies. They do not execute production `SmartBeadsEngine` / `HonestAi` / PvE. G1–G9 Lab passes are not production gameplay proof.

### Documentation set (SmartBeads root)

| File | Role |
|------|------|
| `GPT_PROJECT_RULES_01P.md` | Permanent engineering rules |
| `VISION_05P.md` | Vision, locked V1 seven, design reasoning |
| `GPT_PROJECT_STATUS_01P.md` | Milestone status (shipped only) |
| `GPT_PROJECT_PENDING_01P.md` | Pending work & roadmap (single list) |
| `PROJECT_MAP_05P.md` | This file — structure and navigation |
| `GPT_PROJECT_AUDIT_05P.md` | 4th-cycle process failure audit (supporting) |
| `WEB_FEATURE_TEST_05P.md` | Per-board feature defaults (centre rule, timers) |
| `LAB_TERMINOLOGY_05P.md` / `WEB_REPORT_*.md` | Lab methodology and board verdicts |

### Agent prompts (`VISION/`)

Two audiences — do not confuse them:

**External AI (human paste — Cursor does not load this)**

| File | Role |
|------|------|
| `AI_PROMPT_01.md` | Architect partner prompt for conversations outside Cursor |

Other files may exist under `VISION/` for personal use; they are not part of repo documentation or Cursor configuration.

**Cursor / repo agents (implementation and in-IDE work)**

| File | Role |
|------|------|
| `AGENT_RULE_05P.md` | Canonical workflow, safety, Knowledge Classification, Engineering Principles |
| `CURSOR_PROMPT_01.md` | Cursor implementer — code execution in this repository |
| `AGENT_ARCHITECT_01P.md` | In-repo architect agent (plan/review; no direct edits) |

Single-owner rule — canonical text lives in `AGENT_RULE_05P.md` only:

| Topic | Owner |
|-------|--------|
| Knowledge Classification | `AGENT_RULE_05P.md` |
| Engineering Principles | `AGENT_RULE_05P.md` |
| Roles, approval tiers, workflow, safety, verification | `AGENT_RULE_05P.md` |

All other agent prompts reference the above; they do not restate those sections.

---

## Summary

SmartBeads is a strategic bead-based board game platform.

The physical board model (`BoardDefinition`: intersections and connections) is the source of truth. Configuration selects which board variant to use. The same engine and shared play shell serve all V1 boards.

The objective is to ship the **V1 seven-board app** (locked in `VISION_05P.md`) via one production engine, configurable board geometry, and a shared feature shell. Prototype HTML playables remain the Lab/reference implementation; they do not ship as separate apps.

**Current production playables:** all **V1 seven** — 16-bead · 5×5 (`Board16Sholo`), 6-bead · 4×4 (`Board6`), 6-bead · 3×5 (`Board6x3x5`), 10-bead · 5×5 (`Board10x5`), 12-bead · 6×5 (`Board12x6x5`), 8-bead · 4×6 (`Board8x4x6`), 7-bead · 4×5 (`Board7`).
