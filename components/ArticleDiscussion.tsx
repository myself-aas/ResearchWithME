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
    setLoading(true);
    setLoadError(null);
    setComments([]);
    async function load() {
      try {
        const res = await fetch(`/api/comments?postId=${encodeURIComponent(postId)}`, { headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error('Could not load comments');
        const data: { comments?: Comment[] } = await res.json();
        if (active) setComments(Array.isArray(data.comments) ? data.comments : []);
      } catch {
        if (active) setLoadError('Comments could not be loaded. This does not affect the article.');
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
      setFormError('Add the name and role you want shown with your comment.');
      return;
    }
    if (cleanComment.length < 2) {
      setFormError('Write at least a sentence before posting.');
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
      if (!res.ok) throw new Error('The comment could not be saved.');
      const data: { comment?: Comment } = await res.json();
      if (data.comment) {
        const posted = data.comment as Comment;
        setComments((current) =>
          current.some((comment) => comment.id === posted.id) ? current : [posted, ...current],
        );
      }
      setNameText('');
      setStatus('Comment posted. It is visible below for this session.');
    } catch {
      setFormError('Your comment could not be saved. The text is still in the box, so you can try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="discussion-heading" className="border-t border-line pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="discussion-heading" className="flex items-center gap-2 font-serif text-2xl font-bold text-ink">
          <MessageSquare className="h-5 w-5 text-brand-hover" aria-hidden="true" />
          <span>Peer discussion</span>
        </h2>
        <p className="text-sm text-ink-secondary">
          {loading ? 'Loading comments…' : `${comments.length || commentCount} notes`}
        </p>
      </div>

      <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink">
        Comments are public. Critique the method, reproduce a result, or ask a precise question.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-line bg-surface-raised p-5 sm:p-6">
        <div>
          <label htmlFor="comment-name" className="mb-1.5 block text-sm font-medium text-ink">
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
            className="h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-secondary"
          />
        </div>

        <div>
          <label htmlFor="comment-text" className="mb-1.5 block text-sm font-medium text-ink">
            Comment
          </label>
          <textarea
            id="comment-text"
            rows={4}
            value={text}
            onChange={(event) => setNameText(event.target.value)}
            maxLength={LIMITS.comment}
            placeholder="Describe the result you reproduced, or the part of the method that needs clarification."
            className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2.5 text-base text-ink placeholder:text-ink-secondary"
          />
          <p className="mt-1 text-sm text-ink-secondary">
            {text.length} of {LIMITS.comment} characters
          </p>
        </div>

        {formError && (
          <p role="alert" className="border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}
        {status && (
          <p role="status" className="border-l-2 border-success bg-success/5 px-3 py-2 text-sm text-success">
            {status}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-11 items-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {submitting ? 'Posting…' : 'Post comment'}
        </button>
      </form>

      {loadError && (
        <p role="status" className="mt-4 border-l-2 border-brand-hover bg-brand/5 px-3 py-2 text-sm text-brand-pressed">
          {loadError}
        </p>
      )}

      <ul className="mt-6 grid gap-3">
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-3 rounded-2xl border border-line bg-surface p-5">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-inverse font-serif text-sm font-bold text-text-inverse"
            >
              {comment.avatar || safeInitials(comment.authorName)}
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-semibold text-ink">{comment.authorName}</span>
                {comment.authorRole && <span className="text-ink-secondary">{comment.authorRole}</span>}
                <span className="text-ink-secondary">· {comment.timestamp}</span>
              </p>
              <p className="mt-1 max-w-prose text-base leading-relaxed text-ink">{comment.text}</p>
            </div>
          </li>
        ))}
      </ul>

      {!loading && comments.length === 0 && !loadError && (
        <p className="border-t border-line py-6 text-base text-ink">
          No comments yet. A precise question is a useful first note.
        </p>
      )}
    </section>
  );
}
