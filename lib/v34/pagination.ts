/**
 * ResearchWithME v3.4 — Canonical Keyset Cursor Pagination Engine (Wave 18 P1).
 *
 * Provides uniform `{ cursor, limit, nextCursor, hasMore, total }` pagination
 * across all v3.4 list endpoints and SQL-backed Supabase reads using composite
 * `(sortAt DESC, id DESC)` keyset cursors encoded in opaque Base64URL JSON.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { isStrictPersistenceMode, withSupabaseReadTimeout } from './supabase-sync';

export interface CursorToken {
  sortAt: string;
  id: string;
}

export interface PaginationParams {
  cursor: string | null;
  decodedCursor: CursorToken | null;
  limit: number;
}

export interface CursorPage<T> {
  items: T[];
  cursor: string | null;
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function encodeCursor(token: CursorToken): string {
  const json = JSON.stringify({ s: token.sortAt, i: token.id });
  return Buffer.from(json, 'utf8').toString('base64url');
}

export function decodeCursor(raw: string | null | undefined): CursorToken | null {
  if (!raw || raw.trim().length === 0 || raw.length > 512) return null;
  try {
    const decoded = Buffer.from(raw.trim(), 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as { s?: unknown; i?: unknown };
    if (typeof parsed.s !== 'string' || typeof parsed.i !== 'string') return null;
    if (parsed.s.length === 0 || parsed.i.length === 0) return null;
    return { sortAt: parsed.s, id: parsed.i };
  } catch {
    return null;
  }
}

export function parsePaginationParams(
  url: URL | string,
  defaults?: { limit?: number; maxLimit?: number },
): PaginationParams {
  const parsedUrl = typeof url === 'string' ? new URL(url) : url;
  const maxLimit = defaults?.maxLimit ?? MAX_LIMIT;
  const fallbackLimit = defaults?.limit ?? DEFAULT_LIMIT;
  const rawLimit = parsedUrl.searchParams.get('limit');
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : fallbackLimit;
  const limit = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(maxLimit, parsedLimit))
    : fallbackLimit;

  const rawCursor = parsedUrl.searchParams.get('cursor')?.trim() || null;
  const decodedCursor = decodeCursor(rawCursor);

  return {
    cursor: decodedCursor ? rawCursor : null,
    decodedCursor,
    limit,
  };
}

/**
 * Deterministic keyset cursor pagination over an in-memory sorted collection
 * (sorted descending by `(getSortAt(item), getId(item))`).
 */
export function paginateArrayWithCursor<T>(
  allItems: readonly T[],
  params: PaginationParams,
  opts: {
    getSortAt: (item: T) => string;
    getId: (item: T) => string;
  },
): CursorPage<T> {
  const sorted = [...allItems].sort((a, b) => {
    const sCmp = opts.getSortAt(b).localeCompare(opts.getSortAt(a));
    if (sCmp !== 0) return sCmp;
    return opts.getId(b).localeCompare(opts.getId(a));
  });

  const total = sorted.length;
  const filtered = params.decodedCursor
    ? sorted.filter((item) => {
        const s = opts.getSortAt(item);
        const id = opts.getId(item);
        const cur = params.decodedCursor!;
        if (s < cur.sortAt) return true;
        if (s === cur.sortAt && id < cur.id) return true;
        return false;
      })
    : sorted;

  const pageSlice = filtered.slice(0, params.limit);
  const hasMore = filtered.length > params.limit;
  const last = pageSlice.at(-1);
  const nextCursor =
    hasMore && last
      ? encodeCursor({ sortAt: opts.getSortAt(last), id: opts.getId(last) })
      : null;

  return {
    items: pageSlice,
    cursor: params.cursor,
    limit: params.limit,
    nextCursor,
    hasMore,
    total,
  };
}

/**
 * Canonical Postgres keyset cursor query helper backed by Wave 18 composite
 * `(created_at DESC, id DESC)` indexes. Returns `null` when Supabase is not
 * reachable or when running in non-strict test/stub mode without a remote rowset.
 */
export async function querySupabaseCursorPage<TRow extends Record<string, unknown>, TOut>(
  supabase: SupabaseClient | null | undefined,
  spec: {
    table: string;
    select?: string;
    sortColumn?: string;
    idColumn?: string;
    params: PaginationParams;
    filters?: Record<string, string | number | boolean | null | undefined>;
    inFilters?: Record<string, readonly string[]>;
    mapRow: (row: TRow) => TOut;
  },
): Promise<CursorPage<TOut> | null> {
  if (!supabase) return null;

  const sortCol = spec.sortColumn ?? 'created_at';
  const idCol = spec.idColumn ?? 'id';

  const result = await withSupabaseReadTimeout(
    async () => {
      let query = supabase
        .from(spec.table)
        .select(spec.select ?? '*', { count: 'exact' });

      if (spec.filters) {
        for (const [col, val] of Object.entries(spec.filters)) {
          if (val !== undefined && val !== null && val !== '') {
            query = query.eq(col, val);
          }
        }
      }

      if (spec.inFilters) {
        for (const [col, vals] of Object.entries(spec.inFilters)) {
          if (vals.length > 0) {
            query = query.in(col, [...vals]);
          }
        }
      }

      if (spec.params.decodedCursor) {
        const safeSort = spec.params.decodedCursor.sortAt.replace(/[,()]/g, '');
        const safeId = spec.params.decodedCursor.id.replace(/[,()]/g, '');
        query = query.or(
          `${sortCol}.lt.${safeSort},and(${sortCol}.eq.${safeSort},${idCol}.lt.${safeId})`,
        );
      }

      const { data, error, count } = await query
        .order(sortCol, { ascending: false })
        .order(idCol, { ascending: false })
        .limit(spec.params.limit + 1);

      if (error || !Array.isArray(data)) {
        return null;
      }

      const rows = data as unknown as TRow[];
      const hasMore = rows.length > spec.params.limit;
      const sliced = hasMore ? rows.slice(0, spec.params.limit) : rows;
      const last = sliced.at(-1);
      const nextCursor =
        hasMore && last
          ? encodeCursor({
              sortAt: String(last[sortCol] ?? ''),
              id: String(last[idCol] ?? ''),
            })
          : null;

      return {
        items: sliced.map(spec.mapRow),
        cursor: spec.params.cursor,
        limit: spec.params.limit,
        nextCursor,
        hasMore,
        total: typeof count === 'number' ? count : sliced.length,
      } satisfies CursorPage<TOut>;
    },
    null,
  );

  if (result) return result;
  if (isStrictPersistenceMode()) {
    return {
      items: [],
      cursor: spec.params.cursor,
      limit: spec.params.limit,
      nextCursor: null,
      hasMore: false,
      total: 0,
    };
  }
  return null;
}
