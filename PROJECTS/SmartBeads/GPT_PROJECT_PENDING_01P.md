# Smart Bead Chess — Pending (Open Items Only)

**This is Shekhar's file.** Agents read it; they do **not** edit it unless the human says **`Go — PENDING`**.

**Scope: only work that is still open and must happen before it's safe to consider this "unfinished, nothing left" for launch.** See `GPT_PROJECT_RULES_01P.md` § Where to look for where everything else lives.

When an item here ships and is verified: remove it from here, log it in STATUS (and DECISIONS if it was a locked choice) and Closed Issues.

---

## 1. Hard blockers — close these ASAP, in this order

### 1a. Full account system (signup / login / profile)

**Why first, why non-negotiable:** human decision, 2026-09-19 — *"will not go to market without the full account system — not optional, not deferrable to a later phase."* Not a feature nice-to-have: the product vision explicitly rejects a guest-only / room-code-only launch. Every other web checklist item (§6) can be finished and it still wouldn't matter — this is a hard gate on launch itself.

**What it blocks / depends on it:**
- Online multiplayer (1b below) needs at least a lightweight identity per player.
- Hub left-rail account row (Sign Up / Log In / Help & Support / Player Profile) — visual placeholders already shipped 2026-09-20, but disabled, "coming soon," no backend behind any of them yet.
- The planned Review feature (§3 below) needs at least lightweight identity to prevent spam before it can go live past its current placeholder.

**Status:** not started. No implementation has begun — this is pure backlog right now.

### 1b. Online multiplayer server (required, not static-only)

**Goals:**
- Two humans, two browsers, one authoritative game.
- Moves, captures, chains, resignation, and both timer layers stay in sync.
- Reconnect within a grace window (e.g. 60s) without corrupting state.

**Recommended stack:**

| Layer | Role | Example providers |
|-------|------|-------------------|
| Web app | Page 1 hub, Page 2 setup, canvas client | Cloudflare Pages, Netlify, Vercel, or Nginx on VPS |
| Game API + WebSocket | Rooms, moves, clock authority, match lifecycle | Node or Bun on Railway, Fly.io, Render, or VPS (Hetzner, DigitalOcean, Linode) |
| Database | Users (Phase 2b), rooms, games, tournament brackets (Phase 3) | PostgreSQL (managed or on VPS) |
| Redis (optional) | Room presence, pub/sub, rate limits | Upstash or VPS Redis |

**Minimum path (one bill):** single VPS — Nginx serves the static build + reverse-proxies to the game server on the same machine.

**Server responsibilities (authoritative):** create/join room by code; validate board+preset+rules; hold the canonical engine snapshot; accept move intents, reject illegal ones, broadcast state+clock updates; run timer ticks server-side (match + shot), declare time forfeits; end game, store result for rematch/stats/tournament.

**Client responsibilities:** render board, send clicks as move intents, animate from server ack; never trust client-only clocks for ranked online play; offline/vs AI keeps the current local session (no server).

**Phasing:**
- **Phase 2a (online core):** guest or simple account (email magic link), room code + share URL, one board + one preset for beta, expand to all 7 once stable.
- **Phase 2b (polish):** reconnect, rematch, basic stats, report/abandon, all boards + all presets.
- **Phase 3 (tournament):** scheduled events, single-elimination bracket, server-enforced clocks, DB schema for `tournaments`/`entries`/`pairings`/`results`. Full V1 tournament scope: §13 below.

**Status:** not started — architecture only, no code.

---

## 2. Page 1 UI — HvH Online mode fields (not yet built)

When Human vs Human (Online) is selected on Page 1: time preset (§12), center rule, Create room / Join room, then Start match on Page 2 once connected.

Tutorial — Coach lesson launches from Page 1; on completion, returns to Page 1 hub.

---

## 3. Player reviews — product requirement for when Review ships

Human wants the Review feature itself to be the ongoing signal for whether a board feels fair (not a one-off formal playtest) — AI self-play stats can suggest a fairness read but not confirm it; real players actually using the product is the ground truth. For that to work, when Review ships past its current disabled placeholder it needs to be:

1. **Visible** — not buried; easy to find and use from the hub, not a disabled "coming soon" button.
2. **Inviting** — presented well enough that players actually bother to write something, not a bare textbox.
3. **Fast to read in aggregate** — a glance at a few weeks of reviews should give a real per-board signal, not require re-reading every review by hand.

Needs its own design pass once accounts (§1a) land — reviews need at least lightweight identity to prevent spam. Flagging the requirement now so it isn't designed as a generic "leave feedback" box that misses this specific purpose.

---

## 4. Open risks (carried forward, not yet closed)

- Touch precision on the 16-bead board (37 nodes, tight spacing) — not yet verified on a real phone/tablet.
- Expert AI think time (up to ~45s on large boards, no "thinking…" indicator) may read as a frozen/dead app on mobile more than on desktop — worth a mobile-specific check when Android work starts.
- Everything fixed 2026-09-14/15 (render-crash fix, timer race fix, rewritten chain tests, dead-code removal — full detail in `GPT_PROJECT_AUDIT_05P.md` 5th cycle) is Jest-verified only — no human has watched any of it on a real device or browser yet.

