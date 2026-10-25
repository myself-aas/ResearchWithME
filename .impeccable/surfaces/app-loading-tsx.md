---
version: 1
slug: "app-loading-tsx"
primary_target: "app/loading.tsx"
related_targets: ["components/PageState.tsx"]
---

# Loading

Mode: Read

## Purpose
Set an honest expectation while a publication surface loads.

## First useful result
A visitor knows the archive is loading and can still navigate away.

## Direction
A restrained loading state with a status message and static skeleton lines; no spinner-only page or animated pulse that hides content.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Screen-reader status, slow network, reduced motion, and keyboard access.
