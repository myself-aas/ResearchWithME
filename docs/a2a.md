# A2A public archive agent

`GET /.well-known/agent-card.json` publishes the ResearchWithMe Archive Agent card (A2A JSON-RPC 1.0). The card points to `POST /api/a2a` on the configured site origin and advertises only the `search-published-reviews` skill. The endpoint is public and read-only. It searches published article titles, tags, summaries, and reviewed-artifact identifiers, then returns linked summaries. It does not search outside the archive or offer editorial access.

Example request:

```json
{"jsonrpc":"2.0","id":1,"method":"SendMessage","params":{"message":{"messageId":"client-1","role":"ROLE_USER","parts":[{"text":"quantum computing"}]}}}
```

The response contains a `result.message` with a server-generated `messageId` and `contextId`, `ROLE_AGENT`, and a text part. This is synchronous and stateless: task retrieval, streaming, push notifications, arbitrary attachments, and persistent conversations are **not supported**. Input is limited to one text part of at most 600 characters and requests are rate-limited. The card does not advertise OAuth security requirements because the public A2A endpoint does not require credentials; the separate Supabase discovery mirror does not authorize access to this endpoint.

The card uses the canonical `NEXT_PUBLIC_SITE_URL`; set it to the actual deployment origin when building a preview on a different host. After deployment, verify `GET /.well-known/agent-card.json` and send a `SendMessage` request to the advertised interface before running a third-party scanner. A local change cannot establish the production scanner's `a2aAgentCard` status.
