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

**Engine safety cap (unlimited mode only):** when board `maxPlies` is null, **120** completed plies without another end condition → draw (`safety_cap`). Last-resort belt (same order of magnitude as Lab harness) — **not** the product move-limit mode and **not** timer-based.

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

**AI levels (UI):** 1–2–3 only (Casual / Standard / Expert). Levels 4–5 in code pending removal.

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

**Palette — "Seaglass", one single fixed palette (not per-board, not a choice of several):** rail `linear-gradient(165deg, oklch(0.40 0.065 195), oklch(0.28 0.07 198))` ("Darkest" shade, 2026-09-21 — started at a lighter "Deep" shade, darkened same day, kept in sync with the matching page 2 Seaglass Matched board's side panel) with light text (`#eaf5f2`), centre `oklch(0.80 0.045 195)` with dark text (`#14231f`), gold accent `#c9a24a` / soft `#e6ce94`. Applies to hub chrome only. Unrelated to the page 2 board-look picker ("Choose your look" dark/light/matched swatch rows) — that picker is untouched and still selects the actual game board's look on page 2. Replaces the original "Pearl Deep + Gold" flat palette (locked 2026-09-19) — briefly a swatch-picked optional look (added 2026-09-20 alongside a Jade option, both additive), then locked as the sole permanent hub palette 2026-09-21 per human request; the picker and the Jade option were both removed, not just hidden.

---

## 14. Changing a decision

1. Human approves wording here first (**Go — DECISIONS** + section).
2. Implement in `src/` + Jest/WHEN tests must match the **WHEN** sentence.
3. Update `GPT_PROJECT_STATUS_01P.md` integrity row — point to this section; do not restate full recipe.

Forbidden without human approval: new draw rules beyond those locked above, silent AI strength changes, prototype Lab rules ported to production.
