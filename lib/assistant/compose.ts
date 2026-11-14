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
