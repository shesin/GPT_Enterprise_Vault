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
│   │   ├── Board8x4x6.ts              # 8-bead · 4×6 hourglass (V1 #6)
│   │   ├── Board7.ts                  # Stub — future variant
│   │   ├── Board16Sholo.ts            # 16-bead · 5×5 + wings (V1 #1 reference)
│   │   └── __tests__/                 # Board geometry + prototype parity tests
│   ├── config/
│   │   ├── BoardConfig.ts             # BoardVariant → BoardDefinition registry
│   │   └── BoardCatalog.ts            # Locked V1 product catalog + play defaults
│   ├── core/
│   │   ├── SmartBeadsEngine.ts        # Gameplay engine (slides, captures, chains, termination)
│   │   └── __tests__/
│   │       └── SmartBeadsEngine.test.ts
│   ├── playtest/                      # Developer playtest interfaces
│   │   ├── HumanVsAiRunner.ts         # CLI playtest interface
│   │   ├── web/
│   │   │   ├── main.ts                # Vite entry — bootstraps shared play shell
│   │   │   ├── PlayController.ts      # 3-column feature UI + canvas input loop
│   │   │   ├── play-shell.css         # Feature shell layout/styles
│   │   │   ├── BoardRenderer.ts       # Legacy SVG renderer (CLI / fallback)
│   │   │   ├── feature/
│   │   │   │   ├── FeatureSession.ts  # Board-agnostic session (engine + settings + undo)
│   │   │   │   ├── GameFeatureSettings.ts
│   │   │   │   ├── HonestAi.ts
│   │   │   │   └── centerScoring.ts
│   │   │   ├── layout/
│   │   │   │   └── boardProjection.ts # Lattice → canvas coordinates
│   │   │   └── render/
│   │   │       └── CanvasBoardRenderer.ts
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
│   ├── m2-6x4-browser-verify.mjs
│   ├── m2-6x3x5-browser-verify.mjs
│   ├── m2-10x5-browser-verify.mjs
│   ├── m2-12x6x5-browser-verify.mjs
│   └── m2-8x4x6-browser-verify.mjs
│
├── prototype/                         # Design/UX prototypes (outside production src/)
│   └── board4/                        # Standalone HTML gameplay lab for Board4-scale boards
│
├── BOARD_DISCOVERY_05P.md             # New-board shortlist + discovery Lab outcomes
├── LAB_TERMINOLOGY_05P.md             # Web glossary, gates G1–G9, board-quality ruler
├── WEB_REPORT_16_BEAD_05P.md          # 16-bead reference baseline report
├── WEB_REPORT_All_BEAD_05P.md         # All-board ladder + Cursor Index verdicts
├── WEB_FEATURE_TEST_05P.md            # Feature Test (KEEP boards only) — settings & timer ranges
├── PROJECT_MAP_05P.md                 # Project structure and navigation
├── GPT_PROJECT_RULES_01P.md           # Permanent engineering and design principles
└── GPT_PROJECT_STATUS_01P.md          # Current milestone and next step
```

Repo-root `index.html` is the Vite entry for the production play shell (`npm run web:smartbeads`). Do not confuse it with `prototype/board4/index.html`.

## File Responsibilities

### Repo-root index.html & src/playtest/web/

Browser-based **shared play shell** rendered via Vite + TypeScript + canvas (`npm run web:smartbeads`). Board selection reads `BoardCatalog.ts`; only catalog entries with `playable: true` appear in the UI. Authoritative entry is the repository root `index.html`, not anything under `prototype/`.

- **`main.ts`** — calls `bootstrapPlayShell()`.
- **`PlayController.ts`** — settings panel, timers, undo, honest AI, board `<select>`, result modal.
- **`feature/FeatureSession.ts`** — wraps `SmartBeadsEngine` with per-board `GameFeatureSettings`.
- **`render/CanvasBoardRenderer.ts`** — draws any board with layout coordinates on canvas.

### prototype/board4/

Standalone HTML gameplay laboratory. Lives outside `src/` per the Prototype Classification rule: may skip full architectural review, must not share code with the production engine, and is not part of the Vite TypeScript playtest path.

- **`unrejected games/`** — **Left-out NFT playables only** (5 on disk): Web-pass discovery boards **not** in the locked V1 seven. Locked product playables stay in **`board4/`** root.
- **`playable-dir.cjs`** — Resolves playables: `unrejected games/` first, else `board4/` root (locked V1 + ladder).
- **cursor-index-fullturn-engine.cjs** — Headless 4×4 engine (`geometry`: `rays` | `fullBoxCross`; active playable uses `fullBoxCross`).
- **SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html** — Prototype reference for production `Board6.ts` (6-bead · 4×4).
- **SHOLO_GUTI_6_BEAD_WITH_FEATURE.html** — Prototype reference for production `Board6x3x5.ts` (6-bead · 3×5).
- **SHOLO_GUTI_10_BEAD_WITH_FEATURE.html** — Prototype reference for production `Board10x5.ts` (10-bead · 5×5).
- **SHOLO_GUTI_12_BEAD_6x5_WITH_FEATURE.html** — Prototype reference for production `Board12x6x5.ts` (12-bead · 6×5).
- **SHOLO_GUTI_8_BEAD_4x6_HOURGLASS_WITH_FEATURE.html** — Prototype reference for production `Board8x4x6.ts` (8-bead · 4×6 hourglass).
- **SHOLO_GUTI_WITH_FEATURE.html** — Prototype reference for production `Board16Sholo.ts` (16-bead).
- **sholo-guti-fullturn-engine.cjs** — Headless full-turn engine for 16-bead reference parity tests.
- **evaluate-feature-test-lab.cjs** / **FEATURE_TEST_KEEP_REGISTRY.json** — Feature Test (human-confirmed KEEP only). Report: **`WEB_FEATURE_TEST_05P.md`**.
- **GEMINI_GAME_ARCHITECTURE_05P.md** — Background reference for 4×4 variants; code is authoritative if they disagree.

### src/models/GameState.ts

Authoritative board model: intersections, connections, optional jumpPaths / center nodes / maxPlies / terminationProfile, captures, Move schema, and board cloning.

### src/boards/

BoardDefinition variants. Each file owns geometry, starting layout, center nodes, and match config for one physical board.

| Module | V1 # | Status |
|--------|------|--------|
| `Board16Sholo.ts` | 1 · 16-bead 5×5 | **Production playable** |
| `Board6.ts` | 2 · 6-bead 4×4 | **Production playable** |
| `Board6x3x5.ts` | 3 · 6-bead 3×5 | **Production playable** |
| `Board10x5.ts` | 4 · 10-bead 5×5 | **Production playable** |
| `Board12x6x5.ts` | 5 · 12-bead 6×5 | **Production playable** |
| `Board8x4x6.ts` | 6 · 8-bead 4×6 hourglass | **Production playable** |
| `Board4.ts` | — | Lab orthogonal 4×4 (4-bead) |
| `Board5.ts`, `Board7.ts` | — | Stubs |

### src/config/

- **`BoardConfig.ts`** — maps `BoardVariant` (`4` / `5` / `6` / `7` / `16`) → `BoardDefinition`.
- **`BoardCatalog.ts`** — locked V1 seven product entries, play defaults (centre rule, timers), and `playable` / `productVisible` flags.

### src/core/SmartBeadsEngine.ts

Coordinates gameplay for any registered board variant: slides, optional captures, multi-jump chains, voluntary `endTurn`, elimination/stalemate (`sholo_guti`), and ply limits (`ply_limit`).

### src/playtest/

Interactive CLI runner (`HumanVsAiRunner.ts`) and web feature shell (`web/`) for developer playtesting and engine validation.

### src/simulation/

Automated self-play execution and game metrics collection (`SelfPlayRunner.ts`).

### Documentation set (SmartBeads root)

| File | Role |
|------|------|
| `GPT_PROJECT_RULES_01P.md` | Permanent engineering rules |
| `VISION_05P.md` | Vision, locked V1 seven, design reasoning |
| `GPT_PROJECT_STATUS_01P.md` | Milestone status and next step |
| `PROJECT_MAP_05P.md` | This file — structure and navigation |
| `WEB_FEATURE_TEST_05P.md` | Per-board feature defaults (centre rule, timers) |
| `LAB_TERMINOLOGY_05P.md` / `WEB_REPORT_*.md` | Lab methodology and board verdicts |

---

## Summary

SmartBeads is a strategic bead-based board game platform.

The physical board model (`BoardDefinition`: intersections and connections) is the source of truth. Configuration selects which board variant to use. The same engine and shared play shell serve all V1 boards.

The objective is to ship the **V1 seven-board app** (locked in `VISION_05P.md`) via one production engine, configurable board geometry, and a shared feature shell. Prototype HTML playables remain the Lab/reference implementation; they do not ship as separate apps.

**Current production playables:** 16-bead · 5×5 (`Board16Sholo`), 6-bead · 4×4 (`Board6`), 6-bead · 3×5 (`Board6x3x5`), 10-bead · 5×5 (`Board10x5`), 12-bead · 6×5 (`Board12x6x5`), 8-bead · 4×6 hourglass (`Board8x4x6`).
