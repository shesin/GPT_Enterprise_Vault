==================================================
REPOSITORY SAFETY RULES (MANDATORY)
==================================================

The existing SmartBeads application is the authoritative codebase.

DO NOT replace, rewrite or remove any existing application files.

In particular:

• Do NOT replace the existing root index.html.

• Do NOT modify the TypeScript SmartBeads engine unless explicitly instructed.

• Do NOT alter the existing build system.

• Do NOT change Vite configuration.

• Do NOT modify production application architecture.

Create the prototype as a completely separate development artifact.

Location:

PROJECTS/SmartBeads/prototype/board4/index.html

(or another new prototype folder if one already exists.)

The prototype must be fully standalone and must not interfere with the existing application.

The current SmartBeads app must continue to build and run exactly as before.

If any existing file appears to require modification, STOP and explain why before making the change.

If a prototype file already exists, improve that file incrementally.

Do not rewrite it from scratch unless specifically instructed.

Preserve working functionality wherever possible.

# ROLE

You are an expert HTML5 Canvas game developer and gameplay engineer.

Your task is to improve the existing Board4 prototype.

Do NOT rewrite the project from scratch.

Treat the existing index.html as the authoritative implementation and preserve all working behaviour unless explicitly changed below.

Implement only the requested improvements.

==================================================
AUTHORITATIVE INPUTS
==================================================

1. Existing prototype
   - index.html (current working version)

2. Gameplay Rules
   - The rules below override any previous implementation.

==================================================
GAMEPLAY SPECIFICATION
==================================================

BOARD

• 4×4 Alquerque board.
• 16 nodes.
• Horizontal, vertical and diagonal graph connections.
• Human = Red.
• AI = Blue.

INITIAL POSITION

• Human occupies top row.
• AI occupies bottom row.

==================================================
MOVEMENT
==================================================

Legal moves:

• Adjacent move to an empty connected node.

OR

• Jump over one adjacent enemy bead into an empty landing node.

==================================================
MULTI-JUMP
==================================================

After every capture:

Automatically search for additional capture jumps.

If additional jumps exist:

• Continue chain.

Human may stop voluntarily.

Show a large glowing green

"Finish Multi-Jump"

button whenever optional continuation exists.

AI may also voluntarily stop according to its decision logic.

==================================================
TURN MANAGEMENT
==================================================

Alternate first player every new game.

Maintain:

• current turn
• ply count
• remaining plies

Maximum:

40 total plies.

==================================================
AI
==================================================

Difficulty selector.

Easy

• Depth 1

• Prefer captures

• Otherwise random legal move

Medium

• Depth 3

• Minimax

Hard

• Depth 4

• Alpha-Beta pruning

Evaluation function MUST be deterministic.

Never add randomness inside evaluate().

Randomness is allowed ONLY when selecting among equally scored moves.

==================================================
END CONDITIONS
==================================================

Immediate win

• Opponent eliminated

Immediate loss

• No legal moves (stalemate)

Draw

• Three-fold repetition

After 40 plies

Winner priority:

1. Most captures

2. Greater control of center nodes
   (5,6,9,10)

3. Draw

==================================================
UI
==================================================

Show:

• Turn timer

• Remaining plies

• Total plies

• Beads remaining

• Captures

• Status badge

• AI difficulty selector

Highlight:

• Selectable pieces

• Selected piece

• Legal moves

==================================================
ARCHITECTURE REQUIREMENTS
==================================================

Even though this is a single index.html prototype, organize the JavaScript into clearly separated sections.

1. Configuration

2. Game State

3. Board Definition

4. Move Generation

5. Game Engine

6. AI

7. Rendering

8. UI Controller

9. Utilities

Do NOT mix rendering with game rules.

The game engine must never depend on Canvas drawing logic.

The renderer should only draw the current GameState.

==================================================
GAME STATE
==================================================

Maintain a single GameState object containing all mutable game information instead of scattered global variables wherever practical.

==================================================
MOVE HISTORY
==================================================

Record every completed move.

Each record should contain:

• player

• from

• to

• captured

• ply

Replay UI is NOT required.

==================================================
DEBUG
==================================================

Provide a DEBUG constant.

When enabled display:

• current evaluation

• legal move count

• search depth

• turn number

==================================================
IMPORTANT
==================================================

Do NOT introduce external libraries.

Do NOT use React.

Do NOT use frameworks.

Remain a single standalone HTML prototype.

Keep the code readable.

==================================================
VERIFICATION
==================================================

Before reporting completion:

1. Verify no JavaScript syntax errors.

2. Play at least 20 AI vs AI games.

3. Play at least 5 Human vs AI games.

4. Verify:

• captures

• multi-jump

• finish multi-jump button

• alternating first player

• repetition detection

• stalemate

• 40-ply ending

• tie-break sequence

==================================================
REPORT
==================================================

Report exactly:

• Files Modified

• Gameplay Changes

• Architecture Improvements

• Tests Performed

• Bugs Fixed

• Remaining Issues

• Confidence

Never claim gameplay is correct unless verified through actual play.