'use client';

import { useState } from 'react';
import { Lock, MessageCircle, Send, Unlock } from 'lucide-react';
import { formatShortDate } from '@/lib/formatting/locale';
import type { DiscussionObjectType } from '@/lib/v34/wave3-contracts';
import type {
  DiscussionCommentRecord,
  DiscussionRecord,
} from '@/lib/v34/wave3-store';

interface DiscussionSectionProps {
  objectType: DiscussionObjectType;
  objectId: string;
  initialDiscussions: DiscussionRecord[];
}

export function DiscussionSection({
  objectType,
  objectId,
  initialDiscussions,
}: DiscussionSectionProps) {
  const [discussions, setDiscussions] = useState<DiscussionRecord[]>(initialDiscussions);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [showNewThread, setShowNewThread] = useState(initialDiscussions.length === 0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleStartDiscussion(event: React.FormEvent) {
    event.preventDefault();
    if (newTitle.trim().length < 4) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectType,
          objectId,
          title: newTitle,
          initialBody: newBody.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { discussion?: DiscussionRecord; error?: string };
      if (!res.ok || !data.discussion) {
        setFeedback(data.error || 'Could not start discussion thread.');
        return;
      }
      setDiscussions((prev) => [data.discussion!, ...prev]);
      setNewTitle('');
      setNewBody('');
      setShowNewThread(false);
      setFeedback('Informal discussion thread started.');
    } catch {
      setFeedback('Network error creating discussion.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePostComment(discussionId: string, event: React.FormEvent) {
    event.preventDefault();
    const body = (replyDrafts[discussionId] ?? '').trim();
    if (body.length < 2) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/discussions/${encodeURIComponent(discussionId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const data = (await res.json()) as { comment?: DiscussionCommentRecord; error?: string };
      if (!res.ok || !data.comment) {
        setFeedback(data.error || 'Could not post comment.');
        return;
      }
      setDiscussions((prev) =>
        prev.map((d) =>
          d.id === discussionId ? { ...d, comments: [...d.comments, data.comment!] } : d,
        ),
      );
      setReplyDrafts((prev) => ({ ...prev, [discussionId]: '' }));
    } catch {
      setFeedback('Network error posting comment.');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleLock(disc: DiscussionRecord) {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/discussions/${encodeURIComponent(disc.id)}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locked: !disc.locked,
          reason: !disc.locked ? 'Thread locked — continue formal critiques in Peer Review.' : undefined,
        }),
      });
      const data = (await res.json()) as { discussion?: DiscussionRecord; error?: string };
      if (!res.ok || !data.discussion) {
        setFeedback(data.error || 'Could not update thread lock state.');
        return;
      }
      setDiscussions((prev) => prev.map((d) => (d.id === disc.id ? data.discussion! : d)));
    } catch {
      setFeedback('Network error updating lock state.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Informal Scholarly Discussion"
      className="rounded-xl border border-line bg-surface p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-ink-secondary">
            <MessageCircle className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            Informal Discussion · Separate from Formal Peer Review
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-ink">
            Community Q&amp;A &amp; Replication Notes
          </h2>
          <p className="text-sm text-ink-secondary max-w-2xl">
            Ask clarifying questions, share informal replication runs, or discuss follow-up ideas.
            Formal methodological critiques and decisions belong in the Peer Review section above.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewThread((prev) => !prev)}
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-canvas px-3.5 py-2 text-xs font-medium text-ink hover:border-brand"
        >
          {showNewThread ? 'Close composer' : 'Start discussion thread'}
        </button>
      </div>

      {showNewThread && (
        <form
          onSubmit={handleStartDiscussion}
          className="rounded-xl border border-line bg-canvas p-4 space-y-3"
        >
          <label className="block space-y-1 text-xs">
            <span className="font-medium text-ink">Thread title</span>
            <input
              type="text"
              required
              minLength={4}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Hyperparameter sensitivity on smaller checkpoints?"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span className="font-medium text-ink">Opening comment (optional)</span>
            <textarea
              rows={2}
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Share context, hardware configuration, or follow-up questions..."
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand px-4 py-2 text-xs font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Posting…' : 'Create discussion thread'}
          </button>
        </form>
      )}

      {feedback && (
        <p role="status" className="text-xs font-medium text-brand">
          {feedback}
        </p>
      )}

      <div className="space-y-4">
        {discussions.map((disc) => (
          <article
            key={disc.id}
            className="rounded-xl border border-line bg-canvas/60 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-ink">{disc.title}</h3>
                <p className="text-xs text-ink-secondary">
                  Started by {disc.authorName} · {formatShortDate(disc.createdAt)} ·{' '}
                  {disc.comments.length} comment{disc.comments.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {disc.locked && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-secondary">
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    Locked
                  </span>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleToggleLock(disc)}
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-ink-secondary hover:text-ink"
                >
                  {disc.locked ? (
                    <>
                      <Unlock className="h-3 w-3" aria-hidden="true" />
                      Unlock
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      Lock thread
                    </>
                  )}
                </button>
              </div>
            </div>

            {disc.comments.length > 0 && (
              <ol className="space-y-2 border-t border-line pt-3">
                {disc.comments.map((c) => (
                  <li key={c.id} className="rounded-lg border border-line bg-surface p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-ink-secondary">
                      <span className="font-semibold text-ink">{c.authorName}</span>
                      <span>
                        {formatShortDate(c.createdAt)}
                        {c.editedAt ? ' (edited)' : ''}
                      </span>
                    </div>
                    <p className="text-sm text-ink leading-relaxed">{c.body}</p>
                  </li>
                ))}
              </ol>
            )}

            {disc.locked ? (
              <p className="rounded-lg border border-line bg-surface-subtle px-3 py-2 text-xs text-ink-secondary">
                {disc.lockedReason || 'This discussion thread is locked and no longer accepts replies.'}
              </p>
            ) : (
              <form
                onSubmit={(e) => handlePostComment(disc.id, e)}
                className="flex flex-col sm:flex-row gap-2 pt-2"
              >
                <label className="sr-only" htmlFor={`reply-${disc.id}`}>
                  Add reply to {disc.title}
                </label>
                <input
                  id={`reply-${disc.id}`}
                  type="text"
                  value={replyDrafts[disc.id] ?? ''}
                  onChange={(e) =>
                    setReplyDrafts((prev) => ({ ...prev, [disc.id]: e.target.value }))
                  }
                  placeholder="Write an informal reply or replication note..."
                  className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
                />
                <button
                  type="submit"
                  disabled={busy || (replyDrafts[disc.id] ?? '').trim().length < 2}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Reply
                </button>
              </form>
            )}
          </article>
        ))}

        {discussions.length === 0 && (
          <p className="text-sm text-ink-secondary">
            No informal discussion threads yet. Start one above for replication questions or
            community Q&amp;A.
          </p>
        )}
      </div>
    </section>
  );
}
