# Smart Bead Chess — Project Decisions (05P)

## What this file is

**Single owner for all Smart Bead Chess game and product decisions.**  
If code, UI, or tests disagree with this file, **this file wins** until the human changes it.

Agents read this file **when the task touches gameplay, UI, colours, modes, timers, or player-facing behaviour** — not on every message.  
`.mdc` rules point here; they do not duplicate decisions.

**Not in this file:** agent/engineering process → `GPT_PROJECT_RULES_01P.md`. Broad mission → `VISION_05P.md`. What is built today → `GPT_PROJECT_STATUS_01P.md`. Future / open work → `GPT_PROJECT_PENDING_01P.md` (human-owned — agents do not edit).

Target: ~5 pages. One **WHEN** sentence per behaviour where timing matters.

---

## 1. Bead sides & labels

| Internal | Player-facing | Panel default |
|----------|---------------|---------------|
| `RED` | **Cream** bead (human in PvE) | You / cream camp **bottom** on canvas |
| `BLUE` | **Black** / ebony bead (AI in PvE) | AI / black camp **top** |

User copy uses **cream** and **black bead** — not P1/P2/RED/BLUE in modals or timer reasons.

---

## 2. Capture optionality

Capturing is **optional**. During a capture sequence, human or AI may continue any legal consecutive capture or **voluntarily end** after a legal jump via **Finish capture** (controls row; hidden until mid-chain). Tap elsewhere does **not** end the chain. Applies to every board and player type. AI continue-vs-stop policy is implementation only — never a gameplay rule.

---

## 3. Resignation

Either player (human or AI) may resign **during their own turn**.

- Opponent **agrees** → match ends in a **Draw**.
- Opponent **declines** → resigning player **Loses**.

Same protocol whether resigning or responding side is human or AI.  
Resign **modal** buttons: dashed vs solid styling (not red/green-only) for colorblind safety.  
Resign **shell button**: gold background, red border, subtle red hover inset.

---

## 4. Match end & victory

Three configurable end modes: move-limit, time-limit, unlimited — never hardcode one mode.

**Engine elimination / stalemate:** standard engine paths.

**On configured limit (timer expiry hierarchy):**

1. Total captures — most wins.
2. Center tiebreak — per active center rule (Off / End-game / Cumulative).
3. Draw — if still tied.

Draw is legitimate — not a failure to engineer away.

**Three-fold repetition:** same position (board occupancies + side to move + open chain state) occurring three times ends the match in a draw. Applies uniformly to PvE, PvP, and Watch AI vs AI.

**Engine safety cap (unlimited mode only) — changed 2026-10-01 (Shekhar):** when board `maxPlies` is null, a game with no other end condition stops after **120 completed turns total on the small boards (6x4, 6x3x5, 7x4x5)** and **240 total (120 per side) on the larger boards (8x4x6, 10x5, 12x6x5, 16)** (`engineSafetyCapForVariant`). At the cap the side with **more captures wins** (`safety_cap_captures`); if captures are tied, the **centre rule (when on) decides**; only if still tied is it a **draw** (`safety_cap`). Same order as match-timer expiry. Previously: a flat 120-ply draw even when one side was far ahead (evidence: `GPT_PROJECT_AUDIT_05P.md` § "AI review 2026-10-01"). Last-resort belt — **not** the product move-limit mode and **not** timer-based.

**Centre rule only with a match timer (Shekhar, 2026-10-01):** the Centre Rule setting exists only when a shared match timer is selected. `normalizeTimerSettings` forces `centerRule: 'off'` when the timer is off (and it stays off under the HvH tournament timer); the settings screen disables the Centre Rule dropdown and resets it to Off while the timer is Off. The AI's centre evaluation weight is `CENTER_EVAL_WEIGHT = 1` (tie-breaker only; the timer-urgency boost still makes centre decisive near expiry).

**AI repetition steer:** `HonestAi` applies a soft eval penalty when a candidate turn would revisit an already-seen position (Lab-aligned). Does not forbid the legal third repeat — engine draw still owns termination.

