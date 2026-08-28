25/8/26



Full audit complete — plain text summary

Tier 1 — Tests: 390/390 passing, 31/31 suites. Clean.

Tier 2 — Lab data: 7-bead D1 numbers (20%/80%, F/SP −30pp) verified byte-for-byte against real repo JSON. Real, not fabricated.

Tier 3 — Test quality: 0 tautological assertions, 0 skipped tests, 749 real expect() calls across 390 tests. Not shallow.

Tier 4 — Engine logic: Capture optionality, termination profiles (sholo_guti/ply_limit), resignation, multi-jump chain tracking — all genuinely implemented in source, matching documentation. File sizes reasonable for scope, no stub files.

Tier 5 — Board geometry: All 7 boards' node counts match their documented claims exactly (6×4×4=16, 6×3×5=15, 10×5=25, 12×6×5=30, 8×4×6=24, 7×4×5=20). Centre node IDs match documented values exactly where hardcoded (6-bead: 5,6,9,10 / 6×3×5: node 7 / 10×5: node 12); the rest are computed, consistent with claims.

Tier 6 — Defect fixes (done earlier): selectNode, completeAiTurnIfChainOpen, getFollowUpJumps — all real, present, wired in.

Bottom line

Nothing fabricated found anywhere in this audit. Every specific claim checked — test counts, Lab numbers, defect fixes, board geometry — matched the live repo exactly. The codebase is in genuinely good shape technically. The only real open item remains the one thing no audit can substitute for: your own hands-on playtest of all 7 boards, plus the still-undiagnosed 16-bead-missing-from-web-dropdown issue from earlier.

I need to correct that — not "100% sure," and I want to be precise about what this audit does and doesn't cover, so what you save is accurate.

What this audit actually proved
No fabrication in the specific claims I checked (test counts, Lab numbers, defect fixes, geometry).
The code that's there does what it claims to do.
The 390 tests are real, not shallow.
What it did NOT prove — "100%" would be wrong to write down
I checked test quality signals (no tautologies, no skips), not whether the tests cover the right things. A test suite can be 100% real and passing and still miss a scenario nobody thought to test — that's exactly what happened before: 234 passing tests didn't catch the diagonal-capture bug you found in two minutes of manual play.
I did not read every line of every engine file — I checked that key documented mechanisms exist (resignation, chains, termination), not a full logic-correctness review of every branch and edge case.
I did not touch the UI/rendering/browser layer in this pass — canvas click accuracy, visual correctness, animation timing weren't re-verified today.
Automated verification never implies gameplay quality — that's your own standing rule, and it applies here too. Nothing here confirms the games are fun, balanced, or bug-free from a player's seat.
What's fair to write in your saved report

"Repo-wide audit (2026-08-25): no fabrication found across tests, Lab data, defect-fix claims, or board geometry — all checked claims verified real against live repo. This confirms technical honesty of prior reports, not completeness of test coverage or gameplay quality. Human playtest of all 7 boards remains the only unverified gate before launch."