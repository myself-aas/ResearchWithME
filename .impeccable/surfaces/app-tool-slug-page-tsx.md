---
version: 1
slug: "app-tool-slug-page-tsx"
primary_target: "app/tool/[slug]/page.tsx"
related_targets: ["components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Research Tool Detail

Mode: Evaluate & Adopt

## Purpose
Present a canonical open-source research tool record with SPDX license, repository URL, reproducibility badges, structured evaluations, and pinned versions (Part V §4).

## First useful result
A researcher verifies tool licensing, reproducibility badges, structured benchmark evaluations, and release versions before adopting a tool in a project.

## Direction
Concise technical metadata using monospace identifiers and high-contrast semantic pills.

## Constraints
- WCAG 2.1 AA contrast and safe external link attributes (`rel="noopener noreferrer"`).
- Clean responsive reflow across mobile and desktop.

## Checks
License badge, repository link, reproducibility pills, evaluations list, and breadcrumb back to `/tools`.
