---
version: 1
slug: "app-feed-page-tsx"
primary_target: "app/feed/page.tsx"
related_targets: ["components/v34/ResearchFeedClient.tsx","components/layout/ResponsivePaneLayout.tsx","components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Research Contributions Feed

Mode: Operate

## Purpose
Browse and filter structured scholarly contributions alongside published editorial reviews with verifiable source provenance.

## First useful result
A reader filters contributions by type, topic, or query and opens a grounded review or canonical source record.

## Direction
Use a responsive three-pane layout on desktop collapsing to a single stream plus BottomSheet filters on mobile. Communicate integrity alerts with text and icons, never color alone.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow cleanly to 360px without horizontal overflow.
- Minimum 44px tap targets on interactive controls.
- Non-vanity scholarly recognition counts only.

## Checks
Empty filter state, integrity warning banner, mobile BottomSheet filters, keyboard navigation, and save-to-library toggle.
