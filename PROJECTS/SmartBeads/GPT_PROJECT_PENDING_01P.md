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

**Shipped layout & flow** → **`GPT_PROJECT_DECISIONS_05P.md` §9** (hub mode tiles launch directly; no Start on hub).

### Still pending / polish

- **Chess.com-style hub — SHIPPED 2026-09-20.** See `GPT_PROJECT_DECISIONS_05P.md` §13 (locked spec: palette, left rail, centre order, right rail) and `GPT_PROJECT_STATUS_01P.md` Integrity table (Jest + agent browser check). **UNCONFIRMED** — not yet watched on Shekhar's own screen (see Testing needed list above).
- **Left panel / settings dedup** — hide duplicate mode chrome; settings only on Page 2 or in-game menu (§8 backlog).
- **Human browser pass** — “check everything” on phone/desktop after hub + turn-colour changes.
- **Left rail — account section (2026-09-19)** — Sign Up / Log In / Help & Support / Player Profile (chess.com has this row of 4 at the bottom of its left rail; ours needs the same slot once accounts exist — see §13.1, now a hard launch blocker per human, not optional online-only scope). **Visual placeholders shipped** (2026-09-20, part of the hub above): Review slide-out panel + Help & Support / Player Profile as disabled rail buttons, all "coming soon" — no backend behind any of them yet. Still needs the account/auth system (§4, §13.1) to actually back them before they can go live.
- **Player reviews — the plan to actually learn if boards feel fair (2026-09-23, human).** Rather than a one-off formal playtest for board-fairness questions like the `16`-bead concern in §8b, the human wants the **Review feature itself** to be the ongoing signal: once real players are using the product, their reviews (ideally per-board, not just whole-product) become the ground truth for whether a board plays well or feels biased — something AI self-play stats can suggest but not confirm. For that to actually work, when Review ships past its current placeholder it needs to be: **(1) visible** — not buried, easy to find and use from the hub, not a disabled "coming soon" button; **(2) inviting** — presented well enough that players actually bother to write something, not just a bare textbox; **(3) fast to read in aggregate** — the human (or a future agent) needs to be able to glance at a few weeks of reviews and get a real signal on each board, not re-read every review by hand. This is a product requirement for the Review feature build (§13.1/§4 account-system dependency still applies — reviews need at least lightweight identity to prevent spam), not a new separate feature. **Not scheduled yet** — needs its own design pass once accounts land; flagging the requirement now so it isn't designed as a generic "leave feedback" box that misses this specific purpose.
- **Light board side panels — same-hue instead of charcoal — RESOLVED 2026-09-24, no longer pending.** Originally parked 2026-09-19 (see git history for that attempt's notes); overtaken by a bigger decision the same day (2026-09-24) to remove the charcoal side-only option entirely, for every board, not just the 4 light ones — see DECISIONS §13. Every board (light and dark) now pairs with its own same-hue side panel by default; there is no remaining "same-hue instead of charcoal" work to resume, since there's no charcoal left to replace.

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
- **`PlayController.ts` closure split (remainder), 2026-09-22** — a first pass (commit `ebeaa90`) extracted the genuinely decoupled pieces (AI turn runner, board settings panel, start banner controller, select populators, timer display), cutting the file from 2481 to 2049 lines; full detail in `GPT_PROJECT_AUDIT_05P.md`'s 2026-09-22 entry. A second pass (same day, PENDING §8a item 2) extracted two more narrow controllers following the same `createXController(elements, deps)` factory pattern: `feature/resignationController.ts` (owns `pendingResignPlayer` state; `canOfferResignation`/`beginResignation`/`finishResignation`/pending-offer getters) and `feature/undoController.ts` (owns the `undoStack`; `pushSnapshot`/`undo`/`reset`/`syncButtonState`). `PlayController.ts` is now 1993 lines. What's still left in `bootstrapPlayShell` — coach video playback (`coachVideoPlayer`/`coachVoice`/`syncCoachVideoCue` etc.), move animation/execution (`playAnimated`, `executeMoveAnimated`, `drawBoard`), and result-modal rendering — was evaluated and judged too entangled to extract safely in this pass: `syncCoachVideoCue` alone re-implements a large chunk of the same game-over/result-modal rendering `updateUI` does (winner/score-line text, modal show/hide, sound cues), and `initCoachVideoPlayer`/`playAnimated` directly read and mutate `anim`, `animating`, `turnCaptures`, and `session` — the same shared state the main game loop uses. Pulling coach video out cleanly would mean either duplicating that result-rendering logic into the new controller (a second source of truth) or first factoring out a shared result-renderer helper — that's its own scoped follow-up, not a mechanical extraction like the two done here. tsc clean and the two targeted Jest files (`PlayController.test.ts`, `processRegressionGuards.test.ts`) green after each extraction; full suite + browser smoke check (new game, a move, undo, resign) also confirmed green.

## 8b. Board selection re-review (evidence check — 2026-09-22 preliminary, 2026-09-23 full production-grade pass)

Human asked: are all our selected boards good (excl. 16 — "standard"), on 3 criteria — (1) not breaking, (2) 1st/2nd-player bias, (3) playable/good — and if any pooled/rejected alternative looks better than the shipped board of the same bead count. This section reports the full 6-board evidence pass. **No board has been swapped, removed, or promoted — this is evidence-gathering only**, per the Governance note below.

**Governance note (kept):** `VISION_05P.md` "V1 product boards (locked)" states: **"Locked 2026-08. Do not change this set unless a genuine Lab or gameplay failure is found"** and **"Do not reopen board selection unless a genuine Lab or gameplay failure is found."** This review found no genuine Lab or gameplay failure on any of the 6 boards checked (detail below) — the locked set stands.

### Critical evidence-tier finding (why this pass exists)

The 2026-09-22 preliminary check above (and all 3 `LAB_EVALUATION_*.json` files in `prototype/board4/`) used the **prototype `.cjs` AI engines**, never `HonestAi.ts`. Per `GPT_PROJECT_RULES_01P.md` "Rule - Behavioral Gates": *"Production AI Lab must use HonestAi.ts, never prototype .cjs AI as a substitute."* So a fresh production-grade run was required for the actual per-board verdict. A new reusable script, `PROJECTS/SmartBeads/scripts/lab-board-fairness-eval.mjs`, generalizes the single-board pattern in `lab-ai-difficulty-eval.mjs` to loop self-play fairness/playability across all 6 shipped non-16 boards, using the real `SmartBeadsEngine` + `HonestAi.selectAiTurnPath`, both sides at the same AI level per match (a board-fairness read, not an AI-difficulty read), BLUE always moving first. Raw results: `PROJECTS/SmartBeads/prototype/board4/PRODUCTION_LAB_FAIRNESS_2026-09-23.json`.

**Evidence tiers — do not blend:**
- **Tier A (production-grade, this pass):** shipped-board verdicts below — `HonestAi.ts` + `SmartBeadsEngine`, D1/D2/D3 (levels 1/2/3), D1=90 games, D2=100 games, D3=24 games per board (D3 sample intentionally smaller — VISION_05P.md: D3 is secondary long-horizon evidence only, never ranked; D2 is primary and gets the largest N).
- **Tier B (prototype-engine, pre-existing data):** the "better alternative?" comparison — same prototype `.cjs` engine used consistently within each `LAB_EVALUATION_*.json` file (apples-to-apples *within* that tier), but **not comparable to Tier A numbers**. Any "alternative looks better" reading from Tier B is a *lead for a follow-up production-grade test*, not proof.

### 1–3. Per-board verdict (Tier A, production HonestAi)

Method per board: `npx tsc --noEmit -p tsconfig.json` (repo-wide, once — see Verification below), the board's Jest suites (geometry + prototype-parity + catalog/smoke tests), a live browser smoke pass (`npm run web:smartbeads`, moves + capture check, console-error check), then the fairness/playability self-play run.

| Board | Not breaking | D2 fairness (primary) | D2 playability | Concern? |
|---|---|---|---|---|
| `6x4` (6-bead·4×4) | ✅ tsc clean, 2 Jest suites green, browser: move+AI double-capture, 0 console errors | FPA **−17.5pp** (BLUE 40/RED 57/draw 3, 97 winners) — fair, well inside ±35pp gate | 97% resolve by elimination, 3% legit repetition-draw, 0% move-cap; avgPlies 46.2, avgCaptures 8.77 | None |
| `6x3x5` (6-bead·3×5) | ✅ tsc clean, 2 Jest suites green, browser: moves accepted, 0 console errors (no capture arose in the short smoke sequence — capture path already covered by `Board6x3x5PrototypeParity.test.ts`) | FPA **−19.6pp** (39/58/3, 97 winners) — fair | 97% elimination, 3% repetition-draw, 0% move-cap; avgPlies 51, avgCaptures 8.53 | None |
| `10x5` (10-bead·5×5) | ✅ tsc clean, 2 Jest suites green, browser: move+AI capture, 0 console errors | FPA **−20pp** (36/54/10, 90 winners) — fair | 90% elimination, 4% repetition-draw, 6% move-cap-draw; avgPlies 73.2, avgCaptures 15.46 | None |
| `12x6x5` (12-bead·6×5) | ✅ tsc clean, 2 Jest suites green, browser: move+AI capture, 0 console errors | FPA **−17.6pp** (35/50/15, 85 winners) — fair | 85% elimination, 1% repetition-draw, 14% move-cap-draw; avgPlies 80.6, avgCaptures 19.23 | Lowest resolve-rate of the 6 (still a clear majority) — expected: largest/slowest-resolving board by bead count, consistent with VISION's "interpret move-cap relative to board size," not a red flag |
| `8x4x6` (8-bead·4×6) | ✅ tsc clean, 2 Jest suites green, browser: move+AI double-jump capture (2 captures), 0 console errors | FPA **−19.6pp** (37/55/8, 92 winners) — fair | 92% elimination, 0% repetition-draw, 8% move-cap-draw; avgPlies 66.7, avgCaptures 12.19 | None |
| `7x4x5` (7-bead·4×5) | ✅ tsc clean, 2 Jest suites green, browser: move+AI capture, 0 console errors | FPA **+18.3pp** (55/38/7, 93 winners) — fair, only board favoring BLUE(P1) at D2 | 93% elimination, 5% repetition-draw, 2% move-cap-draw; avgPlies 54.8, avgCaptures 10.29 | See root-cause note below (not a failure — still inside gate) |

Repo-wide baseline: `npx tsc --noEmit -p tsconfig.json` → **0 errors**. Board-relevant Jest: 15 suites / 203 tests, all green (`Board6`, `Board6x3x5`, `Board10x5`, `Board12x6x5`, `Board8x4x6`, `Board7` + their `*PrototypeParity` suites, `BoardCatalog.test.ts`, `allBoards.smoke.test.ts`, `v1GeometryCaptureAudit.test.ts`). No production code changed by this pass, so the full suite wasn't required by the project's own testing-scope rule; not run.

**No stalemate endings occurred in any of the 1,284 self-play games run** (D1+D2+D3 × 6 boards) — every decisive game ended by `elimination`; every draw was either `repetition` (threefold) or the engine's own `safety_cap` (120-ply, `ENGINE_SAFETY_MAX_PLIES`). Noted as an observation, not a concern — `getLegalMoves().length === 0` stalemate is exercised directly by the geometry/parity Jest suites.

### Cross-board pattern (root-cause reading, not a per-board defect)

- **D1 (greedy sanity, not primary):** BLUE(P1) favored on 4/6 boards (+19 to +29pp), perfectly even on 2 (`6x3x5`, `10x5` at 0pp). Expected — D1 has no search, so the mover-first tempo advantage dominates. Matches VISION's framing of D1 as "a greedy sanity check, not the primary selection depth."
- **D2 (primary):** a consistent **RED(P2) edge of −17.5 to −20pp on 5 of the 6 boards**, despite very different geometries (4×4, 3×5, 5×5, 6×5, 4×6) — this uniformity points to a trait of the 1-reply-ply search/eval itself (the same `HonestAi.ts` code path runs for both sides at D2), not a per-board geometry defect. All 5 are still comfortably inside the ±35pp gate. **`7x4x5` is the outlier**, flipping to +18.3pp (P1 favored) — it's also the only odd-bead-count board of the 6 (the other 5 are 6/6/8/10/12, allowing a fully symmetric even camp split; 7 does not), which is a plausible geometry-driven explanation for why it alone breaks the pattern. This is a hypothesis worth a closer look, not a proven root cause, and it does not change the verdict (still fair, inside gate).
- **D3 (secondary, small n by design — never ranked per VISION):** noisy as expected (13–20 winners out of 24 games; `7x4x5` D3 only reached 8 winners, below the 10-winner read threshold, flagged in the raw data). Not used for any verdict above.

### 4. Compare against pooled/rejected alternatives (Tier B — prototype-engine, leads only)

| Shipped board | Bead count | Alternative(s) tested (Tier B) | Tier B verdict | Materially better than shipped? |
|---|---|---|---|---|
| `6x4`, `6x3x5` | 6 | **None fully evaluated.** `6_BEAD_5x5` appears only as a `dropped` entry in `LAB_EVALUATION_5_7_8_10_12_BEAD_COMPACT_SET.json` ("sparse empty ends, ~48% occupancy") — never Lab-run. | n/a | No data to compare — gap noted, not a finding either way |
| `7x4x5` | 7 | `7_BEAD_4x4_DENSE` (NEEDS FURTHER TESTING): D2 elimination 23.3%, FPA −35.7pp on 21 winners (near the fairness gate). `7_BEAD_5x5` (NEEDS FURTHER TESTING): D2 elimination **0%** — 100% move-cap draws, no winners at all, no fairness read possible. | Neither reaches `KEEP` | **No** — both resolve far worse than shipped `7x4x5`'s 93% elimination rate (Tier B numbers are on the weaker prototype AI, so resolution-rate gap isn't fully apples-to-apples, but even allowing for that, `7_BEAD_5x5` never resolving a single D2 game under any engine is a meaningfully worse signal) |
| `8x4x6` | 8 | `8_BEAD_4x6_HOURGLASS` (NEEDS FURTHER TESTING): D2 elimination 2.2%, only 2 winners — no meaningful fairness read. `8_BEAD_5x5` (NEEDS FURTHER TESTING): D2 elimination 1.1%, 1 winner. `8_BEAD_5x4` (**REJECT**, `g2_fairness_fail`): D2 FPA −50pp on 61 winners — decisively unfair. | Best case NEEDS FURTHER TESTING, one REJECT | **No** — the only alternative with an adequate sample is fairness-REJECTed; the others barely resolve under the prototype engine |
| `10x5` | 10 | `10_BEAD_4x6_HOURGLASS` (**REJECT**, `g2_fairness_fail`): D2 FPA −30pp on only 5 winners (both underpowered and rejected). `10_BEAD_6x5` ("wide buffer") appears only as a `dropped` entry, never fully run. | REJECT | **No** |
| `12x6x5` | 12 | `12_BEAD_5x7` (NEEDS FURTHER TESTING): D2 elimination 2.2%, 2 winners. `12_BEAD_MINIWING` (**REJECT**, `g2_fairness_fail`): D2 elimination 3.3%, FPA +50pp on 3 winners. `12_BEAD_4x7_HOURGLASS` (**REJECT**, `g2_fairness_fail`): D2 elimination 3.3%, 3 winners. Even the *exact same geometry* run under the prototype engine (`12_BEAD_6x5`) only reached 7.8% D2 elimination (7 winners) — vs. **85%** under production `HonestAi` on the identical board. | Two REJECTs, one underpowered NEEDS FURTHER TESTING | **No** — and this comparison is the clearest illustration of the Tier A/B gap: the prototype engine barely ever finishes a game on *any* 12-bead geometry (2.2–7.8% elimination across all four), which is also why the 2026-08-17 comparison already logged below was flagged as underpowered |

