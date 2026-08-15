# Board4 Web Prototype — Status

Tracks what's built, how it's been verified, and porting status to SmartBeadsEngine.ts.

Update after every test session. Do not restate rule content here — that lives in WEB_RULES_05P.md / WEB_IN_PROGRESS_05P.md.

---

## Active Sholo / Cursor Index feature line (2026-08-15)

Headless Web G1–G9 + playable smoke for 4×4 6-bead variants. Consolidated report: **`WEB_REPORT_All_BEAD_05P.md`** (SmartBeads root).

| Playable | Geometry | Web verdict | Smoke |
|----------|----------|-------------|-------|
| `SHOLO_GUTI_6_BEAD_b_4x4_WITH_FEATURE.html` | Full box crosses | **NEEDS FURTHER TESTING** | PASS |
| `SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html` | Long diagonal rays | **NEEDS FURTHER TESTING** | PASS |
| `SHOLO_GUTI_10_BEAD_WITH_FEATURE.html` | 5×5 lattice | NEEDS FURTHER TESTING | (prior smoke) |
| `SHOLO_GUTI_7_BEAD_WITH_FEATURE.html` | 4×5 | NEEDS FURTHER TESTING | (prior smoke) |
| `SHOLO_GUTI_6_BEAD_WITH_FEATURE.html` | 3×5 sketch | NEEDS FURTHER TESTING | (prior smoke) |
| `SHOLO_GUTI_WITH_FEATURE.html` | 16-bead reference | REFERENCE | (prior smoke) |

**Evaluator:** `evaluate-cursor-index-lab.cjs` · **Engine:** `cursor-index-fullturn-engine.cjs` · **Artifacts:** `CURSOR_INDEX_LAB_EVALUATION.json`, `CURSOR_INDEX_6_LAB_EVAL.json`, `CURSOR_INDEX_6_B_LAB_EVAL.json`.

**Human playtest:** not started — required before KEEP on any candidate.

---

## Legacy Board4 index track (inactive)

- File: `prototype/board4/index.html`
- Last commit: "Add web prototype board4, prototype classification rule, AI role prompts" (2026-08-06)
- Headless test hook: `window.__BOARD4_LAB_HEADLESS__ = true` → `Board4Lab` API

### Verification log (legacy track)

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

---

## Porting to SmartBeadsEngine.ts

Nothing ported yet. A rule should only move from prototype to the real engine after it appears in WEB_RULES_05P.md (i.e. has passed verification above).

| Rule | In WEB_RULES_05P.md? | Ported to engine? |
|---|---|---|
| — | — | — |

---

## Next session

1. Human playtest **`SHOLO_GUTI_6_BEAD_b_4x4_WITH_FEATURE.html`** (preferred 4×4 candidate).
2. Then 10-bead / 7-bead / 6-bead (3×5) per `GPT_PROJECT_STATUS_01P.md`.
