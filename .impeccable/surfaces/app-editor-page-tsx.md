---
version: 1
slug: "app-editor-page-tsx"
primary_target: "app/editor/page.tsx"
related_targets: ["components/v34/ScholarlyEditorWorkspace.tsx","components/layout/BottomSheet.tsx","components/BlogHeader.tsx"]
---

# Scholarly MDX Editor Workspace

Mode: Author & Verify

## Purpose
Deliver the canonical v3.4 multi-pane scholarly MDX workspace sharing the exact `Draft` and `ResearchDocument` contract with the Contribution Wizard (ADR-032-02, Part I §10, Part III §18–§20).

## First useful result
A contributor opens or continues a draft, edits structured Evidence/Claim/Citation/Limitation blocks via Slash Commands or drag/keyboard reordering, validates MDX security and publication preconditions, and saves offline with conflict safety.

## Direction
Calm multi-pane editorial canvas collapsing cleanly to single-column + BottomSheet drawers on phone and tablet viewports.

## Constraints
- Hide mobile bottom navigation inside `/editor/*` to avoid competing with editor controls.
- Enforce WCAG 2.1 AA contrast, 44px mobile touch targets, keyboard reordering (`Alt+↑/↓`), and focus-trapped bottom sheets.
- Preserve both versions on HTTP 409 conflict without silent overwrite.

## Checks
Slash commands, block drag/keyboard/button reorder, live MDX sanitization, identifier normalizer, snapshot capture/restore, and contextual assistant checks.
