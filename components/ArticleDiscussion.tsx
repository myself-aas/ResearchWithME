'use client';

import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { cleanText, LIMITS } from '@/lib/validation';
import { formatDate, safeInitials } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase/config';

interface Comment {
  id: string;
  authorName: string;
  authorRole?: string;
  avatar: string;
  timestamp: string;
  text: string;
}

export default function ArticleDiscussion({ postId, commentCount }: { postId: string; commentCount: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [text, setNameText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/comments?postId=${encodeURIComponent(postId)}`, { headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error('Could not load comments');
        const data: { comments?: Comment[] } = await res.json();
        if (active) setComments(Array.isArray(data.comments) ? data.comments : []);
      } catch {
        if (active) setLoadError('Comments did not load. The review still reads normally; reload the page to try the discussion again.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [postId]);

  // Realtime is available once the discussion is backed by Supabase. It is a
  // progressive enhancement: the initial fetch and manual posting still work.
  useEffect(() => {
    if (!isSupabaseConfigured || !postId.startsWith('cms-')) return;
    const numericId = postId.slice(4);
    if (!/^\d{1,19}$/.test(numericId)) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
        const supabase = getSupabaseBrowserClient();
        const channel = supabase
          .channel(`post-${numericId}-comments`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${numericId}` },
            (payload) => {
              if (disposed) return;
              const row = payload.new as {
                id: number | string;
                author_name?: string;
                author_role?: string;
                content?: string;
                inserted_at?: string;
              };
              const id = `cms-comment-${row.id}`;
              const authorName = row.author_name ?? 'Reader';
              setComments((current) =>
                current.some((comment) => comment.id === id)
                  ? current
                  : [
                      {
                        id,
                        authorName,
                        authorRole: row.author_role ?? 'Reader',
                        avatar: safeInitials(authorName, 'RD'),
                        timestamp: row.inserted_at ? formatDate(row.inserted_at) : 'Just now',
                        text: row.content ?? '',
                      },
                      ...current,
                    ],
              );
            },
          )
          .subscribe();

        cleanup = () => {
          disposed = true;
          void supabase.removeChannel(channel);
        };
      } catch {
        // Realtime is optional; the rest of the discussion keeps working.
      }
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [postId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const cleanName = cleanText(name, LIMITS.name);
    const cleanComment = cleanText(text, LIMITS.comment);
    if (!cleanName) {
      setFormError('Add the name and role to show next to your comment.');
      return;
    }
    if (cleanComment.length < 2) {
      setFormError('Add a few words before posting.');
      return;
    }

    setFormError(null);
    setSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          authorName: cleanName,
          text: cleanComment,
          authorRole: 'Reader',
        }),
      });
      if (!res.ok) throw new Error('The comment was not saved.');
      const data: { comment?: Comment } = await res.json();
      if (data.comment) {
        const posted = data.comment as Comment;
        setComments((current) =>
          current.some((comment) => comment.id === posted.id) ? current : [posted, ...current],
        );
      }
      setNameText('');
      setStatus('Comment posted. It appears below.');
    } catch {
      setFormError('The comment was not saved. Your text is still in the box, so you can post it again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="discussion" aria-labelledby="discussion-heading" className="border-t border-stone-200 pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="discussion-heading" className="flex items-center gap-2 font-serif text-2xl font-bold text-stone-900">
          <MessageSquare className="h-5 w-5 text-amber-800" aria-hidden="true" />
          <span>Peer discussion</span>
        </h2>
        <p className="text-sm text-stone-600">
          {loading ? 'Loading comments…' : `${comments.length || commentCount} comments`}
        </p>
      </div>

      <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-700">
        Comments are public. Critique the method, describe a reproduction, or ask a specific question.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-lg border border-stone-200 bg-white p-5">
        <div>
          <label htmlFor="comment-name" className="mb-1.5 block text-sm font-medium text-stone-800">
            Name and role
          </label>
          <input
            id="comment-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={LIMITS.name}
            autoComplete="name"
            placeholder="Alex V., systems engineer"
            className="h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-600"
          />
        </div>

        <div>
          <label htmlFor="comment-text" className="mb-1.5 block text-sm font-medium text-stone-800">
            Comment
          </label>
          <textarea
            id="comment-text"
            rows={4}
            value={text}
            onChange={(event) => setNameText(event.target.value)}
            maxLength={LIMITS.comment}
            placeholder="Describe the result you reproduced, or the part of the method that needs clarification."
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-600"
          />
          <p className="mt-1 text-sm text-stone-600">
            {text.length} of {LIMITS.comment} characters
          </p>
        </div>

        {formError && (
          <p role="alert" className="border-l-2 border-red-800 bg-red-50 px-3 py-2 text-sm text-red-900">
            {formError}
          </p>
        )}
        {status && (
          <p role="status" className="border-l-2 border-emerald-700 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            {status}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-11 items-center rounded-md bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800 disabled:opacity-60"
        >
          {submitting ? 'Posting…' : 'Post comment'}
        </button>
      </form>

      {loadError && (
        <p role="status" className="mt-4 border-l-2 border-amber-800 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {loadError}
        </p>
      )}

      <ul className="mt-6 divide-y divide-stone-200 border-t border-stone-200">
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-3 py-5">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 font-serif text-sm font-bold text-stone-50"
            >
              {comment.avatar || safeInitials(comment.authorName)}
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-semibold text-stone-900">{comment.authorName}</span>
                {comment.authorRole && <span className="text-stone-600">{comment.authorRole}</span>}
                <span className="text-stone-600">· {comment.timestamp}</span>
              </p>
              <p className="mt-1 max-w-prose text-base leading-relaxed text-stone-800">{comment.text}</p>
            </div>
          </li>
        ))}
      </ul>

      {!loading && comments.length === 0 && !loadError && (
        <p className="border-t border-stone-200 py-6 text-base text-stone-700">
          No comments yet. A precise question is a useful first note.
        </p>
      )}
    </section>
  );
}
