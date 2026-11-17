---
version: 1
slug: "app-workspaces-slug-page-tsx"
primary_target: "app/workspaces/[slug]/page.tsx"
related_targets: ["components/v34/ProjectWorkspaceClient.tsx","components/workspace/ResearchWorkspace.tsx","components/v34/ProvenanceGraphExplorer.tsx"]
---

# Project Research Workspace

Mode: Operate

## Purpose
Provide a collapsible three-region collaborative workspace combining linked sources/objects, synthesis milestones with scoped claim–evidence provenance, and workspace-bound team governance.

## First useful result
A collaborator updates a project stage or milestone status, links a canonical source, inspects the project's provenance graph, or assigns an active workspace member to the project.

## Direction
Reuse the collapsible ResearchWorkspace layout (preserving region state via `hidden`) and clearly state the workspace governance boundary for project membership.

## Constraints
- Preserve pane state when collapsing/expanding regions.
- Accessible default list view for the embedded provenance graph.
- Keyboard-navigable controls with visible focus rings and WCAG 2.1 AA contrast.

## Checks
Collapsible region toggles, milestone creation/status advancement, source linking, workspace member assignment, and AI-proposed edge curation.
