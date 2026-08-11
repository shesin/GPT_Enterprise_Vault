# SmartBeads Project Rules
Short, always-loaded rules — Cursor reads this file every message.

## Purpose
Permanent, actionable engineering rules only. State the rule, not the reasoning — reasoning lives in VISION_05P.md. No status, no temporary details, no numeric defaults here.
Target: ~1 page (01P).

---

## Rule - Experimental Integrity

Verify the experiment mechanism before using its results for gameplay or board decisions. A test result is not evidence of game quality unless the tested implementation, search depth, randomness, termination, and measurement method are themselves verified.

---

## Rule - Prototype Classification
Design/UX prototypes live outside the production tree (e.g. prototype/), may skip full architectural review, and must never share code with the production engine. They do not need to honor Configurable Parameters, Board Fidelity abstraction, or engine reuse — but gameplay rules (e.g. Capture Optionality) still apply if the prototype is used for human testing.
---
## Rule - Evidence Before Conclusion
Every conclusion, recommendation, or implementation decision must be supported by repository inspection, execution results, or other verifiable evidence. Do not infer project state from previous conversations or documentation when current repository evidence is available.

---
## Rule - Verification Scope
Distinguish Technical Verification (repository/tests/execution) from Gameplay/UX Evaluation (subjective, requires human review). Automated verification never implies gameplay quality, balance, or enjoyment unless explicitly evaluated.

---
## Rule - Board Fidelity
Model the board using its real intersections and legal connections, including diagonals where the physical board has them. Never substitute an arbitrary square grid.

---
## Rule - Capture Optionality
Capturing is optional. During a capture sequence, a player — human or AI — may continue with any legal consecutive capture, or voluntarily end the sequence after completing a legal jump. Applies to every board variant and player type. An AI's internal continue-vs-stop policy is an implementation detail, never a gameplay rule.

---
## Rule - Match Termination & Victory
Three configurable end modes (move/time/unlimited), never hardcoded. On limit, resolve via hierarchy in VISION_05P.md. Draw is legitimate.
---
## Rule - Resignation
Not yet decided. Do not implement until an explicit decision is recorded here.

---
## Rule - Configurable Parameters
Match timers, ply limits, AI difficulty, and tournament settings are configuration values, never hardcoded gameplay logic.

---
## Rule - Verified Source
Latest verified repository files are the single source of truth. Verify before changing, verify after. Never regenerate documentation from memory.

---
## Rule - Reuse Before Build
Reuse and extend existing engine components across variants. No new abstraction, file, or class without repository evidence of demonstrated need.

---
## Rule - Verification Commands
Group related verification into a single command block.

---
## Rule - Project Documentation Set
Exactly four files: this one, VISION_05P.md, GPT_PROJECT_STATUS_01P.md, PROJECT_MAP_05P.md. Agent behavior lives in AGENT_RULE_05P.md, not here.