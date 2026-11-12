'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, PenSquare, RotateCcw, Send } from 'lucide-react';
import ConfirmDelete from '@/components/cms/ConfirmDelete';
import StatusBadge from '@/components/cms/StatusBadge';
import {
  primaryButtonClass,
  secondaryButtonClass,
  subtleButtonClass,
} from '@/components/cms/styles';
import { cmsFetch, isUnauthorized } from '@/lib/cms/client-api';
import type { CmsPost } from '@/lib/cms/types';
import { useCmsPosts } from '@/lib/cms/use-cms';
import { formatDate } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { cn } from '@/lib/utils';
import { Text } from '@/components/primitives';
import { WorkflowDisclosure } from '@/components/workflows';
import { RESEARCH_WORKFLOWS } from '@/lib/workflows/research-workflows';

type StatusFilter = 'all' | 'draft' | 'published';

const filters: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'published', label: 'Published' },
];

export default function ManageArticlesPage() {
  const { posts, error, loading, live, reload } = useCmsPosts();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const counts = useMemo(() => {
    const list = posts ?? [];
    return {
      all: list.length,
      draft: list.filter((post) => post.status === 'draft').length,
      published: list.filter((post) => post.status === 'published').length,
    };
  }, [posts]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (posts ?? []).filter((post) => {
      if (statusFilter !== 'all' && post.status !== statusFilter) return false;
      if (!needle) return true;
      return [post.title, post.slug, post.authorName, post.category, ...post.tags].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });
  }, [posts, query, statusFilter]);

  async function toggleStatus(post: CmsPost) {
    if (busyId) return;
    const nextStatus = post.status === 'published' ? 'draft' : 'published';
    setBusyId(post.id);
    setActionError(null);
    setNotice(null);

    try {
      await cmsFetch<{ post: CmsPost }>(`/api/cms/posts/${post.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setNotice(
        nextStatus === 'published'
          ? `“${post.title}” is now published.`
          : `“${post.title}” was reverted to a draft.`,
      );
      reload();
    } catch (cause) {
      if (!isUnauthorized(cause)) {
        setActionError(
          cause instanceof Error
            ? `${cause.message} Open the article to finish the required fields.`
            : 'The status could not be changed.',
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  async function remove(post: CmsPost) {
    if (busyId) return;
    setBusyId(post.id);
    setActionError(null);
    setNotice(null);

    try {
      await cmsFetch(`/api/cms/posts/${post.id}`, { method: 'DELETE' });
      setNotice(`“${post.title}” was deleted with its comments.`);
      reload();
    } catch (cause) {
      if (!isUnauthorized(cause)) {
        setActionError(cause instanceof Error ? cause.message : 'The article could not be deleted.');
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">Articles</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink">
            Every draft and published article, with its live status. Publishing here revalidates the public platform.
          </p>
        </div>
        <Link href="/dashboard" className={primaryButtonClass}>
          <PenSquare className="h-4 w-4" aria-hidden="true" />
          <span>New article</span>
        </Link>
      </div>

      {notice && (
        <p
          role="status"
          className="mt-5 flex items-start gap-2 border-l-2 border-success bg-success/5 px-4 py-3 text-sm text-success"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </p>
      )}

      {(error || actionError) && (
        <div role="alert" className="mt-5 border-l-2 border-destructive bg-destructive/5 px-4 py-3">
          <p className="flex items-start gap-2 text-sm font-semibold text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{actionError ?? error}</span>
          </p>
          <div className="mt-3">
            <button type="button" onClick={reload} className={secondaryButtonClass}>
              Try again
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-sm">
          <label htmlFor="article-filter" className="mb-1.5 block text-sm font-medium text-ink">
            Filter articles
          </label>
          <input
            id="article-filter"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title, slug, author, or tag"
            className="h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-secondary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Filter by status" className="inline-flex rounded-md border border-border-strong bg-surface-raised p-0.5">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={statusFilter === filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  'min-h-10 rounded px-3 text-sm font-medium transition-colors',
                  statusFilter === filter.value
                    ? 'bg-surface-inverse text-text-inverse'
                    : 'text-ink hover:bg-surface',
                )}
              >
                {filter.label} ({counts[filter.value]})
              </button>
            ))}
          </div>

          {isSupabaseConfigured && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary">
              <span
                aria-hidden="true"
                className={cn('h-1.5 w-1.5 rounded-full', live ? 'bg-success' : 'bg-ink-secondary')}
              />
              {live ? 'Live updates on' : 'Live updates off'}
            </span>
          )}
        </div>
      </div>

      {loading && posts === null && (
        <div aria-busy="true" aria-live="polite" className="mt-6">
          <p className="text-sm font-medium text-ink-secondary">Loading articles…</p>
          <div aria-hidden="true" className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface-raised">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center justify-between gap-4 px-4 py-5">
                <div className="w-full space-y-2">
                  <div className="h-4 w-2/3 rounded bg-surface-subtle" />
                  <div className="h-3 w-1/3 rounded bg-surface-subtle" />
                </div>
                <div className="h-8 w-24 shrink-0 rounded bg-surface-subtle" />
              </div>
            ))}
          </div>
        </div>
      )}

      {posts !== null && posts.length === 0 && (
        <div className="mt-8 border-y border-line py-12 text-center">
          <h2 className="font-serif text-2xl font-bold text-ink">No articles yet</h2>
          <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-ink">
            Write the first article. It stays private as a draft until you publish it.
          </p>
          <Link href="/dashboard" className={cn(primaryButtonClass, 'mt-5')}>
            <PenSquare className="h-4 w-4" aria-hidden="true" />
            <span>Write the first article</span>
          </Link>
        </div>
      )}

      {posts !== null && posts.length > 0 && filtered.length === 0 && (
        <div className="mt-8 border-y border-line py-10 text-center">
          <Text as="h2" variant="card-title">No articles match this filter</Text>
          <p className="mt-2 text-sm text-ink-secondary">
            {counts.all} {counts.all === 1 ? 'article is' : 'articles are'} in the studio.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setStatusFilter('all');
            }}
            className={cn(secondaryButtonClass, 'mt-4')}
          >
            Clear filters
          </button>
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface-raised">
          {filtered.map((post) => {
            const busy = busyId === post.id;
            return (
              <li key={post.id} className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/edit/${post.id}`}
                      className="break-words font-serif text-lg font-semibold text-ink underline-offset-4 hover:text-brand hover:underline"
                    >
                      {post.title}
                    </Link>
                    <StatusBadge status={post.status} />
                    {post.featured && (
                      <span className="rounded border border-brand/25 bg-brand/5 px-1.5 py-0.5 text-xs font-semibold text-brand">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="mt-1 break-all font-mono text-sm text-ink-secondary">/post/{post.slug}</p>
                  <p className="mt-1 text-sm text-ink-secondary">
                    {post.authorName} · {post.category} ·{' '}
                    {post.status === 'published' ? 'Published' : 'Updated'} {formatDate(post.updatedAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {post.status === 'published' && (
                    <Link href={`/post/${post.slug}`} className={cn(subtleButtonClass, 'min-h-10')}>
                      View
                    </Link>
                  )}
                  <Link href={`/dashboard/edit/${post.id}`} className={cn(secondaryButtonClass, 'min-h-10 px-3')}>
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => void toggleStatus(post)}
                    disabled={busy}
                    className={cn(secondaryButtonClass, 'min-h-10 px-3')}
                    aria-label={
                      post.status === 'published'
                        ? `Revert ${post.title} to draft`
                        : `Publish ${post.title}`
                    }
                  >
                    {post.status === 'published' ? (
                      <>
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        <span>Revert</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" aria-hidden="true" />
                        <span>{busy ? 'Publishing…' : 'Publish'}</span>
                      </>
                    )}
                  </button>
                  <ConfirmDelete
                    onConfirm={() => void remove(post)}
                    busy={busy}
                    label="Delete"
                    question="Delete this article?"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
        Deleting an article also deletes its comments. Reverting a published article removes it from the platform
        immediately.
      </p>

      <div className="mt-10 border-t border-line pt-6">
        <WorkflowDisclosure workflow={RESEARCH_WORKFLOWS.publication} heading="h2" summary="How publication and indexing work" />
      </div>
    </div>
  );
}
