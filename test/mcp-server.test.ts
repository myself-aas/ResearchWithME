import { describe, expect, it } from 'vitest';
import { GET as getCard } from '@/app/.well-known/mcp/server-card.json/route';
import { DELETE as deleteMcp, GET as getMcp, POST as postMcp } from '@/app/mcp/route';
import { getPostSlugs } from '@/lib/content/posts';

/**
 * MCP Server Card (SEP-1649) and the MCP server it advertises at `/mcp`.
 *
 * The card describes a real Streamable HTTP MCP endpoint; these tests drive
 * the endpoint through the JSON-RPC methods an MCP client uses: initialize,
 * ping, tools/list, and tools/call.
 */

interface Card {
  serverInfo: { name: string; version: string };
  description: string;
  endpoint: { url: string; transport: string; protocolVersions: string[] };
  capabilities: {
    tools: { listChanged: boolean; description: string; tools: string[] };
    resources: null;
    prompts: null;
  };
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
}

async function callMcp(method: string, params?: unknown, id = 1): Promise<JsonRpcResponse> {
  const response = await postMcp(
    new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params === undefined ? { jsonrpc: '2.0', id, method } : { jsonrpc: '2.0', id, method, params }),
    }),
  );
  return (await response.json()) as JsonRpcResponse;
}

