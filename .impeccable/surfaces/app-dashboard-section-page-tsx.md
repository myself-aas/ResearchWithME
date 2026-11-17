---
version: 1
slug: "app-dashboard-section-page-tsx"
primary_target: "app/dashboard/[section]/page.tsx"
related_targets: ["lib/v34/dashboard-routes.ts","app/research-os/page.tsx"]
---

# Dashboard Canonical Section Deep Links

Mode: Navigate & Consolidate

## Purpose
Preserve stable deep-link URLs for all 15 Part I §26.2 personal command-center sections (`/dashboard/library`, `/dashboard/projects`, `/dashboard/reviews`, `/dashboard/sources`, `/dashboard/evidence`, `/dashboard/claims`, `/dashboard/contributions`, `/dashboard/workspace`, `/dashboard/assistant`, `/dashboard/network`, `/dashboard/reputation`, `/dashboard/insights`, `/dashboard/archive`, `/dashboard/profile`, `/dashboard/settings`).

## First useful result
A user or bookmark following any documented `/dashboard/<section>` link lands immediately on its authoritative v3.4 surface without broken URLs.

## Direction
Deterministic server-side redirect with safe 404 fallback for unknown section slugs.

## Constraints
- Never redirect to arbitrary external URLs; resolve only from the static `DASHBOARD_SECTION_TARGETS` allowlist.
- Never shadow static studio or account dashboard sibling routes.

## Checks
All 15 canonical section slugs resolve to valid internal paths; invalid slugs return HTTP 404.
