'use client';

import { useMemo, useState } from 'react';
import { MessageSquareQuote, ShieldCheck } from 'lucide-react';
import ReviewThread from '@/components/scholarly/ReviewThread';
import type { PermissionDecision } from '@/lib/schemas/scholarly';
import { toScholarlyDialogueItems } from '@/lib/v34/scholarly-adapter';
import type { FormalReviewRecord, ReviewDecisionRecord, ReviewItemRecord, ReviewRebuttalRecord } from '@/lib/v34/wave2-store';
import type { ReviewDecisionOutcome } from '@/lib/v34/wave2-contracts';

interface PeerReviewSectionProps {
  contributionId: string;
  contributionVersion: number;
  initialReviews: FormalReviewRecord[];
}

type ComposerMode = 'review' | 'rebuttal' | 'decision';

const PERMISSIONS: PermissionDecision[] = [
  { capability: 'suggestion:accept', granted: true },
  { capability: 'suggestion:reject', granted: true },
  { capability: 'thread:reply', granted: true },
];

export function PeerReviewSection({
  contributionId,
  contributionVersion,
  initialReviews,
}: PeerReviewSectionProps) {
  const [reviews, setReviews] = useState<FormalReviewRecord[]>(initialReviews);
  const [mode, setMode] = useState<ComposerMode>('review');

  // Review / suggestion fields
  const [itemType, setItemType] = useState<'review' | 'suggestion' | 'comment'>('review');
  const [scope, setScope] = useState('Methodology & Evidence');
  const [reviewBody, setReviewBody] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  // Rebuttal fields
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [rebuttalBody, setRebuttalBody] = useState('');

  // Decision fields
  const [decisionOutcome, setDecisionOutcome] = useState<ReviewDecisionOutcome>('MINOR_REVISION');
  const [decisionRationale, setDecisionRationale] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeReview = reviews[0] ?? null;
  const dialogueItems = useMemo(() => toScholarlyDialogueItems(reviews), [reviews]);

  async function handleAcceptOrReject(itemId: string, nextStatus: 'accepted' | 'rejected') {
    const ownerReview = reviews.find((r) => r.items.some((i) => i.id === itemId));
    if (!ownerReview) return;
    setFeedback(null);
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(ownerReview.id)}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, status: nextStatus }),
      });
      const data = (await res.json()) as { item?: ReviewItemRecord; error?: string };
      if (!res.ok || !data.item) {
        setFeedback(data.error || 'Could not update review suggestion.');
        return;
      }
      setReviews((prev) =>
        prev.map((r) =>
          r.id === ownerReview.id
            ? { ...r, items: r.items.map((i) => (i.id === itemId ? data.item! : i)) }
            : r,
        ),
      );
      setFeedback(`Suggestion marked as ${nextStatus}.`);
    } catch {
      setFeedback('Network error updating review item.');
    }
  }

  function handleReplySelect(itemId: string) {
    setMode('rebuttal');
    setSelectedItemIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
  }

  async function submitReviewItem(event: React.FormEvent) {
    event.preventDefault();
    if (reviewBody.trim().length < 5) {
      setFeedback('Please enter at least 5 characters for your formal review note.');
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      if (!activeReview) {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contributionId,
            scope,
            anonymous,
            initialItem: { itemType, scope, body: reviewBody },
          }),
        });
        const data = (await res.json()) as { review?: FormalReviewRecord; error?: string };
        if (!res.ok || !data.review) {
          setFeedback(data.error || 'Could not start formal peer review.');
          return;
        }
        setReviews([data.review]);
        setReviewBody('');
        setFeedback('Formal peer review created.');
      } else {
        const res = await fetch(`/api/reviews/${encodeURIComponent(activeReview.id)}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemType,
            scope,
            body: reviewBody,
            anonymous,
          }),
        });
        const data = (await res.json()) as { item?: ReviewItemRecord; error?: string };
        if (!res.ok || !data.item) {
          setFeedback(data.error || 'Could not append review item.');
          return;
        }
        setReviews((prev) =>
          prev.map((r) =>
            r.id === activeReview.id ? { ...r, items: [...r.items, data.item!] } : r,
          ),
        );
        setReviewBody('');
        setFeedback('Formal review item added.');
      }
    } catch {
      setFeedback('Network error submitting review item.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRebuttal(event: React.FormEvent) {
    event.preventDefault();
    if (!activeReview) {
      setFeedback('Start a formal review first before submitting a rebuttal.');
      return;
    }
    if (selectedItemIds.length === 0) {
      setFeedback('Select at least one review item that your rebuttal addresses.');
      return;
    }
    if (rebuttalBody.trim().length < 5) {
      setFeedback('Please provide a substantive rebuttal (at least 5 characters).');
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(activeReview.id)}/rebuttals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewItemIds: selectedItemIds,
          body: rebuttalBody,
        }),
      });
      const data = (await res.json()) as { rebuttal?: ReviewRebuttalRecord; error?: string };
      if (!res.ok || !data.rebuttal) {
        setFeedback(data.error || 'Could not record rebuttal.');
        return;
      }
      setReviews((prev) =>
        prev.map((r) =>
          r.id === activeReview.id ? { ...r, rebuttals: [...r.rebuttals, data.rebuttal!] } : r,
        ),
      );
      setRebuttalBody('');
      setSelectedItemIds([]);
      setFeedback('Linked author rebuttal recorded.');
    } catch {
      setFeedback('Network error submitting rebuttal.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitDecision(event: React.FormEvent) {
    event.preventDefault();
    if (!activeReview) {
      setFeedback('Start a formal review before recording an editorial decision.');
      return;
    }
    if (decisionRationale.trim().length < 10) {
      setFeedback('Editorial decisions require a rationale of at least 10 characters.');
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(activeReview.id)}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: decisionOutcome,
          rationale: decisionRationale,
        }),
      });
      const data = (await res.json()) as {
        decision?: ReviewDecisionRecord;
        review?: FormalReviewRecord;
        error?: string;
      };
      if (!res.ok || !data.review) {
        setFeedback(data.error || 'Could not record editorial decision.');
        return;
      }
      setReviews((prev) => prev.map((r) => (r.id === activeReview.id ? data.review! : r)));
      setDecisionRationale('');
      setFeedback(`Editorial decision (${decisionOutcome.replace(/_/g, ' ')}) recorded.`);
    } catch {
      setFeedback('Network error recording decision.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-label="Formal Peer Review and Rebuttal Thread"
      className="rounded-xl border border-line bg-surface p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Formal Peer Review · Version {contributionVersion}
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-ink">
            Structured Review &amp; Author Rebuttals
          </h2>
          <p className="text-sm text-ink-secondary max-w-2xl">
            Formal reviews are version-aware, auditable, and distinct from casual discussion.
            Anonymous reviewer identities are strictly redacted across all responses.
          </p>
        </div>

        {activeReview && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-line bg-canvas px-2.5 py-1 font-medium text-ink">
              Status: {activeReview.status.replace(/_/g, ' ')}
            </span>
            {activeReview.recommendation && (
              <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 font-medium text-brand">
                Recommendation: {activeReview.recommendation.replace(/_/g, ' ')}
              </span>
            )}
            {activeReview.anonymous && (
              <span className="rounded-full border border-line bg-canvas px-2.5 py-1 text-ink-secondary">
                Anonymous review active
              </span>
            )}
          </div>
        )}
      </div>

      {/* Existing scholarly ReviewThread component */}
      {dialogueItems.length > 0 ? (
        <ReviewThread
          items={dialogueItems}
          permissions={PERMISSIONS}
          onAccept={(id) => handleAcceptOrReject(id, 'accepted')}
          onReject={(id) => handleAcceptOrReject(id, 'rejected')}
          onReply={handleReplySelect}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-line p-4 text-sm text-ink-secondary">
          No formal peer review items have been filed for version {contributionVersion} yet. Start a
          structured review below.
        </div>
      )}

      {/* Interactive Composer */}
      <div className="rounded-xl border border-line bg-canvas/50 p-4 space-y-4">
        <div
          className="flex flex-wrap items-center gap-2 border-b border-line pb-3"
          role="tablist"
          aria-label="Formal review composer mode"
        >
          {(
            [
              ['review', 'Add Review / Suggestion'],
              ['rebuttal', 'Submit Linked Rebuttal'],
              ['decision', 'Record Decision'],
            ] as Array<[ComposerMode, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              onClick={() => setMode(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === key
                  ? 'bg-brand text-on-primary'
                  : 'border border-line bg-surface text-ink-secondary hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'review' && (
          <form onSubmit={submitReviewItem} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1 text-xs">
                <span className="font-medium text-ink">Entry type</span>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as 'review' | 'suggestion' | 'comment')}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
                >
                  <option value="review">Formal review critique</option>
                  <option value="suggestion">Actionable suggestion (accept/reject)</option>
                  <option value="comment">Scoped technical comment</option>
                </select>
              </label>

              <label className="block space-y-1 text-xs">
                <span className="font-medium text-ink">Scope / section</span>
                <input
                  type="text"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder="e.g. Section 2 · Evidence & limitations"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
                />
              </label>
            </div>

            <label className="block space-y-1 text-xs">
              <span className="font-medium text-ink">Review feedback</span>
              <textarea
                rows={3}
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                placeholder="Evaluate methodological rigor, locator accuracy, or missing scope boundaries..."
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-ink-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-line"
                />
                Submit as Anonymous reviewer (redacts identity from public thread)
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
              >
                <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden="true" />
                {submitting ? 'Submitting…' : 'Post formal review item'}
              </button>
            </div>
          </form>
        )}

        {mode === 'rebuttal' && (
          <form onSubmit={submitRebuttal} className="space-y-3">
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-ink">
                Select review items addressed by this rebuttal (required)
              </legend>
              {activeReview && activeReview.items.length > 0 ? (
                <div className="space-y-1.5">
                  {activeReview.items.map((item) => {
                    const checked = selectedItemIds.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className="flex items-start gap-2 rounded-lg border border-line bg-surface p-2.5 text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedItemIds((prev) =>
                              checked ? prev.filter((x) => x !== item.id) : [...prev, item.id],
                            )
                          }
                          className="mt-0.5 h-4 w-4 rounded border-line"
                        />
                        <span className="text-ink">
                          <strong className="font-semibold">{item.scope || item.itemType}:</strong>{' '}
                          {item.body.slice(0, 140)}
                          {item.body.length > 140 ? '…' : ''}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-ink-secondary">No review items available yet to rebut.</p>
              )}
            </fieldset>

            <label className="block space-y-1 text-xs">
              <span className="font-medium text-ink">Author rebuttal</span>
              <textarea
                rows={3}
                value={rebuttalBody}
                onChange={(e) => setRebuttalBody(e.target.value)}
                placeholder="Explain revisions made, cite supporting evidence, or clarify scope..."
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || !activeReview}
              className="rounded-lg bg-brand px-4 py-2 text-xs font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit linked rebuttal'}
            </button>
          </form>
        )}

        {mode === 'decision' && (
          <form onSubmit={submitDecision} className="space-y-3">
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-ink">Editorial outcome</span>
              <select
                value={decisionOutcome}
                onChange={(e) => setDecisionOutcome(e.target.value as ReviewDecisionOutcome)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
              >
                <option value="ACCEPT">Accept</option>
                <option value="MINOR_REVISION">Minor revision</option>
                <option value="MAJOR_REVISION">Major revision</option>
                <option value="REJECT">Reject</option>
              </select>
            </label>

            <label className="block space-y-1 text-xs">
              <span className="font-medium text-ink">Mandatory decision rationale (min 10 chars)</span>
              <textarea
                rows={3}
                value={decisionRationale}
                onChange={(e) => setDecisionRationale(e.target.value)}
                placeholder="Summarize why this version meets or needs revisions against evidence and scope standards..."
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || !activeReview}
              className="rounded-lg bg-brand px-4 py-2 text-xs font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Recording…' : 'Record editorial decision'}
            </button>
          </form>
        )}

        {feedback && (
          <p role="status" className="text-xs font-medium text-brand">
            {feedback}
          </p>
        )}
      </div>
    </section>
  );
}
