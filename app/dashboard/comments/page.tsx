'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react';
import ConfirmDelete from '@/components/cms/ConfirmDelete';
import { primaryButtonClass, secondaryButtonClass } from '@/components/cms/styles';
import { cmsFetch, isUnauthorized } from '@/lib/cms/client-api';
import type { CmsComment } from '@/lib/cms/types';
import { useCmsComments } from '@/lib/cms/use-cms';
import { formatDate } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { cn } from '@/lib/utils';

export default function CommentsModerationPage() {
  const { comments, error, loading, live, reload } = useCmsComments();
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return comments ?? [];
    return (comments ?? []).filter((comment) =>
      [comment.authorName, comment.authorRole, comment.content, comment.postTitle].some((value) =>
        value.toLowerCase().includes(needle),
      ),
    );
  }, [comments, query]);

  async function remove(comment: CmsComment) {
    if (busyId) return;
    setBusyId(comment.id);
    setActionError(null);
    setNotice(null);

    try {
      await cmsFetch(`/api/cms/comments/${comment.id}`, { method: 'DELETE' });
      setNotice(`Comment by ${comment.authorName} was deleted.`);
      reload();
    } catch (cause) {
      if (!isUnauthorized(cause)) {
        setActionError(cause instanceof Error ? cause.message : 'The comment was not deleted.');
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900">Comments</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-700">
            Reader discussion on published reviews. Deleting a comment removes it for every visitor, and comments cannot
            be edited after posting.
          </p>
        </div>
        <p className="text-sm text-stone-600">
          {(comments ?? []).length} {(comments ?? []).length === 1 ? 'comment' : 'comments'} in total
        </p>
      </div>

      {notice && (
        <p
          role="status"
          className="mt-5 flex items-start gap-2 border-l-2 border-emerald-700 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </p>
      )}

      {(error || actionError) && (
        <div role="alert" className="mt-5 border-l-2 border-red-700 bg-red-50 px-4 py-3">
          <p className="flex items-start gap-2 text-sm font-semibold text-red-900">
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
          <label htmlFor="comment-filter" className="mb-1.5 block text-sm font-medium text-stone-800">
            Filter comments
          </label>
          <input
            id="comment-filter"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Author, review, or text"
            className="h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-600"
          />
        </div>

        {isSupabaseConfigured && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600">
            <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', live ? 'bg-emerald-700' : 'bg-stone-400')} />
            {live ? 'Live updates on' : 'Live updates off'}
          </span>
        )}
      </div>

      {loading && comments === null && (
        <div aria-busy="true" aria-live="polite" className="mt-6">
          <p className="text-sm font-medium text-stone-600">Loading comments…</p>
          <div aria-hidden="true" className="mt-3 space-y-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="h-4 w-1/3 rounded bg-stone-200" />
                <div className="mt-3 h-3 w-2/3 rounded bg-stone-200" />
              </div>
            ))}
          </div>
        </div>
      )}

      {comments !== null && comments.length === 0 && (
        <div className="mt-8 border-y border-stone-200 py-12 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-stone-500" aria-hidden="true" />
          <h2 className="mt-3 font-serif text-2xl font-bold text-stone-900">No comments yet</h2>
          <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-stone-700">
            Discussion appears here as soon as readers respond to a published article.
          </p>
          <Link href="/" className={cn(primaryButtonClass, 'mt-5')}>
            Read the journal
          </Link>
        </div>
      )}

      {comments !== null && comments.length > 0 && filtered.length === 0 && (
        <div className="mt-8 border-y border-stone-200 py-10 text-center">
          <h2 className="font-serif text-xl font-semibold text-stone-900">No comments match this filter</h2>
          <button type="button" onClick={() => setQuery('')} className={cn(secondaryButtonClass, 'mt-4')}>
            Clear filter
          </button>
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="mt-6 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {filtered.map((comment) => {
            const busy = busyId === comment.id;
            return (
              <li key={comment.id} className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-semibold text-stone-900">{comment.authorName}</span>
                    <span className="text-sm text-stone-600">{comment.authorRole}</span>
                    <span aria-hidden="true" className="text-stone-500">
                      ·
                    </span>
                    <time dateTime={comment.insertedAt} className="text-sm text-stone-600">
                      {formatDate(comment.insertedAt)}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-stone-600">
                    On{' '}
                    <Link
                      href={`/post/${comment.postId}`}
                      className="font-medium text-amber-900 underline underline-offset-4"
                    >
                      {comment.postTitle}
                    </Link>
                  </p>
                  <p className="mt-3 whitespace-pre-wrap break-words border-l-2 border-stone-200 pl-4 text-base leading-relaxed text-stone-800">
                    {comment.content}
                  </p>
                </div>

                <ConfirmDelete
                  onConfirm={() => void remove(comment)}
                  busy={busy}
                  label="Delete"
                  question="Delete this comment?"
                />
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-sm leading-relaxed text-stone-600">
        New comments are rate limited and length-checked before they appear here.
      </p>
    </div>
  );
}
