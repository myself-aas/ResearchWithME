---
version: 1
slug: "app-bookmarks-page-tsx"
primary_target: "app/bookmarks/page.tsx"
related_targets: ["components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Reading List

Mode: Operate

## Purpose
Review, export, and manage saved research.

## First useful result
A reader opens a saved item, exports the list, or clears it with confirmation and clear feedback.

## Direction
Use a simple document list with typographic hierarchy and generous spacing. Destructive actions are explicit and recoverable where possible.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Empty list, corrupted local storage, export failure, long titles, accidental clear, and mobile actions.