**Conclusion on alternatives:** across all 6 boards, no pooled/rejected alternative shows a materially better fairness or playability signal than its shipped counterpart. Where a fairness read is even possible under the prototype engine, it's either a `REJECT` (worse) or drawn from a winner count far below the project's own ≥10 threshold. 6-bead has no alternative data to compare at all. Nothing here rises to "a genuine Lab or gameplay failure" for the locked set.

### 2026-08-17 preliminary comparison (superseded by the Tier B table above, kept for history)

**What was checked (one comparison only, prototype-engine, same caveat as Tier B above):** shipped 12-bead·6×5 vs. pooled 12-bead·5×7, using the same-day same-protocol Lab run (`LAB_EVALUATION_9_7_5_12_4_BEAD_SET.json` vs. `LAB_EVALUATION_5_7_8_10_12_BEAD_COMPACT_SET.json`, both 2026-08-17). The composite "score" ranked the pooled board higher, but that gap was driven almost entirely by a first-player-advantage figure computed from 2–7 winners out of 90 games per side — below the project's own documented ≥10-winner threshold for a meaningful fairness comparison. On metrics with adequate sample (avg captures, avg game length), the two boards were nearly identical. Neither board — nor any tested alternative sampled — ever reached a `KEEP` verdict; all sit at `NEEDS FURTHER TESTING` or `REJECT`, same status as the shipped set itself. The 2026-09-23 full pass above confirms this finding and extends it to all 6 boards.

