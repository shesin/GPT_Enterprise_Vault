# SmartBeads Project Status

## Current Phase

Core Engine Development

---

## Current Focus

Add capture rules on the BoardDefinition graph, then AI self-play on Board4.

---

## Completed

* Project migrated into GPT_Enterprise_Vault.
* BoardDefinition established as the authoritative board model.
* Board variants `4`, `5`, and `7` registered through BoardConfig.
* Board4 rebuilt as a configurable 4×4 orthogonal grid with center nodes and maxPlies.
* SmartBeadsEngine applies legal slides, optional ply limits, capture-count wins, and center tie-break.
* Documentation structure simplified.

---

## Next Step

Implement capture mechanics that update `captures`, then evaluate Board4 via AI self-play.

If needed, expand to 5×5 / 6×6 through new board configs using the same engine.

---

## Architecture

1. Enterprise Layer

   * Documentation
   * Standards
   * Templates

2. Shared Technology Layer

   * Reusable game engines

3. Project Layer

   * SmartBeads gameplay
