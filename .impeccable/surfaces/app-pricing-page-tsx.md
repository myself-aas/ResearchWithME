---
version: 1
slug: "app-pricing-page-tsx"
primary_target: "app/pricing/page.tsx"
related_targets: ["components/billing/CheckoutButton.tsx","components/billing/LemonSqueezyScript.tsx","components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Pricing

Mode: Persuade

## Purpose
Sell three products without implying that reading is one of them.

## First useful result
A reader understands what costs money, confirms that the archive stays free, and either starts a checkout or signs in to start one.

## Direction
Three plain cards, one per product, each naming its price in the same words the catalogue uses. No badges, no comparison table, no strikethrough "was" price, no countdown. The section below the cards explains who charges the card and where the purchase appears afterwards, because a merchant of record is not obvious to a first-time buyer. Typography carries the hierarchy; the only accent colour is the primary action.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks; each card is a section with a heading of its own.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Signed-out state (the action is a link to sign in, not a button that fails), signed-in state (the action is a checkout button), a failed checkout (an inline alert on the card, page still usable), a 320px reflow, and a keyboard-only purchase from the first card to the overlay opening.
