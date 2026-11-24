# Writing for ResearchWithMe

Every essay on this site is an `.mdx` file in [`posts/`](./posts). The repository is the CMS: add a
file, commit it, push, and the build renders the page, the archive entry, the search index, the RSS
item, and the social card from that one file.

```bash
npm run new -- "How I read a benchmark"     # creates a draft with today's date
npm run new -- "How I read a benchmark" --publish
```

## Anatomy of a post

```mdx
---
title: "How I read a benchmark"
description: "One or two sentences used on cards, in search, and in the feed."
date: "2026-11-24"
tags: ["benchmarks", "methodology"]
series: "Reproduction notes"      # optional
cover: "/images/folio-dashboard.jpeg"   # optional, from /public
coverAlt: "A dashboard of benchmark results."  # required when cover is set
featured: false                   # optional, pins it to the top of the home page
draft: false                      # optional, true = development only
toc: true                         # optional, false hides the table of contents
canonical: "https://elsewhere.example/post"  # optional, if first published elsewhere
---

Opening paragraph. It receives the drop cap.
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | `h1` and metadata title. |
| `description` | yes | 20–280 characters. Cards, search, RSS, meta description. |
| `date` | yes | `YYYY-MM-DD`. Drives ordering and the archive year. |
| `updated` | no | `YYYY-MM-DD`; shown next to the publication date. |
| `tags` | no | Lowercase by convention; every tag gets a `/tags/[tag]` page. |
| `cover` + `coverAlt` | no | A cover is not allowed without alt text. |
| `featured` | no | `true` makes it the lead card on the home page. |
| `draft` | no | `true` renders in `npm run dev` and is excluded from production builds. |
| `toc` | no | `false` disables the table of contents for that post. |

The file name is the URL slug (`how-i-read-a-benchmark.mdx` → `/posts/how-i-read-a-benchmark`).
Override it with a `slug` field if you need to. Duplicate slugs fail the build.

## Components

These are available in every post without an import:

```mdx
<KeyTakeaways>
- The claim is narrower than the abstract suggests.
- The harness is reproducible once the warm-up is excluded.
</KeyTakeaways>

<Callout tone="note" title="Worth reading first">
  Tones: `note`, `tip`, `warning`, `danger`.
</Callout>

<Figure
  src="/images/folio-process.jpeg"
  alt="A whiteboard sketch of the request path."
  caption="Always write a caption that stands alone."
/>

<Video src="/media/talk.mp4" poster="/images/talk-poster.jpg" caption="A five-minute walkthrough." />

<Sidenote>A small aside that stays inline with the prose.</Sidenote>
```

Markdown also gives you GFM tables, footnotes[^1], fenced code blocks with syntax highlighting and a
copy button, blockquotes, and heading anchors.

[^1]: Footnotes render in a dedicated section at the end of the post.

## Images and video

- Put images in `public/images/` and reference them as `/images/name.ext`.
- Remote `https://` images work in MDX figures and covers.
- Write alt text for every meaningful image. Cover alt text is enforced by the schema.

## Drafts and publishing

`draft: true` keeps a post out of production. In development it renders normally with a **Draft**
badge in lists, which makes it safe to review a piece in place before publishing.

Publishing is a git operation:

```bash
git add content/posts/my-new-post.mdx
git commit -m "Publish: my new post"
git push
```

A push triggers the Cloudflare Workers build, which validates every file's frontmatter and fails with
the file name and field if something is wrong. Deleted files disappear from the site on the same
build.

## What is generated from the files

| Output | Source |
| --- | --- |
| `/posts/[slug]` | the MDX body + frontmatter |
| `/posts` archive | dates, grouped by year |
| `/tags` and `/tags/[tag]` | the union of all tags |
| `/search` | title, description, tags, and plain-text body |
| `/rss.xml` | title, description, date, tags, link |
| `/sitemap.xml` | every post and tag page |
| Social cards | title, date, author, first three tags |
