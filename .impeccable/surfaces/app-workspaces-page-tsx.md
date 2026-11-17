---
version: 1
slug: "app-workspaces-page-tsx"
primary_target: "app/workspaces/page.tsx"
related_targets: ["components/v34/WorkspacesClient.tsx","components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Research Workspaces & Projects

Mode: Operate

## Purpose
Organize collaborative research workspaces and structured projects with explicit objectives, lifecycle stages, milestone progress, and linked canonical scholarly objects.

## First useful result
A researcher filters active projects by workspace or stage, inspects milestone completion ratios, creates a workspace or project, and opens a project workspace detail page.

## Direction
Render calm project cards showing explicit textual progress ratios alongside progress bars, canonical object counts, collaborator summaries, and direct workspace navigation.

## Constraints
- WCAG 2.1 AA contrast, visible focus indicators, and semantic headings/landmarks.
- Reflow cleanly to 360px with zero horizontal overflow.
- Never represent progress or status by color alone; always pair with textual labels.

## Checks
Stage filtering, workspace filtering, new workspace creation, new project creation, and project detail navigation.
