# Board4 Web Prototype — Status

Tracks what's built, how it's been verified, and porting status to SmartBeadsEngine.ts.

Update after every test session. Do not restate rule content here — that lives in WEB_RULES_05P.md / WEB_IN_PROGRESS_05P.md.

---

## Active Sholo / Cursor Index feature line (2026-08-15)

**Playable location:** Locked V1 seven in **`prototype/board4/`** root. Left-out NFT survivors (5) in **`unrejected games/`**. Lab scripts use `playable-dir.cjs`.

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

**Discovery NFT playables (2026-08-17):** Web **REJECT (G2)** playables **removed** from disk. Lab audit JSON retained. Active discovery playables:

| Playable | Role |
|----------|------|
| `SHOLO_GUTI_8_BEAD_5x5_WITH_FEATURE.html` | 8-bead 5×5 thinned — Lab G1–G9 pass (`8_BEAD_5x5_LAB_COMPLETE.json`) · human playtest |
| `SHOLO_GUTI_7_BEAD_4x4_DENSE_WITH_FEATURE.html` | 7-bead 4×4 dense — NFT · best new board |
| `SHOLO_GUTI_7_BEAD_5x5_WITH_FEATURE.html` | 7-bead 5×5 thin hourglass — NFT |
| `SHOLO_GUTI_8_BEAD_4x6_HOURGLASS_WITH_FEATURE.html` | 8-bead 4×6 hourglass — NFT |
| `SHOLO_GUTI_12_BEAD_5x7_WITH_FEATURE.html` | 12-bead 5×7 two-file — NFT |
| `SHOLO_GUTI_12_BEAD_6x5_WITH_FEATURE.html` | 12-bead 6×5 two-file — NFT |
| `SHOLO_GUTI_4_BEAD_3x5_REAR_WITH_FEATURE.html` | 4-bead 3×5 rear — NFT (lowest priority) |

Smoke: `verify-discovery-nft-feature.cjs` → `SHOLO_DISCOVERY_NFT_FEATURE_SMOKE.json`.

**Removed playables (REJECT G2):** 5-bead 3×5 LR, 5-bead 4×4, 12-bead miniwing, 12-bead Baro, 9-bead 5×5, 5-bead 3×5 rear thin, 5-bead 4×3 hourglass, 8-bead 5×4, 10-bead 4×6 hourglass, 12-bead 4×7 hourglass — plus legacy 4/5/8-bead sketch and Cursor Index 4 (removed earlier).

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

1. Human playtest **8-bead 5×5** — `SHOLO_GUTI_8_BEAD_5x5_WITH_FEATURE.html`.
2. Set KEEP-board centre/timer **defaults** (`WEB_FEATURE_TEST_05P.md`).
3. Do not retest 7-bead Lab; do not promote C1/C2/C4/Baro 12.
