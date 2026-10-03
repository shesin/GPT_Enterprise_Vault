# Smart Bead Chess — Pending (Open Items Only)

**This is Shekhar's file.** Agents read it; they do **not** edit it unless the human says **`Go — PENDING`**.

**Scope: only work that is still open and must happen before it's safe to consider this "unfinished, nothing left" for launch.** See `GPT_PROJECT_RULES_01P.md` § Where to look for where everything else lives.

When an item here ships and is verified: remove it from here, log it in STATUS (and DECISIONS if it was a locked choice) and Closed Issues.

**Ordering note :** within each Part below, items are grouped into "Claude task" (agent-doable, ordered smallest effort → largest) and "Shekhar task" (needs Shekhar directly — account creation, purchases, physical-device checks, subjective sign-off). Items are numbered sequentially in this new order (A1, A2, A3… / B1, B2, B3…)
---

**Recommendation :** knock out the small web wins first since they're fast and close out quickly, then run Android's B1–B4 in parallel with the two web hard blockers.

**Web-first rule :** everything in web that can be tested here — bugs, playtest feedback, browser checks, coach/UI polish — must be finished and confirmed **before** starting Android work as Debugging is far faster on web (instant reload, browser devtools) than on a device/emulator.

# PART A — WEB (nothing here is gated by DUNS — DUNS only affects the Android/Play Store side in Part B)


## Claude task 

**Game stability & polish — finish before Android:**

### A1. Coach video polish — optional, needs your explicit go

**Owner: Claude, after Shekhar's go**

1. Highlight active panel bullet during playback.
2. ~2s hold after each demo move before the next snap.

Video 2 (timers, shot clock, centre rules) — planned, not started.

### A2. Bugs from playtest

**Owner: Claude, after Shekhar's playtest (A11)**

Depends on A11. Failing test before fix, per standing rule.

**Bigger web build-out — accounts, multiplayer, tournament (after game stability confirmed):**

### A3. Timers (Human vs Human) — engineering detail

**Owner: Claude**

**Layer A — Match clock (Chess.com model):** each player has their own bank; ticks only on that player's turn; reach 0:00 → lose on time; UI shows two clocks (opponent top, you bottom), active one highlighted.

**Layer B — Shot clock:** each turn must complete within the board-fixed limit (120s/90s/60s — locked table, see `GPT_PROJECT_DECISIONS_05P.md` §13a); exceeding it is a loss on time, same as a match-clock flag fall; UI is a small per-turn countdown on the active player.

**Why two layers, not one:** a single "whole game ends in N minutes" clock was rejected as the main competitive mode — unfair when move counts differ between players. Match clock rewards overall speed; shot clock stops stalling when someone hoards bank time.

**Historical — superseded split:** the current board-fixed table (locked, `GPT_PROJECT_DECISIONS_05P.md` §13a) supersedes an earlier draft that used a 90s shot clock for 16/12/10-bead and 60s for 8/7/6-bead — that split no longer applies.

**Status (2026-10-03):** the server owns the match, tournament and shot clocks for online games and pushes them every second (A9, first version). Tournament games use the fixed shot-clock values (built, C37); the online lobby uses the normal menus. PvE stays frozen — do not touch (locked in `GPT_PROJECT_DECISIONS_05P.md` §6).

### A4. Page 1 UI — HvH Online mode fields (first version built 2026-10-02)

**Owner: Claude**

When Human vs Human (Online) is selected on Page 1: time preset (A3), center rule, Create room / Join room, then Start match on Page 2 once connected. Built: hub tile "Play vs Friend — Online", a lobby (create a room with board, timer, shot clock and centre rule, or join with the code) and a room bar with the code and a Copy button.

Tutorial — Coach lesson launches from Page 1; on completion, returns to Page 1 hub.

### A5. Web-side gap noticed, not previously tracked (flagging for your call)

**Owner: Shekhar (decides the Privacy and Terms text)**

- **Privacy policy / Terms of Service for the web app itself** — currently only tracked for the Android Play Store listing (Part B); but the web app also collects account signup data, so it likely needs its own privacy policy/ToS page before public launch, not just an app-store listing.

### A6. Hosting — deploy pipeline detail

**Owner: Claude, with Shekhar for the Hostinger settings**

**We deploy:** `vite build` static assets → CDN or Nginx; game server container/process → same provider; env secrets (DB URL, JWT/session secret, CORS origin); CI runs the Jest suite on push, deploys on tagged release (human approves).

