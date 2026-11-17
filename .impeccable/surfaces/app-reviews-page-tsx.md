---
version: 1
slug: "app-reviews-page-tsx"
primary_target: "app/reviews/page.tsx"
related_targets: ["components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Formal Peer Reviews Directory

Mode: Evaluate & Audit

## Purpose
List version-locked formal peer reviews separated from open discussion threads, preserving anonymous-reviewer privacy invariants (ADR-032-05).

## First useful result
A researcher inspects formal review status, linked contribution versions, structured item/rebuttal counts, and review decisions without exposing anonymous reviewer identities.

## Direction
Structured editorial ledger emphasizing version lock, review scope, and decision clarity.

## Constraints
- Never expose `reviewerName` or `reviewerHandle` when `anonymous === true`.
- WCAG 2.1 AA contrast and keyboard navigation.

## Checks
Anonymous reviewer redaction, version lock tags, decision summaries, and links to `/review/[id]` and `/contribution/[slug]`.
