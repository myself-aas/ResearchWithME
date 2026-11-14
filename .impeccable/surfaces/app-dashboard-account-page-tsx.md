---
version: 1
slug: "app-dashboard-account-page-tsx"
primary_target: "app/dashboard/account/page.tsx"
related_targets: ["components/account/ApiKeys.tsx","components/billing/CheckoutButton.tsx","components/billing/LemonSqueezyScript.tsx","components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Account

Mode: Operate

## Purpose
Answer two questions and get out of the way: what have I bought and is it still running, and which API keys do I hold and how much of this month's allowance is used.

## First useful result
A reader can tell what they have bought and, if they still hold a co-pilot subscription from before it was withdrawn, whether it is active, how many credits remain, when it renews, and what to do if a payment failed.

## Direction
A definition list for the facts (status, plan, credits), then receipts in prose, then anything still on sale. State is a word first and a colour second: `Past due` and `Ended` are readable without the alert styling, and the note underneath says what happens next. No account-settings furniture that is not implemented — notably no billing-portal button until the portal URL is documented.

API keys sit between purchases and what is on sale, as one section at the same level as the others: a sentence stating use against the monthly allowance, the keys as a divided list (name, first characters, created, last used, status), and one form with one primary action, "Create key". A new key is shown once in a read-only field beside "Copy" and "Done", with the sentence "This key is shown once. Store it now."; after "Done" only its first characters remain. Revoking asks for confirmation inline, in the row, naming the key and the consequence; there is no modal. An unknown usage count is a dash, never zero.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
No purchases, active, past due (access retained with a payment warning), expired (no "Active" anywhere on the page), a signed-out visit (the dashboard layout redirects before this page renders), and a 320px reflow. For keys: none yet, one active, one revoked, a just-created key (shown once, gone after Done), the sixth-key refusal, a failed load (the section says so and the rest of the page still renders), and an unreadable usage count (dash).
