# Gpt_Enterprise_Vault — Claude Code instructions

Read this file every session. You already know the project files — read the docs below only when the current task actually needs them, not by default.

## File split
This file holds only always-critical rules — short enough to follow in full, every message. Situational detail, doc maps, and narrow workflows (handoff prompts, the doc index, audit cadence, etc.) live in `PROJECTS/SmartBeads/GPT_PROJECT_RULES_01P.md` instead (doc index there under § Where to look) — read it only when the task needs it. Don't add always-needed material there, and don't let situational detail creep back in here.

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

## Always
- **Say = do** — check the actual code first whenever there's the slightest doubt, and only report an outcome after it's been tested/confirmed (tests run, browser observed, or code read). Mark **UNCONFIRMED** otherwise.
- `git commit` / `git push` only when explicitly asked.
- **Do only what is explicitly asked.** Never take proactive side-actions (writing memory files, extra docs, cleanup, anything not requested) without asking first. If something seems urgently needed, ask permission — don't just do it.
- **Testing scope:** after a change, run only the test file(s) relevant to it by default — not the full suite. Run the full suite only when explicitly asked, *except* when there's real doubt the change could affect other parts of the codebase (e.g. it touches a shared token/type other boards or modules also read) — then run the full suite anyway without waiting to be asked.
- **Never let a save/overwrite silently destroy existing data.** Any operation that can clobber saved state (multi-writer, stale cache, concurrent edits) needs a real safeguard — version check or confirmation — before it ships, not a hope it won't happen. If it happens anyway, fix the root cause immediately, not a patch that leaves the same failure mode live.

## Ongoing audit duty
- **Investigate before asking.** You have direct file/code access — when something looks wrong, read and cross-check every related file yourself before asking a clarifying question. Only ask if the code truly can't resolve the ambiguity, and ask once, not iteratively.
- **"Complete audit" means checking for structural duplication, not just the flagged area.** Systematically scan for parallel/duplicate entry points, configs, or files serving the same purpose (multiple HTML pages, multiple config blocks, etc.) as a standing audit category — not only after being pointed at one instance.
- No duplicate, contradictory, or dead code/doc lines are acceptable as "known issues" — if found, they get flagged and fixed, not just documented as a gotcha to work around.
- Before implementing anything non-trivial, check whether the change touches a place where two sources of truth might exist (e.g. a value defined in more than one file) — don't assume a single edit covers the real behaviour.
- If something is duplicated, wrong, low-quality, or an existing approach could be meaningfully better — say so and propose a fix, but wait for explicit approval before editing, same as any other change under Mode above.