describe('MCP Server Card', () => {
  it('serves JSON with HTTP 200', async () => {
    const response = getCard();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('includes serverInfo with name and version', async () => {
    const card = JSON.parse(await getCard().text()) as Card;
    expect(card.serverInfo.name).toBe('researchwithme');
    expect(typeof card.serverInfo.version).toBe('string');
    expect(card.serverInfo.version.length).toBeGreaterThan(0);
  });

  it('declares a streamable-http endpoint at /mcp', async () => {
    const card = JSON.parse(await getCard().text()) as Card;
    expect(card.endpoint.url).toMatch(/^https:\/\/researchwith\.me\/mcp$/);
    expect(card.endpoint.transport).toBe('streamable-http');
    expect(card.endpoint.protocolVersions.length).toBeGreaterThan(0);
  });

  it('lists capabilities: tools supported, resources and prompts not', async () => {
    const card = JSON.parse(await getCard().text()) as Card;
    expect(card.capabilities.tools).toBeDefined();
    expect(card.capabilities.tools.listChanged).toBe(false);
    expect(card.capabilities.tools.tools).toEqual([
      'list_articles',
      'get_article',
      'search_articles',
      'get_llms_index',
      'get_feed',
    ]);
    expect(card.capabilities.resources).toBeNull();
    expect(card.capabilities.prompts).toBeNull();
  });

  it('is valid JSON and round-trips', async () => {
    const card = JSON.parse(await getCard().text()) as Card;
    const roundTrip = JSON.parse(JSON.stringify(card)) as Card;
    expect(roundTrip.serverInfo).toEqual(card.serverInfo);
    expect(roundTrip.capabilities.tools.tools).toHaveLength(5);
  });
});

describe('MCP server at /mcp', () => {
  it('answers initialize with protocol version, capabilities, and serverInfo', async () => {
    const response = await callMcp('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    });
    expect(response.error).toBeUndefined();
    const result = response.result as {
      protocolVersion: string;
      capabilities: { tools: { listChanged: boolean } };
      serverInfo: { name: string; version: string };
    };
    expect(result.protocolVersion).toBe('2025-06-18');
    expect(result.capabilities.tools).toEqual({ listChanged: false });
    expect(result.serverInfo).toEqual({ name: 'researchwithme', version: '1.0.0' });
  });

  it('falls back to its own protocol version for unsupported requests', async () => {
    const response = await callMcp('initialize', { protocolVersion: '1999-01-01' });
    const result = response.result as { protocolVersion: string };
    expect(result.protocolVersion).toBe('2025-06-18');
  });

  it('answers ping', async () => {
    const response = await callMcp('ping');
    expect(response.error).toBeUndefined();
    expect(response.result).toEqual({});
  });

  it('lists all five tools with input schemas', async () => {
    const response = await callMcp('tools/list');
    const result = response.result as {
      tools: { name: string; description: string; inputSchema: Record<string, unknown> }[];
    };
    expect(result.tools.map((tool) => tool.name)).toEqual([
      'list_articles',
      'get_article',
      'search_articles',
      'get_llms_index',
      'get_feed',
    ]);
    for (const tool of result.tools) {
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('calls list_articles and returns the archive index', async () => {
    const response = await callMcp('tools/call', { name: 'list_articles', arguments: {} });
    const result = response.result as { content: { type: string; text: string }[]; isError?: boolean };
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain('published essay');
    expect(text).toMatch(/- \*\*.+\*\*/);
  });

  it('calls get_article and returns Markdown for a real slug', async () => {
    const slug = getPostSlugs()[0];
    const response = await callMcp('tools/call', { name: 'get_article', arguments: { slug } });
    const result = response.result as { content: { type: string; text: string }[]; isError?: boolean };
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toMatch(/^---\n/);
    expect(text).toContain('canonical: https://researchwith.me');
  });

  it('returns an error result for an unknown slug', async () => {
    const response = await callMcp('tools/call', {
      name: 'get_article',
      arguments: { slug: 'no-such-essay' },
    });
    const result = response.result as { content: { type: string; text: string }[]; isError: boolean };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No essay found');
  });

  it('calls search_articles and returns ranked matches', async () => {
    const response = await callMcp('tools/call', {
      name: 'search_articles',
      arguments: { query: 'the', limit: 5 },
    });
    const result = response.result as { content: { type: string; text: string }[]; isError?: boolean };
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toMatch(/match\(es\)/);
  });

  it('calls get_llms_index and returns the index text', async () => {
    const response = await callMcp('tools/call', { name: 'get_llms_index', arguments: {} });
    const result = response.result as { content: { type: string; text: string }[]; isError?: boolean };
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('# ResearchWithMe');
  });

  it('calls get_feed and returns JSON Feed items', async () => {
    const response = await callMcp('tools/call', { name: 'get_feed', arguments: {} });
    const result = response.result as { content: { type: string; text: string }[]; isError?: boolean };
    expect(result.isError).toBeUndefined();
    const feed = JSON.parse(result.content[0].text) as { version: number; count: number; items: unknown[] };
    expect(feed.version).toBe(1);
    expect(feed.count).toBeGreaterThan(0);
    expect(feed.items.length).toBe(feed.count);
  });

  it('returns a JSON-RPC error for an unknown tool', async () => {
    const response = await callMcp('tools/call', { name: 'no_such_tool', arguments: {} });
    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe(-32602);
  });

  it('returns a JSON-RPC error for an unknown method', async () => {
    const response = await callMcp('no/such/method');
    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe(-32601);
  });

  it('returns 400 on a malformed JSON body', async () => {
    const response = await postMcp(
      new Request('http://localhost/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not json',
      }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as JsonRpcResponse;
    expect(body.error?.code).toBe(-32700);
  });

  it('answers notifications with 202 and no body', async () => {
    const response = await postMcp(
      new Request('http://localhost/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      }),
    );
    expect(response.status).toBe(202);
  });

  it('handles JSON-RPC batches', async () => {
    const response = await postMcp(
      new Request('http://localhost/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { jsonrpc: '2.0', id: 1, method: 'ping' },
          { jsonrpc: '2.0', id: 2, method: 'tools/list' },
        ]),
      }),
    );
    expect(response.status).toBe(200);
    const batch = (await response.json()) as JsonRpcResponse[];
    expect(batch).toHaveLength(2);
    expect(batch[0].id).toBe(1);
    expect(batch[1].id).toBe(2);
  });

  it('rejects GET and DELETE on the endpoint', () => {
    expect(getMcp().status).toBe(405);
    expect(deleteMcp().status).toBe(405);
  });
});
