---
version: 1
slug: "app-projects-page-tsx"
primary_target: "app/projects/page.tsx"
related_targets: ["components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Research Projects Directory

Mode: Plan & Coordinate

## Purpose
List bounded, workspace-governed research projects showing owning Workspace boundary, stage, milestone completion, linked objects, and collaborator counts (ADR-032-04).

## First useful result
A researcher locates active research projects, checks workspace ownership and milestone progress, and enters a project workbench.

## Direction
Structured scannable cards clearly distinguishing owning Workspace from Project objective.

## Constraints
- WCAG 2.1 AA contrast and 44px touch targets.
- Reflow cleanly across mobile, tablet, and desktop widths.

## Checks
Workspace ownership badge, stage label, milestone completion ratio, and links to `/project/[id]` and `/workspaces`.
