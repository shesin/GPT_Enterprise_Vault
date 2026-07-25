# SmartBeads Project Rules

## Purpose

This document contains the permanent engineering and design principles for SmartBeads.

Only long-term project rules belong here.

Do not add temporary implementation details, project status, experiments, or next actions.

Target: 01P (~1 page)

This is a living project constitution.

When approaching the target size:

- Consolidate and rewrite existing rules.
- Replace obsolete or superseded rules.
- Do not create versioned or overflow files (e.g. *_02P, *_v2, *_OLD).
- Always maintain a single current document representing the latest permanent project principles.
- If uncertain whether information belongs in this document, ask before adding it.

---
## Rule

Board Protection: Never remove or replace an existing verified board variant (e.g., Board37.ts) when implementing or testing experimental variants (4x4, 5x5). Add new variants alongside existing ones.

Capture Rules: Jumps are NOT mandatory. Multi-jumps (chaining) ARE allowed. Once a chain begins, the player may voluntarily stop after any single capture; chaining is never forced mid-turn.

---

## Rule

Prefer complete verification command blocks instead of multiple fragmented commands.

When checking one task or milestone, provide a single command block that verifies the required state together.

Avoid unnecessary command splitting unless different steps require separate execution or explanation.

## Rule

The latest verified project files are the single source of truth.

When modifying an existing document, use the verified current version as the base.

Do not regenerate, rewrite, or recreate project documents from memory or previous discussions.

If the current version is unavailable or uncertain, request the latest file before making changes.

Separate verified project facts from assumptions or suggestions.

Do not treat previous conversations, AI memory, or generated summaries as authoritative when current files are available.

## Rule

Model SmartBeads after the real physical bead board.

Represent the board using its actual intersections and legal connections rather than an arbitrary square grid.

---

## Rule

Do not change the core gameplay simply to make implementation easier.

Introduce new rules or gameplay changes only when they clearly improve gameplay and are permanently adopted.

---

## Rule

The software architecture should evolve with the project.

Do not create files, classes, abstractions, or systems before there is a demonstrated need.

Prefer extending existing code until a clear responsibility requires separation.

---

## Rule

Verify the current project state before making changes, and verify the result immediately after making changes.

Do not build on assumptions or implementation reports.

Whenever practical, confirm changes using the actual files or independent verification commands.

Build only on verified foundations.

---

## Rule

The first SmartBeads version must reproduce a recognized standard physical Guti/Sholo Guti board.

External references may be used to understand the traditional layout.

Any redesigned boards or experimental variants must be developed separately after the standard version is playable and validated.

---

## Rule

Discover the smallest balanced and enjoyable version before increasing board size.

Prefer evaluating progressively larger game sizes (typically **4 → 5 → 7**) until the smallest balanced and enjoyable version is found.

Use configurable boards, AI self-play, and playtesting to guide major design decisions.

---

## Rule

Prefer configurable systems over duplicated implementations.

Board sizes, layouts, starting positions, and future variants should reuse the same engine whenever practical.

---

## Rule

Project documentation consists of:

- PROJECT_MAP_05P.md
- GPT_PROJECT_RULES_01P.md
- GPT_PROJECT_STATUS_01P.md

Do not create additional `GPT_*.md` documents unless a genuinely new permanent documentation category is required.