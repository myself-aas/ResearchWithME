---
version: 1
slug: "app-topics-page-tsx"
primary_target: "app/topics/page.tsx"
related_targets: ["components/v34/TopicsClient.tsx","components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Scholarly Topic Taxonomy

Mode: Browse & Curate

## Purpose
Provide a first-class, FK-backed scholarly topic taxonomy replacing ad-hoc string arrays across contributions, sources, projects, and open-source tools.

## First useful result
A researcher filters canonical topics, inspects linked object counts and parent-child taxonomy hierarchy, jumps directly to filtered research feed views, or registers a new canonical topic.

## Direction
Keep taxonomy metadata calm, scannable, and verifiable using semantic tokens and explicit counts.

## Constraints
- WCAG 2.1 AA contrast, visible focus indicators, and semantic landmarks.
- Enforce kebab-case canonical slugs and prevent duplicate topic fragmentation.
- Reflow cleanly from 320px to 1920px with zero horizontal overflow.

## Checks
Topic search filtering, canonical topic creation, parent topic hierarchy display, and deep links to `/feed` and `/graph`.
