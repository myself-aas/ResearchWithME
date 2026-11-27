import { absoluteUrl } from '@/lib/seo';

/**
 * MCP Server Card (SEP-1649 / SEP-2127), served at
 * `/.well-known/mcp/server-card.json`.
 *
 * This card describes the MCP server this service actually hosts at `/mcp`:
 * a stateless Streamable HTTP (JSON-RPC 2.0) endpoint exposing this site's
 * read-only capabilities as tools. Every advertised capability is backed by
 * a working implementation, so clients that connect from the card's `endpoint`
 * will find exactly what it promises.
 */
export const dynamic = 'force-static';

const SERVER_NAME = 'researchwithme';
const SERVER_VERSION = '1.0.0';

export function GET() {
  const card = {
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    description:
      'MCP server for ResearchWithMe, a public, read-only research archive. Exposes the published essays (list, read as Markdown, full-text search), the article feed, and the llms.txt index as MCP tools over Streamable HTTP. No authentication is required.',
    endpoint: {
      url: absoluteUrl('/mcp'),
      transport: 'streamable-http',
      protocolVersions: ['2025-03-26', '2025-06-18'],
    },
    capabilities: {
      tools: {
        listChanged: false,
        description:
          'Five read-only tools: list_articles, get_article, search_articles, get_llms_index, and get_feed.',
        tools: [
          'list_articles',
          'get_article',
          'search_articles',
          'get_llms_index',
          'get_feed',
        ],
      },
      resources: null,
      prompts: null,
    },
  };

  return new Response(JSON.stringify(card, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
