---
version: 1
slug: "app-pricing-page-tsx"
primary_target: "app/pricing/page.tsx"
related_targets: ["lib/billing/catalogue.ts","components/billing/CheckoutButton.tsx","components/billing/LemonSqueezyScript.tsx","components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Pricing

Mode: Persuade

## Purpose
Sell the two digital products without implying that reading is one of them. Services are not sold here: the payment provider prohibits them.

## First useful result
A reader understands what costs money, confirms that the archive stays free, and either starts a checkout or signs in to start one.

## Direction
The page follows the order of a buyer's doubts: what is already free, what each product lets them do, who it is for, what the catch is, who takes the money, and what happens afterwards.

- A ruled strip under the title lists what is free, with links, before any price appears.
- Two plain cards, one per product. Each leads with the outcome in the buyer's terms, then the price in the same words the catalogue uses, a short line on how it is charged, what is included, who it is for, how it is delivered, and one honest limit ("Worth knowing first").
- "How buying works" is three numbered steps. "Questions before you pay" is a native disclosure list answering the objections a first-time buyer has about a merchant of record, accounts, subscriptions, and refunds.
- All product copy comes from `lib/billing/catalogue.ts`; the page adds no claim the catalogue or `docs/billing.md` does not make.

No badges, no "most popular" label, no comparison table, no strikethrough "was" price, no countdown, no customer counts or testimonials until real ones exist. Typography carries the hierarchy; the only accent colour is the primary action. See `.agents/product-marketing.md` for the reasoning.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks; each card is a section with a heading of its own.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Signed-out state (the action is a link to sign in, not a button that fails), signed-in state (the action is a checkout button), a failed checkout (an inline alert on the card, page still usable), a 320px reflow, and a keyboard-only purchase from the first card to the overlay opening.

## Added 2026-11-14

- A product whose checkout is not configured shows a plain "Not on sale yet" note in place of the buy button, for signed-in and signed-out readers alike. No disabled button, no waiting list.
- A "Free downloads" section follows the product. Each card states what is in the file, what the reader needs to run it, and its limit, then one download link. No account, no email capture. The link is a secondary-weight control so the page still has one primary action.

## Added 2026-11-14: second product

The Statistical Table Generator ($5, one payment) is the second product card. It follows the same card pattern and
the same "Not on sale yet" note until `LEMONSQUEEZY_VARIANT_STAT_TABLES` is set. Its copy states the requirement
(Python and a terminal), what it leaves out, and that free programs cover more; it points to the free Research
Toolkit as the way to try it. The page no longer says there is one thing for sale.
