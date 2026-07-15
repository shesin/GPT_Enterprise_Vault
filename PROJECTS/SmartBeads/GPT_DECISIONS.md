# Decision: SmartBeads Monorepo Architecture Migration

Date: 15 July 2026

## Decision

SmartBeads development moved from an isolated repository structure into the GPT_Enterprise_Vault monorepo architecture.

## New Structure

PROJECTS/SmartBeads
- Game-specific documentation
- Game rules
- Playtest logs
- Project source code

SHARED
- Reusable game engines
- Common systems
- Cross-project technology components

## Source Code Separation

The architecture separates:

PROJECTS/SmartBeads/src
- SmartBeads-specific gameplay logic
- Board models
- Player systems
- Game rules

SHARED/engine
- Generic reusable engines:
  - GameEngine.ts
  - MoveEngine.ts
  - RuleEngine.ts
  - VictoryEngine.ts

## Reason

Future SMART Technology projects may reuse common engines.

Examples:
- Smart Beads
- Smart Chess
- Future strategy games

The goal is to create a reusable game technology foundation rather than a single game codebase.

## Status

Architecture migration completed.
GitHub repository synchronized.
Ready for SmartBeads core engine development.