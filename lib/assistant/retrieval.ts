/**
 * The Archive Assistant's reasoning layer: deterministic retrieval over the
 * public search index, and extractive answers with citations.
 *
 * There is no language model here, on purpose. The site's non-negotiables
 * (AGENTS.md §0) forbid accounts, databases, and third-party scripts; an
 * LLM-backed chat would break all three or hand a reader's query to a remote
 * service. So the assistant does what the rest of the site does — it works
 * from the build-time index, in the reader's browser, and it quotes the
 * archive instead of improvising. Every sentence it emits that is not
 * boilerplate is either a reader's query echoed back, a passage from a
 * published essay, or a link to one.
 *
 * Pure module: no DOM, no fetch, no React. The client component
 * (`components/assistant/AssistantThread.tsx`) owns loading
 * `/search-index.json` and streaming; this file owns deciding what to say.
 */
import Fuse from 'fuse.js';
import type { SearchDoc, SearchDocLite } from '@/lib/content/types';

/** One retrieved passage: a contiguous run of sentences from a single essay. */
export interface Passage {
  slug: string;
  href: string;
  title: string;
  date: string;
  /** The passage text, as published (no paraphrase). */
  text: string;
}

/** A retrieval hit: the passage plus the essay it came from. */
export interface RetrievalHit {
  passage: Passage;
  /** Other passages from the same essay that also matched, best first. */
  siblings: Passage[];
}

const MIN_CHUNK_CHARS = 140;
const MAX_CHUNK_CHARS = 320;
const MAX_HITS = 4;
const MAX_CHUNKS_PER_POST = 3;
/** Fuse threshold: below this score a passage is treated as a non-match. */
const MATCH_THRESHOLD = 0.55;

/**
 * Split a post's plain text into sentence-aligned chunks.
 *
 * `SearchDoc.text` is whitespace-collapsed MDX plain text, so sentences are
 * the only reliable unit. Consecutive sentences are grouped greedily up to
 * `MAX_CHUNK_CHARS`; a run shorter than `MIN_CHUNK_CHARS` is merged with the
 * previous chunk so no retrieval unit is a stray fragment. Deterministic:
 * same text in, same chunks out, every time.
 */
export function chunkText(text: string): string[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"'(])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  if (sentences.length === 0) return [];

  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
      continue;
    }
    if (current.length + sentence.length + 1 <= MAX_CHUNK_CHARS) {
      current = `${current} ${sentence}`;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);

  // Merge fragments forward so every chunk carries enough context to quote.
  const merged: string[] = [];
  for (const chunk of chunks) {
    const previous = merged[merged.length - 1];
    if (previous && (chunk.length < MIN_CHUNK_CHARS || previous.length < MIN_CHUNK_CHARS)) {
      merged[merged.length - 1] = `${previous} ${chunk}`;
    } else {
      merged.push(chunk);
    }
  }
  return merged;
}

/** The retrieval corpus: every essay cut into passages, tagged with its essay. */
export function chunkDocs(docs: SearchDoc[]): (Passage & { tags: string[] })[] {
  return docs.flatMap((doc) =>
    chunkText(doc.text).map((text) => ({
      slug: doc.slug,
      href: doc.href,
      title: doc.title,
      date: doc.date,
      text,
      tags: doc.tags,
    })),
  );
}

function fuseOptions() {
  return {
    includeScore: true,
    // Passage matching is stricter than title matching: a vague query should
    // return an honest "nothing found" instead of an arbitrary quote.
    threshold: MATCH_THRESHOLD,
    ignoreLocation: true,
    minMatchCharLength: 3,
    keys: [
      { name: 'text' as const, weight: 0.6 },
      { name: 'title' as const, weight: 0.22 },
      { name: 'tags' as const, weight: 0.18 },
    ],
  } satisfies ConstructorParameters<typeof Fuse<Passage & { tags: string[] }>>[1];
}

