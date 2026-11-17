---
version: 1
slug: "app-claims-page-tsx"
primary_target: "app/claims/page.tsx"
related_targets: ["components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Structured Claims Directory

Mode: Browse & Evaluate

## Purpose
Surface first-class typed scholarly claims with normalized SUPPORTS, QUALIFIES, and CONTRADICTS evidence counts (ADR-032-01).

## First useful result
A researcher compares empirical, methodological, causal, and replication claims along with opposing evidence counts and opens detailed claim provenance.

## Direction
Calm, factual typography emphasizing evidence balance rather than popularity scores.

## Constraints
- WCAG 2.1 AA contrast, zero vanity scores, semantic tokens only.
- Clean responsive reflow from 320px to 1920px.

## Checks
Claim type/lifecycle pills, support/qualify/contradict counters, and links to `/claim/[id]` and `/graph`.