**Environments:** Production (public URL) and Staging (same stack, separate DB) — staging used for online/timer QA before prod.

### A7. Full account system (signup / login / profile) — HARD BLOCKER

**Owner: Claude; needs Shekhar for A19 items 6–8**

**Why non-negotiable:** human decision, 2026-09-19 — *"will not go to market without the full account system — not optional, not deferrable to a later phase."* Not a feature nice-to-have: the product vision explicitly rejects a guest-only / room-code-only launch. Every other web checklist item can be finished and it still wouldn't matter — this is a hard gate on launch itself.

**What it blocks / depends on it:**
- Online multiplayer (A9 below) needs at least a lightweight identity per player.
- Hub left-rail account row (Sign Up / Log In / Help & Support / Player Profile) — visual placeholders already shipped 2026-09-20, but disabled, "coming soon," no backend behind any of them yet.
- The planned Review feature (A8 below) needs at least lightweight identity to prevent spam before it can go live past its current placeholder.

**Status (Claude, 2026-10-03):** built and verified: e-mail login link, Google and Facebook sign-in (both off until their keys exist), profile name, ratings list (details: `AUTONOMOUS_LOG.md` Run 3). Still open: real e-mail sending on Hostinger (needs the `SMTP_*` variables, A19-6), the Google and Facebook keys (A19-7/8), then a real-account test on the hosted site.

### A8. Player reviews — product requirement for when Review ships

**Owner: Claude, when Review ships**

Human wants the Review feature itself to be the ongoing signal for whether a board feels fair (not a one-off formal playtest) — AI self-play stats can suggest a fairness read but not confirm it; real players actually using the product is the ground truth. For that to work, when Review ships past its current disabled placeholder it needs to be:

1. **Visible** — not buried; easy to find and use from the hub, not a disabled "coming soon" button.
2. **Inviting** — presented well enough that players actually bother to write something, not a bare textbox.
3. **Fast to read in aggregate** — a glance at a few weeks of reviews should give a real per-board signal, not require re-reading every review by hand.

Needs its own design pass once accounts (A7) land — reviews need at least lightweight identity to prevent spam. Flagging the requirement now so it isn't designed as a generic "leave feedback" box that misses this specific purpose.

### A9. Online multiplayer server (required, not static-only) — HARD BLOCKER

**Owner: Claude**

**Goals:**
- Two humans, two browsers, one authoritative game.
- Moves, captures, chains, resignation, and both timer layers stay in sync.
- Reconnect without corrupting state: done 2026-10-03 (the seat code is kept 3 hours in the browser; a refresh, a closed tab or a relaunched browser rejoins; only the clock running out loses, see DECISIONS C31).

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
- **Phase 3 (tournament):** scheduled events, single-elimination bracket, server-enforced clocks, DB schema for `tournaments`/`entries`/`pairings`/`results`. Full V1 tournament scope: A10 below.

**Status (Claude, 2026-10-03):** built and tested: rooms, server clocks, reconnect, presence, rate limits, ratings, tournaments (details: `AUTONOMOUS_LOG.md`). Open: the real two-browser test on Hostinger (A19-10) and the VPS decision (A16).

### A10. Tournament plan (Phase 3)

**Owner: Shekhar (playtest and rule review), Claude (fixes)**

**Status (Claude, 2026-10-03):** V1 built and tested (single elimination, byes, seeding by rating, replay after a draw, walkover after 5 minutes, organiser dialog; Run 3). Open: a real playtest with 4+ people on the hosted site, and Shekhar's review of the rules in DECISIONS C34–C38. Not in V1: Swiss/round-robin, prizes, cross-region latency guarantees.

**Not in V1:** Swiss/round-robin, cash prizes/payment, cross-region latency guarantees.

**Dependencies:** Online Phase 2 stable; persistent identity (even lightweight accounts); an admin tool or config file to create events (CLI first is fine).

## Shekhar task — 

**Game stability & testing — finish before Android:**

### A11. Human playtest, all 7 boards

**Owner: Shekhar**

`npm run web:smartbeads`; feel/balance — human sign-off only. Not done.

### A12. Your unconfirmed browser checks

**Owner: Shekhar**

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

### A13. Open risks (carried forward, not yet closed)

**Owner: Shekhar**

