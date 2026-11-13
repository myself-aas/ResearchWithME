---
version: 1
slug: "app-dashboard-applications-page-tsx"
primary_target: "app/dashboard/(studio)/applications/page.tsx"
related_targets: ["components/dashboard/ApplicationQueue.tsx","lib/applications.ts","components/PageState.tsx"]
---

# Writer Applications

Mode: Operate

## Purpose
Let editors review pending applications to publish on ResearchWithMe.

## First useful result
An editor sees pending applications newest first with approve and reject actions.

## Direction
Editor-only queue behind the studio layout gate; row-level security scopes the rows.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Demo mode without Supabase, queue read failure, empty queue, long applicant text, and keyboard focus.
