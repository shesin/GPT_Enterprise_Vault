# Smart Bead Chess — Pending Product Plan (DRAFT)

## What this file is (human-owned)

**This is Shekhar’s file.** Agents read it; they do **not** edit it unless the human says **`Go — PENDING`**.

**Everything listed here which is still open — minor or major — and must not ship in the final product (web or Android app) until it is fixed, decided, or explicitly waived by the human.** If it is unresolved, it stays here. When it ships and is verified, it leaves here and goes to **`GPT_PROJECT_DECISIONS_05P.md`** (locked choice) and/or **`GPT_PROJECT_STATUS_01P.md`** (verified today).

**Status:** DRAFT — human approval required before implementation.  
**Scope:** Open roadmap, gaps, risks, polish, and known blockers — online multiplayer, timers (HvH), hosting, tournaments, UX debt, browser sign-off gaps.  
**Does not replace:** **`GPT_PROJECT_DECISIONS_05P.md`** · **`GPT_PROJECT_STATUS_01P.md`** · **`VISION_05P.md`**.

Target: 01P (~2–3 pages, word-friendly)

---

If web and mobile need 2 different solutions/approaches, that must be mentioned and put under **risk** so it can be closed before mobile app development.

**Difference**
None currently — same engine/UI drives both web and the planned Capacitor Android wrap; no separate mobile logic exists yet to diverge.

**risk**
- Touch precision on the 16-bead board (37 nodes, tight spacing) — not yet verified on a real phone/tablet; §10 below already flags "Touch verification on device — Especially 16-bead" but it wasn't linked from here.
- Expert AI think time (up to ~45s on large boards, no "thinking…" indicator) may read as a frozen/dead app on mobile more than on desktop — worth a mobile-specific check when Android work starts.
- Everything fixed by Claude on 2026-09-14/15 (render-crash fix, timer race fix, rewritten chain tests, dead-code removal — full detail in `GPT_PROJECT_AUDIT_05P.md` 5th cycle) is Jest-verified only — no human has watched any of it on a real device or browser yet.

**Open risks (not closed until human sign-off)**

- **Human browser UNCONFIRMED** — turn-colour every-turn flash (`GPT_PROJECT_DECISIONS_05P.md` §7–§8); Jest only.
- **Coach vs live** — lesson playback may not match what players see in a real game in edge cases.
- **No Playwright check** — turn-start flash deselect-not-return and Finish capture mid-chain are not in browser gates; regression would not be caught there.

### Testing needed from you (steps)

1. `npx vite` from the repo root, open localhost:5173.
2. Play vs AI on any board — capture a black bead, confirm no visual glitch (grid lines, board colour) during or after.
3. Watch AI vs AI on the 16-bead board, Expert vs Expert, let a full match play out (times out around 2 min) — confirm the result modal's winner and reason text agree with each other.
4. Same Watch AI setup, but let 2-3 matches play back to back via "Play again" — confirms the timer-expiry fix holds under repeated play, not just once.
5. On any board, get into a multi-jump chain (capture, then another capture available) — confirm "Finish capture" button appears and ends your turn correctly.

*Shipped UI/game choices (turn colour, capture optional, resignation, hub flow, colours, etc.) → **`GPT_PROJECT_DECISIONS_05P.md`**. Verification rows → **`GPT_PROJECT_STATUS_01P.md`**.*

---

## 1. Direction (future — not yet shipped)

**Already locked & shipped** (hub, two-page flow, modes, starter policy, PvE timers frozen, turn colours, shell colours) → **`GPT_PROJECT_DECISIONS_05P.md`** §6–§10. Do not re-decide here.

- **Not static-only.** Ship targets **online Human vs Human** plus vs AI and tutorial — not a download-only or same-device-only product long term.
- **Online HvH (Phase 2):** room/join and timer presets on Page 1 when mode is Human vs Human (Online).
- **Timers (Human vs Human only):** Chess.com-style **per-player match clock** (time runs only on your turn; play fast → save time) **plus** **shot clock** (must move within 60s or 90s each turn). Reject “whole game ends in 3 minutes total” as the main competitive mode — unfair when move counts differ.
- **Timers (Human vs AI — frozen):** Do **not** change PvE timer behaviour or UI. Current local session (match/shot off by default, clocks tick during AI think, catalog toggles in settings) is **approved as-is** — no dual-clock rework, no new presets on Page 2 for vs AI.
- **Tournament:** planned from the start in architecture; **Phase 3** delivery after online rooms work.

