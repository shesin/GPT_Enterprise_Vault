# GPT Document Standard
Version: v1.0
Status: Production
Purpose: Repository Documentation Standard

---

# Objective

This document defines the standard for creating, naming, organizing, updating, and maintaining all documentation within the GPT Enterprise Vault.

The goal is consistency, simplicity, and long-term maintainability.

---

# Documentation Principles

Every document must:

• Have one primary purpose.

• Be placed in one obvious location.

• Avoid duplicate information.

• Support engineering.

Documentation exists to enable software development, not replace it.

---

# Documentation Hierarchy

Level 0

Repository

↓

Level 1

Enterprise

↓

Level 2

Project

↓

Level 3

Working Documents

↓

Code

---

# Document Categories

## Repository Documents

Describe the entire repository.

Examples:

Repository Map

README

---

## Enterprise Documents

Describe company-wide knowledge.

Examples:

Global Vision

Engineering Philosophy

AI Standard

Document Standard

Roadmap

---

## Project Documents

Describe one product.

Examples:

Project Vision

Project Status

Game Rules

Architecture

Design Documents

---

## Working Documents

Describe the current state of development.

Examples:

Project Status

Next Actions

Decisions

Changelog

Session Summary

These documents change frequently.

---

# Naming Convention

Core Documents

01_GPT_BOOTSTRAP_01P_v1.0.md

02_GPT_MASTER_INDEX_01P_v1.0.md

03_GPT_GLOBAL_VISION_05P_v1.0.md

Working Documents

GPT_PROJECT_STATUS.md

GPT_NEXT_ACTIONS.md

GPT_DECISIONS.md

GPT_CHANGELOG.md

GPT_SESSION_SUMMARY.md

Project Documents

GPT_PROJECT_VISION_05P.md

GPT_GAME_RULES_10P.md

GPT_ARCHITECTURE_10P.md

---

# Prefix Rules

GPT_

Reserved for engineering documentation.

SMART_

Reserved for products.

No unnecessary prefixes.

---

# Numbering Rules

Permanent documents

01

02

03

...

Working documents

No numbering.

Reason:

Working documents evolve continuously.

---

# Page Limits

01P

Quick reference.

Maximum one page.

Examples

Bootstrap

Master Index

---

05P

Medium reference.

Vision

Standards

Roadmaps

---

10P

Large reference.

Architecture

Game Rules

Specifications

Avoid documents larger than 10 pages whenever practical.

Split documents by topic instead.

---

# Versioning

Major

v1.0

v2.0

Minor

v1.1

v1.2

v1.3

Increase:

Major

When structure changes significantly.

Minor

For content improvements.

---

# Update Rules

Permanent documents

Update rarely.

Working documents

Update continuously.

Templates

Never edit directly.

Copy before use.

---

# AI Rules

AI assistants should:

Read Bootstrap first.

Update existing documents instead of creating duplicates.

Prefer editing over expanding.

Avoid unnecessary documentation.

Produce working software whenever possible.

---

# Documentation Lifecycle

Create

↓

Review

↓

Use

↓

Update

↓

Archive

Delete only when the information is obsolete and preserved elsewhere.

---

# Repository Rule

If unsure where a document belongs:

Repository-wide

→ Repository Root

Company-wide

→ ENTERPRISE

Project-specific

→ PROJECTS

Temporary

→ Working

Reusable

→ Templates

---

# Success Criteria

A new engineer or AI assistant should understand:

Where to create a document.

How to name it.

How large it should be.

When to update it.

Within five minutes.

---

# End of Document