# Public archive contract (repository snapshot)

Source of truth: `lib/mcp.ts`, `lib/agent-skills.ts`, `docs/mcp.md`, `docs/agent-skills.md` and tests in `test/pages/mcp.test.ts`. Recheck before use; do not treat this snapshot as a live deployment check.

- Server card: `GET /.well-known/mcp/server-card.json`; public skill index: `GET /.well-known/agent-skills/index.json`.
- Transport: separate stateless JSON-RPC 2.0 `POST /mcp` requests with `Content-Type: application/json`, `Accept: application/json, text/event-stream`. `initialize` negotiates `2025-11-25`; `notifications/initialized` is accepted; `GET /mcp` returns 405.
- Tool: `search_reviews`, input `{ "query": "term" }` (1–120 characters), returns at most five published, linked summaries. A zero-result reply is **not** proof that no external research exists.
- Resource: `https://researchwith.me/api/articles`, up to 100 published article metadata entries. No pagination or article body through MCP. Follow the published article URL to read its full contents.
- No prompts, write actions, unpublished drafts, OAuth bearer-token validation, or arbitrary web research. Rate and origin protections apply. Do not probe registration/auth endpoints during passive checks.

Read the live card and discovery index before claiming deployment; verify SHA-256 against the actual skill artifact when mirroring the public skill. Never paste secrets or private editor material into an MCP request.