**Real gap this surfaced (not a board-choice bug):** human playtest confirmation was never completed/logged for the V1 board choices — that predates and is independent of this review; see the Testing needed list and Open risks near the top of this file.

### 5. Ranked comparison, all 7 boards including 16 (2026-09-23, added on human request)

Human asked for 16-bead to be added for comparison even though it was excluded from the original check (it's the "standard" board). Ran the same Tier A production `lab-board-fairness-eval.mjs` harness against board `16`. D1+D2 completed; D3 was stopped early on human instruction (20/24 games in progress) — not a problem, D3 is secondary and never used to rank per `VISION_05P.md`. **Note:** because the run was stopped before completion, the script's final `writeFileSync` never ran, so — unlike the 6-board file — there is no separate structured JSON for board `16`; the numbers below are transcribed directly from the run's own console output, saved verbatim as evidence.

**Ranking method (simple, transparent, not an official score):** sort by D2 `|FPA|` (fairness, smaller = better) first, D2 resolve rate (elimination%, higher = better) second — both explicitly *not* the raw-win%/move-cap% ranking `VISION_05P.md` warns against; this is the two criteria the human asked to judge on (bias, and "not win or lose also bad").

| Rank | Board | D2 FPA | D2 resolve rate | Move-cap "no result" | Note |
|---|---|---|---|---|---|
| 1 | `6x4` | −17.5pp | 97% | 0% | Best of all 7 |
| 2 | `6x3x5` | −19.6pp | 97% | 0% | |
| 3 | `7x4x5` | +18.3pp | 93% | 2% | Only board favoring P1; still mid-pack overall |
| 4 (tie) | `12x6x5` | −17.6pp | 85% | 14% | Second-lowest bias, worst resolve rate of the 6 |
| 4 (tie) | `8x4x6` | −19.6pp | 92% | 8% | |
| 6 | `10x5` | −20pp | 90% | 6% | Weakest of the 6 shipped-and-cleared boards |
| **7** | **`16`** | **−42.9pp** | **21%** | not yet broken out (79% draw incl. move-cap+repetition) | **Outside the ±35pp fairness gate — worst of all 7 by a wide margin** |

**`16` detail:** D1 (n=90): Blue 25 / Red 26 / Draw 39, FPA −2pp. D2 (n=100): Blue 6 / Red 15 / Draw 79, FPA **−42.9pp**. Only 21/100 D2 games had a winner — below the project's own ≥10-per-side confidence bar on the Blue (P1) side specifically (6 winners), though Red (15) clears it — so treat the exact magnitude as noisier than the other 6 boards' numbers, but the direction (badly unfair, badly unresolved) is clear regardless. Raw data: `PROJECTS/SmartBeads/prototype/board4/PRODUCTION_LAB_FAIRNESS_2026-09-23_board16_raw_console.txt` (console transcript — run separately from the 6-board JSON file, stopped before its own JSON write completed; see note above).

**This is the one finding in this whole review that plausibly does meet VISION's "genuine Lab or gameplay failure" bar** — see Flagged section below. Still not acted on; the locked set has not been changed.

### Flagged for the human's decision

1. **`16`'s D2 fairness-gate failure and low resolve rate (added 2026-09-23)** — the only finding in this review that looks like a real candidate for VISION's "genuine Lab or gameplay failure" threshold. **Decision (2026-09-23, human):** does not block launch — ship with all 7 boards as-is. The AI self-play number may not reflect what a human actually feels playing `16`; real signal will come from players via the Review feature once it ships (see §2's "Player reviews — the plan to actually learn if boards feel fair" bullet) rather than a formal pre-launch test. Revisit only if player reviews actually surface a fairness complaint on `16`.
2. **`7x4x5`'s D2 first-player-favored outlier** (see root-cause reading above) — worth a closer geometric look at some point, purely out of curiosity/rigor, not because it's failing.
2. **The consistent −17.5 to −20pp P2 edge at D2 across 5 of 6 boards** looks like a trait of `HonestAi.ts`'s search/eval at that level rather than any one board's geometry — if this matters to game feel, it's an AI-tuning question, not a board-selection question, and out of scope for this pass.

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
