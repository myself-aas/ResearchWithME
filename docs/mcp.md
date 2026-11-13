# Public MCP archive server

`GET /.well-known/mcp/server-card.json` publishes a public server card. Its `remotes[0].url` (and compatibility `endpoint`) points to `/mcp`, a stateless, read-only Streamable HTTP JSON-RPC endpoint supporting protocol version `2025-11-25`. The card includes the SEP-2127 extension schema, identity, transport, and version as well as `serverInfo`, `endpoint`, and a capabilities summary for discovery clients. Prompts are **not** supported.

Clients can `initialize`, send `notifications/initialized`, and call `tools/list`, `tools/call`, `resources/list`, `resources/read`, or `ping`. The `search_reviews` tool accepts `{ "query": "term" }` and returns published article summaries with links. The only resource, the public article catalogue, provides up to 100 published article metadata records. No editorial APIs, unpublished records, bearer-token authentication, SSE stream, or subscriptions are exposed. `GET /mcp` returns 405 because this server does not provide a server-initiated SSE stream.

Example requests (send each as a separate `POST /mcp` with `Content-Type: application/json` and `Accept: application/json, text/event-stream`):

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"example-client","version":"1.0.0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_reviews","arguments":{"query":"quantum"}}}
```

The server rejects cross-origin browser requests, bounds input sizes, and rate-limits POST requests. Production scanner status `checks.discovery.mcpServerCard.status` must be validated after deployment; repository tests do not establish a live pass.
