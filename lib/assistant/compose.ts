/**
 * Answer composition for the Assistant.
 *
 * Imports nothing from Next.js or Cloudflare: the site Worker runs this
 * in-process, and the Assistant Worker (`workers/assistant`) bundles the same
 * file. Keep it that way.
 */
import type { AssistantAnswer, AssistantArticle, AssistantInput } from './types';

export const MODEL_TIMEOUT_MS = 20_000;
export const MAX_ANSWER_CHARS = 20_000;
export const MODEL_UNAVAILABLE_NOTICE =
  'The language model was unavailable, so this answer was assembled directly from the catalog.';

export type Generate = (prompt: string, signal: AbortSignal) => Promise<string>;

export function catalogAnswer(query: string, articles: AssistantArticle[]): string {
  if (articles.length === 0) {
    return (
      '### No direct match in the catalog\n\n' +
      'The archive does not contain a review that matches that question. Try a narrower term, a repository name, or a DOI, or browse the fields below.\n\n' +
      '- **Research Reviews** cover methodology, replication, and primary literature.\n' +
      '- **GitHub Repo Teardowns** examine architecture, memory behaviour, and performance.\n' +
      '- **Health & Medicine** reviews trial design, pharmacology, and clinical outcomes.\n\n' +
      'Every answer here is limited to published articles; nothing outside this catalog is searched.'
    );
  }

  return (
    `### What the archive says about “${query}”\n\n` +
    `${articles.length} ${articles.length === 1 ? 'review directly addresses' : 'reviews directly address'} this topic:\n\n` +
    articles
      .map(
        (article) =>
          `#### ${article.title}\n` +
          `By ${article.author} · ${article.category}\n\n` +
          (article.artifact ? `Reviewed artifact: ${article.artifact}\n\n` : '') +
          `Key points:\n${article.keyTakeaways.map((takeaway) => `- ${takeaway}`).join('\n')}\n\n` +
          `${article.summary}`,
      )
      .join('\n\n---\n\n')
  );
}

export function buildPrompt(query: string, articles: AssistantArticle[]): string {
  const system = [
    'You are the ResearchWithMe editorial assistant.',
    'Answer only from the article records supplied below. Do not invent sources, DOI values, or findings.',
    'Name the article and author for every claim, and say when the catalog does not answer the question.',
    'Write in a direct, precise editorial voice. Use short paragraphs and bullet points. Do not use emoji.',
    '',
    ...articles.map(
      (article) =>
        `[${article.id}] ${article.title}\nAuthor: ${article.author}\nCategory: ${article.category}\n` +
        `Summary: ${article.summary}\nTakeaways:\n${article.keyTakeaways.map((item) => `- ${item}`).join('\n')}`,
    ),
  ].join('\n\n');
  return `${system}\n\nReader question:\n"${query}"`;
}

/**
 * Never throws: a model failure, a timeout, or an empty reply becomes a
 * catalogue answer with a notice, so a caller always has something to return.
 */
export async function composeAnswer(input: AssistantInput, generate: Generate | null): Promise<AssistantAnswer> {
  const fallback = catalogAnswer(input.query, input.articles);
  if (!generate) return { answer: fallback, mode: 'CATALOG', notice: null };

  const records = input.articles.length > 0 ? input.articles : (input.context ?? []);
  try {
    const text = await generate(buildPrompt(input.query, records), AbortSignal.timeout(MODEL_TIMEOUT_MS));
    const answer = (typeof text === 'string' ? text : '').trim().slice(0, MAX_ANSWER_CHARS);
    if (!answer) throw new Error('Empty model response');
    return { answer, mode: 'MODEL', notice: null };
  } catch (error) {
    console.error('Assistant model call failed:', error instanceof Error ? error.message : error);
    return { answer: fallback, mode: 'CATALOG', notice: MODEL_UNAVAILABLE_NOTICE };
  }
}

const MAX_QUERY_CHARS = 600;
const MAX_RECORDS = 4;
const MAX_FIELD_CHARS = 4000;
const MAX_TAKEAWAYS = 20;

function shortString(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_FIELD_CHARS;
}

function parseArticle(value: unknown): AssistantArticle | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const { id, slug, title, author, category, summary, keyTakeaways, artifact } = record;
  if (![id, slug, title, author, category, summary].every(shortString)) return null;
  if (!Array.isArray(keyTakeaways) || keyTakeaways.length > MAX_TAKEAWAYS || !keyTakeaways.every(shortString)) return null;
  if (artifact !== null && !shortString(artifact)) return null;
  return {
    id: id as string, slug: slug as string, title: title as string, author: author as string,
    category: category as string, summary: summary as string, keyTakeaways: keyTakeaways as string[],
    artifact: artifact as string | null,
  };
}

function parseArticles(value: unknown): AssistantArticle[] | null {
  if (!Array.isArray(value) || value.length > MAX_RECORDS) return null;
  const parsed = value.map(parseArticle);
  return parsed.every((article): article is AssistantArticle => article !== null) ? parsed : null;
}

/**
 * What the Assistant Worker accepts over RPC. The caller is our own site
 * Worker, but the bounds are enforced here too: they are what keeps a prompt,
 * and therefore a model bill, a known size.
 */
export function parseAssistantInput(value: unknown): AssistantInput | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const query = typeof record.query === 'string' ? record.query.trim() : '';
  if (query.length < 1 || query.length > MAX_QUERY_CHARS) return null;
  const articles = parseArticles(record.articles);
  if (!articles) return null;
  if (record.context === undefined) return { query, articles };
  const context = parseArticles(record.context);
  return context ? { query, articles, context } : null;
}

/** What the site Worker accepts back. A reply that does not fit is discarded, not repaired. */
export function parseAssistantAnswer(value: unknown): AssistantAnswer | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.answer !== 'string' || record.answer.trim() === '') return null;
  if (record.mode !== 'MODEL' && record.mode !== 'CATALOG') return null;
  if (record.notice !== null && typeof record.notice !== 'string') return null;
  return {
    answer: record.answer.slice(0, MAX_ANSWER_CHARS),
    mode: record.mode,
    notice: record.notice === null ? null : record.notice.slice(0, 500),
  };
}
