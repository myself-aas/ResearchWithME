---
version: 1
slug: "app-dashboard-reading-page-tsx"
primary_target: "app/dashboard/reading/page.tsx"
related_targets: ["components/dashboard/overview/primitives.tsx","lib/dashboard/metrics.ts","lib/dashboard/data.ts","components/cms/DashboardShell.tsx","components/dashboard/overview/ReadingList.tsx","lib/stores/preferences-store.ts"]
---

# Dashboard: My reading

Mode: Operate

## Purpose
Give every signed-in account one place to decide what to read next, see what is new in the archive, and check the state of their writer application.

## First useful result
A reader sees how much reading is on their saved list and picks the shortest article, or opens something published since the previous period.

## Direction
Three headline figures, not four: reading list (lead), new in the archive, account access. Then the saved list shortest-first beside new articles by discipline, then the new articles as a table marked with what is already saved. Hairline-divided figures rather than floating cards, serif numerals, brand for the selected period and a neutral rule for the comparison period. Follows the dashboard-designer skill: lead figure top-left, chart titles that state the finding, one period filter above everything, source and timestamp in the footer.

## Constraints
- Uses the shared platform masthead and footer and the dashboard sidebar; no bespoke chrome.
- Every headline figure carries a comparison (previous period or a stated target) and a link to where the action is taken. A figure that cannot be read shows a dash and a reason, never zero.
- Each figure carries a "How this is counted" disclosure fed from the single `DEFINITIONS` registry in `lib/dashboard/metrics.ts`, so one metric never has two meanings across dashboards.
- One period filter (4, 12, 52 weeks; default 4) drives every panel and lives in the URL. No automatic refresh.
- Status is a dot plus a word; red is reserved for a missed target. Bars are labelled with their values and repeated as a screen-reader table.
- Server-rendered and static: no animation of measurements. Tables scroll inside their own region; the page does not scroll sideways at 320px.
- Targets (stalled draft: 14 days; application decision: 7 days) are constants in `lib/dashboard/metrics.ts`.

## Checks
Empty reading list, storage blocked, before hydration (dash, not zero), empty archive, pending / declined / approved application, demo mode, 12- and 52-week periods, 320px width, dark mode.
