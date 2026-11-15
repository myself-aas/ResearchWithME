import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPrompt, catalogAnswer, composeAnswer } from '@/lib/assistant/compose';
import { rankArticles, toAssistantArticle, toCitation } from '@/lib/assistant/retrieve';
import type { BlogPost } from '@/lib/blog-data';

vi.mock('@/lib/cms/catalogue', () => ({ getArticleCatalogue: vi.fn(async () => []) }));
vi.mock('@/lib/rate-limit', () => ({
  clientKey: () => 'k',
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 1, retryAfter: 0 })),
}));

const article = {
  id: 'a1', slug: 'replication', title: 'Replication in practice', author: 'A. Writer', category: 'Research Reviews',
  summary: 'What a rerun showed.', keyTakeaways: ['Seeds matter'], artifact: null,
};

const post = {
  id: 'p1', slug: 'vllm-teardown', title: 'vLLM teardown', summary: 'Memory behaviour under load.', category: 'GitHub Repo Teardowns',
  tags: ['inference'], keyTakeaways: ['Paged attention'], author: { name: 'B. Author' },
  reviewedArtifact: { identifier: 'vllm-project/vllm', title: 'vLLM', meta: 'Apache-2.0' },
} as unknown as BlogPost;

afterEach(() => vi.unstubAllEnvs());

describe('composeAnswer', () => {
  it('returns the model text in MODEL mode', async () => {
    const out = await composeAnswer({ query: 'replication', articles: [article] }, async () => 'Model text');
    expect(out).toEqual({ answer: 'Model text', mode: 'MODEL', notice: null });
  });
  it('falls back to the catalogue answer when the generator throws', async () => {
    const out = await composeAnswer({ query: 'replication', articles: [article] }, async () => { throw new Error('boom'); });
    expect(out.mode).toBe('CATALOG');
    expect(out.answer).toBe(catalogAnswer('replication', [article]));
    expect(out.notice).toBe('The language model was unavailable, so this answer was assembled directly from the catalog.');
  });
  it('treats an empty model reply as a failure', async () => {
    expect((await composeAnswer({ query: 'q', articles: [article] }, async () => '   ')).mode).toBe('CATALOG');
  });
  it('uses the catalogue with no notice when there is no generator', async () => {
    expect(await composeAnswer({ query: 'q', articles: [] }, null)).toMatchObject({ mode: 'CATALOG', notice: null });
  });
  it('caps the model reply at 20000 characters', async () => {
    expect((await composeAnswer({ query: 'q', articles: [article] }, async () => 'x'.repeat(30_000))).answer).toHaveLength(20_000);
  });
  it('prompts from the context records when nothing matched', async () => {
    let seen = '';
    await composeAnswer({ query: 'q', articles: [], context: [article] }, async (prompt) => { seen = prompt; return 'ok'; });
    expect(seen).toContain('[a1] Replication in practice');
    expect(seen).toBe(buildPrompt('q', [article]));
  });
});

describe('catalogAnswer', () => {
  it('says so when nothing matches', () => {
    expect(catalogAnswer('q', [])).toContain('### No direct match in the catalog');
  });
  it('names each matching article and its artifact', () => {
    const text = catalogAnswer('vllm', [toAssistantArticle(post)]);
    expect(text).toContain('1 review directly addresses this topic');
    expect(text).toContain('#### vLLM teardown\nBy B. Author · GitHub Repo Teardowns');
    expect(text).toContain('Reviewed artifact: vllm-project/vllm (Apache-2.0)');
  });
});

describe('rankArticles', () => {
  it('ignores stop words and short terms', () => {
    expect(rankArticles('what is the', [post])).toEqual([]);
  });
  it('returns a post whose title matches', () => {
    expect(rankArticles('vllm memory', [post])).toEqual([post]);
  });
  it('drops a post that scores under the threshold', () => {
    expect(rankArticles('teardowns', [post])).toEqual([]);
  });
  it('builds an absolute citation url', () => {
    expect(toCitation(toAssistantArticle(post), 'https://researchwith.me')).toEqual({
      id: 'p1', slug: 'vllm-teardown', title: 'vLLM teardown', author: 'B. Author', category: 'GitHub Repo Teardowns',
      url: 'https://researchwith.me/post/vllm-teardown',
    });
  });
});

describe('legacy route', () => {
  it('legacy response shape is unchanged', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const { POST } = await import('@/app/api/research-assistant/route');
    const res = await POST(new Request('http://localhost/api/research-assistant', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: 'x-ray' }),
    }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(['answer', 'citations', 'mode']);
    expect(body.mode).toBe('catalog');
  });
});
