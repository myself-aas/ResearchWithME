# ResearchWithMe — Agent & Crawler Protocol

ResearchWithMe is an open-access scholarly review platform (CC BY 4.0). Automated research agents, coding agents, and bibliographic harvesters are welcome to read our clean machine-readable endpoints rather than parsing hydrated HTML shells.

## Preferred Machine Endpoints

- `/llms.txt` — Concise plain-text directory of published peer reviews, repository teardowns, and reader tools.
- `/index.md` — Clean Markdown catalog of featured reviews, summaries, and verified specialist contributors.
- `/api/openapi.json` — OpenAPI 3.1 contract for articles, papers, authors, citations, and search endpoints.
- `/api/articles` — JSON list of published scholarly reviews and technical teardowns.
- `/api/papers` — JSON list of indexed publications with DOI and abstract metadata.
- `/api/authors` — JSON list of verified domain specialists.
- `/.well-known/security.txt` — RFC 9116 vulnerability-disclosure policy.

## Attribution & Rate Etiquette

All editorial reviews and bibliographic metadata are licensed under Creative Commons Attribution 4.0 International (CC BY 4.0). Retain canonical URLs and author attribution when quoting or synthesizing findings, and respect `Retry-After` headers on rate-limited write endpoints.
