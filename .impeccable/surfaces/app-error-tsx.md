---
version: 1
slug: "app-error-tsx"
primary_target: "app/error.tsx"
related_targets: ["components/PageState.tsx"]
---

# Recoverable Error

Mode: Read

## Purpose
Explain a failed request and provide a safe recovery path.

## First useful result
A visitor can retry, return home, or browse papers without losing confidence or stored data.

## Direction
A quiet error surface with an explicit alert, no invented cause, and visible primary and secondary actions.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive pop-ups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Network failure, repeated errors, keyboard focus, reduced motion, and screen-reader announcement.
