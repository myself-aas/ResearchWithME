---
version: 1
slug: "app-dashboard-desk-page-tsx"
primary_target: "app/dashboard/(studio)/desk/page.tsx"
related_targets: ["components/dashboard/overview/primitives.tsx","lib/dashboard/metrics.ts","lib/dashboard/data.ts","components/cms/DashboardShell.tsx"]
---

# Dashboard: Desk overview

Mode: Operate

## Purpose
Show an editor what needs a decision today across the whole desk, and whether publishing is up or down on the previous period.

## First useful result
An editor sees how many writer applications are waiting and whether any is past the 7-day target, then opens the queue, the stalled drafts, or the comments in one click.

## Direction
Operational, five headline figures with a wide lead: applications awaiting a decision (lead), published, drafts idle 14+ days, days from first save to publication, comments. Then the publishing trend beside coverage by discipline, then drafts, writers, and the pending queue as tables. Hairline-divided figures rather than floating cards, serif numerals, brand for the selected period and a neutral rule for the comparison period. Follows the dashboard-designer skill: lead figure top-left, chart titles that state the finding, one period filter above everything, source and timestamp in the footer.

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
Empty archive, archive read failure, demo mode (no application queue), no pending applications, an overdue application, all drafts fresh, 52-week period, 320px width, dark mode.
