---
version: 1
slug: "app-contribute-page-tsx"
primary_target: "app/contribute/page.tsx"
related_targets: ["components/v34/ContributeWizard.tsx","lib/persistence/sync-coordinator.ts","components/layout/BottomSheet.tsx"]
---

# Guided Contribution Studio

Mode: Create

## Purpose
Guide contributors through choosing a scholarly format, resolving canonical sources, attaching located evidence, writing structured blocks with offline autosave, and passing integrity checks before publication.

## First useful result
A contributor drafts offline-safe blocks with visible save state and sees actionable pre-publication integrity gates.

## Direction
Keep the flow focused and calm with clear step controls, live local/sync status, and conflict preservation modals. Hide mobile bottom navigation inside the wizard so it never competes with authoring controls.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow cleanly to 360px without horizontal overflow.
- Preserve both versions on draft version conflict.

## Checks
All 10 contribution types selectable, source identifier resolution, offline autosave state badge, conflict sheet resolution, and §16 publication blockers.
