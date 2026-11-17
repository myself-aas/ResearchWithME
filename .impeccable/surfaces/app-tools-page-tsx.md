---
version: 1
slug: "app-tools-page-tsx"
primary_target: "app/tools/page.tsx"
related_targets: ["components/v34/ToolsDirectoryClient.tsx","components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Open-Source Research Tools Registry

Mode: Operate

## Purpose
Provide a global deduplicated catalog of open-source research tool repositories with timestamped observation metadata linked to immutable citable software Source records.

## First useful result
A researcher searches open-source tools, inspects timestamped repository metadata alongside linked citable software sources, registers or refreshes a tool repository, or links a release snapshot.

## Direction
Explicitly distinguish live repository observations (stars, forks, release tags with `observedAt`) from immutable canonical Source citations.

## Constraints
- WCAG 2.1 AA contrast, visible focus indicators, and semantic landmarks.
- Deduplicate global repositories rather than cloning entries per workspace.
- Reflow cleanly to 360px with zero horizontal overflow.

## Checks
Repository search filtering, deduplicated registration, timestamped observation copy, and ToolSourceLink attachment.
