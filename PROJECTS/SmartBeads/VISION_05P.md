# SmartBeads Vision

## Purpose

This document defines the long-term vision and philosophy of SmartBeads, plus every project-specific decision and piece of reasoning that isn't a short, always-loaded rule.

It explains why the project exists, what it aims to become, and the principles that should guide every future decision.

GPT_PROJECT_RULES_01P.md states rules tersely with no reasoning, by design — it is loaded into every Cursor request and must stay small. If a sentence explains *why* a rule exists, or documents a decision that isn't a universal always-check rule, it belongs here, not there.

Do not record implementation status details or historical session notes — those belong in GPT_PROJECT_STATUS_01P.md.

This is a living document.

As the project matures:
- Refine existing principles.
- Remove obsolete philosophy.
- Keep a single current vision.
- Preserve long-term consistency.

---

# Project Vision

SmartBeads is a family of modern abstract strategy games inspired by traditional Indian bead games such as Guti and Sholo Guti.

Its purpose is not merely to digitize traditional games, but to build a world-class strategy game platform where authentic gameplay, disciplined engineering, artificial intelligence, and scientific experimentation work together to create outstanding strategy games.

The long-term objective is to become the global reference platform for traditional bead games.

---

# Long-Term Mission

Build the world's finest ecosystem for bead-based strategy games through:
- authentic gameplay
- elegant design
- disciplined engineering
- AI-assisted research
- evidence-based improvement
- player education
- competitive play

Every future SmartBeads game should inherit these principles.

---

## Respect Tradition

Traditional games evolved through generations of play.

Software should faithfully reproduce their identity before attempting improvements.

Technology adapts to the game. The game should never change simply because programming becomes easier. This is why GPT_PROJECT_RULES_01P.md's "Board Fidelity" rule forbids square-grid shortcuts, and why capturing remains a player choice rather than a forced action ("Capture Optionality") — traditional bead games have always treated it that way.

---

## Gameplay First

Gameplay is always the highest priority.

Visual quality, effects, monetization, and technology exist to support gameplay — not replace it.

---

## Simplicity

Easy to learn. Difficult to master.

Players should understand the rules quickly while continuing to discover new strategies over hundreds of games.

---

## Strategy Over Luck

Victory should result from better decisions.

Avoid randomness, hidden information, and artificial advantages whenever practical.

---

## Respect the Player

Players should earn success through skill.

Avoid manipulative engagement techniques, unnecessary frustration, and deceptive systems.

Build long-term trust through quality.

---

# Game Mechanics — Reasoning

*(GPT_PROJECT_RULES_01P.md states each of these tersely. This section explains why.)*

### Board Structure & Graph Adjacency

A board is a graph of nodes and legal connections — never a plain square grid, even where nodes happen to be indexed by row/col internally for convenience. Diagonal and orthogonal jump paths must follow the same real physical adjacency the traditional board has. This is why "Board Fidelity" is a hard rule: representing coordinates as `row * width + col` is fine; silently dropping the diagonal edges that a real board has is not.

### Multi-Jump & Capture Optionality

