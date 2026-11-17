import { describe, expect, it } from 'vitest';
import { handleMcp, mcpServerCard, MCP_VERSION } from '@/lib/mcp';
import { GET as nextCard, HEAD as nextCardHead } from '@/app/.well-known/mcp/server-card.json/route';
import type { BlogPost } from '@/lib/blog-data';

const TEST_SITE_URL = 'https://researchwith.me';
const rpc = (method: string, params: object = {}, id = 1) => ({ jsonrpc: '2.0', id, method, params });

const SAMPLE_ARTICLE: BlogPost = {
  id: 'mcp-1',
  slug: 'mcp-example',
  title: 'Quantum notes',
  subtitle: 'Subtitle',
  summary: 'A quantum research review.',
  content: ['Body'],
  category: 'Research Reviews',
  format: 'Deep-Dive Essay',
  publicationType: 'editorial',
  author: {
    id: 'a1',
    name: 'Editor',
    avatar: 'E',
    role: 'Editor',
    domain: 'Physics',
    bio: 'Editorial physicist',
    joinedDate: '2026-01-01',
    articleCount: 1,
  },
  publishedAt: '2026-11-15',
  readTime: '5 min read',
  tags: ['quantum'],
  coverImage: '/images/cover.jpg',
  featured: false,
  keyTakeaways: ['Takeaway 1'],
  likes: 0,
  commentsCount: 0,
};

const postMcp = (body: unknown, headers: Record<string, string> = {}) =>
  handleMcp(
    new Request(`${TEST_SITE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...headers,
      },
      body: JSON.stringify(body),
    }),
    async () => [SAMPLE_ARTICLE],
    TEST_SITE_URL,
  );

describe('MCP card and public Streamable HTTP server', () => {
  it('serves consistent metadata including the MCP endpoint', async () => {
    const response = nextCard();
    expect(response.status).toBe(200);
    const card = await response.json();
    expect(card).toEqual(mcpServerCard(TEST_SITE_URL));
    expect(card.serverInfo).toEqual({ name: card.name, version: card.version });
    expect(card.remotes[0].url).toBe(`${TEST_SITE_URL}/mcp`);
    expect(card.capabilities).toEqual({ tools: true, resources: true, prompts: false });

    const head = nextCardHead();
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
  });

  it('initializes, lists and calls a read-only search tool and resource', async () => {
    const init = await (
      await postMcp(
        rpc('initialize', {
          protocolVersion: MCP_VERSION,
          capabilities: {},
          clientInfo: { name: 'test', version: '1' },
        }),
      )
    ).json();
    expect(init.result.protocolVersion).toBe(MCP_VERSION);
    expect(init.result.capabilities).toEqual({ tools: {}, resources: {} });
    expect((await postMcp({ jsonrpc: '2.0', method: 'notifications/initialized' })).status).toBe(202);

    const tools = await (await postMcp(rpc('tools/list'))).json();
    expect(tools.result.tools[0].name).toBe('search_reviews');

    const call = await (
      await postMcp(rpc('tools/call', { name: 'search_reviews', arguments: { query: 'quantum' } }))
    ).json();
    expect(call.result.content[0].text).toContain(`${TEST_SITE_URL}/post/mcp-example`);

    const listed = await (await postMcp(rpc('resources/list'))).json();
    const uri = listed.result.resources[0].uri;
    const read = await (await postMcp(rpc('resources/read', { uri }))).json();
    expect(JSON.parse(read.result.contents[0].text).articles[0].title).toBe('Quantum notes');
  });

  it('rejects cross-origin requests, unsupported versions, and invalid arguments', async () => {
    expect((await postMcp(rpc('tools/list'), { Origin: 'https://evil.example' })).status).toBe(403);
    expect((await postMcp(rpc('tools/list'), { 'MCP-Protocol-Version': 'invalid' })).status).toBe(400);
    expect(
      (await (await postMcp(rpc('tools/call', { name: 'search_reviews', arguments: { query: '' } }))).json()).error.code,
    ).toBe(-32602);
  });
});
