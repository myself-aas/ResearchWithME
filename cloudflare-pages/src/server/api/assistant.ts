import type { RequestContext } from '../context';
import { rateLimit } from '../context';
import { clientKey } from '../http';
import { json, type ApiRoute, type ApiHandler } from './registry';
import { getPublicArticleCatalogue } from '../stores';
import { cleanText } from '@/lib/validation';
import { MODEL_TIMEOUT_MS } from '../models';
import type { BlogPost } from '@/lib/blog-data';

const MAX_QUERY = 600;

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'about', 'what', 'does', 'how', 'why', 'from', 'into', 'that', 'this',
  'are', 'was', 'were', 'has', 'have', 'had', 'its', 'their', 'they', 'than', 'then', 'when', 'where',
  'which', 'while', 'does', 'did', 'can', 'could', 'should', 'would', 'you', 'your', 'our', 'per',
]);

/**
 * Deterministic relevance over the public catalogue. Identical scoring to the
 * Next route: title 4, tags 3, reviewed artifact 3, summary 2, category 1,
 * threshold 3, top 3.
 */
async function matchingPosts(ctx: RequestContext, query: string): Promise<BlogPost[]> {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9.+-]+/)
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term))
    .slice(0, 12);

  if (terms.length === 0) return [];

  const archive = await getPublicArticleCatalogue(ctx);

  return archive
    .map((post) => {
      const title = post.title.toLowerCase();
      const summary = post.summary.toLowerCase();
      const category = post.category.toLowerCase();
      const tags = post.tags.join(' ').toLowerCase();
      const artifact =
        `${post.reviewedArtifact?.identifier ?? ''} ${post.reviewedArtifact?.title ?? ''}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (title.includes(term)) score += 4;
        if (tags.includes(term)) score += 3;
        if (artifact.includes(term)) score += 3;
        if (summary.includes(term)) score += 2;
        if (category.includes(term)) score += 1;
      }
      return { post, score };
    })
    .filter((entry) => entry.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.post);
}

async function fallbackAnswer(ctx: RequestContext, query: string) {
  const matches = await matchingPosts(ctx, query);

  if (matches.length > 0) {
    return {
      answer:
        `### What the archive says about “${query}”\n\n` +
        `${matches.length} ${matches.length === 1 ? 'review directly addresses' : 'reviews directly address'} this topic:\n\n` +
        matches
          .map(
            (post) =>
              `#### ${post.title}\n` +
              `By ${post.author.name} · ${post.category}\n\n` +
              (post.reviewedArtifact
                ? `Reviewed artifact: ${post.reviewedArtifact.identifier} (${post.reviewedArtifact.meta})\n\n`
                : '') +
              `Key points:\n${post.keyTakeaways.map((takeaway) => `- ${takeaway}`).join('\n')}\n\n` +
              `${post.summary}`,
          )
          .join('\n\n---\n\n'),
      citations: matches,
    };
  }

  return {
    answer:
      '### No direct match in the catalog\n\n' +
      'The archive does not contain a review that matches that question. Try a narrower term, a repository name, or a DOI, or browse the fields below.\n\n' +
      '- **Research Reviews** cover methodology, replication, and primary literature.\n' +
      '- **GitHub Repo Teardowns** examine architecture, memory behaviour, and performance.\n' +
      '- **Health & Medicine** reviews trial design, pharmacology, and clinical outcomes.\n\n' +
      'Every answer here is limited to published articles; nothing outside this catalog is searched.',
    citations: [],
  };
}

const researchAssistant: ApiHandler = async (ctx) => {
  const limit = await rateLimit(ctx, clientKey(ctx.request, 'assistant'), 12, 60_000);
  if (!limit.allowed) {
    return json(
      { error: 'Too many questions in a short window. Wait a minute and try again.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } },
    );
  }

  if (!(ctx.request.headers.get('content-type') ?? '').includes('application/json')) {
    return json({ error: 'Send the question as JSON.' }, { status: 415 });
  }

  let payload: { query?: unknown };
  try {
    payload = (await ctx.request.json()) as { query?: unknown };
  } catch {
    return json({ error: 'The question body could not be read.' }, { status: 400 });
  }

  const query = cleanText(payload.query, MAX_QUERY);
  if (!query) {
    return json({ error: 'Ask a question to search the archive.' }, { status: 400 });
  }

  const fallback = await fallbackAnswer(ctx, query);
  const citations = fallback.citations.map((post) => ({
    id: post.id,
    title: post.title,
    author: post.author.name,
    category: post.category,
  }));

  const apiKey = ctx.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ answer: fallback.answer, citations, mode: 'catalog' });
  }

  const corpus =
    fallback.citations.length > 0 ? fallback.citations : (await getPublicArticleCatalogue(ctx)).slice(0, 4);
  const systemPrompt = [
    'You are the ResearchWithMe editorial assistant.',
    'Answer only from the article records supplied below. Do not invent sources, DOI values, or findings.',
    'Name the article and author for every claim, and say when the catalog does not answer the question.',
    'Write in a direct, precise editorial voice. Use short paragraphs and bullet points. Do not use emoji.',
    '',
    ...corpus.map(
      (post) =>
        `[${post.id}] ${post.title}\nAuthor: ${post.author.name}\nCategory: ${post.category}\n` +
        `Summary: ${post.summary}\nTakeaways:\n${post.keyTakeaways.map((item) => `- ${item}`).join('\n')}`,
    ),
  ].join('\n\n');

  try {
    const text = await ctx.services.models.generateText({
      apiKey,
      model: ctx.env.GEMINI_MODEL || 'gemini-3.8-flash',
      prompt: `${systemPrompt}\n\nReader question:\n"${query}"`,
      timeoutMs: MODEL_TIMEOUT_MS,
    });
    const answer = cleanText(text, 20_000);
    if (!answer) throw new Error('Empty model response');
    return json({ answer, citations, mode: 'model' });
  } catch (error) {
    console.error('Research assistant model call failed:', error instanceof Error ? error.message : error);
    return json({
      answer: fallback.answer,
      citations,
      mode: 'catalog',
      notice:
        'The language model was unavailable, so this answer was assembled directly from the catalog.',
    });
  }
};

export const assistantRoutes: ApiRoute[] = [
  { path: '/api/research-assistant', handlers: { POST: researchAssistant } },
];
