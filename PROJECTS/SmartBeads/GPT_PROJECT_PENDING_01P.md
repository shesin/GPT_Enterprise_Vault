# SmartBeads — Pending Product Plan (DRAFT)

**Status:** DRAFT — human approval required before implementation.  
**Purpose:** Single plan for two-page play flow, **online multiplayer**, timers, hosting, and tournaments.  
**Does not replace:** `VISION_05P.md` (locked V1 boards), `GPT_PROJECT_STATUS_01P.md` (what is built today).

Target: 01P (~2–3 pages, word-friendly)

---

## 1. Direction (human decisions captured)

- **Not static-only.** Ship targets **online Human vs Human** plus vs AI and tutorial — not a download-only or same-device-only product long term.
- **Two pages mandatory** before live board (Chess.com-style progressive disclosure).
- **Page 1 — Play hub:** choose mode only — **Human vs AI**, **Human vs Human (online)**, **Tutorial**. (Optional fourth: quick rematch — defer until hub exists.)
- **Page 2 — Match setup:** board, time preset, rules, opponent (room code / invite for online), then **Start match**.
- **Timers (Human vs Human only):** Chess.com-style **per-player match clock** (time runs only on your turn; play fast → save time) **plus** **shot clock** (must move within 60s or 90s each turn). Reject “whole game ends in 3 minutes total” as the main competitive mode — unfair when move counts differ.
- **Timers (Human vs AI — frozen):** Do **not** change PvE timer behaviour or UI. Current local session (match/shot off by default, clocks tick during AI think, catalog toggles in settings) is **approved as-is** — no dual-clock rework, no new presets on Page 2 for vs AI.
- **Tournament:** planned from the start in architecture; **Phase 3** delivery after online rooms work.

---

## 2. Two-page UX (mandatory)

### Page 1 — Play hub

- Large mode cards (like Chess.com “Play Chess” panel).
- **Human vs AI** — HonestAi PvE (existing engine path).
- **Human vs Human** — online room (Phase 2); label clearly “Play online” (not same-device-only wording).
- **Tutorial** — guided path on small board (6×3×5 or 6×4); no clocks by default.
- Left rail (later, optional): Play · Learn · Stats · History · Tournament.
- **Hide on hub:** match/shot settings, duplicate mode dropdowns, live player clocks, account chrome on board.

### Page 2 — Match setup

Fields depend on mode:

**Human vs AI**

- Board (7 locked V1)
- AI level (Easy / Medium / Hard)
- Center rule (per catalog)
- **No timer changes** — keep existing in-game settings (match/shot off by default; current `FeatureSession` / `clockPolicy` behaviour unchanged)
- **Start match** → live game + audio unlock

**Human vs Human (online)**

- Board, **time preset** (see §3 — HvH only), center rule
- **Create room** (code + share link) or **Join room** (enter code)
- Optional display names
- **Start match** when both connected (or host starts)

**Tutorial**

- Fixed small board; step script (slide → capture → chain + Finish → optional center)
- **Begin** → in-place lesson; return to hub when done

### Live game (after Start)

- Existing 4-column play shell (left stats/clocks, board, settings collapsed or minimal, ad slot if not premium).
- **Rematch / Change mode** returns to Page 1 or Page 2 — product choice at build time.
- **Starter policy (already shipped):** Start overlay → human (cream) first; New game alternates in PvE; online matches use server-assigned or agreed opener.

---

## 3. Timers — Human vs Human only

**Scope:** This section applies to **online Human vs Human** (and tournaments). **Human vs AI is out of scope** — shipped local clocks and settings stay as they are; no preset dropdown, no dual-clock UI rework, no engine/session changes for PvE.

### Two layers (both optional via presets — HvH Page 2)

**Layer A — Match clock (Chess.com model)**

- Each player has their own bank (e.g. 3:00, 5:00, 10:00).
- Clock ticks **only while it is that player’s turn**.
- Reach **0:00** → lose on time.
- UI: **two clocks** — opponent top, you bottom — active clock highlighted.

**Layer B — Shot clock (SmartBeads rule)**

- Each turn must complete within **60s or 90s** (preset-defined).
- Exceed shot limit → **lose on time** (recommended; simple — same as match flag fall).
- UI: small per-turn countdown on active player (ring or numeric); can reuse shot-ring visuals.

**Why both:** Match clock rewards overall speed; shot clock stops stalling when someone hoards bank time.

### Presets (Page 2 dropdown — **Human vs Human setup only**)

| Preset   | Match clock | Shot clock |
|----------|-------------|------------|
| Casual   | Off         | Off        |
| Quick    | 3:00 each   | 60s/turn   |
| Standard | 5:00 each   | 90s/turn   |
| Blitz    | 3:00 each   | 45s/turn   |

Board-specific defaults from catalog (16/12/10: longer banks; 8/7/6: shorter) can override Standard — keep one preset list on Page 2 for clarity.

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

- **Match timer progress rings (Human vs Human only)** — radial countdown on player panels when match clock is on; low-time pulse (defaults tied to catalog: longer on 16/12/10, shorter on 8/7/6). Shot-clock ring already shipped; this is the **match-bank** ring for online HvH — not PvE timer rework.
- **Session score counter** — track series across rematches (alternating opener already **shipped** — see status).
- **Left panel / settings dedup** — hide duplicate mode and account chrome on hub; settings only on Page 2 or in-game menu.

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

Shipped v1 is **OK** in code (see `GPT_PROJECT_STATUS_01P.md`). Human said **good** on pacing and 3v3 layout. Optional next steps — **need explicit go** before code:

1. **Highlight active panel bullet** during playback (Move / Single capture / Double capture).
2. **~2s hold after each demo move** before the next segment snap.

Not the same as **Watch AI** (spectate). Not the long-term **AI Coach** vision below.

---

## 12. Future learning (vision — not scheduled)

AI Coach, match analysis, replay, tactical explanations, pattern recognition, progress tracking — after tutorial + online core. Teach understanding, not memorization (`VISION_05P.md` Learning Philosophy).

---

## 13. Open decisions (need human yes/no)

1. **Accounts:** guest + room code only for beta, or sign-in from day one?
2. **Shot breach (HvH):** lose on time only (recommended) or softer penalty?
3. **Default preset (HvH):** Casual (no clock) or Quick (3:00 + 60s)?
4. **Rematch path:** Page 2 again or instant rematch with same settings?
5. **Tournament first board:** 16-bead only, or allow per-event config?
6. **Host preference:** single VPS vs split (static CDN + Railway API)?

---

## 14. Doc ownership

| File | Holds |
|------|--------|
| `GPT_PROJECT_STATUS_01P.md` | **Done / verified only** |
| `GPT_PROJECT_PENDING_01P.md` | **This file — all pending & roadmap** |
| `VISION_05P.md` | Principles, locked V1 seven, Lab rules — no task tables |

When work ships, move items from here → status. Do not duplicate pending lists in status or vision.

---

*Draft maintained: 2026-08-30 (timer scope: HvH only; PvE frozen). Owner: human product decision.*