- Touch precision on the 16-bead board (37 nodes, tight spacing) — not yet verified on a real phone/tablet.
- Expert AI think time is now milliseconds (worst measured 46 ms desktop, 336 ms at 6x CPU throttle; `GPT_PROJECT_AUDIT_05P.md` § 10) — still worth one real-phone check when Android work starts (emulated only).
- Everything fixed 2026-09-14/15 (render-crash fix, timer race fix, rewritten chain tests, dead-code removal — full detail in `GPT_PROJECT_AUDIT_05P.md` 5th cycle) is Jest-verified only — no human has watched any of it on a real device or browser yet.

**Business / infra — not game-blocking, but still open:**

### A14. Company email setup

**Owner: Shekhar**

Not done — needed for Play Store registration and general business use.

### A15. Hosting — purchase checklist

**Owner: Shekhar**

Human buys: (1) domain — **DONE**; (2) host with Node + DB support — **confirmed** (Hostinger plan already has this, see Hosting Reference at bottom of doc); (3) database — included in current plan, see Hosting Reference at bottom.

### A16. VPS/hosting timing — don't buy yet

**Owner: Shekhar**

VPS timing has nothing to do with DUNS — DUNS only blocks the Android/Play Store side (Part B). The real gate is the web engineering work: buying a VPS now means paying for a live server with nothing to deploy to it, since the account system (A7) + multiplayer server (A9) don't exist yet. **Buy VPS when the implementer is actually ready to deploy client+API+DB to staging** — i.e., once A7/A9 are substantially built, not before.

**Exact trigger (2026-10-02):** buy the VPS only when (1) the A9 game server runs locally with two browsers playing one authoritative game, and (2) the A7 account API passes its tests locally. The Hostinger plan already covers the static build and the account API (Node + MySQL); only the A9 WebSocket server needs the VPS. Build A9 first, locally.

### A17. Choose host, deploy, and go live (remaining web checklist rows)

| Task | Owner | Status / Notes |
|------|-------|--------|
| Choose host (VPS / Railway) | Shekhar | **Not yet — wait.** See A16 for why |
| Deploy client + API + DB | Claude | Blocked on A7 + A9 + host choice |
| Live smoke vs local | Shekhar | Blocked on deploy |

### A18. Music — replace the current soundimage.org tracks (Shekhar's call)

**Owner: Shekhar picks, Claude wires**

Shekhar finds the present music weak. YouTube songs cannot be used (copyright). Options, any one:
1. **Free licensed libraries (credit line needed):** Pixabay Music, Incompetech, Free Music Archive. Claude shortlists by mood; Shekhar listens and picks; Claude reads each licence and updates `public/credits.html`.
2. **AI-generated:** Suno, Udio, Stable Audio, ElevenLabs Music. Needs a paid plan with commercial use (check the terms and keep the receipt); AI music has weak copyright protection; some stores want AI use disclosed. Claude writes the prompts and wires the finished files in.
3. **Buy a licence or commission** a composer.

**Wanted style (Shekhar, 2026-10-02):** instrumental, piano with flute (bansuri), veena and tabla. Plan: 3–4 loopable tracks (2–4 min) plus one short menu track.

**Also decided 2026-10-02:** the first online boards are 6x4, 8x4x6 and 16 (A9/A10); the other four open after those are stable.

### A19. Shekhar-only items (everything on Shekhar's name, one list)

