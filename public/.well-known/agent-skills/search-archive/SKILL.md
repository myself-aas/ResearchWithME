---
name: search-archive
description: Run full-text search across every published ResearchWithMe essay using the prebuilt search index. Use to find articles by topic, tool, or term before reading them.
---

# Search the Archive

ResearchWithMe ships a prebuilt full-text index of the entire archive.
Query it to find which essays mention a topic, tool, or term — no
scraping required.

## The search index

```
GET /search-index.json
```

Returns `200` with `application/json`. The body is:

```json
{
  "version": 1,
  "count": 42,
  "docs": [
    {
      "slug": "airflow-before-you-ship",
      "href": "/blog/airflow-before-you-ship",
      "title": "...",
      "description": "...",
      "tags": ["..."],
      "date": "YYYY-MM-DD",
      "readingTimeMinutes": 12,
      "text": "first 8000 characters of plain-text body"
    }
  ]
}
```

## Matching

The index is a data artifact, not a query service: fetch it and match
locally. Recommended approach:

1. Normalize the query (lowercase, trim).
2. Score each doc by term frequency in `title`, `description`, `tags`,
   and `text`; `title` matches rank highest.
3. Return the matching docs' `href` (the canonical article URL) ordered
   by score.

## Notes

- The index is statically generated at build time, so it always reflects
  the published archive. It is cached aggressively (`s-maxage=31536000`).
- The endpoint carries `X-Robots-Tag: noindex`: it is a machine artifact,
  not a page, and should not be indexed by search engines.
- No authentication is required.
