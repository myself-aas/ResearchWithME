---
version: 1
slug: "app-author-id-page-tsx"
primary_target: "app/author/[id]/page.tsx"
related_targets: ["components/AuthorProfileCard.tsx","components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Author Profile

Mode: Read

## Purpose
Evaluate a contributor and browse their publication archive.

## First useful result
A reader sees credentials, metrics, and articles in a predictable hierarchy, then opens a paper.

## Direction
A broad biographical header uses the editorial system; the archive below is a quiet, scannable list without nested cards.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Unknown author, long biography, zero articles, filters with no results, bookmark persistence, and mobile layout.
