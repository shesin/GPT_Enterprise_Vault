# SmartBeads — GPT Project Audit (4th cycle)

Date: 2026-08-27  
Scope: Production `src/` (not prototype)  
Status: FAILURE RECORD + corrective actions (permanent)

Enforcement text for Cursor agents lives in `.cursor/rules/smartbeads-core.mdc`, `smartbeads-rules.mdc`, and `VISION/CURSOR_PROMPT_01.md` — not duplicated here.

---

## Purpose

This file documents an **absolute failure of AI process** on SmartBeads: major, human-obvious bugs and unapproved features remained after multiple “audits,” while Jest stayed green and status docs claimed confidence.

Humans found basic defects in minutes. Prior AI audits listed gaps but did **not** add failing behavioral tests and fixes. That pattern must never repeat.

---

## What the human ordered (this cycle)

1. **Remove 3-fold repetition entirely** from production FeatureSession (not only delete a test). It was never approved for V1 Rules/VISION.
2. **Explain how unapproved features entered** and write strict Cursor enforcement so agents never add product rules without approval.
3. **Explain how major bugs survived 3 prior audits** and write strict enforcement against audit-without-fix behavior.
4. Soften **Medium** so Hard feels tougher (especially on 8-bead); Easy already OK on 6×3×5.
5. **Verify shot clock** during AI think (AI moves too fast for human to see freeze — agent must prove clocks tick).
6. Explain “16 + one small board” smoke (own beads, capture + Finish, New game / Play again).
7. **No open issues**: finish testing on all boards; if a feature cannot be tested, remove it or justify why.

---

## Absolute failure summary

### Failure class A — Unapproved product feature shipped

**3-fold repetition draw** was ported from prototype Lab/HTML into production `FeatureSession` without:

- Explicit human product approval
- Entry in `GPT_PROJECT_RULES_01P.md` / `VISION_05P.md` as a V1 rule
- A “keep vs remove” decision offered to the human first

How it got in: agents treated prototype completeness (Lab matrix, INDEX HTML, chess-like draw rules) as license to copy into production. That violates human ownership of gameplay and Medium/Major approval gates.

**Corrective action this cycle:** feature **removed** from production session code and tests. Prototype may still contain it; production must not.

### Failure class B — Audits that create false confidence

Prior audits repeatedly:

- Grepped for “hangs” and asserted `path.length > 0`
- Ran Easy-only or Lab-only smoke
- Used prototype `.cjs` AI as a stand-in for production `HonestAi.ts`
- Wrote gap lists (“Hard on 16 not gated,” “PvP clock untested”) **without** adding failing Jest + fixing code
- Left shipped UI features half-wired (center On but AI ignore; timers freeze on `aiThinking`; Hard silent-downgrade to Easy)

Green Jest + “audit complete” language while humans rediscovered P0 bugs in ~5 minutes is **pathetic process failure**, not a documentation nit.

### Failure class C — Leaving “open issues” for the human

Statements like:

- “Hard strength on 16 — Extra coverage / Lab breadth”
- “PvP chess-clock shell test — low urgency unless you play with timers”

…are unacceptable when the human has repeatedly said: **agent owns full automated coverage; no open issues; if you cannot test, remove the feature.**

---

## What prior “3 audits” actually did (pattern)

Typical prior audit output:

1. Inventory features and boards
2. Spot gaps in coverage
3. Stop at a report
4. Claim technical verification (Jest green) as if product were healthy

What they did **not** do:

1. Write a failing behavioral test that would catch Easy≠Easy, clock freeze, center ignored, silent Hard→Easy
2. Fix until that test passes
3. Close every listed gap on **all 7 boards** or delete the unverified feature

---

## Corrective work in this cycle (code)

- 3-fold removed from production `FeatureSession` + tests
- Medium ~20% capture-aware soft-miss; Hard 0%; Easy unchanged (~30%)
- Strength gates include **8x4x6** (human-reported Medium≈Hard) and Hard coverage on **16**
- `shellTimerShouldSkip` — clocks tick during `aiThinking`/`animating`; Jest proves shot clock can expire on BLUE for Ivory win
- All 7 product boards: own-bead select, Medium AI reply, reset/New game; Finish on 16 + 6×3×5
- PvP match-timer chess-clock tick asserted

---

## Explainers for human playtest items

### “16 + one small board” smoke

Meaning of the pass criteria:

- Only **own** (current-player) beads selectable; opponent beads inert
- Capture works; optional multi-jump **Finish** ends the turn
- **New game / Play again** resets to a playable opening

Automated now for **all 7** product boards (select + reset + AI reply), plus explicit Finish cases on **16** and **6×3×5**.

### Shot clock during AI

AI often replies in <1s, so humans cannot see a freeze. Agent verification:

- Policy: `shellTimerShouldSkip` ignores `aiThinking`/`animating`
- Session ticks while BLUE to move reduce shot remaining
- Expiry on BLUE awards RED (Ivory) without requiring AI to move

### Medium vs Hard on 8-bead

Human: Easy OK on 6×3×5; Medium≈Hard on 8-bead. Fix: Medium soft-miss ~20%; Hard stays full depth-2; gate Hard > Medium on **8x4x6**.

---

## Recommendation

Do not soft-pedal language in future status docs. Prefer failing tests over narrative confidence. When adding a new failure cycle, append a dated section here or create `GPT_PROJECT_AUDIT_06P.md` — do not scatter audits in subfolders.
