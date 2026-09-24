# SHEKHAR_PROMPT_01.md

Human-side companion to `VISION/CURSOR_PROMPT_01.md`. Agent rules: `.cursor/rules/instruction-fidelity.mdc`.

The agent is a machine. It matches **patterns** and **literal words**. **“All” means all.** It does not share human memory after a handoff.

**webpage design**( for claude) Workflow: I design the layout in the "Hub Layout Builder" mockup (
Hub Layout Builder
) — drag, resize, edit text there. When I say a section is ready, you read its saved state via ArtifactData (collection layout, doc current) and replicate it into the real page (index.html / play-hub.css / PlayHub.ts in PROJECTS/SmartBeads/src/playtest/web/) at exact 1:1 fidelity — same sizes, same gaps, same positions. Do not shrink, compress, or "clean up" spacing.

**failing execution**( for claude) : Problem is instruction is not clear.
Once its clear its done.
little remark ok but not more. quit and come back to work.

**Before you ask for edits:** say **what** (one thing), **where** (segment / file / “audio only”), and **out of scope** (“rest don’t touch”). Then **`Go — …`** only if the agent’s scope block matches.

**Avoid alone:** fix all mess, fix everything, clean up, polish, just fix it, you know what I mean, go (with no scope). These sound like the whole page or whole repo.

**Say instead:** “Resign segment only: duplicate audio + missing glow. Rest don’t touch. Go when scope matches.”

**Not approval:** silence, frustration, bravo, old context, “fix all mess” without naming the place.

**If you slip into human chat:** the agent should ask one short question — “Which part only?” — not start editing.

**Quick check:** one behaviour named? out of scope said? **Go** if you want edits? If not, say **plan only / no edit**.

You own the product. Narrow words + **Go** = good milestones.
