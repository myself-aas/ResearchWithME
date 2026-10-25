import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { getArticleCatalogue } from '@/lib/cms/catalogue';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { cleanText } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_QUERY = 600;

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'about', 'what', 'does', 'how', 'why', 'from', 'into', 'that', 'this',
  'are', 'was', 'were', 'has', 'have', 'had', 'its', 'their', 'they', 'than', 'then', 'when', 'where',
  'which', 'while', 'does', 'did', 'can', 'could', 'should', 'would', 'you', 'your', 'our', 'per',
]);

async function matchingPosts(query: string) {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9.+-]+/)
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term))
    .slice(0, 12);

  if (terms.length === 0) return [];

  const archive = await getArticleCatalogue();

  return archive.map((post) => {
    const title = post.title.toLowerCase();
    const summary = post.summary.toLowerCase();
    const category = post.category.toLowerCase();
    const tags = post.tags.join(' ').toLowerCase();
    const artifact = `${post.reviewedArtifact?.identifier ?? ''} ${post.reviewedArtifact?.title ?? ''}`.toLowerCase();
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

async function fallbackAnswer(query: string) {
  const matches = await matchingPosts(query);

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

export async function POST(request: NextRequest) {
  const limit = rateLimit(clientKey(request, 'assistant'), 12, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many questions in a short window. Wait a minute and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
    return NextResponse.json({ error: 'Send the question as JSON.' }, { status: 415 });
  }

  let payload: { query?: unknown };
  try {
    payload = (await request.json()) as { query?: unknown };
  } catch {
    return NextResponse.json({ error: 'The question body could not be read.' }, { status: 400 });
  }

  const query = cleanText(payload.query, MAX_QUERY);
  if (!query) {
    return NextResponse.json({ error: 'Ask a question to search the archive.' }, { status: 400 });
  }

  const fallback = await fallbackAnswer(query);
  const citations = fallback.citations.map((post) => ({
    id: post.id,
    title: post.title,
    author: post.author.name,
    category: post.category,
  }));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      answer: fallback.answer,
      citations,
      mode: 'catalog',
    });
  }

  const corpus = fallback.citations.length > 0 ? fallback.citations : (await getArticleCatalogue()).slice(0, 4);
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
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nReader question:\n"${query}"` }] }],
    });
    const answer = cleanText(response.text ?? '', 20_000);
    if (!answer) throw new Error('Empty model response');
    return NextResponse.json({ answer, citations, mode: 'model' });
  } catch (error) {
    console.error('Research assistant model call failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      answer: fallback.answer,
      citations,
      mode: 'catalog',
      notice: 'The language model was unavailable, so this answer was assembled directly from the catalog.',
    });
  }
}
