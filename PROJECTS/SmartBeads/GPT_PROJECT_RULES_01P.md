# SmartBeads Project Rules

## Purpose

This document contains the permanent engineering and design principles for SmartBeads.

Only long-term rules belong here.

Do not add temporary implementation details, status, experiments, or next actions.

Target: 01P (~1 page)

When approaching the limit:
- Consolidate existing rules.
- Remove duplicates and obsolete rules.
- Replace this file only.
- Do not create overflow or version files.
- If uncertain whether something belongs here, ask before adding it.

---
## Rule

AI Engineering Responsibility

SmartBeads development follows the AI Engineering Responsibility Principle defined in VISION.

Implementation prompts describe the engineering objective, constraints, and completion criteria. They do not prescribe implementation details.

Repository-aware coding agents are responsible for understanding the current SmartBeads implementation before making changes.

When implementing a task:

* Inspect the current project structure.
* Validate assumptions in the prompt.
* Reuse existing architecture whenever practical.
* Extend existing components before creating new ones.
* Avoid duplicate files, duplicate concepts, and parallel architectures.
* Preserve project structure unless an architectural change has been explicitly approved.
* Verify the implementation before considering the task complete.

If the repository differs from the prompt, trust the repository for implementation details and report the difference rather than creating a second solution.

## Rule

Verified files and actual test results are the source of truth.

Do not rely on reports, assumptions, memory, or planned changes.

Before and after important changes:
- Check actual files.
- Check actual diff.
- Run practical verification where possible.

---

## Rule

Cline tasks must be small and measurable.

Every task must define:
- Objective
- Allowed files
- Completion criteria
- Verification method

A task is complete only after verification evidence is available.

---

## Rule

Model SmartBeads after the real physical bead board.

Represent actual intersections and legal connections rather than forcing an arbitrary grid model.

---

## Rule

Do not change gameplay only to simplify coding.

Gameplay changes must improve balance, replayability, or fun and must be accepted before becoming permanent.

---

## Rule

Keep architecture minimal.

Do not create files, classes, abstractions, or systems before a clear need exists.

Prefer extending existing components until separation is justified.

---

## Rule

Discover the smallest balanced and enjoyable version first.

Evaluate progressively:

4 → 5 → 7 beads

Use configuration, AI self-play, and playtesting to guide decisions.

---

## Rule

Prefer configuration over duplication.

Different board sizes and variants should extend the existing architecture through configuration whenever practical.

The implementation should evolve as the project grows without requiring redesign for each new board size.

---

## Rule

Project documentation is limited to:

- PROJECT_MAP_05P.md
- GPT_PROJECT_RULES_01P.md
- GPT_PROJECT_STATUS_01P.md

Do not create additional GPT documents unless a new permanent category is required. 