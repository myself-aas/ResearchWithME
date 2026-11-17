---
version: 1
slug: "app-search-page-tsx"
primary_target: "app/search/page.tsx"
related_targets: ["components/v34/SearchClient.tsx","components/BlogHeader.tsx","components/BlogFooter.tsx"]
---

# Unified Scholarly Search

Mode: Search & Filter

## Purpose
Enable lexical and normalized identifier (DOI, arXiv, GitHub URL) search across all six canonical ResearchWithME knowledge objects with explicit match-reason disclosure and transparent, removable query expansion terms.

## First useful result
A researcher enters keywords or a canonical identifier, filters by object type, inspects why each hit matched, optionally applies or dismisses suggested expansion terms, or saves the query as a digest alert in their Personal Library.

## Direction
Keep search transparency front-and-center: disclose mode (`lexical` vs `identifier`), match reason, integrity warnings, and never silently rewrite user queries.

## Constraints
- WCAG 2.1 AA contrast, visible focus indicators, and single `<main id="main-content">` landmark.
- Explicit loading, empty, offline, and error states.
- Reflow cleanly from 320px to 1920px with zero horizontal overflow.

## Checks
Lexical & identifier lookup, entity facet filtering, editable query expansion chips, and saved search alert creation.
