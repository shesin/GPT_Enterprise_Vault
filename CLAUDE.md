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
- **Say = do** — check the actual code first whenever there's the slightest doubt, and only report an outcome after it's been tested/confirmed (tests run, browser observed, or code read). Mark **UNCONFIRMED** otherwise.
- `git commit` / `git push` only when explicitly asked.
- **Do only what is explicitly asked.** Never take proactive side-actions (writing memory files, extra docs, cleanup, anything not requested) without asking first. If something seems urgently needed, ask permission — don't just do it.
- **Testing scope:** after a change, run only the test file(s) relevant to it by default — not the full suite. Run the full suite only when explicitly asked, *except* when there's real doubt the change could affect other parts of the codebase (e.g. it touches a shared token/type other boards or modules also read) — then run the full suite anyway without waiting to be asked.

## Handoff / new-chat prompts
- When asked to write a prompt for a new chat session (handoff summary, context dump, etc.), it must end with an explicit, actionable task line — never just background/context and nothing else.
- It must always state the repository path (`D:\Business Idea\Gpt_Enterprise_Vault`) up front — never assume a new session already knows which folder/repo this is about.
- A fresh session has no memory of this conversation, and per Mode above it will not act on context alone — it will just ask "what would you like me to do with this?" A handoff that stops at information, with no stated next task, causes exactly that dead-end.
- State the actual next task plainly at the end of the handoff (e.g. "Task: implement X" / "Task: review Y and report back"), even if the task is just "confirm this context is correct before proceeding."

## Ongoing audit duty
- No duplicate, contradictory, or dead code/doc lines are acceptable as "known issues" — if found, they get flagged and fixed, not just documented as a gotcha to work around.
- Before implementing anything non-trivial, check whether the change touches a place where two sources of truth might exist (e.g. a value defined in more than one file) — don't assume a single edit covers the real behaviour.
- If something is duplicated, wrong, low-quality, or an existing approach could be meaningfully better — say so and propose a fix, but wait for explicit approval before editing, same as any other change under Mode above.
- Roughly every 1-2 days of active work (not literally calendar-daily if idle), review test coverage and source quality in the area just touched: are tests actually exercising the real behaviour (not a duplicated/stale table), is anything unreachable, is anything under-tested. Report findings; don't silently fix without approval.
