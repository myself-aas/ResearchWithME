---
version: 1
slug: "app-workspace-id-page-tsx"
primary_target: "app/workspace/[id]/page.tsx"
related_targets: ["components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Canonical Workspace Route

Mode: Navigate & Govern

## Purpose
Serve the canonical `/workspace/[id]` URL contract (Part V §4), resolving workspace or project identifiers to their active workbench without breaking bookmarks or API links.

## First useful result
A researcher following a `/workspace/[id]` canonical link lands immediately in the corresponding project or workspace overview.

## Direction
Zero-friction canonical redirect with safe 404 handling for unknown IDs.

## Constraints
- Never redirect to untrusted external URLs.
- Preserve clear canonical URL resolution across workspaces and projects.

## Checks
Valid workspace ID redirect, valid project ID/slug redirect, and 404 behavior for nonexistent IDs.
