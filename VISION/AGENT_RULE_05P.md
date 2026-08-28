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

# Git — human instructions (owner language)

When the human says **commit**, **push**, **save to git**, or similar, they mean the work ends up on the **remote repository (GitHub)** — not only on the local machine.

Default workflow unless they explicitly say **local only** or **do not push**:

1. `git status` / `git diff` — see what changed  
2. `git add` relevant files  
3. `git commit` with a clear message  
4. **`git push`** to `origin` on the current branch  
5. Report the commit hash **and** raw push output (or the exact error if push fails)

Do not treat a local commit alone as done when the human asked to commit or push.

If unsure what they mean, **ask before starting work**. Do not begin implementation while doubts remain.

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

# Evidence-Based Claims (no fabrication)

Before stating that any component **already does**, **already handles**, **already values**, or **already accounts for** some behavior — as opposed to being asked to check whether it does — you must have searched or read the actual file(s) that would implement it and quoted what you found. A claim about existing behavior with no search performed is not a technical claim; it is a guess formatted as one.

This applies with no exception to:

- Claims that engine/AI code already implements a rule, setting, or feature.
- Claims that a bug is already fixed or a fix is already in place.
- Claims that a test already covers some behavior.

If you did not grep, read, or otherwise directly inspect the specific file that would contain the behavior, you may not assert the behavior exists. Say **not checked** instead of describing what you assume is probably there.

## Feature status — exactly three labels

Any feature, setting, or rule you are asked about must be reported as one of:

- **FUNCTIONAL, TESTED** — code path traced end-to-end, and a named test (existing or newly written) exercises the full claim and passes; raw test output pasted in the completion report when the human requires proof.
- **FUNCTIONAL, UNTESTED** — code path traced end-to-end and appears correct, but no test currently exercises the full claim. State exactly what a test would need to check.
- **NOT FUNCTIONAL / DOES NOT EXIST** — code path does not exist, is unreachable under current settings/defaults, or was found to be decorative (e.g. a UI value with no effect on outcome).

"It's implemented but I haven't checked if it works" is not a valid label — that means **FUNCTIONAL, UNTESTED**, not a hedge on top of an unverified claim. There is no fourth option where you describe what the feature is supposed to do and imply that is what it does. If the honest answer is "this exists only in documentation/UI, not in the logic that decides outcomes," say exactly that.

## Silence is not confirmation

Do not report a feature as working because no test failed. A green test suite proves the tests that exist passed — it says nothing about behavior no test touches. Before reporting **FUNCTIONAL, TESTED**, name the specific test(s) that exercise the full claim. If none exist, the feature is **UNTESTED** or **NOT FUNCTIONAL**, never functional by default.

## Evidence block required before TESTED

Before any **FUNCTIONAL, TESTED** label, the report must include all of:

1. File path and line range inspected (or grep command used).
2. Quoted snippet (≤15 lines) showing the behavior.
3. Exact test file and `it('...')` name covering the **full** claim.
4. One sentence on what that test does **not** cover (if anything).

Missing any item → label must be **FUNCTIONAL, UNTESTED** or **NOT FUNCTIONAL / DOES NOT EXIST**.

Mislabeling after a failed human spot-check is a **stop condition**: discard the turn's implementation claims, redo the audit with evidence, do not proceed until corrected.

---

# One human bug ⇒ full sweep (not one-line fixes)

When the human reports a **basic issue they found in play** (UI wrong, rule not applied, AI misbehaving, counter stuck, etc.), treat it as evidence that **tests and engine coverage are incomplete** — not as an isolated ticket.

Default response:

1. Reproduce or write a **failing** test for what they saw (when possible).  
2. **Search the same class of problem** across boards, settings, and related code paths — do not wait for a list of 100 bugs.  
3. Run the **full relevant test suite** (Jest, browser gates when applicable).  
4. Fix what fails; report what was found and what was verified with raw output.

The human will catch one or two issues in minutes of play. Finding those same gaps in tests and sweeping related failures is the agent's job.

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
- Always state understanding at the top before execution.
- Small verified changes.
- Protect architecture.
- Verify before claiming.
- Escalate important decisions.
- Avoid unnecessary complexity.
- Format reports with clean headers and bulleted key-value lines for clean Word-paste compatibility (avoid wide, disorienting tables).
