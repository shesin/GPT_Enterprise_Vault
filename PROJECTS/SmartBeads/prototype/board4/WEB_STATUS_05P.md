# Board4 Web Prototype — Status

Tracks what's built, how it's been verified, and porting status to SmartBeadsEngine.ts.

Update after every test session. Do not restate rule content here — that lives in WEB_RULES_05P.md / WEB_IN_PROGRESS_05P.md.

---

## Active Sholo / Cursor Index feature line (2026-08-15)

**4×4 selection finalized:** `SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html` (full box crosses) is the **only** active 6-bead 4×4 playable. Rays variant and `SHOLO_GUTI_6_BEAD_b_4x4_WITH_FEATURE.html` removed.

Consolidated report: **`WEB_REPORT_All_BEAD_05P.md`** (SmartBeads root).

| Playable | Geometry | Web verdict | Smoke |
|----------|----------|-------------|-------|
| **`SHOLO_GUTI_6_BEAD_4x4_WITH_FEATURE.html`** | Full box crosses | **NEEDS FURTHER TESTING** | PASS |
| `SHOLO_GUTI_10_BEAD_WITH_FEATURE.html` | 5×5 lattice | NEEDS FURTHER TESTING | (prior smoke) |
| `SHOLO_GUTI_7_BEAD_WITH_FEATURE.html` | 4×5 | NEEDS FURTHER TESTING | (prior smoke) |
| `SHOLO_GUTI_6_BEAD_WITH_FEATURE.html` | 3×5 sketch | NEEDS FURTHER TESTING | (prior smoke) |
| `SHOLO_GUTI_WITH_FEATURE.html` | 16-bead reference | REFERENCE | (prior smoke) |

**Removed (not active):** rays `SHOLO_GUTI_6_BEAD_4x4` (pre-cross file), `SHOLO_GUTI_6_BEAD_b_4x4_WITH_FEATURE.html`.

**Lab audit trail (unchanged):** `CURSOR_INDEX_6_LAB_EVAL.json` (INDEX_6 rays), `CURSOR_INDEX_6_B_LAB_EVAL.json` (INDEX_6_B cross).

**Evaluator:** `evaluate-cursor-index-lab.cjs` · **Engine:** `cursor-index-fullturn-engine.cjs` (`fullBoxCross` for active playable).

**Human playtest:** **KEEP confirmed 2026-08-15** (all four active ladder playables).

**Feature Test (2026-08-15):** **COMPLETE** — per-board centre study in `FEATURE_TEST_CENTRE_RULE_EVALUATION.json`. See **`WEB_FEATURE_TEST_05P.md`**.

**Discovery C1–C4 playables (2026-08-16):** Lab complete — `evaluate-c1-c4-lab.cjs` → `C1_C4_LAB_EVALUATION.json`. **C3 Lab validation complete** (`C3_LAB_COMPLETE.json`, N=100/seed) — **all G1–G9 pass** · human playtest only remaining · **C1/C2/C4 REJECT (G2)**. KEEP boards unchanged.

**Baro Guti 12-bead (2026-08-16):** Traditional 5×5 Alquerque rank camps — `SHOLO_GUTI_12_BEAD_BARO_WITH_FEATURE.html`. Lab → `BARO_12_LAB_EVALUATION.json` — **REJECT (G2)** second-mover skew. Distinct from C4 mini-wings. Do not promote.

| Playable | Role |
|----------|------|
| `SHOLO_GUTI_5_BEAD_3x5_LR_WITH_FEATURE.html` | C1 — 5 vs 5, 3×5 left–right |
| `SHOLO_GUTI_5_BEAD_4x4_WITH_FEATURE.html` | C2 — 5 vs 5, 4×4 full box cross |
| `SHOLO_GUTI_8_BEAD_5x5_WITH_FEATURE.html` | C3 — 8 vs 8, 5×5 thinned 10-bead |
| `SHOLO_GUTI_12_BEAD_MINIWING_WITH_FEATURE.html` | C4 — 12 vs 12, 5×5 + inner wings |
| `SHOLO_GUTI_12_BEAD_BARO_WITH_FEATURE.html` | Baro Guti — traditional 12 vs 12, 5×5 Alquerque rank camps · **REJECT G2** |

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

1. Human playtest **C3** — `SHOLO_GUTI_8_BEAD_5x5_WITH_FEATURE.html`.
2. Set KEEP-board centre/timer **defaults** (`WEB_FEATURE_TEST_05P.md`).
3. Do not retest 7-bead Lab; do not promote C1/C2/C4/Baro 12.
