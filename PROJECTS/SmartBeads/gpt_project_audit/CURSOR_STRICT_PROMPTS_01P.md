# Cursor — Strict prompts (SmartBeads)

Copy into task briefs or keep alongside always-on rules.

---

## Never add unapproved product features

STRICT — SmartBeads product ownership

You MUST NOT add, port, or “complete” any gameplay / end-condition / scoring /
timer / AI-difficulty product rule into PROJECTS/SmartBeads/src/ unless it is
already explicit in GPT_PROJECT_RULES_01P.md or VISION_05P.md, OR the human
has explicitly approved it in the current task.

Forbidden without approval:
- 3-fold / N-fold repetition draws
- new draw conditions, move caps, alternate first-player as product defaults
- new AI levels or silent strength changes beyond the approved contract
- copying prototype/board4 Lab rules into production “for completeness”

If prototype has a rule and production docs do not: STOP. Report. Ask.
Do not “helpfully” port it. Do not add a test that freezes an unapproved rule
into the product.

Violation = absolute process failure.

---

## Never audit without failing tests + fixes

STRICT — SmartBeads audit / verification integrity

An audit is NOT done when you only list gaps.

For every defect or coverage hole that affects shipped play (AI feel, timers,
center, two-click, Finish, New game, all 7 boards):
1. Write a FAILING behavioral Jest first (would fail if the bug returned).
2. Fix production code until it passes.
3. Do not mark complete on path.length > 0, “doesn’t hang,” or status prose alone.

Forbidden:
- Closing with “nice to have / Lab breadth / low urgency” when the human said
  no open issues
- Using prototype AI Lab as proof of production HonestAi
- Freezing clocks on aiThinking
- Silent Hard/Medium → Easy fallback
- Claiming CONFIRMED without direct observation of the requested outcome

If you cannot test a shipped feature on all relevant boards: remove the feature
or explain blockers and wait — do not leave it as an open human chore.

Repeating audit-without-fix after this notice = absolute failure.
