# Autonomous run log

Rules: `GPT_PROJECT_RULES_01P.md` § Autonomous mode. Nothing here is committed.

## Run 1 — 2026-10-02 (scope: W7, W9, W6, W8, W1, A3/A4 engine)

| Item | Result | Evidence |
|---|---|---|
| W3 keyboard play | DONE (before this run, pushed in 87121d0) | `keyboardNav.test.ts` 7 tests; gate scenario "Keyboard"; mutation: removing the key handler fails the gate |
| W4 44 px tap targets | DONE (pushed) | gate scenario "Phone tap targets"; mutation: CSS stashed → gate fails |
| W5 wall-clock clocks | DONE (pushed) | 5 unit tests + gate "Clocks: 130 s ... throttled callback"; mutation fails |
| W7 repo clean-up | DONE | `SHARED/` and `hub-theme-mockup.html` deleted; tsconfig, ESLint, package.json globs and both repo maps updated; tsc, ESLint, Prettier clean |
| W9 legacy scripts | DONE | ran all 18 `m2-*-verify/observe/browser` scripts: 17 failed on stale selectors (hidden `#board-select`, `#play-theme-setting`, `#p1-pieces`, ...), 1 passes and is used by the gate. The 17 are deleted; `PROJECT_MAP_05P.md` updated |
| W6 test hooks in production | DONE | `window.__SB_TEST__`, `sb-test-resign-ai` and the local `sb-premium` flag are compiled out of `vite build` (`__SB_TEST_HOOKS__`; `SB_TEST_HOOKS=1` keeps them). FOUND: production start page launched games *through* `__SB_TEST__.enterFromHub` — now routed via `bootstrapPlayShell`'s `onReady(launcher)`. New gate `m3-prod-build-gate.mjs` (4 scenarios, in `npm test`/CI); mutation (hooks forced on) → 2 of 4 fail |

| W8 test holes | PARTLY DONE | `resignationController.test.ts` (6) and `startBannerController.test.ts` (5) added and registered in the feature-session batch (23 files now). Mutation: dropping the pending-offer check fails a test; dropping `clearTimeout` in dismiss is an equivalent mutant (the phase-2 callback is already guarded by the `animate` class). NOT done: `boardSettingsPanel` and `PlayHub` (DOM-heavy; need a DOM test environment, e.g. jsdom, added to Jest — a tooling decision) |
| W1 phone landscape | DONE | CSS block in `play-shell.css`; at 740x360 the board is 318 px tall (was 270), no scroll, controls and ad stacked on the right. Gate scenario "Phone landscape" (740x360, 667x375, 844x390); mutation: CSS disabled -> gate fails |
| W8 (rest) | DONE | `jest-environment-jsdom` added (dev only). `boardSettingsPanel.test.ts` (8) and `playHub.test.ts` (8, `@jest-environment jsdom`); mutations: removing the timer lock fails a test; changing the lesson action / spectate mode fails 2 tests |
| A9 online server | DONE (first version) | `PROJECTS/SmartBeads/server/`: `GameRoom` (authoritative rules via `FeatureSession`, server-owned clocks that follow real time, resign/draw flow, seat tokens), `RoomManager` (5-letter codes, idle sweep, 2000-room cap), `app.ts` (one Node app: WebSocket `/ws` + HTTP polling fallback `/api/rooms...` + serves `dist/`). Launch boards 6x4, 8x4x6, 16. 32 server tests (rooms + real WebSocket/polling integration); mutations (no clock settle before a move, no turn check, no push after an intent, no token check in polling) each fail a test. Production bundle `npm run build:server` -> `server-dist/main.js`, smoke-tested over HTTP (site served, full game played) |
| A3 clocks online | DONE | server-side match, tournament and shot clocks (same rules as offline), pushed every second; the browser does not run its own clocks online |
| A4 online UI | DONE (first version) | hub tile "Play vs Friend - Online" opens a lobby (create room with board/timer/shot clock, or join with the code); game screen shows a room bar (code, whose turn, slow-connection notice, Copy code); resign offers appear for the friend; New game / Play again / Menu return to the start page. Gate scenario "Online" drives TWO real browsers through the server (create, join, turn lock, move sync, resignation) on Chromium and WebKit |
| A7 accounts | NOT STARTED | blocked on your setup (Google/Facebook developer apps, sending e-mail address) |

## How to test online play yourself
1. Local: `npm run server` (port 3000) and, in another window, `npm run web:smartbeads`; the Vite dev server forwards `/api` and `/ws` to port 3001, so run the server with `PORT=3001`. Open the game in two browser windows: Play vs Friend - Online, Create room in one, Join with the code in the other.
2. Hosted (Hostinger, UNCONFIRMED until you try it): `npm install && npm run build && npm run build:server`, then run `npm start` (it serves the site and the game on `PORT`, default 3000). On Hostinger use Websites -> Node.js app, connect the GitHub repo, build command `npm install && npm run build && npm run build:server`, start file `server-dist/main.js`, Node 22. The game falls back to polling by itself if the host blocks WebSockets; the room bar then shows "slow connection".
3. What it does NOT do yet: reconnect after a page reload (the room token is kept only in the page), accounts / ratings, tournaments.

## Findings to know
- `npm test` overwrites the tracked evidence PNGs in `scripts/evidence-2step` and `scripts/evidence-capture` on every run (they show as modified). Restored with `git checkout`; consider git-ignoring them.
- Premium (ad removal) has no production source yet: until the account server exists, production always shows ads. That is the intended W6 result.

## Open questions
- Online reload: should a refreshed page rejoin its room automatically (token kept in sessionStorage)? Default plan: yes, in the next run.
- A7: Google/Facebook developer apps and the sending e-mail address are needed from you (PENDING A19 items 6 and 8).
