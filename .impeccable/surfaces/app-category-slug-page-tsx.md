---
version: 1
slug: "app-category-slug-page-tsx"
primary_target: "app/category/[slug]/page.tsx"
related_targets: ["components/HomeFeed.tsx","components/ArticleFeed.tsx"]
---

# Field Archive

Mode: Operate

## Purpose
Browse the article feed filtered to one research field.

## First useful result
A reader sees the field name and its matching reviews, with search preserved.

## Direction
Reuses the home feed with the field preselected; unknown slugs return a real 404.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Unknown slug, empty field, search query carried in the URL, and mobile layout.
