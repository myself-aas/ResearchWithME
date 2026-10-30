---
version: 1
slug: "app-verify-page-tsx"
primary_target: "app/verify/page.tsx"
related_targets: ["components/BlogHeader.tsx","components/BlogFooter.tsx","lib/auth-context.tsx"]
---

# Contributor Verification

Mode: Operate

## Purpose
Understand the prototype verification paths and the permissions each role receives.

## First useful result
A contributor chooses a verification method, sees honest prototype status, and reaches the writer studio.

## Direction
Use standard selects, inputs, and buttons. Icons support labels inline; permission summaries use rules and spacing rather than nested cards.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive pop-ups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Invalid ORCID, invalid email, role switching, permission changes, long names, and keyboard focus.
