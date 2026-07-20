Cursor Engineering Prompt
Core Principle
Design the workflow so that memory becomes less important than repository inspection and verification.
The repository is the source of truth.
AI should understand the current implementation before making decisions.
________________________________________
Engineering Workflow
Before Any Implementation
Before writing or changing code:
1.	Read the required project memory files.
2.	Inspect the current repository structure.
3.	Understand the existing architecture.
4.	Identify the authoritative implementation.
5.	Validate assumptions against actual files.
6.	Determine the minimum safe implementation.
Do not assume:
•	filenames
•	classes
•	methods
•	folder structure
•	architecture
•	missing features
If information already exists in the repository, use that source.
Only request clarification when genuinely required.
________________________________________
Objective Format
Use this structure for development tasks:
OBJECTIVE
The objective defines the outcome, not the implementation approach.
The repository determines the implementation.
________________________________________
ENGINEERING CONSTRAINTS
•	Preserve the existing architecture.
•	Extend existing components before creating new ones.
•	Avoid duplicate files, duplicate concepts, and parallel implementations.
•	Do not redesign unless the objective explicitly requires redesign.
•	Keep modules small, testable, and maintainable.
•	Preserve future extensibility.
•	Follow project memory and engineering principles.
•	Respect product rules and physical/game logic as the source of truth.
________________________________________
Architecture Rules
When multiple solutions exist:
Prefer the solution that:
1.	Fits the existing architecture.
2.	Reduces future complexity.
3.	Avoids duplicate concepts.
4.	Keeps future variants possible.
5.	Requires the least architectural disruption.
If the repository suggests a better implementation than the wording of the objective, follow the repository and explain the reasoning.
________________________________________
Verification Rules
Before completing any task:
Verify:
•	implementation correctness
•	architecture consistency
•	affected tests/build status
•	no unnecessary files were created
•	no duplicate concepts were introduced
Report:
1.	Meaningful changed files.
2.	Why each change was required.
3.	Architectural impact.
4.	Verification results.
Never invent:
•	files
•	test results
•	errors
•	architecture decisions
Clearly separate:
•	repository facts
•	assumptions
•	recommendations
________________________________________
SmartBeads Development Objective Template
OBJECTIVE
Review the SmartBeads repository and implement the requested engineering objective while preserving the existing architecture.
The implementation should continue using the configurable board engine and support future board variants.
The goal is to produce the smallest complete playable system that can later expand through progressive board variants:
4 → 5 → 6 → 7
________________________________________
SMARTBEADS ENGINEERING PRINCIPLES
•	Physical board model is the source of truth.
•	BoardDefinition/intersections/connections remain authoritative.
•	Configuration selects variants; configuration does not replace the board model.
•	Extend the engine instead of creating parallel systems.
•	Implement the minimum required capability.
•	Verify each completed capability before proceeding.
________________________________________
Completion Criteria
Produce a verified implementation that advances SmartBeads toward a playable version while remaining compatible with future board variants.
Before requesting product decisions:
Inspect repository and project memory again.
Determine whether approved:
•	board geometry
•	gameplay rules
•	product decisions
already exist.
If they exist:
•	identify the authoritative source
•	summarize it
Only request clarification for genuinely missing decisions.
________________________________________
Cursor Session Prompt
Use the Engineering Prompt.
Objective:
Constraints:
Completion Criteria:

