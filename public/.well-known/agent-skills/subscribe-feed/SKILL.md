---
name: subscribe-feed
description: Retrieve the syndication feed of published ResearchWithMe essays in RSS 2.0 or JSON Feed format, latest posts first. Use to follow new writing without scraping the archive.
---

# Subscribe to the Feed

ResearchWithMe publishes its article feed in two standard formats. Both
are statically generated from the same source posts and return the newest
posts first.

## RSS 2.0

```
GET /rss.xml
```

Returns `200` with `application/rss+xml`. The channel carries the site
title, description, and language. Each `<item>` contains:

- `<title>` — the post title
- `<link>` and `<guid isPermaLink="true">` — the canonical article URL
- `<pubDate>` — publication date
- `<description>` — the post summary
- `<category>` — one element per post tag

## JSON Feed

```
GET /feed.json
```

Returns `200` with `application/feed+json` (JSON Feed 1.1). The document
has `version`, `title`, `description`, `home_page_url`, `feed_url`,
`language`, and `authors`. Each item contains:

- `id` and `url` — the canonical article URL
- `title`, `summary`
- `date_published` (and `date_modified` when the post was revised)
- `tags`, `language`

## Notes

- Both feeds list the most recent posts; full archive access is via the
  sitemap and the search index.
- Feeds are cached (`public, max-age=3600`) and regenerate on publish.
- No authentication is required.
