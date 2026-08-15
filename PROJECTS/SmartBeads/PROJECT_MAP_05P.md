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
├── LAB_TERMINOLOGY_05P.md             # Web glossary, gates G1–G9, board-quality ruler
├── WEB_REPORT_16_BEAD_05P.md          # 16-bead reference baseline report
├── WEB_REPORT_All_BEAD_05P.md         # All-board ladder + Cursor Index verdicts
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

- **SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html** — 6-bead 4×4 playable (Human vs AI / PvP). Long diagonal rays. Web: **NEEDS FURTHER TESTING** (G1–G9 pass, 2026-08-15).
- **SHOLO_GUTI_6_BEAD_b_4x4_WITH_FEATURE.html** — Same shell/start; **full box crosses** (X in every 2×2 cell). Web: **NEEDS FURTHER TESTING**; **preferred** 4×4 candidate for human playtest (2026-08-15).
- **cursor-index-fullturn-engine.cjs** — Headless 4×4 engine (`geometry`: `rays` | `fullBoxCross`; beads 4 or 6).
- **evaluate-cursor-index-lab.cjs** — Authoritative G1–G9 for INDEX_6 + INDEX_6_B → `CURSOR_INDEX_LAB_EVALUATION.json`.
- **generate-cursor-index.cjs** / **verify-cursor-index.cjs** — Generator and smoke tests (both 4×4 playables).
- **GEMINI_LAB.html** — Batch-testing tool. Parametrized (bead count, board geometry, tiebreaker mode, move limit). Runs many AI-vs-AI games headless and outputs a comparison table across configs so results do not need to be copy-pasted from the console by hand.
- **SHOLO_GUTI.html** — Standalone playable Human-vs-AI Sholo Guti / Sixteen Soldiers (37-point board, 16 vs 16). Calibration/reference traditional game — not a SmartBeads product config.
- **SHOLO_GUTI_CALIBRATION.html** — Headless/calibration harness for the same geometry (hop-based AI; not the primary playable).
- **sholo-guti-fullturn-engine.cjs** / **sholo-lab-metrics.cjs** / **validate-sholo-fullturn-lab.cjs** / **final-validate-sholo-lab.cjs** / **validate-lab-16-bead-reference.cjs** — Headless full-turn Web harness + comparison guards. Run `final-validate-sholo-lab.cjs` before SmartBeads candidate testing; run `validate-lab-16-bead-reference.cjs` for 16-bead reference baseline. Honest depths: D1 greedy, D2 = 1 opponent reply, D3 = 2 opponent replies. See **LAB_CAPABILITY_STATUS.json**; methodology at **`LAB_TERMINOLOGY_05P.md`**; reports at **`WEB_REPORT_16_BEAD_05P.md`**, **`WEB_REPORT_All_BEAD_05P.md`** (SmartBeads root).
- **SHOLO_GUTI_WITH_FEATURE.html** — Playable 16-bead Sholo Guti with full-stretch board, right-panel settings (PVP/PVE, timers, shot clock, center rules, BGM), undo, move/capture animation, turn highlight, honest Easy/Medium/Hard AI.
- **SHOLO_GUTI_10_BEAD_WITH_FEATURE.html** — 10 vs 10 on 5×5 lattice only (side triangles removed). Same feature shell + move-highlight Off/On (PvP defaults Off).
- **SHOLO_GUTI_7_BEAD_WITH_FEATURE.html** — 7 vs 7 on 4×5 (column layout 5+2+2+5). Amber centre line at row 3 between col 2 and col 3 = endgame zone. P1 plays from bottom.
- **SHOLO_GUTI_6_BEAD_WITH_FEATURE.html** — 6 vs 6 on 3×5 (sketch geometry). Rows 1–2 Ebony top, row 3 empty + single amber centre node, rows 4–5 Ivory bottom. Square board, P1 at bottom.
- **SHOLO_3x5_BEAD_LAYOUTS.html** — Static 3/4/5-bead layout diagrams only (no playables for 3/4/5). **Removed playables:** 3-bead (not tested), 4/5/8-bead (Web REJECT G2).
- **sholo-10-bead-fullturn-engine.cjs** / **compare-sholo-10-vs-16-lab.cjs** — Headless Lab for the 10-bead candidate + protocol compare vs 16-bead. Output: `SHOLO_10_VS_16_LAB_COMPARE.json`.
- **record-sholo-16-feature-baseline.cjs** — Programmatic verification script for feature semantics and 16-bead feature baseline recording.
- **verify-sholo-10-bead-feature.cjs** / **verify-sholo-7-bead-feature.cjs** / **verify-sholo-6-bead-feature.cjs** — Smoke checks for active Sholo playables.
- **verify-sholo-guti.cjs** — Smoke tests for the playable (geometry, Finish, honest AI depth labels, AI replies).
- **GEMINI_GAME_ARCHITECTURE_05P.md** — Describes the rules and mechanics implemented so far for both the 4-bead and 6-bead 4×4 variants (background reference; code is authoritative if they disagree).
- **verify-gemini-lab.cjs** — Headless test script for GEMINI_LAB.html.
- **WEB_RULES_05P.md** — Browser-verified, production-accepted rules for this prototype line.
- **WEB_STATUS_05P.md** — Verification log for this prototype line.
- **WEB_IN_PROGRESS_05P.md** — Implemented-but-unverified features for this prototype line.
- **CURSOR_INDEX_LAB_EVALUATION.json** / **CURSOR_INDEX_6_LAB_EVAL.json** / **CURSOR_INDEX_6_B_LAB_EVAL.json** / **CURSOR_INDEX_VERIFY_SMOKE.json** — 4×4 Web eval + playable smoke (2026-08-15).
- **index.html**, **verify.cjs**, **collect-evidence.cjs**, **evidence/** — a separate, currently inactive prototype track. Explicitly different from the repository-root `index.html` used by the TypeScript engine Vite playtest GUI; do not conflate the two.

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

### LAB_TERMINOLOGY_05P.md / WEB_REPORT_16_BEAD_05P.md / WEB_REPORT_All_BEAD_05P.md

Project-level Web documentation (SmartBeads root). Terminology and G1–G9 gates; 16-bead reference certification report; consolidated ladder and Cursor Index verdicts. Headless engines, JSON artifacts, and evaluators remain under **`prototype/board4/`**.

---

## Summary

SmartBeads is a strategic bead-based board game project.

The physical board model (`BoardDefinition`: intersections and connections) is the source of truth.

Configuration selects which board variant to use. The same engine evaluates multiple bead counts through AI self-play and playtesting.

The objective is to discover the smallest balanced, enjoyable and replayable game before expanding to larger variants.
