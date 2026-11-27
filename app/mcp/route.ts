import { buildArticleMarkdown } from '@/lib/content/markdown';
import { buildLlmsTxt } from '@/lib/content/llms-index';
import { getAllPostMeta, getPostBySlug, getSearchIndex } from '@/lib/content/posts';
import { absoluteUrl } from '@/lib/seo';
import { SITE } from '@/lib/site';

/**
 * MCP server over Streamable HTTP (JSON-RPC 2.0), served at `/mcp`.
 *
 * A real, working MCP endpoint — not a stub. It implements the
 * initialize / ping / tools-list / tools-call subset of the MCP protocol
 * over HTTP POST, and exposes this site's genuine read-only capabilities
 * as tools: listing and reading the archive, full-text search, the feed,
 * and the llms.txt index. Everything is served from the same content
 * collection the site renders from, so the tools can only ever return
 * published content. No authentication, no writes — consistent with the
 * site's public, read-only contract.
 *
 * The server is stateless: no session IDs are issued, which the
 * Streamable HTTP transport permits for servers that do not maintain
 * per-session state.
 */

export const dynamic = 'force-dynamic';

/** MCP protocol version this server implements. */
const PROTOCOL_VERSION = '2025-06-18';

/** Protocol versions this server can speak; the client's version is echoed when supported. */
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-03-26', '2025-06-18'];

const SERVER_NAME = 'researchwithme';
const SERVER_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 helpers
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number | string;
  method: string;
  params?: unknown;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

function rpcResult(id: number | string | undefined, result: unknown) {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function rpcError(id: number | string | undefined, error: JsonRpcError) {
  return { jsonrpc: '2.0', id: id ?? null, error };
}

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

interface ToolResult {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

function textResult(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

function errorResult(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

/** list_articles: every published essay as an annotated index. */
function toolListArticles(): ToolResult {
  const posts = getAllPostMeta();
  const lines = [
    `${posts.length} published essay(s) on ${SITE.name}, newest first:`,
    '',
    ...posts.map(
      (post) =>
        `- **${post.title}** (${post.date}${post.updated ? `, updated ${post.updated}` : ''}) — ${post.description}\n  - URL: ${absoluteUrl(post.href)}\n  - Markdown: ${absoluteUrl(`${post.href}/markdown`)}\n  - Tags: ${post.tags.join(', ') || 'none'}`,
    ),
  ];
  return textResult(lines.join('\n'));
}

/** get_article: one essay as Markdown, by slug. */
function toolGetArticle(args: Record<string, unknown>): ToolResult {
  const slug = args.slug;
  if (typeof slug !== 'string' || slug.trim() === '') {
    return errorResult('Missing required argument "slug" (the essay URL segment).');
  }
  const post = getPostBySlug(slug);
  if (!post) {
    return errorResult(`No essay found at slug "${slug}". Use list_articles to see valid slugs.`);
  }
  return textResult(buildArticleMarkdown(post));
}

/** search_articles: ranked full-text match over the archive index. */
function toolSearchArticles(args: Record<string, unknown>): ToolResult {
  const query = args.query;
  if (typeof query !== 'string' || query.trim() === '') {
    return errorResult('Missing required argument "query" (search terms).');
  }
  const limitRaw = args.limit;
  const limit =
    typeof limitRaw === 'number' && Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), 50)
      : 10;

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
  if (terms.length === 0) {
    return errorResult('The search query contained no terms.');
  }

  const docs = getSearchIndex();
  const scored = docs
    .map((doc) => {
      const title = doc.title.toLowerCase();
      const description = doc.description.toLowerCase();
      const tags = doc.tags.join(' ').toLowerCase();
      const text = doc.text.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (title.includes(term)) score += 10;
        if (tags.includes(term)) score += 5;
        if (description.includes(term)) score += 3;
        // Count occurrences in the body text, capped so long essays do not dominate.
        let index = text.indexOf(term);
        let occurrences = 0;
        while (index !== -1 && occurrences < 10) {
          occurrences += 1;
          index = text.indexOf(term, index + term.length);
        }
        score += Math.min(occurrences, 10);
      }
      return { doc, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.doc.date.localeCompare(b.doc.date))
    .slice(0, limit);

  if (scored.length === 0) {
    return textResult(`No essays matched "${query}".`);
  }

  const lines = [
    `${scored.length} match(es) for "${query}":`,
    '',
    ...scored.map(({ doc }) => {
      const snippet = doc.text.slice(0, 200).replace(/\s+/g, ' ').trim();
      return `- **${doc.title}** (${doc.date}) — ${doc.description}\n  - URL: ${absoluteUrl(doc.href)}\n  - Snippet: ${snippet}…`;
    }),
  ];
  return textResult(lines.join('\n'));
}

/** get_llms_index: the full llms.txt index text. */
function toolGetLlmsIndex(): ToolResult {
  return textResult(buildLlmsTxt());
}

/** get_feed: the published articles as JSON Feed items. */
function toolGetFeed(): ToolResult {
  const items = getAllPostMeta().map((post) => ({
    title: post.title,
    url: absoluteUrl(post.href),
    summary: post.description,
    date_published: `${post.date}T00:00:00.000Z`,
    ...(post.updated ? { date_modified: `${post.updated}T00:00:00.000Z` } : {}),
    tags: post.tags,
  }));
  return textResult(JSON.stringify({ version: 1, count: items.length, items }, null, 2));
}

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => ToolResult;
}

const TOOLS: ToolDefinition[] = [
  {
    name: 'list_articles',
    description:
      'List every published essay on ResearchWithMe with title, date, description, canonical URL, markdown URL, and tags. Use to discover what has been written.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => toolListArticles(),
  },
  {
    name: 'get_article',
    description:
      'Return one published essay as clean Markdown (with YAML frontmatter), by its slug. Use after list_articles or search_articles to read a specific essay in full.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The essay URL segment, e.g. "airflow-before-you-ship".',
        },
      },
      required: ['slug'],
      additionalProperties: false,
    },
    handler: toolGetArticle,
  },
  {
    name: 'search_articles',
    description:
      'Full-text search across every published essay. Returns ranked matches (title, date, description, URL, snippet) scored by term frequency. Use to find essays on a topic.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search terms.' },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default 10, max 50).',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    handler: toolSearchArticles,
  },
  {
    name: 'get_llms_index',
    description:
      'Return the full llms.txt index of the site: the summary, every essay as an annotated link, the machine-readable interfaces, and usage/licensing notes.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => toolGetLlmsIndex(),
  },
  {
    name: 'get_feed',
    description:
      'Return the published articles as JSON Feed items (title, URL, summary, dates, tags), newest first.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => toolGetFeed(),
  },
];

