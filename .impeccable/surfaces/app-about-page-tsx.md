---
version: 1
slug: "app-about-page-tsx"
primary_target: "app/about/page.tsx"
related_targets: ["components/AboutPage.tsx","components/billing/ServicesShowcase.tsx","lib/seo/jsonld.ts"]
---

# About and Editorial Charter

Mode: Read

## Purpose
State plainly how ResearchWithMe publishes open-access paper reviews and repository teardowns.

## First useful result
A reader understands who publishes here and under what standards within one screen.

## Direction
Long-form serif reading column with clear section headings; claims limited to what the platform actually does. A "How the work is funded" section names the paid products and their prices as a plain list and links to `/pricing`; it sells nothing itself.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Heading order, long lines at 320px, JSON-LD validity, and no claims of indexing, DOIs or peer review the platform cannot back.
