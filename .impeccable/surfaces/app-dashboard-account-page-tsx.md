---
version: 1
slug: "app-dashboard-account-page-tsx"
primary_target: "app/dashboard/account/page.tsx"
related_targets: ["components/billing/CheckoutButton.tsx","components/billing/LemonSqueezyScript.tsx","components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Account

Mode: Operate

## Purpose
Answer one question — what have I bought, and is it still running — and get out of the way.

## First useful result
A reader can tell what they have bought and, if they still hold a co-pilot subscription from before it was withdrawn, whether it is active, how many credits remain, when it renews, and what to do if a payment failed.

## Direction
A definition list for the facts (status, plan, credits), then receipts in prose, then anything still on sale. State is a word first and a colour second: `Past due` and `Ended` are readable without the alert styling, and the note underneath says what happens next. No account-settings furniture that is not implemented — notably no billing-portal button until the portal URL is documented.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
No purchases, active, past due (access retained with a payment warning), expired (no "Active" anywhere on the page), a signed-out visit (the dashboard layout redirects before this page renders), and a 320px reflow.
