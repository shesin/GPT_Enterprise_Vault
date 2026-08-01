# SmartBeads Project Map

## Structure

```text
SmartBeads/
│
├── src/                               # SmartBeads source code
│   ├── boards/                        # Physical BoardDefinition variants
│   │   ├── Board4.ts
│   │   ├── Board5.ts
│   │   ├── Board6.ts
│   │   └── Board7.ts
│   ├── config/                        # Variant selection only
│   │   └── BoardConfig.ts             # Resolves BoardVariant → BoardDefinition
│   ├── core/
│   │   ├── SmartBeadsEngine.ts        # Main gameplay engine and game flow
│   │   └── __tests__/
│   │       └── SmartBeadsEngine.test.ts
│   ├── playtest/                      # Developer playtest interface
│   │   ├── HumanVsAiRunner.ts
│   │   └── __tests__/
│   │       └── HumanVsAiRunner.test.ts
│   ├── simulation/                    # Automated self-play simulation runner
│   │   ├── SelfPlayRunner.ts
│   │   └── __tests__/
│   │       └── SelfPlayRunner.test.ts
│   └── models/
│       └── GameState.ts               # BoardDefinition + GameState
│
├── PROJECT_MAP_05P.md                 # Project structure and navigation
├── GPT_PROJECT_RULES_01P.md           # Permanent engineering and design principles
└── GPT_PROJECT_STATUS_01P.md          # Current milestone and next step
```

## File Responsibilities

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

Interactive CLI runner for developer playtesting and engine validation (`HumanVsAiRunner.ts`).

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