---

## 5. Center rule

| Mode | Meaning |
|------|---------|
| **Off** | No center tiebreak |
| **End-game** | Who holds more center seats at end wins on tie |
| **Cumulative** | Center seats counted across completed turns |

**Defaults:** `centerRule: 'off'` on all 7 V1 boards (End-game/Cumulative selectable per catalog).  
**Tournament timer (HvH):** centre forced **off**.  
Cumulative accrues each **completed turn** in session.

---

## 6. Timers & clocks (shipped local)

**Defaults (all 7 boards):** match timer off, tournament timer off, shot clock off. Timer option `'3'` available; default stays off.

| Layer | Behaviour |
|-------|-----------|
| **Timer** | Shared match clock (all modes); expiry → captures → centre → beads → draw |
| **Tournament timer** | HvH per-player chess clocks; flag fall = instant loss; centre off; mutually exclusive with shared timer in UI |
| **Shot clock** | Per-turn limit; expiry on active player = loss; ticks **during AI think** |

**PvE frozen:** do not change PvE timer UI/behaviour without explicit human go. Clocks tick on Ebony’s turn.

---

## 7. Match-start bead highlight (idle opening only)

**WHEN:** At **idle match start** (no selection, no chain, not animating) until **first pick** of the game.

**What shows:**

- Current player’s beads: **orange ring** (cream / RED) or **lime ring** (black / BLUE).
- Gentle **pulse** on those beads during this flash only.
- Opponent beads **dimmed to 72%** during this flash only.
**Board canvas:** fixed **cream half tint** on the cream-camp side every frame — **no** turn-based wash swap (no blue/dark half flip).

**Clears** on first pick or move and **does not return** on later turns. Mid-chain: chain piece only; no full-board flash. Deselect/re-select: rings stay off.

**Re-arms** only on **New game / reset** (`turnStartRingsPending`).

Coach, Watch AI, resign demo, win glow: use **`previewScriptedSelection`** — same rings as human tap, not separate coach-only flags.

---

## 8. Move & selection colours (board canvas)

| State | Cream (RED) | Black (BLUE) |
|-------|-------------|--------------|
| Idle turn-start flash | Orange ring | Lime ring |
| Selected bead | Orange ring | Lime ring |
| Legal landing square (with selection) | Orange ring | Lime ring |
| Last-move from/to (non-captured) | Orange ring | Lime ring |

All beads draw at **radius 16** (no selected size bump). Opponent beads **inert** — not clickable.

Center nodes: thin ring, same muted gold as the board's grid lines, under center scoring nodes (all 7 boards) — deliberately subtle, not a bright accent.

---

## 9. Starter & game flow (local)

**Two pages:** Page 1 hub → Page 2 live board (same URL, shell swap). **New game** (non-coach) returns to Page 1.

**Hub modes (Page 1):** Play vs AI · Watch AI vs AI · Play with a Friend (Same Device) · Play with a Friend (Online — disabled until Phase 2). Mode tiles launch directly; no Start on hub.

**Starter policy:** Human (cream) **first** on start overlay / new match. **New game / Play again** alternates opener in PvE. Board switch returns to start overlay with human first (does not consume alternation counter).

**Watch AI inter-move pause:** **5s** after each animated move on **all shipped V1 boards** (6–16 beads). **10s** reserved for future larger boards only.

---

## 10. Shell & control colours

| Control | Decision |
|---------|----------|
| **BGM ▶ Play** | Field green gradient `#72bf77` → `#4caf50` |
| **BGM ⏸ Pause** | Gold (`var(--gold)`) |
| **Resign** | Gold bg, red border (see §3) |
| **Finish capture** | **Same colours as Resign** (gold bg, red border, red hover inset); controls row after Resign; hidden until mid-chain |

Game mode: chosen on hub or start overlay — **not** duplicated in Page 2 settings panel.

