---
version: 1
slug: "app-graph-page-tsx"
primary_target: "app/graph/page.tsx"
related_targets: ["components/v34/ProvenanceGraphExplorer.tsx","components/graph/ProvenanceGraph.tsx","components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Claim–Evidence Provenance Graph

Mode: Operate

## Purpose
Explore the canonical scholarly provenance network connecting primary sources, located evidence units, structured claims, and published contributions, with human curation for AI-proposed edges.

## First useful result
A researcher filters relationships by semantic type, inspects a node's provenance chain in the keyboard-navigable list or SVG graph view, and accepts or rejects an AI-proposed edge.

## Direction
Keep keyboard-navigable List mode and the equivalent tabular edge view as the accessible default, pairing every visual signal with explicit text labels.

## Constraints
- Equivalent non-visual list/table for every graph view (WCAG 2.1 AA).
- Color and stroke dashing are never the sole signal for edge semantics or AI status.
- AI-proposed relationships remain PROPOSED until a human explicitly accepts or rejects them.

## Checks
List/Graph view toggle, roving-tabindex keyboard traversal, edge type filtering, node inspector updates, and human accept/reject of PROPOSED edges.
