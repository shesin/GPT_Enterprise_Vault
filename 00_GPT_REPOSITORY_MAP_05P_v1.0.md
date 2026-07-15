# GPT Enterprise Vault
## Repository Map
Version: v1.0
Status: Production
Owner: Rose & Lotus Engineering

---

# Purpose

The GPT Enterprise Vault is the single source of truth for all company ideas, engineering knowledge, AI workflows, software projects, research, documentation, reusable code, and experiments.

The repository is designed to be understandable by both humans and AI assistants.

Every file must have one clear purpose and one obvious location.

---

# Repository Philosophy

The repository is organized around three principles:

1. Every document answers one primary question.
2. Git is the permanent source of truth.
3. Documentation exists to enable engineering, not replace engineering.

---

# Repository Structure

```
Gpt_Enterprise_Vault
│
├── ENTERPRISE
├── PROJECTS
├── LABS
├── src
├── TEMPLATES
└── README
```

---

# Folder Guide

## ENTERPRISE

Purpose

Stores permanent company knowledge.

Contains:

• Core
• Standards
• Working
• Templates

Never place source code here.

---

## ENTERPRISE/Core

Purpose

Permanent engineering knowledge.

Typical files:

01_GPT_BOOTSTRAP

02_GPT_MASTER_INDEX

03_GPT_GLOBAL_VISION

04_GPT_ENTERPRISE_RULES

05_GPT_ENTERPRISE_STRUCTURE

06_GPT_AI_STANDARD

07_GPT_DOCUMENT_STANDARD

08_GPT_ENGINEERING_PHILOSOPHY

09_GPT_ENGINEERING_ROADMAP

These documents change rarely.

---

## ENTERPRISE/Working

Purpose

Current engineering status.

Typical files:

GPT_PROJECT_STATUS

GPT_NEXT_ACTIONS

GPT_DECISIONS

GPT_CHANGELOG

GPT_SESSION_SUMMARY

These documents are updated frequently.

---

## ENTERPRISE/Standards

Purpose

Company standards.

Examples:

Documentation Standard

Coding Standard

Naming Standard

Testing Standard

---

## ENTERPRISE/Templates

Purpose

Reusable templates.

Never edit templates directly.

Always copy before use.

---

## PROJECTS

Purpose

Every product has its own folder.

Example:

SmartBeads

ShieldAI

SmartEmergency

SmartChess

Future products

Each project is self-contained.

---

## Project Folder

Every project should contain:

Project Vision

Project Status

Next Actions

Decisions

Documentation

Assets

Source Code

Tests

Releases

---

## LABS

Purpose

Research.

Experiments.

Proof of concepts.

Nothing inside LABS is considered production-ready.

---

## src

Purpose

Reusable production code shared across projects.

Examples:

Game Engine

Rule Engine

Replay Engine

Statistics Engine

Utility libraries

---

## TEMPLATES

Purpose

General reusable templates that are not enterprise specific.

---

# Document Hierarchy

Repository

↓

Enterprise

↓

Project

↓

Code

---

# AI Navigation

Every AI assistant should begin with:

ENTERPRISE/Core/01_GPT_BOOTSTRAP_01P_v1.0.md

The Bootstrap determines which additional documents should be read.

Users should never need to remember multiple startup documents.

---

# Naming Convention

Core documents

01_GPT_BOOTSTRAP_01P_v1.0.md

Working documents

GPT_PROJECT_STATUS.md

Version format

v1.0

v1.1

v2.0

Page limits

01P

05P

10P

---

# Source of Truth

Repository State

Git Repository

Project Status

GPT_PROJECT_STATUS.md

Architecture Decisions

GPT_DECISIONS.md

Current Work

GPT_NEXT_ACTIONS.md

Company Vision

GPT_GLOBAL_VISION_05P_v1.0.md

---

# Engineering Workflow

Vision

↓

Architecture

↓

Implementation

↓

Testing

↓

Release

↓

Maintenance

Documentation supports this workflow.

Documentation is never the final product.

Working software is the goal.

---

# Repository Rule

When unsure where a file belongs:

1. Does it describe the company?

→ ENTERPRISE

2. Does it belong to one product?

→ PROJECTS

3. Is it experimental?

→ LABS

4. Is it reusable code?

→ src

5. Is it reusable documentation?

→ Templates

---

# Success Criteria

A new engineer or AI assistant should be able to understand:

• What this repository is.

• Where information lives.

• Where new files belong.

• How projects are organized.

• Where to begin.

within five minutes.

---

End of Document