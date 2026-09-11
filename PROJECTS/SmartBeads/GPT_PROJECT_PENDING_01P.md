# Smart Bead Chess — Pending Product Plan (DRAFT)

## What this file is (human-owned)

**This is Shekhar’s file.** Agents read it; they do **not** edit it unless the human says **`Go — PENDING`**.

**Everything listed here is still open — minor or major — and must not ship in the final product (web or Android app) until it is fixed, decided, or explicitly waived by the human.** If it is unresolved, it stays here. When it ships and is verified, it leaves here and goes to **`GPT_PROJECT_DECISIONS_05P.md`** (locked choice) and/or **`GPT_PROJECT_STATUS_01P.md`** (verified today).

**Status:** DRAFT — human approval required before implementation.  
**Scope:** Open roadmap, gaps, risks, polish, and known blockers — online multiplayer, timers (HvH), hosting, tournaments, UX debt, browser sign-off gaps.  
**Does not replace:** **`GPT_PROJECT_DECISIONS_05P.md`** · **`GPT_PROJECT_STATUS_01P.md`** · **`VISION_05P.md`**.

Target: 01P (~2–3 pages, word-friendly)

---

If difference is not suitable for mobile app then it must be put in risk. If web and mobile needs 2 solution
then it must be mentioned and stayed in risk so that while mobile app development it could be closed.

**Difference**
No

**risk**
No

**Open risks (not closed until human sign-off)**

- **Human browser UNCONFIRMED** — turn-colour every-turn flash (`GPT_PROJECT_DECISIONS_05P.md` §7–§8); Jest only.
- **Coach vs live** — lesson playback may not match what players see in a real game in edge cases.
- **No Playwright check** — turn-start flash deselect-not-return and Finish capture mid-chain are not in browser gates; regression would not be caught there.

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

## For human to human, tournament timer,	We will keep only one 90 sec enabled shot clock for 16,12,10 and	60 sec shot clock for 8,7,6


## first web page must be like chess.com page
-Left panel correction
-Centre etc can go longer but right now only in 100% page area

## congratulator message has issue, p2 win etc coming

## check everything

## 2. Two-page UX

**Shipped layout & flow** → **`GPT_PROJECT_DECISIONS_05P.md` §9** (hub mode tiles launch directly; no Start on hub; `play-board.html` keeps dev start overlay).

### Still pending / polish

- **Chess.com-style hub** — left rail, centre board grid, right rail; fit in 100% viewport (see notes below).
- **Left panel / settings dedup** — hide duplicate mode chrome; settings only on Page 2 or in-game menu (§8 backlog).
- **Congratulation message** — fix P2 win copy showing incorrectly (human note).
- **Human browser pass** — “check everything” on phone/desktop after hub + turn-colour changes.

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

Video 1 basics (**7-bead**, ~3 min) shipped in code — see `GPT_PROJECT_STATUS_01P.md`. Optional next steps — **need explicit go**:

1. **Highlight active panel bullet** during playback.
2. **~2s hold after each demo move** before the next snap.

**Video 2 (timers, shot clock, centre rules)** — planned separate ~2–3 min video; not started.

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
| `GPT_PROJECT_DECISIONS_05P.md` | **Locked game & product decisions** (single owner) |
| `GPT_PROJECT_RULES_01P.md` | Agent & engineering rules |
| `GPT_PROJECT_STATUS_01P.md` | **Done / verified only** |
| `GPT_PROJECT_PENDING_01P.md` | **This file — open roadmap, gaps, risks** |
| `VISION_05P.md` | Broad principles & mission — no locked recipes |

When work ships: update **DECISIONS** (if new locked choice) + **STATUS** (verification). Remove shipped items from here. Do not duplicate decision recipes in status, vision, or pending.

---

*Draft maintained: 2026-08-30 (timer scope: HvH only; PvE frozen). Owner: human product decision.*