"Unblocks" = which Claude items wait for it (the rest is in this list's own items). Nothing else in this list is Claude's.

1. **Game look decisions.** Claude applies them afterwards. Unblocks: nothing.
2. **Music selection (A18).** Pick a route and send track URLs or AI-tool files. Unblocks: music wiring.
3. **Privacy, Terms and Credits review.** Review/finish `public/privacy.html`, `terms.html`, `credits.html` and give the support e-mail. Unblocks: final legal pages.
4. **Sound effects.** Confirm the source and licence of the files in `public/audio`. Unblocks: Credits page.
5. **soundimage.org music.** Decide: host the files yourself, or drop them with A18.
6. **Company e-mail.** `info@smartbeadchess.com` exists (Shekhar, 2026-10-03) and is used as contact, sender and reply address. Still needed: the SMTP host, port and user name from hPanel (usually smtp.hostinger.com, port 465); the password only as the Hostinger variable `SMTP_PASS`, never in chat or the repo; the SPF/DKIM records the panel shows so mails do not land in spam. Unblocks: real sign-in e-mails, legal pages.
7. **Google developer app (Google sign-in).** console.cloud.google.com → new project "Smart Bead Chess" → APIs & Services → OAuth consent screen (External; app name; support e-mail; authorised domain `smartbeadchess.com`; privacy and terms URLs; scopes openid, email, profile only) → Credentials → Create credentials → OAuth client ID → Web application → authorised JavaScript origins `https://smartbeadchess.com` and `http://localhost:5173`. Send Claude the Client ID (public); keep the Client secret private (server environment). Move the consent screen from Testing to In production before launch, or only test users can sign in. Unblocks: Google login.
8. **Facebook developer app (Facebook sign-in).** developers.facebook.com → log in → My Apps → Create App → use case "Authenticate and request data from users with Facebook Login" → App settings → Basic: app domain `smartbeadchess.com`, privacy and terms URLs, category Games → Facebook Login → Settings → Valid OAuth Redirect URIs (Claude gives the exact URL when A7 is built). Send Claude the App ID (public); keep the App Secret private. Switch the app from Development to Live (basic e-mail and public profile need no review). Unblocks: Facebook login.
9. **Razorpay account (A20).** razorpay.com → sign up → business KYC (PAN, bank account, GST if any; takes days). Start with Test mode keys; Key Secret stays private. Unblocks: ad-removal payment.
10. **Hostinger two-browser test.** hPanel → Websites → Add website → Node.js Apps → connect the GitHub repo; build command `npm install && npm run build && npm run build:server`; entry file `server-dist/main.js`; Node 22; set the environment variables Claude lists. Open the site in two browsers and play online (steps in `AUTONOMOUS_LOG.md`). Unblocks: knowing whether a VPS is needed.
11. **VPS purchase** only at the A16 trigger.
12. **Testing only you can do.** A11/A12 playtests, real-phone checks (A13, B6), a real screen reader (NVDA free, or VoiceOver) on the keyboard play. Unblocks: opening the other four boards online (the first three are open).
13. **Android:** B5, B7, B8.
14. **Decisions:** ad / consent flow, and the hub items still "coming soon".

### A20. Ad-removal payment (do last)

**Owner: Shekhar (Razorpay account, price), then Claude (test payment)**

Built behind a switch (Razorpay orders, signature check, webhook; Run 3). Off until `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `AD_REMOVAL_PRICE_PAISE` are set. Open: Shekhar creates the Razorpay account (A19-9) and picks the price; Claude then runs a test-mode payment. On Android also a Play Store payment profile (B8).

---

### W1–W8. Whole-code audit 2026-10-01 — open items (evidence: `GPT_PROJECT_AUDIT_05P.md` § 13)

- **W1. Phone landscape.** The board no longer distorts (fixed), but the layout is portrait-only: at 740×360 the board is about 270 px tall and the page scrolls. A real landscape layout (board on the left, bars and controls on the right) is a design job.
- **W2. (done 2026-10-02)** Changing a setting mid-game now asks first; covered by `m3-flow-gate.mjs`.
- **W3. (done 2026-10-02) Keyboard play:** Tab focuses the board, arrows reach a bead, Enter picks, arrows + Space place; gate scenario "Keyboard". A real screen reader test is still open (A19-12).
- **W4. (done 2026-10-02) Phone tap targets:** every control is at least 44 px; gate scenario "Phone tap targets".
- **W5. (done 2026-10-02) Clocks follow real time:** a hidden or throttled tab settles the missed seconds at once (a 130 s callback still expires a 2-minute timer); unit tests and a gate scenario. A 5-minute hidden-tab test on a real phone is still open.
- **W6. (done 2026-10-02) Test hooks and the premium flag are compiled out of production builds** (`__SB_TEST_HOOKS__`; gate `m3-prod-build-gate.mjs`). Premium has no production source until accounts (A7), so production always shows ads.
- **W7. (done 2026-10-02) Repo clean-up:** dead files, `SHARED/engine` and `hub-theme-mockup.html` deleted (recoverable from git).
- **W8. (done 2026-10-02/03) Test coverage:** the real-browser flow gate has 27 scenario checks plus 6 production-build checks, in Chromium and WebKit locally and in Firefox and WebKit in CI (job `browser-gates-other-engines`, green run 53); jsdom tests cover the resignation controller, start banner, settings panel and PlayHub. `processRegressionGuards.test.ts` still asserts on source text. Firefox cannot start on this PC.
- **W9. (done 2026-10-02) Legacy scripts:** 17 broken `m2-*` verify scripts deleted; the one that works is used by the gate.

---

### U1–U12. UI look and portal audit 2026-10-02 — status (evidence and wording: `GPT_PROJECT_AUDIT_05P.md` § 15 and § 16)

- **Done 2026-10-02 (browser-verified, covered by `m3-flow-gate.mjs`):** U3 phone start page shows the Play buttons on the first screen; U4 fonts self-hosted; U6 star legend + accessible star text; U7 mode help text; U8 Warm Walnut panel contrast (all 9 looks now measured at 4.5:1 or better); U9 dialog focus, Tab trap, Escape; U10 Menu button in the game; U12 favicon, meta description, share card, manifest, no-JavaScript message; U1/U2 draft Privacy, Terms and Credits pages, footer links, music credit.
- **Declined:** U5 (the whole start page deliberately uses the system font; tiles were not inconsistent); U11 (live board in the look preview: Shekhar removed the preview lines on 2026-09-24).
- **Still open (needs the owner):** (a) review and finish the Privacy and Terms drafts and add a support e-mail address (`public/privacy.html`, `terms.html`); (b) confirm the source and licence of the sound effects in `public/audio` and state it on the Credits page; (c) read the soundimage.org licence and host the music files yourself (they are still hot-linked); (d) ad / consent flow when real ads are added; (e) hub items that are not built (Community, Tournament, Review, Online play) still show "coming soon"; (f) first-run sound hint (sound is off by default); (g) Firefox cannot be launched on the dev PC, so it is untested.

### A24. On Shekhar from the 2026-10-03 audit work, and Claude's own choices to confirm (Claude)

**Owner: Shekhar for items 1–7, Claude for item 14**

The reviewed choices (rate limits, resignation lapse, seat code, repaint, shot-clock table, Firefox job) are recorded in `GPT_PROJECT_DECISIONS_05P.md` §15 as (Claude & reviewed). Item 14 is still (Claude).

**Decisions only you can make**
1. **Frame embedding:** may other websites (game portals) show the game inside their page? Claude suggests yes for the game page, and no for login and payment pages when they are built (A7, A20). Needed before the Content-Security-Policy is added.
2. **Music sites (A18):** send the sites or files. The Content-Security-Policy must list them, or you host the music yourself (A19-5). Claude builds the CSP after this.
3. **Watch AI time limit:** built at 3 minutes (C32); say so if you prefer 2.
4. **"Claim win" button:** in untimed online games, after the opponent has been away a few minutes, should the player who stayed get a "Claim win" button? Claude suggests yes. Not built.

**Things only you can do**
5. **Deployment:** set `TRUST_PROXY=1` on Hostinger when the site sits behind its proxy (A15, A17). Without it, the per-client rate limits treat all players as one client. Also ask the host or CDN for a firewall rate limit, because a distributed attack cannot be stopped in the game code.
6. **Real-phone heat check (A12, A13):** play 10 minutes or more on a phone and note whether it warms. Claude's measured proxy: idle CPU 4.2% down to 1.0%, random play 33.8% down to 14.2%.
7. **Privacy and Terms review (A19-3):** the Privacy page now includes online play.

**Claude's own choice, to confirm or change**
14. **(Claude) Audit probe scripts** (rules reference check, AI oracle, soak, CPU) live only in a temporary folder. Claude suggests saving them under `PROJECTS/SmartBeads/scripts/audit-tools/` so the evidence can be re-run. Waiting for your yes.

### A25. Review of Claude's decisions with Shekhar (Claude)

**Owner: Shekhar, with Claude**

`GPT_PROJECT_DECISIONS_05P.md` §15 lists every decision Claude made since autonomous mode started (2026-10-02), each marked (Claude), with where it lives and whether Shekhar has accepted it. Go through it with Claude when there is time; anything Shekhar changes becomes a normal decision in the right section.

### A26. Second project and clean-up of Smart Beads (Shekhar decided 2026-10-03) (Claude)

**Owner: Shekhar decides; Claude does the work.**

- Smart Emergency gets its own repo and folder in `D:\Business Idea\` (nothing in this repo changes). It is created from a new session opened in that folder; this vault's session never edits outside the vault without "Go — outside vault" and the exact path.
- Smart Beads is rearranged and cleaned. Claude first writes the plan (what moves where, the `VISION/` → `PROJECTS/SmartBeads/AGENT_PROMPTS/` move with its 8 references, the root web files), tags the last good commit, works on a branch, and merges only when every test and gate give the same results as before.
- Open: Shekhar says what "rearrange" should include, for example moving the root web files into `PROJECTS/SmartBeads/`.

---

# PART B — APP (Android)

## Claude task 

### B1. Install Capacitor + Android platform

Owner: Claude. Can start now. Capacitor wrap confirmed (not native WebView bridge).

### B2. Icon, splash, package ID

Owner: Shekhar (assets), Claude wires. Can start now.

### B3. Signed `.aab` build process

Owner: Claude builds. Can start now. (Keystore custody itself is a Shekhar task — see B5 below.)

### B4. Phone layout pass

Owner: Claude + Shekhar. Can start now.

**Out of V1 Android scope — do not let these creep in:** haptics, offline match persistence, native WebView bridge.

## Shekhar task — 

### B5. Keystore backup custody

**Shekhar keeps keystore** — loss = cannot ever update the listing again. (Pairs with the build in B3, which I can do; holding the keystore itself cannot be delegated.)

### B6. Touch verification on device

Owner: Shekhar confirms. Especially 16-bead (37 nodes, tight spacing) — can start now. Needs a real physical device.

### B7. App-side gaps noticed, not previously tracked (flagging for your call)

- **Monetization decision** — nothing in any doc states whether the game is free or will ever charge money. This decides whether a Play Store payment profile is needed now (B8 already notes "skip if free" — but that's an assumption, not a confirmed decision).
- **GST/MSME paperwork freshness** — flagged only once, in B8's MSME check; worth confirming this isn't a wider gap (e.g. GST filing status) rather than a one-line check.

### B8. After DUNS — sequential, each step blocks the next

**D-U-N-S timing:** near-instant to a couple of days if Dun & Bradstreet already has a record for the business (e.g. tied to a bank loan, GST filing, prior credit check); 5–30 business days if it's a brand-new D-U-N-S from scratch. Check status **inside Play Console** — it's the authoritative tracker, not D&B's own site.

**Rest of account registration (after DUNS matches):**
- MSME status check — confirm active, not lapsed.
- Identity verification (ID + possibly liveness check).
- $25 one-time fee.
- Business details form — must match MSME/GST exactly.
- Accept Developer Distribution Agreement.
- Payment profile — only needed if charging money later; skip if launching free.

**Play Console listing, privacy policy, content rating** — Shekhar.

**Mandatory closed-testing gate (sequential — starts only after account verifies, not parallel with DUNS):**
1. Upload app to a closed testing track (not production).
2. Recruit ≥12 testers who opt in (friends/family/colleagues fine — they just install and stay opted in, real active testing not required).
3. Hold for 14 continuous days with those testers enrolled.
4. Apply for production access → Google review (1–3 days) → goes live.
5. Prep the 12-tester list and closed-testing build **now**, before DUNS clears, so this doesn't add extra delay once the account verifies. (Sourcing testers is easy: friends/WhatsApp groups, Reddit r/AndroidApps / r/alphaandbetausers, or dev Discord servers — people fill 12 slots within a day or two routinely.)
6. **Caveat:** Google changes these numbers occasionally — confirm the live figure inside Play Console once the account verifies.

---

## Hosting Reference (confirmed 2026-09-29 — Hostinger)

**Domain:** `smartbeadchess.com` (+ `www.`), IP `82.180.143.133`.

**Hosting plan:** Disk 50GB · RAM 3072MB · 2 CPU cores · 600,000 inodes · 50 addon sites · 120 max processes · 60 PHP workers · unlimited bandwidth. Server location: Asia (India); backups: Singapore. Nameservers: `lunar.dns-parking.com` / `solar.dns-parking.com`.

**FTP:** IP `ftp://82.180.143.133`, hostname `ftp://smartbeadchess.com`, username `u472889475`, upload path `public_html`. (Password not stored here — Shekhar's own credential.)

**Node.js app support (confirmed):** versions 18.x/20.x/22.x/24.x; backend frameworks Express, Fastify, Hono, NestJS, Next.js, Nitro, Nuxt, Astro, React Router, SvelteKit; package managers npm/yarn/pnpm; frontend frameworks incl. Vite (what this project already builds with).

**What this plan covers vs. doesn't:**
- Static `dist/` upload → ready now, no blocker.
- Account system (A7) → fits on this plan (REST API, MySQL included).
- Multiplayer server (A9) → still needs the separate VPS (see A16) — shared/cPanel hosting isn't built for persistent WebSocket connections at scale.

---

*Draft maintained: human product decision.*