**AI levels (UI):** 1–2–3 only (Casual / Standard / Expert). Levels 4–5 fully removed (confirmed 2026-09-29 — no code path exists; see `GPT_PROJECT_STATUS_01P.md` § Integrity).

---

## 11. Game modes

| Mode | Behaviour |
|------|-----------|
| **PvE** | Human = cream; AI = black; human acts on RED turns only |
| **PvP (same device)** | Both humans; alternating turns |
| **Spectate / Watch AI** | Two AIs; `previewScriptedSelection` before each hop |
| **Coach** | Watch-only lesson; same highlight path as live pick |

---

## 12. 16-bead board geometry (visual standard)

Central 5×5 matches 10-bead width prominence (~70% vertical play height). Wing caps: compact ~50% row height; apex at `c3`; collinearity preserved on wing junctions. Canvas reference 560×796; central grid ~472×472. See `Board16Sholo.ts` + STATUS for verified dimensions.

---

## 13. Hub layout & chrome palette (Page 1)

**Locked 2026-09-19, shipped 2026-09-20.** Chess.com-style layout — density/card-layout/left-rail style only; content and features stay ours, not a clone.

**Left rail:** brand block → Play (current page) → Community → Tournament → Review (opens a same-width slide-out panel, "coming soon" placeholder) → spacer → Help & Support, Player Profile (disabled placeholders — no backend yet, see §13.1 in `GPT_PROJECT_PENDING_01P.md`).

**Centre order:** How to play (compact single row) → Choose your look → Choose your board (row 1: 6-bead·3×5, 6-bead·4×4, 7-bead, 8-bead; row 2: 10-bead, 12-bead, 16-bead Classic — both rows the **same tile size**, the earlier "row 1 smaller" sizing was removed 2026-09-24, same human. Tiered ★ badges per the 2026-09-23 D2 fairness ranking in PENDING §5, human-picked tiers: `6x4`=★★★, `7x4x5`/`6x3x5`=★★, `12x6x5`/`8x4x6`=★, `10x5`/`16`=no badge, not flagged as worse) → Choose to play with (renamed from "Play with", 2026-09-24, same human; **single row**, order: Play vs AI, Play vs Friend – Same Device, Play vs Friend – Online, Watch AI vs AI — changed 2026-09-24 from the original 2×2 layout, same human, to fit the whole hero-through-Play-with flow above the fold). **No Start Game button** — mode tiles keep launching directly (§9 above still governs).

**Right rail:** pure ad space, no functional content. (The bottom footer ad was removed 2026-09-24, same human — right rail only now.)

**Palette — "Forest Emerald Gold" green, default of a two-option picker (green/black; superseded "one single fixed palette" below):** locked 2026-09-25, replacing Seaglass. Uniform dark emerald green throughout (rail, centre, cards) — `--hub-page-bg`/`--hub-centre-bg: oklch(28% .11 158)` (`#003711`), rail gradient `linear-gradient(165deg, oklch(32% .10 158), oklch(22% .09 160))`, cards `oklch(34% .11 158 / 92%)` — with light ivory text throughout (`oklch(93% .025 82)`, muted `oklch(70% .025 145)`), gold accent `oklch(72% .105 78)` (`#c99c54`) / soft `oklch(82% .075 82)` (`#ddc08c`), border `oklch(45% .055 95 / 35%)`. Headings (`.hub-title`, `.hub-section-title`) set in Cinzel serif; body stays IBM Plex Sans/Segoe UI. Colour and font values taken from the human-approved "Forest Emerald Gold" candidate compared live in the scratch mockup `hub-theme-mockup.html` (green vs teal vs Seaglass), confirmed against the reference site's own computed styles. Unlike Seaglass, the centre panel is now dark-on-dark (not a light centre with dark text) — every hub surface uses the same dark-bg/light-text pairing. Applies to hub chrome only. Unrelated to the page 2 board-look picker ("Choose your look" dark/light/matched swatch rows) — that picker is untouched and still selects the actual game board's look on page 2. Replaces Seaglass (locked 2026-09-21, itself replacing the original "Pearl Deep + Gold" flat palette locked 2026-09-19) — the teal alternative compared alongside it in the mockup was not chosen and does not ship.

