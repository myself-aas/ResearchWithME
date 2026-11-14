import { NextRequest, NextResponse } from 'next/server';
import { composeAnswer } from '@/lib/assistant/compose';
import { createGeminiGenerator } from '@/lib/assistant/generate';
import { rankArticles, toAssistantArticle } from '@/lib/assistant/retrieve';
import { getArticleCatalogue } from '@/lib/cms/catalogue';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { cleanText } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_QUERY = 600;

export async function POST(request: NextRequest) {
  const limit = await rateLimit(clientKey(request, 'assistant'), 12, 60_000);
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

  const archive = await getArticleCatalogue();
  const matches = rankArticles(query, archive).map(toAssistantArticle);
  const citations = matches.map((article) => ({
    id: article.id,
    title: article.title,
    author: article.author,
    category: article.category,
  }));

  const result = await composeAnswer(
    { query, articles: matches, context: archive.slice(0, 4).map(toAssistantArticle) },
    createGeminiGenerator({
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GEMINI_MODEL: process.env.GEMINI_MODEL,
      AI_GATEWAY_BASE_URL: process.env.AI_GATEWAY_BASE_URL,
    }),
  );

  // This route predates the versioned API and keeps its lowercase modes.
  return NextResponse.json({
    answer: result.answer,
    citations,
    mode: result.mode === 'MODEL' ? 'model' : 'catalog',
    ...(result.notice ? { notice: result.notice } : {}),
  });
}
