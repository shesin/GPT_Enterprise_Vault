# Board4 Web Prototype — Status

Tracks what's built, how it's been verified, and porting status to SmartBeadsEngine.ts.
Update after every test session. Do not restate rule content here — that lives in WEB_RULES_05P.md / WEB_IN_PROGRESS_05P.md.

---

## Current build

- File: prototype/board4/index.html
- Last commit: "Add web prototype board4, prototype classification rule, AI role prompts" (2026-08-06)
- Headless test hook: set `window.__BOARD4_LAB_HEADLESS__ = true` before load to expose the `Board4Lab` API without DOM/Canvas — usable for scripted AI-vs-AI verification without a browser.

---

## Verification log

| Item | Method required by spec | Status |
|---|---|---|
| No JS syntax errors | Manual / console check | Not yet run |
| 20× AI vs AI games | Headless `Board4Lab` loop | Not yet run |
| 5× Human vs AI games | Manual browser play | Not yet run |
| Captures | Play-test | Not yet verified |
| Multi-jump + Finish Multi-Jump button | Play-test | Not yet verified |
| Alternating first player | Play-test | Not yet verified |
| Repetition detection (3-fold) | Play-test | Not yet verified |
| Stalemate | Play-test | Not yet verified |
| 40-ply ending + tie-break sequence | Play-test | Not yet verified |

Update this table after each session — don't mark "Verified" without a real run behind it.

---

## Porting to SmartBeadsEngine.ts

Nothing ported yet. A rule should only move from prototype to the real engine after it appears in WEB_RULES_05P.md (i.e. has passed verification above).

| Rule | In WEB_RULES_05P.md? | Ported to engine? |
|---|---|---|
| — | — | — |

---

## Next session

Run the verification log items above before promoting anything to WEB_RULES_05P.md.
