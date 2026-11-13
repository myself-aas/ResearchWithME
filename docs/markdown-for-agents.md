# Markdown content negotiation for agents

The public catalogue (`/`), category pages (`/category/{slug}`), and published article pages (`/post/{slug}`) respond to `Accept: text/markdown` with `Content-Type: text/markdown; charset=utf-8`. Without an explicit positive Markdown preference, browsers continue receiving HTML. Where both HTML and Markdown are requested, HTTP quality values decide; `text/markdown;q=0` does not request Markdown.

The Markdown comes from published CMS records directly, **not** scraped HTML. Article responses include title, source URL, author, publication date, summary, takeaways, and the original full Markdown article body. Catalogue/category responses contain linked titles and summaries, with optional `?search=term`. Drafts and unknown articles remain 404. Markdown requests to API and editorial studio paths are not negotiated; their existing auth and response contracts remain unchanged.

Both the Next.js Worker (middleware rewrite to a server route) and Cloudflare Pages SSR runtime implement the same renderer. Markdown responses include `Vary: Accept` so caches can distinguish representations. Pages HTML also varies by Accept; Next.js overrides the HTML Vary header with its RSC-specific value, but its HTML responses are private/no-store, while the Markdown route sets an explicit short cache lifetime. HEAD returns the same status and media type without a body.

Smoke check after deployment:

```sh
curl -i -H 'Accept: text/markdown' https://researchwith.me/
curl -i -H 'Accept: text/markdown' https://researchwith.me/post/<published-slug>
curl -i -H 'Accept: text/html' https://researchwith.me/
```

The first two should return Markdown without page-layout HTML, and the last should return the ordinary HTML page. This is independent of the existing `/index.md` and `/llms.txt` discovery resources.