Chain jumps are permitted whenever a legal consecutive capture exists, but never forced. A player — human or AI — may always stop after completing a legal jump. This is "Capture Optionality," and it exists because traditional bead games have always treated continuing a capture as the player's choice, not an obligation. A specific AI's internal continue-vs-stop policy (e.g. a random opponent's odds of continuing) is an implementation detail of that AI only — it must never be promoted to a gameplay rule.

### Match Termination & Victory Resolution

Matches support three configurable end modes: move-limit, time-limit, unlimited. Gameplay logic must treat all three as configuration, never hardcode one as the only mode.

When a match reaches its configured limit, resolve the winner using this hierarchy, in order:
1. **Total captures** — most beads captured wins.
2. **Center-hold plies** — if captures are tied, most plies spent occupying a center node wins.
3. **Draw** — if both are tied, the match is a draw.

Draw is a legitimate, accepted outcome of the hierarchy above — not a failure state to be engineered out of existence. We do not adopt scoring formulas or draw-elimination schemes that haven't been validated against actual play; if a future formula (e.g. a combined bead+center-hold score) is proposed, it must be tested through Smart Game Lab evidence before replacing this hierarchy, and any such change is a Major-tier gameplay decision requiring explicit human sign-off.

### Resignation

Not yet designed. No resignation protocol exists in rules, code, or this document today. This is flagged as a future Major-tier decision, to be designed and evidenced before it's implemented — not assumed from an external draft.

---

# Evidence-Based Design

Every important design decision should be supported by evidence.

Ideas should be tested before adoption.

The improvement cycle is:

Build → Test → Measure → Analyze → Improve → Repeat

Artificial Intelligence provides evidence. Humans make final product decisions.

This is why the project only expands to new board variants after AI self-play evidence justifies it — expansion is a consequence of evidence, not a scheduled milestone. The same standard applies to gameplay-rule changes such as match-termination scoring: a rule doesn't change because it was drafted somewhere, it changes because evidence supports it.

---

# Smart Game Lab

Smart Game Lab is the research engine behind SmartBeads.

Its purpose is to discover stronger games through disciplined experimentation.

Capabilities include:
- AI self-play
- rule experiments
- board experiments
- balance analysis
- opening analysis
- heat maps
- win-rate analysis
- draw analysis
- first-player advantage
- game-length analysis
- branching-factor analysis
- statistical reporting

Only improvements supported by consistent evidence become part of the product.

---

# AI Philosophy

Artificial Intelligence exists to improve the game.

Its responsibilities include:
- playing
- teaching
- analyzing
- balancing
- discovering problems
- comparing alternatives
- supporting research

AI recommends. Humans decide.

A specific AI opponent's internal decision policy (for example, a random self-play bot's odds of continuing a capture chain) is an implementation detail of that AI, not a gameplay rule — see GPT_PROJECT_RULES_01P.md's "Capture Optionality" rule for the actual permanent mechanic.

---

# Engineering Philosophy

Architecture exists to support gameplay.

Prefer:
- configurable systems
- deterministic engines
- reusable components
- modular design
- incremental evolution
- verification
- simplicity

Avoid unnecessary complexity. Don't add a new abstraction, file, or class before repository inspection shows a demonstrated need — this is why "Reuse Before Build" in GPT_PROJECT_RULES_01P.md is a hard check, not a suggestion.

---

# Configurable Gameplay

Core gameplay mechanics should remain independent of configuration values.

Parameters such as match timers, maximum plies, AI difficulty, and tournament settings should be configurable rather than hardcoded — changing a value must never require changing gameplay logic.

Current numeric defaults (e.g. Board4's ply limit) are tracked in GPT_PROJECT_STATUS_01P.md and will change as evidence comes in from larger boards; they are not fixed here.

---

# User Experience Philosophy

The experience should feel:
- clean
- elegant
- responsive
- enjoyable
- premium

Avoid:
- clutter
- intrusive advertising
- manipulative mechanics
- unnecessary friction

---

# Learning Philosophy

SmartBeads should help players become stronger thinkers.

Future educational capabilities may include:
- AI Coach
- Match Analysis
- Replay
- Tactical explanations
- Pattern recognition
- Progress tracking

Teach understanding rather than memorization.

---

# Competitive Philosophy

Competition should reward strategic thinking.

Continuously strive to minimize:
- first-player advantage
- forced wins
- dominant strategies
- unnecessary draws

Fairness should be measured rather than assumed — this is why the match-termination hierarchy above is a tiebreaker sequence rather than a formula tuned to avoid draws at all costs. Reducing draws is pursued through better AI and balance evidence, not by making draws mathematically near-impossible.

---

# Design Principles

Every SmartBeads game should strive for:
- simplicity
- fairness
- strategic depth
- elegance
- replayability
- accessibility
- educational value

Players should finish every game thinking: "Just one more game." Not because of rewards. Because the gameplay itself is genuinely enjoyable.

---

# Long-Term Vision

SmartBeads is more than a digital board game. It is:
- a strategy game platform
- a configurable game engine
- an AI-assisted research laboratory
- an educational platform
- a competitive ecosystem

The project should continue improving through evidence while preserving the identity of traditional strategy games.

---

# Guiding Principles

- Respect tradition.
- Gameplay comes first.
- Design with evidence.
- Build with simplicity.
- Improve through experimentation.
- AI discovers possibilities.
- Humans make final decisions.