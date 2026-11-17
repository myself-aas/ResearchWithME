---
version: 1
slug: "app-evidence-page-tsx"
primary_target: "app/evidence/page.tsx"
related_targets: ["components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Canonical Evidence Registry

Mode: Inspect & Verify

## Purpose
Provide a first-class directory of source-version-bound scholarly evidence units with structured locators, extraction methods, quotations, and explicit limitations (ADR-032-01).

## First useful result
A researcher scans verified evidence units, reviews exact source locators and limitations, and opens individual evidence records or linked claims.

## Direction
Prioritize source binding, structured locators, and limitations without visual clutter.

## Constraints
- WCAG 2.1 AA contrast and keyboard-accessible links.
- Reflow cleanly from 320px to 1920px.

## Checks
Locator display, limitation prominence, linked claim counts, and navigation to `/evidence/[id]` and `/source/[id]`.
