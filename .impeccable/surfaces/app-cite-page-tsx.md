---
version: 1
slug: "app-cite-page-tsx"
primary_target: "app/cite/page.tsx"
related_targets: ["components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Citation Builder

Mode: Operate

## Purpose
Produce an accurate, copyable citation for a publication or custom source.

## First useful result
A researcher selects a source and format, then copies a valid citation with confirmation.

## Direction
Standard labeled controls, a readable output field, and format tabs. Monospace is reserved for citation data.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive pop-ups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Missing custom fields, clipboard failure, long DOI, empty output, mobile layout, and keyboard focus.
