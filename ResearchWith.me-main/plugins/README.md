# First-party plugins

Two plugins live here, outside the theme, because both must survive a theme switch and both are large enough to deserve their own release cadence.

| Plugin | Slug | Requires | Purpose |
| --- | --- | --- | --- |
| PDF & Special Editions | `rwm-pdf-editions` | WP 6.5+, PHP 7.4+ | Per-article PDFs, scheduled weekly/monthly/quarterly/half-yearly/yearly editions, licensing profiles, DOI minting, royalty ledger |
| MCP Server | `rwm-mcp-server` | WP 6.9+, MCP Adapter, Abilities API | Exposes theme and publishing abilities over the Model Context Protocol |

Docs:

- `docs/PDF-EDITIONS.md`
- `docs/MCP.md`
- `docs/MONETIZATION.md` (theme-level ads and affiliate features)

## Installation during development

```bash
ln -s "$(pwd)/plugins/rwm-pdf-editions" /path/to/wp-content/plugins/rwm-pdf-editions
ln -s "$(pwd)/plugins/rwm-mcp-server"    /path/to/wp-content/plugins/rwm-mcp-server
```

## Release checklist

1. Parse check: `node tests/lint-php.js` (or mount into Playground and hit `?__reme_lint=1`).
2. `wp plugin check <slug>` with `plugin-check` installed.
3. `phpcs --standard=WordPress plugins/<slug>`.
4. Bump the version in the plugin header, `readme.txt` `Stable tag`, and the `RWM_*_VERSION` constant.
5. Tag the release; attach a ZIP built from the plugin directory only (no `node_modules`, no `.git`).
