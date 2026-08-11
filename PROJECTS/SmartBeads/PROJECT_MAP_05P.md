# SmartBeads Project Map

## Structure

```text
SmartBeads/
│
├── src/                               # SmartBeads source code (production)
│   ├── boards/                        # Physical BoardDefinition variants
│   │   ├── Board4.ts
│   │   ├── Board5.ts
│   │   ├── Board6.ts
│   │   └── Board7.ts
│   ├── config/                        # Variant selection only
│   │   └── BoardConfig.ts             # Resolves BoardVariant → BoardDefinition
│   ├── core/
│   │   ├── SmartBeadsEngine.ts        # Main gameplay engine and  game flow
│   │   └── __tests__/
│   │       └── SmartBeadsEngine.test.ts
│   ├── playtest/                      # Developer playtest interfaces
│   │   ├── HumanVsAiRunner.ts         # CLI playtest interface
│   │   ├── web/
│   │   │   └── main.ts                # Browser SVG playtest GUI
│   │   └── __tests__/
│   │       └── HumanVsAiRunner.test.ts
│   ├── simulation/                    # Automated self-play simulation runner
│   │   ├── SelfPlayRunner.ts
│   │   └── __tests__/
│   │       └── SelfPlayRunner.test.ts
│   └── models/
│       └── GameState.ts               # BoardDefinition + GameState
│
├── prototype/                         # Design/UX prototypes (outside production src/)
│   └── board4/                        # Standalone HTML gameplay lab for Board4
│
├── PROJECT_MAP_05P.md                 # Project structure and navigation
├── GPT_PROJECT_RULES_01P.md           # Permanent engineering and design principles
└── GPT_PROJECT_STATUS_01P.md          # Current milestone and next step
```

Repo-root `index.html` (outside this folder tree) is the Vite entry for the TypeScript engine playtest GUI (`npm run web:board4`). Do not confuse it with `prototype/board4/index.html`.

## File Responsibilities

### Repo-root index.html & src/playtest/web/main.ts

Minimal browser-based playtest GUI rendered via Vite SVG and TypeScript controller (`npm run web:board4`). Authoritative entry is the repository root `index.html`, not anything under `prototype/`.

### prototype/board4/

Standalone HTML gameplay laboratory for Board4-scale experiments. Lives outside `src/` per the Prototype Classification rule: may skip full architectural review, must not share code with the production engine, and is not part of the Vite TypeScript playtest path.

- **GEMINI_INDEX_4.html** — Interactive HTML prototype, 4×4 board, 4 beads per side. Human-playable; used for early rule validation. Keep as historical/reference playable (do not overwrite).
- **GEMINI_INDEX_6.html** — Interactive HTML prototype, 4×4 board, 6 beads per side. Also has Human-vs-Human mode with chess-clock auto-conversion. Keep as historical/reference playable (do not overwrite).
- **CURSOR_INDEX_4.html** — Cursor-improved playable Human-vs-AI (and PvP) game for 4-bead Board4. Same rules as Gemini Index 4; upgraded AI policy / UX shell.
- **CURSOR_INDEX_6.html** — Cursor-improved playable Human-vs-AI (and PvP) game for 6-bead Board4. Same rules as Gemini Index 6; upgraded AI policy / UX shell.
- **generate-cursor-index.cjs** / **verify-cursor-index.cjs** — Generator and smoke tests for the Cursor Index playables.
- **GEMINI_LAB.html** — Batch-testing tool. Parametrized (bead count, board geometry, tiebreaker mode, move limit). Runs many AI-vs-AI games headless and outputs a comparison table across configs so results do not need to be copy-pasted from the console by hand.
- **SHOLO_GUTI.html** — Standalone playable Human-vs-AI Sholo Guti / Sixteen Soldiers (37-point board, 16 vs 16). Calibration/reference traditional game — not a SmartBeads product config.
- **SHOLO_GUTI_CALIBRATION.html** — Headless/calibration harness for the same geometry (hop-based AI; not the primary playable).
- **sholo-guti-fullturn-engine.cjs** / **run-sholo-fullturn-lab.cjs** — Headless AI-vs-AI batch runner reusing the playable full-turn AI (seeded). Instrument calibration only — not SmartBeads board ranking.
- **verify-sholo-guti.cjs** — Smoke tests for the playable (geometry, Finish, honest AI depth labels, AI replies).
- **GEMINI_GAME_ARCHITECTURE_05P.md** — Describes the rules and mechanics implemented so far for both the 4-bead and 6-bead 4×4 variants (background reference; code is authoritative if they disagree).
- **verify-gemini-lab.cjs** — Headless test script for GEMINI_LAB.html.
- **WEB_RULES_05P.md** — Browser-verified, production-accepted rules for this prototype line.
- **WEB_STATUS_05P.md** — Verification log for this prototype line.
- **WEB_IN_PROGRESS_05P.md** — Implemented-but-unverified features for this prototype line.
- **index.html**, **verify.cjs**, **collect-evidence.cjs**, **evidence/** — a separate, currently inactive prototype track (not the same as the GEMINI_INDEX files). Explicitly different from the repository-root `index.html` used by the TypeScript engine Vite playtest GUI; do not conflate the two.

### src/models/GameState.ts

Authoritative board model: intersections, connections, optional jumpPaths / center nodes / maxPlies, captures, Move schema, and board cloning.

### src/boards/

BoardDefinition variants (e.g. Board4 = 4×4 orthogonal grid with jumpPaths). Add new sizes here via config data only.

### src/config/

Chooses board variants only. Does not redefine board geometry.

* **BoardConfig.ts** — maps `BoardVariant` (`4` / `5` / `6` / `7`) to a `BoardDefinition`.

### src/simulation/

Automated self-play execution and game metrics collection (`SelfPlayRunner.ts`).

### src/playtest/

Interactive CLI runner (`HumanVsAiRunner.ts`) and web GUI runner (`web/main.ts`) for developer playtesting and engine validation.

### src/core/SmartBeadsEngine.ts

Coordinates gameplay for any registered board variant: slides, optional captures, multi-jump chains, voluntary endTurn, and ply limits.

### src/core/__tests__/

Unit tests for the engine across registered variants.

### PROJECT_MAP_05P.md

Explains the project structure and the responsibility of each important file.

### GPT_PROJECT_RULES_01P.md

Contains the permanent engineering and design principles for SmartBeads.

### GPT_PROJECT_STATUS_01P.md

Contains the current development phase, completed work, active milestone and immediate next step.

---

## Summary

SmartBeads is a strategic bead-based board game project.

The physical board model (`BoardDefinition`: intersections and connections) is the source of truth.

Configuration selects which board variant to use. The same engine evaluates multiple bead counts through AI self-play and playtesting.

The objective is to discover the smallest balanced, enjoyable and replayable game before expanding to larger variants.
