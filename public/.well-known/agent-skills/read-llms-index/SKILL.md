---
name: read-llms-index
description: Fetch the llms.txt index of ResearchWithMe — a plain-text map of the writing, the machine-readable interfaces, and the auth contract. Use as a lightweight orientation pass before invoking the other skills.
---

# Read the llms.txt Index

ResearchWithMe publishes an `llms.txt` index: a plain-text, human-and-
agent-readable map of everything on the site. It is the cheapest way to
orient before using the other skills.

## The index

```
GET /llms.txt
```

Returns `200` with `text/plain; charset=utf-8`. The structure is:

- **Header** — an H1 with the site name and a one-paragraph summary of
  what the site is.
- **Essays** — every published post as an annotated link with its
  title, description, and date (updated date included when revised).
- **Machine-readable** — links to the sitemap, RSS, JSON Feed,
  robots.txt, the RFC 9727 API catalog, the auth contract, and the A2A
  Agent Card.
- **Representations** — how to obtain alternate representations of the
  writing (Markdown content negotiation and per-essay markdown routes).

## When to use it

- Before calling the API catalog or feed skills, to see the full surface
  in one small document (~a few KB).
- To enumerate every published essay with metadata without fetching the
  search index.
- To confirm where the auth contract lives before making requests.

## Notes

- The index is generated from the same content collection as the site, so
  it cannot list a post that does not exist.
- It is cached (`public, max-age=3600`) and regenerates on publish.
- No authentication is required.
