---
version: 1
slug: "app-write-page-tsx"
primary_target: "app/write/page.tsx"
related_targets: ["components/BlogHeader.tsx","components/BlogFooter.tsx","lib/auth-context.tsx"]
---

# Writer Studio

Mode: Operate

## Purpose
Draft, preview, and publish a structured research review without losing work.

## First useful result
An author writes, sees a faithful preview, validates required fields, and publishes or recovers from an error with the draft intact.

## Direction
A standard editor shell with draft autosave status, clear labels, and a print-like preview. The visual system lives in type, palette, density, and the article signature.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive pop-ups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Autosave failure, permission denial, duplicate publish, long title, long content, empty required fields, and mobile form use.
