---
version: 1
slug: "app-review-id-page-tsx"
primary_target: "app/review/[id]/page.tsx"
related_targets: ["components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Formal Peer Review Detail

Mode: Audit & Decide

## Purpose
Display a version-locked FormalReview with structured ReviewItems, author Rebuttals, and Formal Decisions while enforcing reviewer anonymity redaction (ADR-032-05).

## First useful result
A researcher or editor reads structured review items, linked author rebuttals, and editorial decision rationale anchored to a specific contribution version.

## Direction
Ordered editorial sequence: metadata header -> structured items -> author rebuttals -> decisions.

## Constraints
- Strictly mask evaluator identity whenever `anonymous === true`.
- WCAG 2.1 AA contrast and accessible heading hierarchy.

## Checks
Version lock badge, masked reviewer identity, review item status pills, rebuttals list, and decision rationale.
