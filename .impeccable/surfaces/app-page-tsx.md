---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["components/BlogHeader.tsx","components/BlogHero.tsx","components/ArticleFeed.tsx","components/FeaturedArticle.tsx","components/billing/ServicesShowcase.tsx"]
---

# Home / Article Feed

Mode: Persuade

## Purpose
Help researchers find a rigorous article quickly and understand why the platform is trustworthy.

## First useful result
A reader lands on a readable lead article, can search or filter the catalog, and opens a dedicated article page without a modal interrupting the task.

## Direction
Use the archival editorial system: warm parchment ground, Aptos Serif display and reading type under a double-ruled masthead, amber actions, emerald verification cues, and a calm reading measure. Keep the article hierarchy bold and the feed compact but legible.

Services appear twice, both quietly: a short entry in the hero's summary column linking to `/pricing`, and one ruled band (`ServicesShowcase`) between the lead article and the index. The band states what is free before what is sold, links out instead of starting a checkout, and is hidden whenever a search or filter is active so results are never pushed down.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Search, category and format filters, bookmark persistence, featured link, services band (present on the unfiltered page, absent under search or a filter), author link, mobile navigation, narrow viewport, and reduced motion.
