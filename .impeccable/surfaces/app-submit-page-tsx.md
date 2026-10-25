---
version: 1
slug: "app-submit-page-tsx"
primary_target: "app/submit/page.tsx"
related_targets: ["components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Manuscript Submission

Mode: Operate

## Purpose
Submit a manuscript or reproducible artifact for editorial review.

## First useful result
A contributor completes the required fields and receives a clear success or recoverable error state.

## Direction
A standard form with grouped fields, explicit requirements, preserved input on failure, and a single primary action.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Validation, duplicate submission, network failure, long abstract, file URL safety, and mobile keyboard use.
