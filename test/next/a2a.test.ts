import { describe, expect, it } from 'vitest';
import { agentCard, handleA2aMessage } from '@/lib/a2a';
import { GET as nextCard, HEAD as nextCardHead } from '@/app/.well-known/agent-card.json/route';
import type { BlogPost } from '@/lib/blog-data';

const TEST_SITE_URL = 'https://researchwith.me';

const sendMessage = (text: string, id: number | string = 1) => ({
  jsonrpc: '2.0',
  id,
  method: 'SendMessage',
  params: { message: { messageId: 'client-1', role: 'ROLE_USER', parts: [{ text }] } },
});

const SAMPLE_ARTICLE: BlogPost = {
  id: 'a2a-1',
  slug: 'archive-example',
  title: 'Quantum archive example',
  subtitle: 'Subtitle',
  summary: 'An example review of quantum studies.',
  content: ['Body text'],
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

describe('public A2A discovery and JSON-RPC transport', () => {
  it('publishes a card pointing to the JSON-RPC endpoint', async () => {
    const response = nextCard();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual(agentCard(TEST_SITE_URL));

    const card = agentCard(TEST_SITE_URL);
    expect(card.supportedInterfaces[0]).toEqual({
      url: `${TEST_SITE_URL}/api/a2a`,
      protocolBinding: 'JSONRPC',
      protocolVersion: '1.0',
    });
    expect(card.skills[0]).toMatchObject({
      id: 'search-published-reviews',
      name: expect.any(String),
      description: expect.any(String),
    });
    expect(nextCardHead().status).toBe(200);
  });

  it('answers SendMessage from the published catalogue without requiring credentials', async () => {
    const request = new Request(`${TEST_SITE_URL}/api/a2a`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sendMessage('Quantum')),
    });
    const response = await handleA2aMessage(request, async () => [SAMPLE_ARTICLE], TEST_SITE_URL);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(1);
    expect(body.result.message.role).toBe('ROLE_AGENT');
    expect(body.result.message.contextId).toBeTruthy();
    expect(body.result.message.parts[0].text).toContain(`${TEST_SITE_URL}/post/archive-example`);
  });

  it('rejects unsupported methods, oversized and malformed input without querying posts', async () => {
    const loadPosts = () => {
      throw new Error('Must not run');
    };
    const request = (body: unknown) =>
      new Request(`${TEST_SITE_URL}/api/a2a`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    expect((await (await handleA2aMessage(request({ ...sendMessage('hi'), method: 'GetTask' }), loadPosts, TEST_SITE_URL)).json()).error.code).toBe(-32601);
    expect((await (await handleA2aMessage(request(sendMessage('x'.repeat(601))), loadPosts, TEST_SITE_URL)).json()).error.code).toBe(-32602);
    const oversized = await handleA2aMessage(request(sendMessage('x'.repeat(9000))), loadPosts, TEST_SITE_URL);
    expect(oversized.status).toBe(413);
    expect((await (await handleA2aMessage(request({ ...sendMessage('hi'), id: null }), loadPosts, TEST_SITE_URL)).json()).error.code).toBe(-32600);
  });
});
