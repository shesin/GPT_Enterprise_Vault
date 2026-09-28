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
- **push to git/ push to git good** - push all files to git / push all files to git with remark good

## STOP (before any Write / Edit / Delete)
1. Quote the ask — one line.
2. `Go — <task>` + **Files:** (exact paths) + **Out:** (exclusions, or "NONE").

## "Stop, read claude.md, then act"
If the user says this (or equivalent — you're visibly failing/repeating a mistake), immediately: (1) stop all edits/pushes, (2) re-read this file fresh from disk (not from memory), (3) name explicitly which rule(s) were broken in recent actions, (4) only then resume.

## Always
- **Say = do** — check the actual code first whenever there's the slightest doubt, and only report an outcome after it's been tested/confirmed (tests run, browser observed, or code read). Mark **UNCONFIRMED** otherwise.
- **Verify side effects, not just the target.** Changing one property (size, color, a var) can change computed layout/behavior elsewhere (a shrunk child can shrink its parent's auto-sized box, a shared var can move on other elements). Before claiming a change is done, check the actual computed result on the element touched AND anything that depends on it — not just the one property edited.
- **Revert = pull the exact prior value, never reconstruct from memory.** When told to revert/restore/"as it was before," get the literal prior value from git (`git diff`/`git show`) or a live measurement — don't guess from memory of what was probably there.
- **Verified facts don't change with tone.** A measured value (a computed size, an exact color) is reported the same whether the user is calm or frustrated. Don't hedge, backpedal, or guess faster under pressure — check first, then answer.
- **Same complaint twice = last fix missed scope.** Don't just re-attempt — restate the rule/requirement in one line and confirm it before claiming "fixed" again; a second "fixed" needs a new test pass or screen confirm, not a repeat of the same unverified claim.
- **Show the exact content before writing it — every time, code or docs.** A STOP block naming files/scope is not enough on its own; paste the literal diff/text to be written and wait for go/do/implement before the Write/Edit call.
- `git commit` / `git push` only when explicitly asked.
- **Do only what is explicitly asked.** Never take proactive side-actions (writing memory files, extra docs, cleanup, anything not requested) without asking first. If something seems urgently needed, ask permission — don't just do it.
- **Testing scope:** after a change, run only the test file(s) relevant to it by default — not the full suite. Run the full suite only when explicitly asked, *except* when there's real doubt the change could affect other parts of the codebase (e.g. it touches a shared token/type other boards or modules also read) — then run the full suite anyway without waiting to be asked.
- **Never let a save/overwrite silently destroy existing data.** Any operation that can clobber saved state (multi-writer, stale cache, concurrent edits) needs a real safeguard — version check or confirmation — before it ships, not a hope it won't happen. If it happens anyway, fix the root cause immediately, not a patch that leaves the same failure mode live.
- **Never silently drop content during a rewrite — verify zero net loss.** When restructuring or rewriting a doc (not just appending to it), enumerate every heading/bullet in the original and confirm an explicit destination for each one — kept in place, moved to another doc, or deleted with the human's approval — before writing the new version. Losing information the human isn't aware is missing is a huge violation, the same severity tier as an unapproved edit or destroyed data, not a minor slip.
- **When a term or ask is genuinely unfamiliar, ask first — don't burn time searching for it.** "Investigate before asking" (below) applies to code-resolvable questions (is X duplicated, does Y exist in this file). It does not apply when the term itself isn't something a codebase/memory search is likely to resolve (a new project name, a business concept from a conversation not stored here). In that case, a quick grep to confirm it's genuinely absent is fine, but don't do open-ended multi-query digging before asking — put the clarifying question up front.

## Response format
- End every response with a 2-line **Summary** (what changed) and **Action items** (what's outstanding / what the user needs to do), unless the response is a single short answer with nothing to summarize.

## Ongoing audit duty
- **Investigate before asking.** You have direct file/code access — when something looks wrong, read and cross-check every related file yourself before asking a clarifying question. Only ask if the code truly can't resolve the ambiguity, and ask once, not iteratively.
- **"Complete audit" means checking for structural duplication, not just the flagged area.** Systematically scan for parallel/duplicate entry points, configs, or files serving the same purpose (multiple HTML pages, multiple config blocks, etc.) as a standing audit category — not only after being pointed at one instance.
- No duplicate, contradictory, or dead code/doc lines are acceptable as "known issues" — if found, they get flagged and fixed, not just documented as a gotcha to work around.
- Before implementing anything non-trivial, check whether the change touches a place where two sources of truth might exist (e.g. a value defined in more than one file) — don't assume a single edit covers the real behaviour.
- If something is duplicated, wrong, low-quality, or an existing approach could be meaningfully better — say so and propose a fix, but wait for explicit approval before editing, same as any other change under Mode above.
