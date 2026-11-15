import type { BlogPost } from './blog-data';

export const MCP_VERSION = '2025-11-25';
const RESOURCE_PATH = '/api/articles';
const SERVER_INFO = { name: 'me.researchwith/archive', version: '1.1.0' };
const TOOL = {
  name: 'search_reviews',
  description: 'Find published ResearchWithMe reviews by title, tag, summary, or reviewed artifact. Returns linked summaries from the public archive only.',
  inputSchema: {
    type: 'object', properties: { query: { type: 'string', description: 'Search term (1–120 characters).' } },
    required: ['query'], additionalProperties: false,
  },
};
const ASK_TOOL = {
  name: 'ask_archive',
  description: 'Ask a question and get an answer written only from published ResearchWithMe reviews, with links to them. Requires an API key in the Authorization header (Bearer rwm_…), created on the account page. Each answer uses one unit of the account’s monthly allowance.',
  inputSchema: {
    type: 'object', properties: { query: { type: 'string', description: 'Question about the archive (1–600 characters).' } },
    required: ['query'], additionalProperties: false,
  },
};

/**
 * Answers `ask_archive`. Supplied by the route (app/mcp/route.ts) so this module
 * stays free of the key store and the ledger and can run where they do not exist.
 * `ok: false` is a refusal the caller should read (no key, allowance used), so it
 * is returned as a tool error rather than a protocol error.
 */
export type AskArchive = (request: Request, query: string, rpcId: string | number) =>
  Promise<{ ok: true; text: string } | { ok: false; message: string }>;

export function mcpServerCard(siteUrl: string) {
  const origin = new URL(siteUrl).origin;
  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
    name: SERVER_INFO.name, version: SERVER_INFO.version,
    description: 'Read-only access to published ResearchWithMe reviews and the public article catalogue.',
    remotes: [{ type: 'streamable-http', url: `${origin}/mcp`, supportedProtocolVersions: [MCP_VERSION] }],
    // Compatibility aliases for discovery clients expecting these fields.
    serverInfo: SERVER_INFO,
    endpoint: `${origin}/mcp`,
    capabilities: { tools: true, resources: true, prompts: false },
  };
}

