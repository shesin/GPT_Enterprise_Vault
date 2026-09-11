# Smart Bead Chess — Project Rules (01P)

## What this file is

**Extended agent & engineering rules** — detail on top of `.cursor/rules/*.mdc`.  
Read when doing **implementation, verification, audits, or agent workflow** — **not every message**.

**Game/product decisions** (cream vs black, colours, resignation outcomes, turn glow WHEN, etc.) live only in **`GPT_PROJECT_DECISIONS_05P.md`**. Do not duplicate them here.

**Broad mission** → `VISION_05P.md`. **Shipped today** → `GPT_PROJECT_STATUS_01P.md`. **Future work** → `GPT_PROJECT_PENDING_01P.md` (human-owned).

Production gates detail → `VISION/CURSOR_PROMPT_01.md` § SmartBeads Production Gates.

Target: ~1 page.

---

## Rule - Experimental Integrity

Verify the experiment mechanism before using its results for gameplay or board decisions. A test result is not evidence of game quality unless the tested implementation, search depth, randomness, termination, and measurement method are themselves verified.

---

## Rule - Prototype Classification

Design/UX prototypes live outside the production tree (e.g. `prototype/`), may skip full architectural review, and must never share code with the production engine. If a prototype is used for human testing, it must still honour decisions in `GPT_PROJECT_DECISIONS_05P.md`.

---

## Rule - Evidence Before Conclusion

Every conclusion, recommendation, or implementation decision must be supported by repository inspection, execution results, or other verifiable evidence. Do not infer project state from previous conversations or documentation when current repository evidence is available.

---

## Rule - Verification Scope

Distinguish Technical Verification (repository/tests/execution) from Gameplay/UX Evaluation (subjective, requires human review). A green `npm test` / Jest run is not proof the UI or a human two-click path is bug-free.

---

## Rule - Behavioral Gates

AI difficulty, center/timer outcomes, and human-feel bugs need assertions that would fail if the label is wrong (Easy≠Easy). `path.length > 0` / “doesn’t hang” alone is not enough. Production AI Lab must use `HonestAi.ts`, never prototype `.cjs` AI as a substitute.

---

## Rule - No Half Features

If a decision in `GPT_PROJECT_DECISIONS_05P.md` ships in the UI, AI and session must fully honor it with tests. Do not leave evaluate/search ignoring an enabled setting.

---

## Rule - No Silent AI Downgrade

Hard/Medium must not fall back to Easy search on failure; emergency = first legal hop only.

---

## Rule - Clocks Run During AI

Shot/match timers must tick on Ebony’s turn; never freeze the interval while `aiThinking`. (Product timing detail → DECISIONS §6.)

---

## Rule - No Unapproved Product Decisions

Never port prototype Lab/HTML behaviour into `src/` without explicit human approval or text in **`GPT_PROJECT_DECISIONS_05P.md`**. STOP and ask.

Do not add a Jest test that freezes an unapproved decision into the product.

---

## Rule - Audit Completeness

An audit is NOT done when you only list gaps. For every defect affecting shipped play: failing Jest first → fix → pass. Do not mark complete on `path.length > 0` or prose alone. CONFIRMED only with direct observation.

---

## Rule - Code–Doc Integrity (No Contradiction Ship)

**Doc/code mismatch is a ship blocker — not a cleanup nicety.**

When behaviour, termination, UI ids, or verify scripts change, the **same change set** must update together:

1. Production code (`src/`)
2. Locked product text in **`GPT_PROJECT_DECISIONS_05P.md`** (if it is a gameplay rule)
3. **`GPT_PROJECT_STATUS_01P.md`** § Integrity (shipped vs claim)
4. **`PROJECT_MAP_05P.md`** (if paths or ownership change)
5. **`GPT_PROJECT_AUDIT_05P.md`** — supersede stale audit rows; do not leave “removed = safe” while players still hit the gap
6. Jest + Playwright/verify scripts that exercise the behaviour

**Never:**

- Mark a safeguard **removed** in STATUS/AUDIT while a player-facing gap remains (e.g. Watch AI ping-pong with no draw and `maxPlies: null` on all boards).
- Remove a prototype termination rule without an explicit human **keep vs remove** in DECISIONS, a **replacement** termination if removed, and a behavioural test that fails on infinite play.
- Leave verify scripts on stale DOM ids (e.g. `#start-mode-select` after hub move to `#hub-mode-select`) or URLs that skip `?play=1` when the board shell is required.

**Before claiming mismatch work done:** grep docs and `scripts/` for contradictory claims against code and DECISIONS.

---

## Rule - Never Remove Safeguards Without Replacement

Prototype/Lab may include draw caps, repetition, or move limits. Production may differ — but **removal is a product decision**, not an audit cleanup.

Removing any termination safeguard requires **all** of:

- Human-approved text in **`GPT_PROJECT_DECISIONS_05P.md`**
- Proof that remaining engine paths still end every reachable loop (test or explicit move-cap)
- STATUS/MAP/AUDIT updated in the same PR — not “code only, docs later”

If unsure whether removal is safe → **STOP**. Report the live failure mode. Do not “helpfully” delete.

---

## Rule - Human Oracle

When a bug is found by clicking on screen, encode those exact clicks as a Jest test first. Confirm the test FAILS, then fix engine/session/AI — not CSS/layout first.

---

## Rule - Engine Independent of Animation

`SmartBeadsEngine` and `FeatureSession` must be mathematically correct with no renderer. Animation, CSS, and canvas delay must not implement or repair turn, capture, or AI rules.

---

## Rule - Board Fidelity

Model the board using its real intersections and legal connections, including diagonals where the physical board has them. Never substitute an arbitrary square grid.

---

## Rule - Always Show Understanding

Every response from an AI agent must begin with an explicit **Understanding of the Task** summary before continuing execution.

---

## Rule - Git Commit on Request Only

Never execute `git commit` unless explicitly instructed by the user.

---

## Rule - Word-Compatible Output Formatting

Use structured bullet points and bold key-value headers (e.g. `• Item: Description`) rather than wide markdown tables when the user may copy into Word.

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

## Rule - PENDING Human-Owned (Strict)

`GPT_PROJECT_PENDING_01P.md` is **human-owned — read-only for agents**.

- **Never edit** unless the user message includes **`Go — PENDING`** or **`Go —`** with that **exact path** in **Files:**.
- **`push to git all good`** permits **STATUS / MAP** updates only — **not** PENDING.
- No doc sync, cleanup, or “fix stale refs” on PENDING without explicit **Go — PENDING**.

If a task seems to need a PENDING change → **stop and ask** the human.

---

## Rule - Project Documentation Set

| File | Role | Agent may edit |
|------|------|----------------|
| **`GPT_PROJECT_DECISIONS_05P.md`** | Locked game & product decisions | **Go —** + named file |
| **This file** | Agent & engineering rules | **Go —** + named file |
| **`VISION_05P.md`** | Broad principles & mission | **Go —** + named file |
| **`GPT_PROJECT_STATUS_01P.md`** | Shipped & verified today | **`push to git all good`** or **Go —** |
| **`GPT_PROJECT_PENDING_01P.md`** | Human roadmap & risks | **`Go — PENDING`** only |
| **`PROJECT_MAP_05P.md`** | Paths only | **`push to git all good`** or **Go —** |

Agent behaviour: `AGENT_RULE_05P.md`. Audit trail: `GPT_PROJECT_AUDIT_05P.md`.
