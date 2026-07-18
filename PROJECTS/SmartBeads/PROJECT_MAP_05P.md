# SmartBeads Project Map

## Structure

```text
SmartBeads/
│
├── src/                               # SmartBeads source code
│   ├── BoardConfig.ts                 # Defines configurable board layouts and starting positions.
│   ├── SmartBeadsEngine.ts            # Main gameplay engine and game flow.
│   └── 4x4Config.ts                   # Initial 4 vs 4 board configuration prototype.
│
├── tests/                             # Project tests
│   └── (Project unit and gameplay tests)
│
├── PROJECT_MAP.md                     # Project structure, file responsibilities and navigation.
├── GPT_PROJECT_RULES.md               # Permanent engineering and design principles.
└── GPT_PROJECT_STATUS.md              # Current milestone, completed work and next step.
```

## File Responsibilities

### src/

Contains the SmartBeads implementation.

* **BoardConfig.ts**
  Defines board layouts, active nodes, player starting positions and other configurable board properties.

* **SmartBeadsEngine.ts**
  Coordinates gameplay, board state and interaction between the game modules.

* **4x4Config.ts**
  Stores the initial experimental 4 vs 4 board configuration used for AI evaluation and future expansion.

### tests/

Contains unit tests, gameplay verification and future AI self-play validation.

### PROJECT_MAP.md

Explains the project structure and the responsibility of each important file.

### GPT_PROJECT_RULES.md

Contains the permanent engineering and design principles for SmartBeads.

### GPT_PROJECT_STATUS.md

Contains the current development phase, completed work, active milestone and immediate next step.

---

## Summary

SmartBeads is a strategic bead-based board game project.

Development focuses on building a configurable game engine capable of evaluating multiple board layouts and bead counts through AI self-play and practical playtesting.

The objective is to discover the smallest balanced, enjoyable and replayable game before expanding to larger variants.
