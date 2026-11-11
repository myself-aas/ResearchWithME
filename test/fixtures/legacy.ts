import type { SupabaseClient } from '@supabase/supabase-js';
import type { BlogPost } from '@/lib/blog-data';
import articlesJson from '@/data/articles.json';
import commentsJson from '@/data/comments.json';
import type { CommentRecord, LegacySeeds } from '@/lib/legacy/types';

interface LegacyArticleRow {
  id: string;
  likes: number;
  comments_count: number;
}

interface LegacyCommentRow {
  id: string;
  post_id: string;
  author_name: string;
  author_role: string;
  avatar: string;
  timestamp: string;
  text: string;
  inserted_at: string;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class FakeQuery {
  private filters: Array<(row: Record<string, unknown>) => boolean> = [];
  private orderBy: { column: string; ascending: boolean } | null = null;

  constructor(private readonly rows: Array<Record<string, unknown>>) {}

  select(): this {
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  order(column: string, options: { ascending: boolean }): this {
    this.orderBy = { column, ascending: options.ascending };
    return this;
  }

  private execute(): { data: Array<Record<string, unknown>>; error: null } {
    let rows = this.rows.filter((row) => this.filters.every((filter) => filter(row)));
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      rows = [...rows].sort((a, b) => {
        const left = String(a[column] ?? '');
        const right = String(b[column] ?? '');
        return ascending ? left.localeCompare(right) : right.localeCompare(left);
      });
    }
    return { data: clone(rows), error: null };
  }

  then<TResult1 = { data: Array<Record<string, unknown>>; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Array<Record<string, unknown>>; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export interface SupabaseLegacyFixture {
  client: SupabaseClient;
  seeds: LegacySeeds;
  /** Make every subsequent write RPC fail the way PostgREST/RLS failures do. */
  failWrites(): void;
  /** Read the raw counter row (test introspection). */
  readCounter(id: string): LegacyArticleRow | undefined;
}

/**
 * In-memory stand-in for the Task-3 Supabase schema (legacy_articles /
 * legacy_comments + the two RPCs). Seed data matches the migration exactly:
 * displayed comment counts come from legacy_articles, not from the number of
 * seed comment rows.
 */
export function createSupabaseLegacyFixture(): SupabaseLegacyFixture {
  const seeds: LegacySeeds = {
    articles: clone(articlesJson) as unknown as BlogPost[],
    comments: clone(commentsJson) as unknown as CommentRecord[],
  };

  const articleRows = new Map<string, LegacyArticleRow>(
    seeds.articles.map((article) => [
      article.id,
      { id: article.id, likes: article.likes, comments_count: article.commentsCount },
    ]),
  );
  const commentRows = new Map<string, LegacyCommentRow>(
    seeds.comments.map((comment, index) => [
      comment.id,
      {
        id: comment.id,
        post_id: comment.postId,
        author_name: comment.authorName,
        author_role: comment.authorRole ?? '',
        avatar: comment.avatar,
        timestamp: comment.timestamp,
        text: comment.text,
        // Deterministic insertion order matching seed order.
        inserted_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      },
    ]),
  );

  let writesFail = false;
  let commentSequence = 0;

  const rpcError = (message: string) => ({
    data: null,
    error: { message, code: '22023' },
  });

  const client = {
    from(table: string) {
      if (table === 'legacy_articles') {
        return new FakeQuery([...articleRows.values()] as unknown as Array<Record<string, unknown>>);
      }
      if (table === 'legacy_comments') {
        return new FakeQuery([...commentRows.values()] as unknown as Array<Record<string, unknown>>);
      }
      throw new Error(`Unknown table in legacy fixture: ${table}`);
    },
    async rpc(name: string, args: Record<string, unknown>) {
      if (writesFail) return rpcError('writes are disabled for this fixture');
      if (name === 'increment_legacy_like') {
        const id = String(args.target_id ?? '');
        const row = articleRows.get(id);
        if (!row) return rpcError(`unknown legacy article id: ${id}`);
        row.likes += 1;
        return { data: row.likes, error: null };
      }
      if (name === 'add_legacy_comment') {
        const targetId = String(args.target_id ?? '');
        const row = articleRows.get(targetId);
        if (!row) return rpcError(`unknown legacy article id: ${targetId}`);
        const authorName = String(args.author_name ?? '').trim();
        const content = String(args.content ?? '').trim();
        if (authorName.length < 1 || authorName.length > 120) {
          return rpcError('author_name must be between 1 and 120 characters');
        }
        if (content.length < 2 || content.length > 4000) {
          return rpcError('content must be between 2 and 4000 characters');
        }
        const initials = authorName
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? '')
          .join('');
        commentSequence += 1;
        const inserted: LegacyCommentRow = {
          id: `comm-fixture-${commentSequence}`,
          post_id: targetId,
          author_name: authorName,
          author_role: args.author_role == null ? '' : String(args.author_role),
          avatar: initials || 'RD',
          timestamp: 'Just now',
          text: content,
          inserted_at: new Date().toISOString(),
        };
        commentRows.set(inserted.id, inserted);
        row.comments_count += 1;
        return { data: clone(inserted), error: null };
      }
      return rpcError(`unknown rpc in legacy fixture: ${name}`);
    },
  } as unknown as SupabaseClient;

  return {
    client,
    seeds,
    failWrites() {
      writesFail = true;
    },
    readCounter(id: string) {
      const row = articleRows.get(id);
      return row ? { ...row } : undefined;
    },
  };
}