---

## 2. Two-page UX

**Shipped layout & flow** → **`GPT_PROJECT_DECISIONS_05P.md` §9** (hub mode tiles launch directly; no Start on hub; `play-board.html` keeps dev start overlay).

### Still pending / polish

- **Chess.com-style hub — SHIPPED 2026-09-20.** See `GPT_PROJECT_DECISIONS_05P.md` §13 (locked spec: palette, left rail, centre order, right rail) and `GPT_PROJECT_STATUS_01P.md` Integrity table (Jest + agent browser check). **UNCONFIRMED** — not yet watched on Shekhar's own screen (see Testing needed list above).
- **Left panel / settings dedup** — hide duplicate mode chrome; settings only on Page 2 or in-game menu (§8 backlog).
- **Human browser pass** — “check everything” on phone/desktop after hub + turn-colour changes.
- **Left rail — account section (2026-09-19)** — Sign Up / Log In / Help & Support / Player Profile (chess.com has this row of 4 at the bottom of its left rail; ours needs the same slot once accounts exist — see §13.1, now a hard launch blocker per human, not optional online-only scope). **Visual placeholders shipped** (2026-09-20, part of the hub above): Review slide-out panel + Help & Support / Player Profile as disabled rail buttons, all "coming soon" — no backend behind any of them yet. Still needs the account/auth system (§4, §13.1) to actually back them before they can go live.
- **Light board side panels — same-hue instead of charcoal (parked 2026-09-19).** Explored replacing charcoal side panels with a colour derived from each light board's own hue (Celadon Jade tried first). Several attempts didn't land: a gradient into the board's darkest tone read as charcoal once the dark end dominated a tall panel; a flat medium tone (`#5FAE87`, picked off a mockup swatch) also didn't match what the human wanted when seen live. Reverted — `playShellThemes.ts` is back to its pre-experiment state, no code changes retained. Needs a fresh approach before resuming, not just another shade of what's been tried. Scope, if resumed: Jade first, then the other 4 light boards once Jade is confirmed live.

### Phase 2 add-ons (Page 1 fields when HvH selected)

**Human vs Human (online)** — **time preset** (see §3), center rule, **Create room** / **Join room**, then **Start match** on Page 2 when connected.

**Tutorial** — Coach lesson from Page 1; when done, return to Page 1 hub.

---

## 3. Timers — Human vs Human only

**Scope:** This section applies to **online Human vs Human** (and tournaments). **Human vs AI is out of scope** — shipped local clocks and settings stay as they are; no preset dropdown, no dual-clock UI rework, no engine/session changes for PvE.

### Two layers (both optional via presets — HvH Page 2)

**Layer A — Match clock (Chess.com model)**

- Each player has their own bank (e.g. 3:00, 5:00, 10:00).
- Clock ticks **only while it is that player’s turn**.
- Reach **0:00** → lose on time.
- UI: **two clocks** — opponent top, you bottom — active clock highlighted.

**Layer B — Shot clock (Smart Bead Chess rule)**

- Each turn must complete within **60s or 90s** (preset-defined).
- Exceed shot limit → **lose on time** (recommended; simple — same as match flag fall).
- UI: small per-turn countdown on active player (ring or numeric); can reuse shot-ring visuals.

**Why both:** Match clock rewards overall speed; shot clock stops stalling when someone hoards bank time.

### Board-fixed timers (LOCKED, 2026-09-18)

Replaces the old Casual/Quick/Standard/Blitz dropdown-preset idea above. Principle: **keep it fixed and simple, not a menu of choices** — match clock offers exactly two length options per board-size group, shot clock is a single fixed value per group (not selectable). 120s/90s judged sufficient turn time for tournament play — no softer shot-breach penalty needed, exceeding it is simply a loss on time (same as match-clock flag fall):

| Board group | Match clock options | Shot clock (fixed) |
|-------------|---------------------|---------------------|
| 16, 12-bead | 5 min or 8 min      | 120s                |
| 10, 8-bead  | 3 min or 5 min      | 90s                 |
| 7, 6-bead   | 2 min or 4 min      | 60s                 |

**Supersedes** the earlier "90s for 16/12/10, 60s for 8/7/6" note — that split and those numbers no longer apply; this table is current. Still marked **needs further discussion** per human — not locked for implementation yet.