/**
 * Retrieve the passages that answer a query. At most `MAX_HITS` essays and
 * `MAX_CHUNKS_PER_POST` passages per essay, so an answer quotes several
 * sources instead of one essay dominating. Empty for a query the archive
 * cannot support — callers must render the honest fallback, never a guess.
 */
export function retrievePassages(docs: SearchDoc[], query: string): RetrievalHit[] {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const corpus = chunkDocs(docs);
  if (corpus.length === 0) return [];

  const fuse = new Fuse(corpus, fuseOptions());
  const ranked = fuse.search(trimmed, { limit: 32 });

  const bySlug = new Map<string, { passage: Passage & { tags: string[] }; siblings: Passage[] }>();
  for (const result of ranked) {
    const hit = bySlug.get(result.item.slug);
    if (hit) {
      if (hit.siblings.length < MAX_CHUNKS_PER_POST) hit.siblings.push(result.item);
    } else if (bySlug.size < MAX_HITS) {
      bySlug.set(result.item.slug, { passage: result.item, siblings: [] });
    }
  }
  return [...bySlug.values()];
}

/**
 * Compose the assistant's reply as markdown.
 *
 * Structure, every time: a one-line framing of what was found, the matched
 * passages quoted verbatim under their essay's link, and a Sources list.
 * Nothing is synthesised beyond the connective copy — the reader must be able
 * to click any claim back to its essay. With no usable match, the reply says
 * so plainly and offers the deterministic alternatives (search, latest
 * essays) instead of inventing an answer.
 */
export function composeAnswer(query: string, hits: RetrievalHit[], fallbackDoc?: SearchDocLite): string {
  const trimmed = query.trim();
  if (hits.length === 0) {
    const latest = fallbackDoc
      ? ` The closest published essay is [${fallbackDoc.title}](${fallbackDoc.href}) — try it, or use [Search](/search?q=${encodeURIComponent(trimmed)}) for a ranked list.`
      : ` Use [Search](/search?q=${encodeURIComponent(trimmed)}) for a ranked list of the archive instead.`;
    return [
      `I could not find that in the published essays, and I only quote what is published — I do not improvise.${latest}`,
      '',
      'Try shorter, plainer wording, or one of the suggested prompts below.',
    ].join('\n');
  }

  const lines: string[] = [`Here is what the archive says about “${trimmed}”:`];
  for (const hit of hits) {
    lines.push('');
    lines.push(`**[${hit.passage.title}](${hit.passage.href})** — ${hit.passage.date}`);
    lines.push('');
    lines.push(`> ${hit.passage.text}`);
    for (const sibling of hit.siblings) {
      lines.push('>');
      lines.push(`> ${sibling.text}`);
    }
  }

  lines.push('');
  lines.push('Sources');
  for (const hit of hits) {
    lines.push(`- [${hit.passage.title}](${hit.passage.href})`);
  }
  lines.push('');
  lines.push('Quoted from the published essays; open a source for the full argument and its citations.');
  return lines.join('\n');
}

/**
 * Deterministic starter prompts for an empty thread, derived from the archive
 * itself (the newest essays and the most common tag) rather than hardcoded
 * strings that drift out of date.
 */
export function suggestPrompts(docs: SearchDocLite[]): string[] {
  const latest = docs.slice(0, 2);
  const tagCounts = new Map<string, number>();
  for (const doc of docs) {
    for (const tag of doc.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const topTag = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];

  const prompts: string[] = [];
  if (latest[0]) prompts.push(`Summarise “${latest[0].title}”`);
  if (topTag) prompts.push(`Which essays cover ${topTag}?`);
  if (latest[1]) prompts.push(`What does “${latest[1].title}” argue?`);
  return prompts;
}

/** Pull the text out of the last user message for retrieval. */
export function lastUserText(
  messages: readonly {
    readonly role: string;
    readonly content: readonly { type: string; text?: string }[];
  }[],
): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== 'user') continue;
    return message.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return '';
}
