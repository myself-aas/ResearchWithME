---
version: 1
slug: "app-assistant-page-tsx"
primary_target: "app/assistant/page.tsx"
related_targets: ["components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Research Assistant

Mode: Operate

## Purpose
Ask a grounded question and receive a cited answer from the platform corpus.

## First useful result
A scholar submits a query, sees a scoped source, and receives an answer with citations or a clear error and retry.

## Direction
Use a standard form and result panel with the archival palette. Status is text plus a static indicator; no pulsing dot or cyan-on-dark AI styling.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Empty query, long query, API failure, no results, copied answer, loading state, reduced motion, and keyboard access.