export function mcpCardResponse(siteUrl: string, method: string): Response {
  if (method !== 'GET' && method !== 'HEAD') return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  return new Response(method === 'HEAD' ? null : JSON.stringify(mcpServerCard(siteUrl)), {
    headers: { 'Content-Type': 'application/mcp-server-card+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' },
  });
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
const error = (id: string | number | null, code: number, message: string, status = 200) =>
  json({ jsonrpc: '2.0', id, error: { code, message } }, status);

function matches(query: string, posts: BlogPost[]) {
  const words = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 2).slice(0, 12);
  return posts.map((post) => ({ post, score: words.reduce((score, word) => score +
    (post.title.toLowerCase().includes(word) ? 4 : 0) +
    (post.tags.some((tag) => tag.toLowerCase().includes(word)) ? 3 : 0) +
    (post.summary.toLowerCase().includes(word) ? 2 : 0) +
    ((post.reviewedArtifact?.identifier ?? '').toLowerCase().includes(word) ? 3 : 0), 0),
  })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
}

export async function handleMcp(
  request: Request, loadPosts: () => Promise<BlogPost[]>, siteUrl: string, ask?: AskArchive,
): Promise<Response> {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin || origin !== new URL(origin).origin) return error(null, -32000, 'Invalid Origin.', 403);
    } catch { return error(null, -32000, 'Invalid Origin.', 403); }
  }
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  if (request.headers.get('mcp-protocol-version') && request.headers.get('mcp-protocol-version') !== MCP_VERSION) {
    return error(null, -32600, 'Unsupported MCP protocol version.', 400);
  }
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) return error(null, -32600, 'Expected application/json.', 415);
  if (Number(request.headers.get('content-length')) > 8192) return error(null, -32600, 'Request too large.', 413);
  let value: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 8192) return error(null, -32600, 'Request too large.', 413);
    value = JSON.parse(raw);
  } catch { return error(null, -32700, 'Invalid JSON.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return error(null, -32600, 'Invalid request.');
  const rpc = value as Record<string, unknown>;
  const id = (typeof rpc.id === 'string' && rpc.id.length <= 120) || (typeof rpc.id === 'number' && Number.isSafeInteger(rpc.id)) ? rpc.id as string | number : null;
  if (rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string') return error(id, -32600, 'Invalid request.');
  if (rpc.method === 'notifications/initialized' && rpc.id === undefined) return new Response(null, { status: 202 });
  if (id === null) return error(null, -32600, 'A request id is required.');
  const params = rpc.params && typeof rpc.params === 'object' && !Array.isArray(rpc.params)
    ? rpc.params as Record<string, unknown> : {};
  const result = (data: unknown) => json({ jsonrpc: '2.0', id, result: data });

  switch (rpc.method) {
    case 'initialize': {
      const requested = params.protocolVersion;
      if (requested !== MCP_VERSION) return error(id, -32602, `Supported protocol version: ${MCP_VERSION}.`, 400);
      return result({ protocolVersion: MCP_VERSION,
        capabilities: { tools: {}, resources: {} }, serverInfo: SERVER_INFO });
    }
    case 'ping': return result({});
    case 'tools/list': return result({ tools: [TOOL, ASK_TOOL] });
    case 'resources/list': return result({ resources: [{
      uri: new URL(RESOURCE_PATH, siteUrl).toString(),
      name: 'Published ResearchWithMe articles', mimeType: 'application/json',
      description: 'Metadata for published articles in the public archive.',
    }] });
    case 'tools/call': {
      if ((params.name !== TOOL.name && params.name !== ASK_TOOL.name) || !params.arguments || typeof params.arguments !== 'object' || Array.isArray(params.arguments)) {
        return error(id, -32602, 'Unknown tool or invalid arguments.');
      }
      const args = params.arguments as Record<string, unknown>;
      if (params.name === ASK_TOOL.name) {
        const question = typeof args.query === 'string' ? args.query.trim() : '';
        if (!question || question.length > 600) return error(id, -32602, 'query must be 1–600 characters.');
        const toolError = (text: string) => result({ content: [{ type: 'text', text }], isError: true });
        if (!ask) return toolError('ask_archive is not available on this deployment.');
        try {
          const outcome = await ask(request, question, id);
          return outcome.ok ? result({ content: [{ type: 'text', text: outcome.text }] }) : toolError(outcome.message);
        } catch { return toolError('The answer could not be produced.'); }
      }
      if (typeof args.query !== 'string' || !args.query.trim() || args.query.length > 120) return error(id, -32602, 'query must be 1–120 characters.');
      try {
        const found = matches(args.query.trim(), await loadPosts());
        const text = found.length ? found.map(({ post }) =>
          `${post.title} — ${post.author.name}\n${post.summary}\n${new URL(`/post/${encodeURIComponent(post.slug)}`, siteUrl)}`,
        ).join('\n\n') : 'No matching published review in the archive.';
        return result({ content: [{ type: 'text', text }] });
      } catch { return error(id, -32603, 'The archive is unavailable.', 503); }
    }
    case 'resources/read': {
      if (params.uri !== new URL(RESOURCE_PATH, siteUrl).toString()) return error(id, -32602, 'Unknown resource.');
      try {
        const articles = (await loadPosts()).slice(0, 100).map(({ id: postId, slug, title, summary, author }) => ({
          id: postId, slug, title, summary, author: author.name, url: new URL(`/post/${encodeURIComponent(slug)}`, siteUrl).toString(),
        }));
        return result({ contents: [{ uri: params.uri, mimeType: 'application/json', text: JSON.stringify({ articles }) }] });
      } catch { return error(id, -32603, 'The archive is unavailable.', 503); }
    }
    default: return error(id, -32601, 'Method not found.');
  }
}
