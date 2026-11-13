---
version: 1
slug: "app-global-error-tsx"
primary_target: "app/global-error.tsx"
related_targets: ["components/PageState.tsx"]
---

# Fatal Error Boundary

Mode: Operate

## Purpose
Recover when the root layout itself fails to render.

## First useful result
A visitor sees what happened and can retry or reload the platform.

## Direction
Self-contained html shell using PageState with an alert role and a Retry button; no dependence on the failed layout.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Retry resets the boundary, alert role is announced, the page renders without the root layout, and mobile layout.
