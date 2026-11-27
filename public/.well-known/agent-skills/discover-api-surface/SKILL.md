---
name: discover-api-surface
description: Discover every machine-readable interface ResearchWithMe exposes, via the RFC 9727 API catalog linkset and its OpenAPI 3.1 specifications. Use first to learn which endpoints exist, their schemas, and how to call them.
---

# Discover the API Surface

ResearchWithMe publishes a single catalog that enumerates all of its
machine-readable interfaces. Fetch it before calling anything else.

## The API catalog

```
GET /.well-known/api-catalog
```

Returns `200` with `Content-Type: application/linkset+json`. The body is
an RFC 9727 linkset: one entry per API, each with an `anchor` plus
`service-desc` (OpenAPI spec), `service-doc` (documentation), and `status`
(health check) links.

## OpenAPI specifications

Each entry's `service-desc` points at an OpenAPI 3.1 document:

```
GET /.well-known/api-catalog/openapi/{name}.json
```

Where `{name}` is one of:

- `feeds` — the RSS 2.0 and JSON Feed endpoints
- `search` — the full-text search index endpoint
- `llms` — the `llms.txt` index
- `markdown` — the Markdown content-negotiation interface

Unknown names return `404`.

## Health

```
GET /api/health
```

Returns `{"status": "ok", ...}` with `no-store` caching; linked from the
catalog as each API's `status`.

## Notes

- The catalog is statically generated and cached (`public, max-age=3600`).
- No authentication is required for any endpoint.
