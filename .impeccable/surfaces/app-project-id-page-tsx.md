---
version: 1
slug: "app-project-id-page-tsx"
primary_target: "app/project/[id]/page.tsx"
related_targets: ["components/v34/ProjectWorkspaceClient.tsx","components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Canonical Project Workbench

Mode: Collaborate & Execute

## Purpose
Provide the canonical `/project/[id]` workbench for bounded research projects with milestones, tasks, linked sources/claims/contributions, and versioned notes (ADR-032-04).

## First useful result
A project collaborator inspects milestones, manages tasks, creates versioned project notes, and links scholarly objects inside the workspace boundary.

## Direction
Workspace-scoped layout keeping tasks, notes, and milestones calm and actionable.

## Constraints
- WCAG 2.1 AA contrast, semantic landmarks, and keyboard-accessible controls.
- Maintain strict separation between Workspace governance and Project execution.

## Checks
Project metadata header, interactive milestones/tasks/notes workbench, and deep link to `/projects`.
