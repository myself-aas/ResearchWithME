---
version: 1
slug: "app-contribution-id-page-tsx"
primary_target: "app/contribution/[id]/page.tsx"
related_targets: ["components/scholarly/TrustAssessmentSummary.tsx","components/scholarly/IntegrityNotice.tsx","components/layout/ResponsivePaneLayout.tsx"]
---

# Contribution Detail

Mode: Read

## Purpose
Present a published research contribution with safe structured blocks, linked evidence locators, explicit claim relationships, five independent trust dimensions, and AI provenance disclosure.

## First useful result
A reader inspects the contribution body alongside its independent trust assessment and primary canonical source.

## Direction
Always surface retraction or correction notices before ordinary metadata. Never compress trust dimensions into a single opaque composite score.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow cleanly to 360px without horizontal overflow; collapse inspector rail into a mobile BottomSheet.
- Never render raw unsanitized HTML.

## Checks
Integrity banner precedence, trust dimensions legibility, claim-evidence relation tags, mobile inspector sheet, and save button.
