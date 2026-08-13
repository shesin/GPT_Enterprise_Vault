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
- **sholo-guti-fullturn-engine.cjs** / **sholo-lab-metrics.cjs** / **validate-sholo-fullturn-lab.cjs** / **final-validate-sholo-lab.cjs** / **validate-lab-16-bead-reference.cjs** — Headless full-turn Lab + comparison guards. Run `final-validate-sholo-lab.cjs` before SmartBeads candidate testing; run `validate-lab-16-bead-reference.cjs` for 16-bead reference baseline. Honest depths: D1 greedy, D2 = 1 opponent reply, D3 = 2 opponent replies. See **LAB_CAPABILITY_STATUS.json**, **LAB_TERMINOLOGY_05P.md**, **LAB_REPORT_16_BEAD_05P.md**.
- **SHOLO_GUTI_WITH_FEATURE.html** — Playable 16-bead Sholo Guti with full-stretch board, right-panel settings (PVP/PVE, timers, shot clock, center rules, BGM), undo, move/capture animation, turn highlight, honest Easy/Medium/Hard AI.
- **SHOLO_GUTI_10_BEAD_WITH_FEATURE.html** — 10 vs 10 on 5×5 lattice only (side triangles removed). Same feature shell + move-highlight Off/On (PvP defaults Off).
- **SHOLO_GUTI_8_BEAD_WITH_FEATURE.html** — 8 vs 8 on 4×5. Rows 1–2 Ebony (top), row 3 empty (amber centre line col2–col3), rows 4–5 Ivory (bottom). P1 plays from bottom.
- **SHOLO_GUTI_7_BEAD_WITH_FEATURE.html** — 7 vs 7 on 4×5 (column layout 5+2+2+5). Amber centre line at row 3 between col 2 and col 3 = endgame zone. P1 plays from bottom.
- **SHOLO_GUTI_6_BEAD_WITH_FEATURE.html** — 6 vs 6 on 3×5 (sketch geometry). Rows 1–2 Ebony top, row 3 empty + single amber centre node, rows 4–5 Ivory bottom. Square board, P1 at bottom.
- **SHOLO_GUTI_5_BEAD_WITH_FEATURE.html** — 5 vs 5 on 5×3 (sketch geometry). Top row Ebony, middle row empty + single amber centre node, bottom row Ivory. Square board, P1 at bottom.
- **sholo-10-bead-fullturn-engine.cjs** / **compare-sholo-10-vs-16-lab.cjs** — Headless Lab for the 10-bead candidate + protocol compare vs 16-bead. Output: `SHOLO_10_VS_16_LAB_COMPARE.json`.
- **record-sholo-16-feature-baseline.cjs** — Programmatic verification script for feature semantics and 16-bead feature baseline recording.
- **verify-sholo-10-bead-feature.cjs** / **verify-sholo-8-bead-feature.cjs** / **verify-sholo-7-bead-feature.cjs** / **verify-sholo-6-bead-feature.cjs** / **verify-sholo-5-bead-feature.cjs** — Smoke checks for 10-bead / 8-bead / 7-bead / 6-bead / 5-bead playables.
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