---

## 5. Your unconfirmed browser checks

*(Shekhar to fill in: what's already been tested, which boards, when — move confirmed items to a "Confirmed" list below as you go.)*

**Confirmed (done):**
- *(none logged yet — add here as you test)*

**Still unconfirmed:**
- Turn-colour every-turn flash — Jest-only, never watched in a real browser.
- Coach-lesson-vs-live-game match in edge cases.
- Multi-jump "Finish capture" mid-chain button behavior.
- General pass: check everything on phone/desktop after the hub + turn-colour changes — a broader sweep than the specific items above.

**Testing coverage gap — no Playwright check:** turn-start flash deselect-not-return and "Finish capture" mid-chain are not covered by any automated browser gate — a regression here would not be caught by CI, only by a human manually checking. This is distinct from "not yet personally watched" above — there is currently no automated safety net for it at all.

**Test steps for the unconfirmed items:**
1. `npx vite` from the repo root, open localhost:5173.
2. Play vs AI, any board — capture a bead, confirm no visual glitch (grid lines, board colour) during or after.
3. Watch AI vs AI, 16-bead, Expert vs Expert, let a full match play out (~2 min) — confirm the result modal's winner and reason text agree with each other.
4. Same Watch AI setup, 2-3 matches back-to-back via "Play again" — confirms the timer-expiry fix holds under repeated play, not just once.
5. Any board, get into a multi-jump chain (capture, then another capture available) — confirm "Finish capture" appears and ends the turn correctly.

---

## 6. Web launch checklist

| Task | Owner | Status / Notes |
|------|-------|--------|
| Domain purchase | Shekhar | **DONE** — `rosenlotus.com`, `smartbeadchess.com` purchased |
| Company email setup | Shekhar | Not done — needed for Play Store registration and general business use |
| Human playtest, all 7 boards | Shekhar | Not done — `npm run web:smartbeads`; feel/balance sign-off |
| Bugs from playtest | Shekhar + implementer | Depends on playtest above |
| `vite build` production script | Implementer | Not done |
| Choose host (VPS / Railway) | Shekhar | **Not yet — wait.** See §8 below for why |
| Deploy client + API + DB | Implementer | Blocked on account system (§1) + host choice |
| Live smoke vs local | Shekhar | Blocked on deploy |

---

## 7. Android app checklist (after web hub stable)

Capacitor wrap confirmed (not native WebView bridge).

| Task | Owner | Notes |
|------|-------|--------|
| Install Capacitor + Android platform | Implementer | Can start now |
| Touch verification on device | Shekhar confirms | Especially 16-bead (37 nodes, tight spacing) — can start now |
| Phone layout pass | Implementer + Shekhar | Can start now |
| Icon, splash, package ID | Shekhar assets; implementer wires | Can start now |
| Signed `.aab` + keystore backup | Implementer builds; **Shekhar keeps keystore** | Can start now — loss = cannot ever update the listing again |
| Play Console listing, privacy policy, content rating | Shekhar | **Blocked on DUNS** — see §11 |
| Google review | Google | **Blocked on DUNS** — 1–3 days, after §11's testing gate |

**Out of V1 Android scope — do not let these creep in:** haptics, offline match persistence, native WebView bridge.

---

## 8. VPS/hosting timing — don't buy yet

VPS timing has nothing to do with DUNS — DUNS only blocks the Android/Play Store side (§11). The real gate is the web engineering work: buying a VPS now means paying for a live server with nothing to deploy to it, since the account system + multiplayer server (§1) don't exist yet. **Buy VPS when the implementer is actually ready to deploy client+API+DB to staging** — i.e., once §1 is substantially built, not before.

---

## 9. Hosting — deploy pipeline detail

**We deploy:** `vite build` static assets → CDN or Nginx; game server container/process → same provider; env secrets (DB URL, JWT/session secret, CORS origin); CI runs the Jest suite on push, deploys on tagged release (human approves).

**Environments:** Production (public URL) and Staging (same stack, separate DB) — staging used for online/timer QA before prod.

---

## 10. Hosting — purchase checklist

Human buys: (1) domain — **DONE**, `rosenlotus.com` / `smartbeadchess.com`; (2) host with Node + DB support, not static-only (see §8 on VPS timing); (3) managed Postgres (or Postgres on the same VPS).

---

## 11. Play Store account & launch logistics (blocked on DUNS)

**D-U-N-S timing:** near-instant to a couple of days if Dun & Bradstreet already has a record for the business (e.g. tied to a bank loan, GST filing, prior credit check); 5–30 business days if it's a brand-new D-U-N-S from scratch. Check status **inside Play Console** — it's the authoritative tracker, not D&B's own site.

**Rest of account registration (after DUNS matches):**
- MSME status check — confirm active, not lapsed.
- Identity verification (ID + possibly liveness check).
- $25 one-time fee.
- Business details form — must match MSME/GST exactly.
- Accept Developer Distribution Agreement.
- Payment profile — only needed if charging money later; skip if launching free.

**Mandatory closed-testing gate (sequential — starts only after account verifies, not parallel with DUNS):**
1. Upload app to a closed testing track (not production).
2. Recruit ≥12 testers who opt in (friends/family/colleagues fine — they just install and stay opted in, real active testing not required).
3. Hold for 14 continuous days with those testers enrolled.
4. Apply for production access → Google review (1–3 days) → goes live.
5. Prep the 12-tester list and closed-testing build **now**, before DUNS clears, so this doesn't add extra delay once the account verifies. (Sourcing testers is easy: friends/WhatsApp groups, Reddit r/AndroidApps / r/alphaandbetausers, or dev Discord servers — people fill 12 slots within a day or two routinely.)
6. **Caveat:** Google changes these numbers occasionally — confirm the live figure inside Play Console once the account verifies.

---

## 12. Timers (Human vs Human) — engineering detail

**Layer A — Match clock (Chess.com model):** each player has their own bank; ticks only on that player's turn; reach 0:00 → lose on time; UI shows two clocks (opponent top, you bottom), active one highlighted.

**Layer B — Shot clock:** each turn must complete within the board-fixed limit (120s/90s/60s — locked table, see `GPT_PROJECT_DECISIONS_05P.md` §13a); exceeding it is a loss on time, same as a match-clock flag fall; UI is a small per-turn countdown on the active player.

**Why two layers, not one:** a single "whole game ends in N minutes" clock was rejected as the main competitive mode — unfair when move counts differ between players. Match clock rewards overall speed; shot clock stops stalling when someone hoards bank time.

**Historical — superseded split:** the current board-fixed table (locked, `GPT_PROJECT_DECISIONS_05P.md` §13a) supersedes an earlier draft that used a 90s shot clock for 16/12/10-bead and 60s for 8/7/6-bead — that split no longer applies.

**Work remaining (not started):** dual-clock UI, authoritative server-side clock sync for online play, preset wiring on Page 2 for online setup only. PvE stays frozen — do not touch (already locked in `GPT_PROJECT_DECISIONS_05P.md` §6).

---

## 13. Tournament plan (Phase 3)

**V1 scope:** single elimination, fixed board+preset per event (host-configured); player registers before start window, bracket generated at close; each pairing = auto-assigned online room, winner advances; disconnect = loss if clock expired, else admin replay (kept minimal for V1).

**Not in V1:** Swiss/round-robin, cash prizes/payment, cross-region latency guarantees.

**Dependencies:** Online Phase 2 stable; persistent identity (even lightweight accounts); an admin tool or config file to create events (CLI first is fine).

---

## 14. UI polish backlog

- Match timer progress ring (Human vs Human only) — radial countdown, low-time pulse.
- Session score counter across rematches.
- Left panel / settings dedup — hide duplicate mode/account chrome on hub.

---

## 15. Engineering hygiene

- Dead-code / doc-mismatch sweep — extend the proven method (grep every reference repo-wide, trace reachability, `tsc --noEmit` clean, tests green, live browser check) from rendering/layout/theme files to the rest of `src/`. Do not remove anything without that full chain of evidence.

---

## 16. AI level 4 — ON HOLD

Depth-3 search timing looked safe on a limited test sample (28 runs, all boards, all completed under 3.1s). A real hang bug was found and fixed in the shared search retry logic along the way (affected Expert today, unrelated to level 4 — fixed, 41/41 tests pass). **Not resumed** — human deferred to later; needs a wider timing sample before it can be called safe. Full investigation history: `GPT_PROJECT_CLOSED_ISSUES_05P.md` §AI level 4.

---

## 17. Coach video polish — optional, needs your explicit go

1. Highlight active panel bullet during playback.
2. ~2s hold after each demo move before the next snap.

Video 2 (timers, shot clock, centre rules) — planned, not started.

---

## 18. Implementation order (suggested)

1. Page 1 hub + Page 2 setup — AI + tutorial (local); online fields stubbed; no PvE timer changes.
2. Dual match clocks + shot UI — presets on Page 2 for HvH only; server sync when online ships.
3. `vite build` + staging deploy — client bundle; add game-server host.
4. Game server — room create/join, move relay, server clocks.
5. Online HvH beta — all boards, reconnect, rematch.
6. Tournament MVP — single elimination.
7. Mobile/touch — viewport, hitboxes (feeds Capacitor Android).

---

## 19. Gaps noticed, not previously tracked anywhere (flagging for your call)

- **Privacy policy / Terms of Service for the web app itself** — currently only tracked for the Android Play Store listing (§11); but the web app also collects account signup data, so it likely needs its own privacy policy/ToS page before public launch, not just an app-store listing.
- **Monetization decision** — nothing in any doc states whether the game is free or will ever charge money. This decides whether a Play Store payment profile is needed now (§11 already notes "skip if free" — but that's an assumption, not a confirmed decision).
- **GST/MSME paperwork freshness** — flagged only once, in §11's MSME check; worth confirming this isn't a wider gap (e.g. GST filing status) rather than a one-line check.

---

*Draft maintained: human product decision.*
