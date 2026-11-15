import { describe, expect, it } from 'vitest';
import { createTestApp, TEST_SITE_URL } from '@/test/support/pages';
import { mcpServerCard, MCP_VERSION } from '@/lib/mcp';
import { GET as nextCard, HEAD as nextCardHead } from '@/app/.well-known/mcp/server-card.json/route';

const rpc = (method: string, params: object = {}, id = 1) => ({ jsonrpc: '2.0', id, method, params });
const post = (app: ReturnType<typeof createTestApp>, body: unknown, headers: Record<string, string> = {}) =>
  app.request('/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers }, body: JSON.stringify(body) });

describe('MCP card and public Streamable HTTP server', () => {
  it('serves consistent metadata from Next and Pages, including an actual endpoint', async () => {
    const app = createTestApp();
    for (const response of [await app.request('/.well-known/mcp/server-card.json'), nextCard()]) {
      expect(response.status).toBe(200);
      const card = await response.json();
      expect(card).toEqual(mcpServerCard(TEST_SITE_URL));
      expect(card.serverInfo).toEqual({ name: card.name, version: card.version });
      expect(card.remotes[0].url).toBe(`${TEST_SITE_URL}/mcp`);
      expect(card.capabilities).toEqual({ tools: true, resources: true, prompts: false });
    }
    for (const head of [await app.request('/.well-known/mcp/server-card.json', { method: 'HEAD' }), nextCardHead()]) {
      expect(head.status).toBe(200);
      expect(await head.text()).toBe('');
    }
  });

  it('initializes, lists and calls a read-only search tool and resource', async () => {
    const app = createTestApp();
    await app.seedPost({ slug: 'mcp-example', title: 'Quantum notes', summary: 'A quantum research review.', status: 'published' });
    const init = await (await post(app, rpc('initialize', { protocolVersion: MCP_VERSION, capabilities: {}, clientInfo: { name: 'test', version: '1' } }))).json();
    expect(init.result.protocolVersion).toBe(MCP_VERSION);
    expect(init.result.capabilities).toEqual({ tools: {}, resources: {} });
    expect((await post(app, { jsonrpc: '2.0', method: 'notifications/initialized' })).status).toBe(202);
    const tools = await (await post(app, rpc('tools/list'))).json();
    expect(tools.result.tools[0].name).toBe('search_reviews');
    const call = await (await post(app, rpc('tools/call', { name: 'search_reviews', arguments: { query: 'quantum' } }))).json();
    expect(call.result.content[0].text).toContain(`${TEST_SITE_URL}/post/mcp-example`);
    const listed = await (await post(app, rpc('resources/list'))).json();
    const uri = listed.result.resources[0].uri;
    const read = await (await post(app, rpc('resources/read', { uri }))).json();
    expect(JSON.parse(read.result.contents[0].text).articles[0].title).toBe('Quantum notes');
  });

  it('rejects cross-origin requests, unsupported versions, invalid arguments, and SSE GET', async () => {
    const app = createTestApp();
    expect((await post(app, rpc('tools/list'), { Origin: 'https://evil.example' })).status).toBe(403);
    expect((await post(app, rpc('tools/list'), { 'MCP-Protocol-Version': 'invalid' })).status).toBe(400);
    expect((await (await post(app, rpc('tools/call', { name: 'search_reviews', arguments: { query: '' } }))).json()).error.code).toBe(-32602);
    expect((await app.request('/mcp', { method: 'GET' })).status).toBe(405);
  });
});
