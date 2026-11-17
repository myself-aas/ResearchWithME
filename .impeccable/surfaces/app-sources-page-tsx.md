---
version: 1
slug: "app-sources-page-tsx"
primary_target: "app/sources/page.tsx"
related_targets: ["components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Canonical Sources Directory

Mode: Browse & Verify

## Purpose
Expose first-class canonical scholarly sources with immutable version counts, normalized identifiers (DOI, arXiv, GitHub), and prominent integrity status badges (ADR-032-01).

## First useful result
A researcher inspects canonical source records, checks retraction/correction status at a glance, and navigates directly to source provenance or the contribution wizard.

## Direction
Calm, legible scholarly index cards using semantic tokens and LTR-isolated external identifiers.

## Constraints
- WCAG 2.1 AA contrast, semantic landmarks, and 44px touch targets.
- Reflow cleanly from 320px to 1920px with zero horizontal overflow.

## Checks
Integrity status badges, identifier formatting, version counts, and deep links to `/source/[id]` and `/evidence`.
