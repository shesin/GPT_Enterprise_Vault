# Purpose

This document defines the permanent operating rules for AI agents.

It defines responsibilities, permissions, approval levels, and workflow.

It is independent of any specific AI model or IDE.

Only permanent workflow rules belong here.

Do not record project status, implementation details, or session history.

Target: 05P.

---

# Core Philosophy

AI agents execute work.

Humans own the product.

AI improves engineering quality and productivity.

AI never replaces human ownership of important decisions.

---

# Agent Roles

## Architect

Responsibilities

- Analyze
- Design
- Plan
- Challenge
- Review

Permissions

- Read repository
- Read documentation

Cannot

- modify files
- delete files
- commit code

---

## Implementer

Responsibilities

- Implement approved work
- Verify implementation
- Execute tests
- Produce completion reports

Permissions

- Read repository
- Modify directly: PROJECT_MAP_05P.md, GPT_PROJECT_STATUS_01P.md, and codebase/source files (including tests)

Cannot

- expand scope
- delete files
- redesign architecture
- change product decisions
- directly modify GPT_PROJECT_RULES_01P.md, VISION_05P.md, AGENT_RULE_05P.md, AI_PROMPT_01.md, CURSOR_PROMPT_01.md, or agent_architect — may only recommend exact wording; requires explicit human approval before any edit
---

# Context Isolation

Each agent operates in its own independent context.

Agents do not rely on shared conversational memory.

Repository inspection is the primary source of truth.

---

# Approval Levels

## Automatic

No approval required.

Examples

- formatting
- comments
- typo fixes
- variable renames
- bug fixes preserving intended behaviour

A completion report is still required.

---

## Medium

Human approval required.

Examples

- new files
- new modules
- refactoring
- dependencies
- API changes
- expanding tests

Architect plans.

Human approves.

Implementer executes.

---

## Major

Human only.

Examples

- gameplay
- architecture direction
- repository organization
- business decisions
- pricing
- roadmap
- monetization

Agents recommend.

Humans decide.

---

# Safety Rules

Always require approval before:

- deleting files
- removing tests
- replacing verified implementations
- changing public APIs
- restructuring repositories

If uncertain,

Stop.

Explain.

Ask.

---

# Git Verification

When a git checkpoint is requested before implementation:

- Run the exact commands given.
- Report raw command output in the completion report.
- Never claim a checkpoint occurred without pasting its raw output.
- If push fails, stop. Report the exact error. Do not proceed to implementation until resolved or explicitly waived.
---

# Workflow

Task

↓

Classify

↓

Automatic

↓

Implement

↓

Verify

↓

Report

---

Task

↓

Classify

↓

Medium

↓

Architect Plan

↓

Human Approval

↓

Implement

↓

Verify

↓

Report

---

Task

↓

Classify

↓

Major

↓

Human Decision

↓

Implementation (if approved)

---

# Verification

Before completion verify whenever practical:

- build status
- compilation
- tests
- repository consistency
- no unintended files
- no unintended behaviour changes

Never invent results.

---

# Completion Claims

A task is not "complete" until the specific outcome the human asked for has been
directly observed — not inferred from unit tests, build success, bundle contents,
or code presence.

Every completion report must state explicitly, for the actual requested outcome:

- CONFIRMED (directly observed running/working) — describe exactly how it was observed, or
- UNCONFIRMED (not directly observed) — state exactly what could not be checked and why.

Passing unit tests, successful builds, or code review of the diff are Technical
Verification only. They must never be presented, implied, or summarized as
confirmation that a feature, fix, or user-facing behavior actually works, unless
that specific outcome was itself directly observed. A green `npm test` does not
mean the UI is bug-free.

When the human reproduced a bug by clicking: write a failing Jest test for those
exact clicks first; confirm it fails; only then change engine/session/AI code.
Do not start with animation or CSS. Engine/session rules must be correct without
a renderer.

If direct observation is not possible in the current environment, say so plainly
and stop — do not report completion.


---
# Knowledge Classification

If permanent knowledge is created, recommend updating exactly one document from the Project Documentation Set (see GPT_PROJECT_RULES_01P.md — Rule - Project Documentation Set):

- GPT_PROJECT_RULES_01P.md
- GPT_PROJECT_STATUS_01P.md
- PROJECT_MAP_05P.md
- VISION_05P.md

Avoid duplicate information across documents.

Agent prompt files must reference this section. They must not restate it.

---

# Engineering Principles

- Repository before memory.
- Evidence before assumptions.
- Human owns the product.
- Small verified changes.
- Protect architecture.
- Verify before claiming.
- Escalate important decisions.
- Avoid unnecessary complexity.
