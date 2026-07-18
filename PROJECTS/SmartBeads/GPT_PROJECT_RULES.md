# SmartBeads Project Rules

## Purpose

This document contains permanent design rules for SmartBeads.

These rules define what SmartBeads must remain throughout development.

Do not add temporary implementation details, module objectives, project status, or next actions here.

---

## Rule 1 - Preserve the Physical Game

Model SmartBeads after the real physical bead board.

Represent the board using its actual intersections and legal connections rather than an arbitrary square grid.

---

## Rule 2 - Preserve Gameplay

Do not change the core gameplay simply to make implementation easier.

New rules or changes should be introduced only when they clearly improve gameplay and are approved as project decisions.

---

## Rule 3 - Grow Architecture Only When Needed

The software architecture should evolve with the project.

Do not create files, classes, abstractions, or systems before there is a demonstrated need.

Prefer extending existing code until a clear responsibility requires separation.

