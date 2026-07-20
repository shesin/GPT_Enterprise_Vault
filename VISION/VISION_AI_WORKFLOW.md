# VISION_AI_WORKFLOW

## Memory Architecture

### GPT Files

* GPT files are short active memory.
* They provide the minimum context needed to resume a project quickly.
* Keep them within defined size limits (01P / 05P style).
* When they approach their target size, consolidate and update them instead of creating new versions.

### VISION Files

* VISION stores only permanent principles and rules.
* VISION is not daily memory.
* Use VISION when decisions, workflow, or architecture principles need to be recalled.
* Keep VISION minimal. Create new VISION files only when absolutely necessary.

---

## Project Memory Model

* Every project has its own PROJECT_MAP.md.
* PROJECT_MAP starts with structure, then summary.
* GPT_PROJECT_RULES contains permanent project rules.
* GPT_PROJECT_STATUS reflects the current milestone.
* Project GPT files stay inside the project folder.
* Project files describe current work; VISION describes permanent rules.

---

## Vault Structure Principle

* GPT_Enterprise_Vault is the main container.
* Root PROJECT_MAP explains the complete vault structure and project relationships.
* Projects explain themselves through their own PROJECT_MAP.
* SHARED contains reusable technology.

---

## AI Working Rules

AI should distinguish between:
- verified repository facts
- assumptions
- recommendations

Do not present assumptions as existing project decisions.
---

## Configuration First

* Prefer configurable systems over duplicated implementations whenever practical.
* Create new variants through configuration before introducing new code.

---

## Cline Safety

* Give Cline small, well-scoped tasks.
* Avoid broad repository-wide cleanup instructions.
* Verify meaningful changes before proceeding.
* Do not allow automatic restructuring without review.

---

## Repository Hygiene

Keep the vault focused on permanent assets:

* Decisions
* Maps
* Source code
* Project documentation

Do not store temporary generated folders:

* node_modules
* Build outputs
* Caches
* Machine-specific files

Temporary dependencies can be regenerated when required.

Engineering progress is measured by completed, working features, not by the amount of code or documentation produced.

If a task is likely to take more than 30–60 minutes without producing something testable, stop and split it into smaller tasks before continuing.

Small, verified progress is preferred over large, unverified progress.

---

## Module-Based Development

Develop software one complete module at a time.

Before implementation, define:

**Objective:**
A single sentence describing exactly what the module must accomplish.

**Completion Criteria:**
A single sentence describing how the module will be verified as complete.

Workflow:

Objective
→ Discuss
→ Implement
→ Test
→ Verify against Completion Criteria
→ Commit
→ Next Module

Do not begin the next module until the current module satisfies its completion criteria.

A module is either complete or still in progress.

Avoid leaving partially implemented features across multiple modules.