### Engine / session note

- **PvE (frozen):** PvP chess-clock tick, shot clock during AI think, and catalog defaults already exist in `FeatureSession` / `clockPolicy.ts` — **leave unchanged**.
- **HvH (work remaining):** dual-clock UI, authoritative **server-side** clock sync for online, preset wiring on Page 2 for online setup only.

---

## 4. Online multiplayer — architecture (required, not static-only)

### Goals

- Two humans, two browsers, one authoritative game.
- Moves, captures, chains, resignation, and **both timer layers** stay in sync.
- Reconnect within a grace window (e.g. 60s) without corrupting state.

### Recommended stack (purchase-friendly)

| Layer | Role | Example providers |
|-------|------|-------------------|
| **Web app** | Page 1 hub, Page 2 setup, canvas client | Cloudflare Pages, Netlify, Vercel, or Nginx on VPS |
| **Game API + WebSocket** | Rooms, moves, clock authority, match lifecycle | Node or Bun on **Railway**, **Fly.io**, **Render**, or **VPS** (Hetzner, DigitalOcean, Linode) |
| **Database** | Users (optional Phase 2b), rooms, games, tournament brackets (Phase 3) | PostgreSQL (managed or on VPS) |
| **Redis** (optional) | Room presence, pub/sub, rate limits | Upstash or VPS Redis |

**Minimum VPS path (one bill):** single VPS — Nginx serves static build + reverse-proxy to game server on same machine. Good when human buys one host and wants simplicity.

### Server responsibilities (authoritative)

- Create/join room by code; validate board + preset + rules.
- Hold canonical `FeatureSession` / engine snapshot (or serialized state).
- Accept move intents; reject illegal; broadcast state + clock updates.
- Run timer ticks server-side (match + shot); declare time forfeits.
- End game; store result for rematch / stats / tournament progression.

### Client responsibilities

- Render board; send clicks as move intents; animate from server ack.
- Never trust client-only clocks for online ranked play.
- Offline / vs AI: keep current local session (no server).

### Phasing

**Phase 2a — Online core**

- Guest or simple account (email magic link — product choice).
- Room code + share URL.
- One board + one preset for beta; expand to all 7 after stable.

**Phase 2b — Polish**

- Reconnect, rematch, basic stats, report/abandon.
- All boards + all presets.

**Phase 3 — Tournament**

- Scheduled events, bracket (single elimination first), server-enforced clocks.
- Requires DB schema: `tournaments`, `entries`, `pairings`, `results`.
- UI: hub card **Tournament** → list → join → same live game shell.

---

## 5. Tournament plan (Phase 3)

### V1 tournament scope (first ship)

- **Single elimination**, fixed board + preset per event (host-configured).
- Player registers before start window; bracket generated at close.
- Each pairing = online room auto-assigned; winner advances.
- Tie / disconnect policy documented (e.g. disconnect timeout = loss if clock expired; else admin replay — keep minimal for V1).

### Not in V1 tournament

- Swiss / round-robin (later).
- Cash prizes / payment (later).
- Cross-region latency guarantees (best-effort).

### Dependencies

- Online Phase 2 stable.
- Persistent identity (even lightweight accounts).
- Admin tool or config file to create events (can be CLI first).

---

## 6. Hosting — what to buy and what we deploy

### Human buys

1. **Domain** (optional but recommended).
2. **Host with Node + DB support** (not static-only if online is in scope) — VPS or Railway/Fly tier that runs 24/7 WebSocket process.
3. **Managed Postgres** (or Postgres on same VPS).

### We deploy

- `vite build` static assets → CDN or Nginx.
- Game server container or process → same provider.
- Env secrets: DB URL, JWT/session secret, CORS origin.
- CI: tests (474+ Jest) on push; deploy on tagged release (human approves).

### Environments

- **Production** — public URL.
- **Staging** — same stack, separate DB; for online/timer QA before prod.

---

## 7. Implementation order (suggested)

1. **Page 1 hub + Page 2 setup** — AI + tutorial (local); online fields stubbed; **no PvE timer changes**.
2. **Dual match clocks + shot UI** — presets on Page 2 for **Human vs Human only**; server sync when online ships.
3. **`vite build` + staging deploy** — client bundle; add game-server host (not static-only).
4. **Game server** — room create/join, move relay, server clocks.
5. **Online HvH beta** — all boards, reconnect, rematch.
6. **Tournament MVP** — single elimination.
7. **Mobile / touch** — viewport, hitboxes (feeds Capacitor Android).

