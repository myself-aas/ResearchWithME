/**
 * Search, shared by the server-rendered results and the client.
 *
 * Two corpora, on purpose:
 *
 * - the **lite** index (title, description, tags) is inlined into the search
 *   page, so the first paint has results and typing filters instantly;
 * - the **full** index adds each post's plain text and is fetched once from
 *   `/search-index.json`, a static, cacheable, `noindex` file.
 *
 * Queries never leave the browser: the index travels to the reader, not the
 * other way round. Inlining the full index instead would grow the search page
 * by roughly the size of the archive.
 */
import Fuse from 'fuse.js';
import type { SearchDoc, SearchDocLite } from './content/types';

export const MAX_SEARCH_RESULTS = 20;

function fuseOptions<T extends SearchDocLite>() {
  return {
    includeScore: true,
    threshold: 0.34,
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: [
      { name: 'title' as const, weight: 0.5 },
      { name: 'description' as const, weight: 0.22 },
      { name: 'tags' as const, weight: 0.18 },
      { name: 'text' as const, weight: 0.1 },
    ],
  } satisfies ConstructorParameters<typeof Fuse<T>>[1];
}

export function toLiteDoc(doc: SearchDoc): SearchDocLite {
  const { text: _text, ...rest } = doc;
  return rest;
}

export function toLiteDocs(docs: SearchDoc[]): SearchDocLite[] {
  return docs.map(toLiteDoc);
}

/** Deterministic ranking, capped, with the empty query showing newest posts. */
export function searchDocs<T extends SearchDocLite>(
  docs: T[],
  query: string,
  limit = MAX_SEARCH_RESULTS,
): T[] {
  const trimmed = query.trim();
  if (!trimmed) return docs.slice(0, 8);

  const fuse = new Fuse(docs, fuseOptions<T>());
  return fuse.search(trimmed, { limit }).map((result) => result.item);
}
