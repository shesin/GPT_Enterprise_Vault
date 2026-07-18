\# VISION\_AI\_WORKFLOW



\## Memory Architecture



\### GPT Files



\* GPT files are short active memory.

\* They help start a project quickly.

\* Keep them within defined size limits (1P / 5P style).

\* When they become full, replace/update them. Do not keep growing versions.



\### VISION Files



\* VISION stores only permanent principles and rules.

\* VISION is not daily memory.

\* Use VISION when decisions, workflow, or architecture principles need to be recalled.

\* Keep VISION minimal. Create new VISION files only when absolutely necessary.



\## Project Memory Model



\* Every project has its own PROJECT\_MAP.md.

\* PROJECT\_MAP starts with structure, then summary.

\* Project GPT files stay inside the project folder.

\* Project files describe current work; VISION describes permanent rules.



\## Vault Structure Principle



\* Gpt\_Enterprise\_Vault is the main container.

\* Root PROJECT\_MAP explains the complete vault structure and project relationships.

\* Projects explain themselves through their own PROJECT\_MAP.

\* SHARED contains reusable technology.



\## AI Working Rules



\* Prefer building over documentation.

\* Do not create unnecessary files.

\* Do not redesign architecture without approval.

\* Ask questions when structure or decisions are unclear.

\* Preserve previous decisions instead of reinventing solutions.



\## Cline Safety



\* Give Cline small scoped tasks.

\* Avoid broad repo-wide cleanup instructions.

\* Verify meaningful changes before proceeding.

\* Do not allow automatic restructuring without review.




## Repository Hygiene

Keep the vault focused on permanent assets:
- decisions
- maps
- source code
- project documentation

Do not store temporary generated folders:
- node_modules
- build outputs
- caches
- machine-specific files

Temporary dependencies can be regenerated when required.

Engineering progress is measured by completed, working features, not by the amount of code or documentation produced.

If a task is likely to take more than 30–60 minutes without producing something testable, stop and split it into smaller tasks before continuing.

Small, verified progress is preferred over large, unverified progress.


## Module-Based Development

Develop software one complete module at a time.

Before implementation, define:

Objective:
A single sentence describing exactly what the module must accomplish.

Completion Criteria:
A single sentence describing how the module will be verified as complete.

Workflow:

Objective
→ Discuss
→ Implement
→ Test
→ Verify against Completion Criteria
→ Commit
→ Next Module

Do not begin the next module until the current module satisfies its completion criteria.

A module is either complete or incomplete.
Avoid partially finished modules.

