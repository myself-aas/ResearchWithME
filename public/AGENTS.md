# ResearchWithMe — Agent & Crawler Protocol

ResearchWithMe is an open-access review platform (CC BY 4.0). Automated research agents, coding agents, and bibliographic harvesters are welcome to read our clean machine-readable endpoints rather than parsing hydrated HTML shells.

## Preferred Machine Endpoints

- `/llms.txt` — Concise plain-text directory of published reviews, repository teardowns, and reader tools.
- `/index.md` — Clean Markdown catalog of featured reviews, summaries, and contributing writers.
- `/openapi.json` — OpenAPI 3.1 contract for articles, authors, citations, and search endpoints.
- `/api/articles` — JSON list of published reviews and technical teardowns.
- `/api/authors` — JSON list of published writers with their public profiles.
- `/.well-known/security.txt` — RFC 9116 vulnerability-disclosure policy.

## Attribution & Rate Etiquette

All articles and bibliographic metadata are licensed under Creative Commons Attribution 4.0 International (CC BY 4.0). Retain canonical URLs and author attribution when quoting or synthesizing findings, and respect `Retry-After` headers on rate-limited write endpoints.
