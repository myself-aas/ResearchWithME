---
version: 1
slug: "app-editor-id-page-tsx"
primary_target: "app/editor/[id]/page.tsx"
related_targets: ["components/v34/ScholarlyEditorWorkspace.tsx","components/v34/ContributeWizard.tsx"]
---

# Scholarly MDX Draft Editor

Mode: Continue Authoring

## Purpose
Load any draft by canonical ID handed off from `/contribute` ("Continue in Workspace") or Dashboard Continue Working into the full multi-pane scholarly MDX workspace (ADR-032-02).

## First useful result
The contributor's local IndexedDB or synced server `ResearchDocument` hydrates immediately with full Sources, Review/Blockers, Contextual Assistant, and Snapshot History panes.

## Direction
Identical calm scholarly workspace shell keyed to the canonical draft ID with zero state loss across Wizard <-> Workspace transitions.

## Constraints
- Never silently drop offline edits or overwrite concurrent server versions.
- WCAG 2.1 AA contrast, semantic landmarks, and 320px–1920px responsive reflow.

## Checks
Draft ID hydration from IndexedDB, shared Wizard-to-Workspace continuity, 409 conflict reconciliation, and publication blocker evaluation.
