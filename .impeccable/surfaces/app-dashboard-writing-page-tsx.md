---
version: 1
slug: "app-dashboard-writing-page-tsx"
primary_target: "app/dashboard/(studio)/writing/page.tsx"
related_targets: ["components/dashboard/overview/primitives.tsx","lib/dashboard/metrics.ts","lib/dashboard/data.ts","components/cms/DashboardShell.tsx"]
---

# Dashboard: My writing

Mode: Operate

## Purpose
Show one writer their own byline: what to finish next, how their publishing compares with the previous period, and how readers responded.

## First useful result
A writer sees how many drafts are in progress and which are ready to publish, and opens the one that needs the least work.

## Direction
Personal and operational, five headline figures with a wide lead: drafts in progress (lead), published, days from first save to publication, likes per article against the average for other writers, comments on my articles. Drafts table first, then the publishing trend beside most-liked articles, then the published list. Hairline-divided figures rather than floating cards, serif numerals, brand for the selected period and a neutral rule for the comparison period. Follows the dashboard-designer skill: lead figure top-left, chart titles that state the finding, one period filter above everything, source and timestamp in the footer.

## Constraints
- Uses the shared platform masthead and footer and the dashboard sidebar; no bespoke chrome.
- Every headline figure carries a comparison (previous period or a stated target) and a link to where the action is taken. A figure that cannot be read shows a dash and a reason, never zero.
- Each figure carries a "How this is counted" disclosure fed from the single `DEFINITIONS` registry in `lib/dashboard/metrics.ts`, so one metric never has two meanings across dashboards.
- A "Needs attention" list sits directly under the figures, missed targets first, each with the link that fixes it; when empty it says so. The comment-volume alert uses a moving baseline (two standard deviations over the recent mean), not a fixed threshold.
- One period filter (4, 12, 52 weeks; default 4) drives every panel and lives in the URL. No automatic refresh.
- Status is a dot plus a word; red is reserved for a missed target. Bars are labelled with their values and repeated as a screen-reader table.
- Server-rendered and static: no animation of measurements. Tables scroll inside their own region; the page does not scroll sideways at 320px.
- Targets (stalled draft: 14 days; application decision: 7 days) are constants in `lib/dashboard/metrics.ts`.

## Checks
Account with no author profile, unpublished profile, no drafts, nothing published, no other writer to compare with, demo mode (byline inferred and labelled), 320px width, dark mode.
