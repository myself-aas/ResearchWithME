---
version: 1
slug: "app-evidence-id-page-tsx"
primary_target: "app/evidence/[id]/page.tsx"
related_targets: ["components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Evidence Unit Detail

Mode: Inspect & Assess

## Purpose
Display a canonical Evidence record anchored to an immutable SourceVersion and structured locator alongside linked Claims, deletion restriction policy, and structured Evidence Assessments.

## First useful result
A researcher verifies exact quotation/locator provenance, inspects every Claim linked via SUPPORTS/CONTRADICTS/QUALIFIES, and reviews methodological rigor scores.

## Direction
Clear typographic hierarchy separating primary observation, source anchor, linked claims, and assessments.

## Constraints
- WCAG 2.1 AA contrast, breadcrumb navigation, and semantic regions.
- Never hide limitations or source version bindings.

## Checks
SourceVersion identifier visibility, ADR-032 deletion restriction notice, linked claims list, and assessments display.
