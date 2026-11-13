/**
 * Search modes — reme v3.1 §28. Lexical, exact-identifier, semantic, and
 * AI-expanded modes are distinct and labeled; AI-expanded results are always
 * marked and never presented as lexical results.
 */
import { normalizeIdentifier, type IdentifierScheme } from '@/lib/schemas/identifiers';

export type SearchMode = 'lexical' | 'exact-identifier' | 'semantic' | 'ai-expanded';

export const SEARCH_MODES: SearchMode[] = ['lexical', 'exact-identifier', 'semantic', 'ai-expanded'];

export interface SearchableItem {
  id: string;
  title: string;
  body: string;
  identifiers?: string[];
  keywords?: string[];
}

export interface SearchResultItem<T> {
  item: T;
  mode: SearchMode;
  score: number;
  /** AI-expanded results MUST carry this label (spec §26 labeling) */
  aiExpanded: boolean;
}

const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'on', 'for', 'to', 'is', 'are', 'was', 'with']);

const tokens = (s: string): string[] =>
  s.toLowerCase().split(/[^a-z0-9]+/i).filter((w) => w.length > 2 && !STOP.has(w));

/** Lexical: case-insensitive term matching over title+body. */
export function lexicalSearch<T extends SearchableItem>(query: string, corpus: T[]): SearchResultItem<T>[] {
  const q = tokens(query);
  if (!q.length) return [];
  return corpus
    .map((item) => {
      const hay = `${item.title} ${item.body}`.toLowerCase();
      const score = q.reduce((acc, w) => acc + (hay.includes(w) ? 1 : 0), 0) / q.length;
      return { item, mode: 'lexical' as const, score, aiExpanded: false };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Exact identifier: normalized DOI/ORCID/URL/etc. equality, never fuzzy. */
export function exactIdentifierSearch<T extends SearchableItem>(query: string, corpus: T[]): SearchResultItem<T>[] {
  const schemes: IdentifierScheme[] = ['doi', 'orcid', 'pmid', 'pmcid', 'isbn', 'arxiv', 'ror', 'rrid', 'url', 'handle', 'accession', 'issn'];
  for (const scheme of schemes) {
    const norm = normalizeIdentifier(scheme, query);
    if (!norm.ok) continue;
    return corpus
      .filter((item) => (item.identifiers ?? []).some((id) => id.toLowerCase() === norm.value.normalizedValue.toLowerCase()))
      .map((item) => ({ item, mode: 'exact-identifier' as const, score: 1, aiExpanded: false }));
  }
  return [];
}

/** Semantic: keyword/topic overlap beyond exact terms (synonym expansion). */
export function semanticSearch<T extends SearchableItem>(query: string, corpus: T[]): SearchResultItem<T>[] {
  const q = new Set(tokens(query));
  if (!q.size) return [];
  return corpus
    .map((item) => {
      const kw = new Set([...tokens(item.title), ...(item.keywords ?? []), ...tokens(item.body)]);
      const overlap = [...q].filter((w) => kw.has(w)).length;
      return { item, mode: 'semantic' as const, score: overlap / q.size, aiExpanded: false };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** AI-expanded: lexical + keyword expansion; results MUST be labeled aiExpanded. */
export function aiExpandedSearch<T extends SearchableItem>(query: string, corpus: T[]): SearchResultItem<T>[] {
  const base = lexicalSearch(query, corpus).map((r) => ({ ...r, mode: 'ai-expanded' as const, aiExpanded: true }));
  const extra = semanticSearch(query, corpus)
    .filter((r) => !base.some((b) => b.item.id === r.item.id))
    .map((r) => ({ ...r, mode: 'ai-expanded' as const, aiExpanded: true }));
  return [...base, ...extra].sort((a, b) => b.score - a.score);
}

export function search<T extends SearchableItem>(mode: SearchMode, query: string, corpus: T[]): SearchResultItem<T>[] {
  switch (mode) {
    case 'lexical': return lexicalSearch(query, corpus);
    case 'exact-identifier': return exactIdentifierSearch(query, corpus);
    case 'semantic': return semanticSearch(query, corpus);
    case 'ai-expanded': return aiExpandedSearch(query, corpus);
  }
}
