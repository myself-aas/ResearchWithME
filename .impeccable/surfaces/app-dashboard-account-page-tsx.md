---
version: 1
slug: "app-dashboard-account-page-tsx"
primary_target: "app/dashboard/account/page.tsx"
related_targets: ["components/account/ApiKeys.tsx"]
---

# Account

Mode: Operate

## Purpose
Manage free API keys, inspect the monthly allowance, and reach profile and identity settings. There is no storefront or paid access.

## Direction
A single scrolling column. State the free monthly allowance, then list API keys and provide the create/revoke controls. Show a new key once, with Copy and Done. Unknown usage is a dash, never an invented zero. Key-loading failures must not hide profile settings or imply an empty key list.

## Constraints
- Shared dashboard shell owns the site header and footer.
- Semantic headings, visible focus, 44px actions, and reflow to 320px.
- No sales calls to action, payment scripts, purchase history, or subscription plans.

## Checks
No keys, existing keys, revoked keys, create/revoke failures, unknown usage, unavailable key store, absent sign-in configuration, profile links, and no payment integration. Browser reflow and keyboard checks remain required.
