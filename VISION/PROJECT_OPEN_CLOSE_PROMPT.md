# Project Open & Close Prompt

This workflow applies to every project in the repository.

Project:

PROJECTS/<Project>

Examples:

PROJECTS/SmartBeads
PROJECTS/SmartLabs
PROJECTS/SmartEmergency
PROJECTS/SmartShield

==================================================
PROJECT STARTUP
===============

Read:

1. VISION/VISION_AI_WORKFLOW.md
2. PROJECTS/<Project>/PROJECT_MAP_05P.md
3. PROJECTS/<Project>/GPT_PROJECT_RULES_01P.md
4. PROJECTS/<Project>/GPT_PROJECT_STATUS_01P.md

Objectives:

* Understand the current project state.
* Respect the project rules and current architecture.
* Follow VISION.
* Continue from the current milestone.
* Focus on building, not redesigning.
* Prefer updating existing files over creating new ones.

==================================================
PROJECT SHUTDOWN
================

Project:

PROJECTS/<Project>

Review and update only if required:

PROJECTS/<Project>/PROJECT_MAP_05P.md
PROJECTS/<Project>/GPT_PROJECT_RULES_01P.md
PROJECTS/<Project>/GPT_PROJECT_STATUS_01P.md

Repository-wide updates (only if required):

GPT_Enterprise_Vault/PROJECT_MAP_05P.md
VISION/VISION_AI_WORKFLOW.md

Verify:

* All changes reviewed.
* No unintended files created.
* No obsolete files remain.
* Documentation reflects today's work.

Git:

git add .
git commit -m "<meaningful message>"
git push
git status

Cline:

* Sync workspace.
* Verify no unexpected file modifications.
* Confirm the project is ready for the next session.

Session ends only when:

✓ Documentation is current.
✓ GitHub is synchronized.
✓ Working tree is clean.

If no document requires an update, do not modify it.
