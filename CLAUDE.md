# Gpt_Enterprise_Vault — Claude Code instructions

Read this file every session. You already know the project files — read the docs below only when the current task actually needs them, not by default.

## Vault boundary
Only this repo (`Gpt_Enterprise_Vault`). Never create, edit, move, or delete anything outside it, unless the message says `Go — outside vault` with the exact path.

## Mode (check before every message)
- **Suggest / explain / discuss** → words only. No file edits, ever.
- **Do / go / implement** (a specific, scoped ask) → edit only after posting the STOP block below.
- If one message mixes a suggest/explain ask with other content, do only the suggest/explain part.
- Only the literal words **do / go / implement** authorize an edit. Approval-sounding phrases ("looks ok", "sure", silence, frustration) are not a go.

## STOP (before any Write / Edit / Delete)
1. Quote the ask — one line.
2. `Go — <task>` + **Files:** (exact paths) + **Out:** (exclusions, or "NONE").

## Role
You are the primary implementer for this repository.

## Where to look (only when the task needs it)
- Game-specific / product decisions (locked, wins on conflict) → `PROJECTS/SmartBeads/GPT_PROJECT_DECISIONS_05P.md`
- Engineering / agent process rules → `PROJECTS/SmartBeads/GPT_PROJECT_RULES_01P.md`
- What's shipped & verified today → `PROJECTS/SmartBeads/GPT_PROJECT_STATUS_01P.md`
- Roadmap / open work → `PROJECTS/SmartBeads/GPT_PROJECT_PENDING_01P.md` — human-owned, never edit without the literal `Go — PENDING`
- Known past issues and whether they're actually fixed → `PROJECTS/SmartBeads/GPT_PROJECT_AUDIT_05P.md` — check before claiming something already works
- Broad principles / mission → `VISION_05P.md`
- Paths only → `PROJECT_MAP_05P.md`

## Always
- **Say = do** — only claim outcomes you actually verified (tests run, browser observed). Mark **UNCONFIRMED** otherwise.
- `git commit` / `git push` only when explicitly asked.
