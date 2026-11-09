/**
 * ReviewThread — πeme v3.1 §7 Scholarly Dialogue (stage 3, beta).
 *
 * Renders Comment / Suggestion / Review / Rebuttal / Decision items in
 * chronological order. Suggestions expose accept/reject (capability-checked);
 * rebuttals link to review items; decisions record rationale. Reviewer
 * anonymity is respected in author labels (spec §24).
 * Keyboard: native buttons; list semantics via <ol>. Token mapping:
 * collaboration-* semantic tokens. Tests: dialogue.test.ts.
 */
import type { DialogueItem, PermissionDecision, ObjectId } from '@/lib/schemas/scholarly';
import { dialogueView, sortThread } from '@/lib/scholarly/dialogue';
import { can } from '@/lib/scholarly/claim-card';

export interface ReviewThreadProps {
  items: DialogueItem[];
  permissions: PermissionDecision[];
  onAccept?: (id: ObjectId) => void;
  onReject?: (id: ObjectId) => void;
  onReply?: (id: ObjectId) => void;
}

export default function ReviewThread({ items, permissions, onAccept, onReject, onReply }: ReviewThreadProps) {
  const thread = sortThread(items);
  const actionBtn =
    'min-h-11 rounded-sm bg-surface px-3 py-2 font-sans text-sm font-medium text-brand transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
  return (
    <ol aria-label="Review thread" className="space-y-3">
      {thread.map((item) => {
        const v = dialogueView(item);
        return (
          <li key={item.id} className="rounded-md border border-line bg-surface p-4">
            <p className={`font-sans text-[0.8125rem] font-semibold uppercase tracking-[0.04em] ${v.toneClass}`}>
              {v.label}
              {v.statusLabel ? <span className="ml-2 text-text-tertiary normal-case tracking-normal">· {v.statusLabel}</span> : null}
            </p>
            {item.scope ? <p className="mt-1 font-sans text-xs text-text-tertiary">Scope: {item.scope}</p> : null}
            <p className="mt-2 text-[1.125rem] leading-[1.7] text-text-primary">{item.body}</p>
            {item.type === 'rebuttal' && item.reviewItemIds?.length ? (
              <p className="mt-1 font-sans text-xs text-text-tertiary">Responds to review item(s): {item.reviewItemIds.map((i) => i.slice(0, 8)).join(', ')}</p>
            ) : null}
            {item.type === 'decision' && item.rationale ? (
              <p className="mt-1 font-sans text-sm text-text-secondary">Rationale: {item.rationale}</p>
            ) : null}
            <p className="mt-2 font-sans text-xs text-text-tertiary">
              {v.authorLabel} · {item.createdAt.slice(0, 10)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.type === 'suggestion' && onAccept && can(permissions, 'suggestion:accept') ? (
                <button type="button" className={actionBtn} onClick={() => onAccept(item.id)}>Accept</button>
              ) : null}
              {item.type === 'suggestion' && onReject && can(permissions, 'suggestion:reject') ? (
                <button type="button" className={actionBtn} onClick={() => onReject(item.id)}>Reject</button>
              ) : null}
              {onReply && can(permissions, 'thread:reply') ? (
                <button type="button" className={actionBtn} onClick={() => onReply(item.id)}>Reply</button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
