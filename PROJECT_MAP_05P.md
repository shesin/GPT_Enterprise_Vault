# GPT_Enterprise_Vault Project Map

## Structure

```text
GPT_Enterprise_Vault/
│
├── PROJECTS/          # Independent software projects
├── SHARED/            # Reusable engines and shared components
├── VISION/            # Agent prompts — see PROJECT_MAP agent-prompt table (external AI vs Cursor)
│
├── PROJECT_MAP_05P.md # Repository map
├── package.json
├── package-lock.json
└── .gitignore
```

## Summary

GPT_Enterprise_Vault is the central repository for all software projects.

* **PROJECTS** contains independent products.
* **SHARED** contains reusable technology shared across projects.
* **VISION** contains agent prompts and workflow rules. **`AI_PROMPT_01.md`** is for external architect chat (human paste — Cursor does not load it). Cursor uses **`CURSOR_PROMPT_01.md`** and **`AGENT_RULE_05P.md`**. Details in each project's `PROJECT_MAP_05P.md`.

Each project maintains its own:

* PROJECT_MAP_05P.md
* GPT_PROJECT_RULES_01P.md
* GPT_PROJECT_STATUS_01P.md

The repository is organized to maximize reuse, minimize duplication, and support long-term project development.
