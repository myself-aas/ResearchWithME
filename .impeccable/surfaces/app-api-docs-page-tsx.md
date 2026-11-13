---
version: 1
slug: "app-api-docs-page-tsx"
primary_target: "app/api-docs/page.tsx"
related_targets: ["components/ApiDocsReference.tsx"]
---

# API Reference

Mode: Read

## Purpose
Document the archive, assistant and editorial HTTP APIs.

## First useful result
A developer finds an endpoint, its parameters and an example request without leaving the page.

## Direction
Dense but scannable reference with monospace reserved for endpoints, parameters and code samples.

## Constraints
- WCAG 2.1 AA contrast, visible keyboard focus, and semantic landmarks.
- Reflow to 320px without horizontal scrolling.
- No kickers above headings, gradient text, glass as decoration, nested cards, or intrusive popups.
- Loading, empty, error, disabled, and success states explain what happened and what to do next.
- Local assets and honest demo labels; no fabricated live verification claims.

## Checks
Code block overflow at 320px, copyable examples, anchor navigation, and keyboard focus in the endpoint list.