**2026-09-26 supersession — "not a picker" clause reversed, human direction.** A **black** hub-chrome variant was added alongside green, selectable live via two swatch buttons at the top of the left rail (`#hub-page-look-swatches` in `index.html`, wired by `wireHubPageLookPicker()` in `PlayHub.ts`), persisted per-browser in `localStorage` (`sb-hub-page-look`, values `green`/`black`; green remains the default for new visitors). Black values: `--hub-page-bg: oklch(9% 0 0)`, cards `oklch(15% 0 0 / 92%)`, rail gradient `linear-gradient(165deg, oklch(13% 0 0), oklch(6% 0 0))`, text `#ffffff`, gold accent unchanged (`#c9a24a`) for visual consistency with green. **Resolved 2026-09-29 (human direction):** the dark-theme board-look swatches (Classic Green id 1, Ocean Blue id 3, Purple Night id 6 especially) previously read as low-contrast against the black hub card background. Fix: the "Choose your board look" swatch box (`.hub-look-body`) now uses a lighter `--hub-look-box-bg` value (`oklch(34% 0 0)`, was `oklch(19% 0 0)`) under the "Black" theme — the overall hub page/rail/card background is unchanged; only this one box lightened, at `PROJECTS/SmartBeads/src/playtest/web/play-hub.css:71`.

**Simplified 2026-09-29 (human direction):** the three intermediate "lighter black" hub-theme variants (`black-l1`/`black-l2`/`black-l3`) were removed — they were only ever a workaround for the contrast issue above, which is now fixed directly. The picker is back to exactly two options: **Black** (default) and **Green**. `HubPageLook` type, swatch markup, and the three now-dead CSS theme blocks all removed together (`PlayHub.ts`, `index.html`, `play-hub.css`). A visitor with a stale `black-l1`/`black-l2`/`black-l3` value already saved in `localStorage` falls back to green automatically (`readStoredHubPageLook()`'s existing fallback — unchanged).

---

## 13a. Open decisions locked 2026-09-15/18 (moved from PENDING §13, 2026-09-28)

1. **Accounts:** sign-in from day one (not guest + room code only). Hard launch blocker (2026-09-19, human): will not go to market without the full account system (signup/login/profile) — not optional, not deferrable.
2. **Rematch path:** both offered — Page 2 setup again, or instant rematch with same settings.
3. **Host preference:** single VPS (not split static + separate API).
4. **Tournament timer model:** two independent per-player clocks (chess-clock style), each ticking only during that player's own turn — matches the shipped local PvP tournament-timer mechanism (`p1Clock`/`p2Clock`); online work adds server authority over the same model, not a new one.
5. **Shot breach (HvH):** lose on time only — no softer penalty. 120s/90s/60s per the board-fixed table below judged long enough that a real breach means genuinely stalling.
6. **Timers (HvH) — board-fixed table, confirmed locked 2026-09-28:**

   | Board group | Match clock options | Shot clock (fixed) |
   |-------------|---------------------|---------------------|
   | 16, 12-bead | 5 min or 8 min | 120s |
   | 10, 8-bead | 3 min or 5 min | 90s |
   | 7, 6-bead | 2 min or 4 min | 60s |

   Not a Casual/Quick/Standard/Blitz preset menu — fixed and simple, two length options per board-size group, shot clock a single fixed value per group.
7. **Tournament board scope:** all 7 boards for V1 (not 16-bead-only).

---

## 14. Changing a decision

1. Human approves wording here first (**Go — DECISIONS** + section).
2. Implement in `src/` + Jest/WHEN tests must match the **WHEN** sentence.
3. Update `GPT_PROJECT_STATUS_01P.md` integrity row — point to this section; do not restate full recipe.

Forbidden without human approval: new draw rules beyond those locked above, silent AI strength changes, prototype Lab rules ported to production.
