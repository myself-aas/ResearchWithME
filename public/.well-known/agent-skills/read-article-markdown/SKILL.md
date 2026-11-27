---
name: read-article-markdown
description: Retrieve any published ResearchWithMe essay as clean Markdown instead of HTML, either by content negotiation or a direct markdown route. Use when reading, quoting, citing, or feeding article text into a downstream pipeline.
---

# Read Article as Markdown

ResearchWithMe publishes every essay as HTML, but agents do not need to
parse HTML to read an article. Two interfaces return the same article text
as clean Markdown.

## Content negotiation (preferred)

Send `Accept: text/markdown` on any article request. The response is the
article as Markdown with `Content-Type: text/markdown; charset=utf-8` and
an `x-markdown-tokens` header carrying the estimated token count.

```http
GET /blog/airflow-before-you-ship HTTP/1.1
Accept: text/markdown
```

Browsers (no `Accept: text/markdown`) keep receiving the normal HTML page.

## Direct markdown route

Each essay also has a dedicated Markdown endpoint:

```
GET /blog/{slug}/markdown
```

Returns `200` with `text/markdown; charset=utf-8` and `x-markdown-tokens`.

## Notes

- The Markdown is a faithful, readable rendering of the article: headings,
  lists, tables, and code blocks are preserved; navigation, scripts, and
  styling are stripped.
- Frontmatter metadata is not included in the negotiated response; the
  canonical HTML page remains the source for titles, dates, and tags.
- No authentication is required.