const TOOL_MAP = new Map(TOOLS.map((tool) => [tool.name, tool]));

// ---------------------------------------------------------------------------
// JSON-RPC method dispatch
// ---------------------------------------------------------------------------

function handleRequest(request: JsonRpcRequest): Record<string, unknown> {
  const { id, method, params } = request;

  switch (method) {
    case 'initialize': {
      const requested =
        params && typeof params === 'object' && 'protocolVersion' in params
          ? String((params as { protocolVersion?: unknown }).protocolVersion)
          : undefined;
      return rpcResult(id, {
        protocolVersion: requested && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
          ? requested
          : PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });
    }

    case 'ping':
      return rpcResult(id, {});

    case 'tools/list':
      return rpcResult(id, {
        tools: TOOLS.map(({ name, description, inputSchema }) => ({
          name,
          description,
          inputSchema,
        })),
      });

    case 'tools/call': {
      const callParams =
        params && typeof params === 'object' ? (params as { name?: unknown; arguments?: unknown }) : {};
      const toolName = typeof callParams.name === 'string' ? callParams.name : '';
      const tool = TOOL_MAP.get(toolName);
      if (!tool) {
        // Per the MCP spec, an unknown tool is a JSON-RPC invalid-params error.
        return rpcError(id, {
          code: -32602,
          message: `Unknown tool "${toolName}". Use tools/list to see available tools.`,
        });
      }
      const args =
        callParams.arguments && typeof callParams.arguments === 'object'
          ? (callParams.arguments as Record<string, unknown>)
          : {};
      return rpcResult(id, tool.handler(args));
    }

    default:
      return rpcError(id, { code: METHOD_NOT_FOUND, message: `Method not found: ${method}` });
  }
}

async function handlePost(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(rpcError(undefined, { code: PARSE_ERROR, message: 'Parse error' }), 400);
  }

  // JSON-RPC batches arrive as arrays; answer each element in order.
  if (Array.isArray(body)) {
    if (body.length === 0) {
      return jsonResponse(rpcError(undefined, { code: INVALID_REQUEST, message: 'Empty batch' }), 400);
    }
    const responses = body.map((entry) => {
      if (
        entry === null ||
        typeof entry !== 'object' ||
        (entry as JsonRpcRequest).jsonrpc !== '2.0' ||
        typeof (entry as JsonRpcRequest).method !== 'string'
      ) {
        return rpcError(undefined, { code: INVALID_REQUEST, message: 'Invalid request object' });
      }
      return handleRequest(entry as JsonRpcRequest);
    });
    return jsonResponse(responses);
  }

  if (body === null || typeof body !== 'object' || (body as JsonRpcRequest).jsonrpc !== '2.0') {
    return jsonResponse(rpcError(undefined, { code: INVALID_REQUEST, message: 'Invalid JSON-RPC request' }), 400);
  }

  const response = handleRequest(body as JsonRpcRequest);
  // Notifications (no id) get an empty 202, per the MCP Streamable HTTP transport.
  if ((body as JsonRpcRequest).id === undefined) {
    return new Response(null, { status: 202 });
  }
  return jsonResponse(response);
}

export async function POST(request: Request): Promise<Response> {
  return handlePost(request);
}

/**
 * GET is reserved for server-initiated SSE streams. This stateless server
 * does not use them, so the transport is POST-only.
 */
export function GET(): Response {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'POST' },
  });
}

/** Session termination: this server is stateless and issues no sessions. */
export function DELETE(): Response {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'POST' },
  });
}