---

## 8. UI polish backlog (remaining)

- **Match timer progress rings (Human vs Human only)** — radial countdown on player panels when match clock is on; low-time pulse (defaults tied to catalog, per the board-fixed timer table in §3: longest banks on 16/12, shortest on 7/6). Shot-clock ring already shipped; this is the **match-bank** ring for online HvH — not PvE timer rework.
- **Session score counter** — track series across rematches (alternating opener already **shipped** — see status).
- **Left panel / settings dedup** — hide duplicate mode and account chrome on hub; settings only on Page 2 or in-game menu.

---

## 8a. Engineering hygiene backlog

- **Dead-code / doc-mismatch sweep (rest of `src/`)** — this session found and removed several unreachable code paths (center-square/center-line rendering, an unused grid-line theme picker, a leftover color-token export) and matching stale doc claims in STATUS/DECISIONS, in the rendering/layout/theme files touched. Extend the same method to the rest of the codebase: grep every reference to a suspect export across `src/` (not just the file it's in), confirm the call path is actually unreachable — trace whether any board/config/setting could ever hit it, not just "grep came back short" — then `tsc --noEmit` clean and the real test suite green after removal, plus a live browser check. **Do not remove anything without that full chain of evidence** — a thin grep result is a lead, not proof by itself.
- **`PlayController.ts` closure split (remainder), 2026-09-22** — a first pass (commit `ebeaa90`) extracted the genuinely decoupled pieces (AI turn runner, board settings panel, start banner controller, select populators, timer display), cutting the file from 2481 to 2049 lines; full detail in `GPT_PROJECT_AUDIT_05P.md`'s 2026-09-22 entry. What's left is one ~1900-line closure (`bootstrapPlayShell`) sharing ~20 mutable variables (`session`, `anim`, `animating`, `aiThinking`, `timerId`, `undoStack`, etc.) across ~70 functions covering coach video playback, animation/move execution, resignation flow, undo, result modal, and DOM event wiring. Fully modularizing it means converting it to a stateful controller (class or explicit shared context object) threaded through every extracted piece — materially larger and higher-risk than the first pass. Needs its own scoped design check-in (class vs. context-object approach) before starting, not a "just keep extracting" continuation.

## 8b. Board selection re-review (evidence check, 2026-09-22 — not acted on)

Human asked whether the shipped 7 V1 boards are actually the best choice, given several alternate geometries were Lab-tested per bead count but never promoted (`prototype/board4/unrejected games/` holds 5 "NEEDS FURTHER TESTING" alternates: 4-bead 3×5 rear, 7-bead 4×4 dense, 7-bead 5×5, 8-bead 5×5, 12-bead 5×7; several more geometries across other bead counts were `REJECT`ed in the same discovery-round JSON files under `prototype/board4/`).

**Governance note:** `VISION_05P.md` locked the current 7 in 2026-08 and states "do not reopen board selection unless a genuine Lab or gameplay failure is found." This review is evidence-gathering only — no board has been swapped, and nothing here should be read as license to change the catalog without a fresh explicit go.

**What was checked so far (one comparison only):** shipped 12-bead·6×5 vs. pooled 12-bead·5×7, using the same-day same-protocol Lab run (`LAB_EVALUATION_9_7_5_12_4_BEAD_SET.json` vs. `LAB_EVALUATION_5_7_8_10_12_BEAD_COMPACT_SET.json`, both 2026-08-17). The composite "score" ranked the pooled board higher, but that gap was driven almost entirely by a first-player-advantage figure computed from 2–7 winners out of 90 games per side — below the project's own documented ≥10-winner threshold for a meaningful fairness comparison. On metrics with adequate sample (avg captures, avg game length), the two boards were nearly identical. Neither board — nor any tested alternative sampled — ever reached a `KEEP` verdict; all sit at `NEEDS FURTHER TESTING` or `REJECT`, same status as the shipped set itself.

**Not yet done:** the same side-by-side for the other bead counts (7-bead, 8-bead, 4/5-bead) against their respective pooled alternatives — would need to work through the remaining `LAB_EVALUATION_*.json` files in `prototype/board4/` the same way. No conclusion reached yet on whether any pooled board is actually better; the one comparison done did not find solid evidence of that for 12-bead.

**Real gap this surfaced (not a board-choice bug):** human playtest confirmation was never completed/logged for the V1 board choices — that predates and is independent of this review; see the Testing needed list and Open risks near the top of this file.

---

## 9. Launch checklist (web)

| Task | Owner | Notes |
|------|-------|--------|
| Human playtest, all 7 boards | Shekhar | `npm run web:smartbeads`; feel/balance — human sign-off only |
| Bugs from playtest | Shekhar + implementer | Failing test before fix |
| `vite build` production script | Implementer | Client static bundle |
| Choose host (VPS / Railway + domain) | Shekhar | Must run **game server**, not static-only |
| Deploy client + API + DB | Implementer | Staging then prod; smoke-test live URL |
| Live smoke vs local | Shekhar | CONFIRMED in browser only |

---

## 10. Android app (V1 — after web hub stable)

Capacitor wrap **confirmed** (not native WebView bridge).

| Task | Owner | Notes |
|------|-------|--------|
| Install Capacitor + Android platform | Implementer | |
| Touch verification on device | Shekhar confirms | Especially 16-bead |
| Phone layout pass | Implementer + Shekhar | Same viewport goals as web mobile item |
| Icon, splash, package ID | Shekhar assets; implementer wires | |
| Signed .aab + keystore backup | Implementer; **Shekhar keeps keystore** | Loss = cannot update listing |
| Play Console listing, privacy, rating | Shekhar | |
| Google review | Google | 1–3 days |

**Out of V1 Android scope:** haptics, offline match persistence, native WebView bridge.

---

## 11. Coach teaching video — optional polish (approved backlog, not scheduled)

Video 1 basics (**7-bead**, ~3 min) shipped in code — see `GPT_PROJECT_STATUS_01P.md`. Optional next steps — **need explicit go**:

1. **Highlight active panel bullet** during playback.
2. **~2s hold after each demo move** before the next snap.

**Video 2 (timers, shot clock, centre rules)** — planned separate ~2–3 min video; not started.

Not the same as **Watch AI** (spectate). Not the long-term **AI Coach** vision below.

---

## 12. Future learning (vision — not scheduled)

AI Coach, match analysis, replay, tactical explanations, pattern recognition, progress tracking — after tutorial + online core. Teach understanding, not memorization (`VISION_05P.md` Learning Philosophy).

---

## 13. Open decisions — all LOCKED (2026-09-15/18)

1. **Accounts:** sign-in from day one (not guest + room code only). **Hard launch blocker (2026-09-19, human):** will not go to market without the full account system (signup/login/profile) — not optional, not deferrable to a later phase.
2. **Rematch path:** both offered — Page 2 setup again, or instant rematch with same settings.
3. **Host preference:** single VPS (not split static + separate API).
4. **Tournament timer model:** two independent per-player clocks (chess-clock style), each ticking only during that player's own turn — matches the already-shipped local PvP tournament-timer mechanism in `FeatureSession` (`p1Clock`/`p2Clock`); online work adds server authority over the same model, not a new one.
5. **Shot breach (HvH):** lose on time only — same rule a shot clock always meant; no softer penalty. 120s/90s/60s (per §3 board-fixed table) judged long enough that a real breach means genuinely stalling, not a harsh cutoff.
6. **Timers (HvH):** the board-fixed table in §3 (not a Casual/Quick/Standard/Blitz preset menu).
7. **Tournament board scope:** all 7 boards for V1 (not 16-bead-only).

Nothing left open here — online HvH build can proceed on these once ready to start.

---

## 14. Doc ownership

| File | Holds |
|------|--------|
| `GPT_PROJECT_DECISIONS_05P.md` | **Locked game & product decisions** (single owner) |
| `GPT_PROJECT_RULES_01P.md` | Agent & engineering rules |
| `GPT_PROJECT_STATUS_01P.md` | **Done / verified only** |
| `GPT_PROJECT_PENDING_01P.md` | **This file — open roadmap, gaps, risks** |
| `VISION_05P.md` | Broad principles & mission — no locked recipes |

When work ships: update **DECISIONS** (if new locked choice) + **STATUS** (verification). Remove shipped items from here. Do not duplicate decision recipes in status, vision, or pending.

---

*Draft maintained: 2026-08-30 (timer scope: HvH only; PvE frozen). Owner: human product decision.*
