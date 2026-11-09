/**
 * Scholarly dialogue presentation logic — πeme v3.1 §7 (pure, unit-tested).
 * Comment / Suggestion / Review / Rebuttal / Decision each get a distinct
 * label and collaboration token; reviewer anonymity is respected in labels.
 */
import type { DialogueItem } from '@/lib/schemas/scholarly';

export interface DialogueView {
  type: DialogueItem['type'];
  label: string;
  toneClass: string;
  authorLabel: string;
  statusLabel?: string;
}

const META: Record<DialogueItem['type'], { label: string; toneClass: string }> = {
  comment: { label: 'Comment', toneClass: 'text-collaboration-comment' },
  suggestion: { label: 'Suggestion', toneClass: 'text-collaboration-suggestion' },
  review: { label: 'Review', toneClass: 'text-collaboration-review' },
  rebuttal: { label: 'Rebuttal', toneClass: 'text-collaboration-review' },
  decision: { label: 'Decision', toneClass: 'text-collaboration-consensus' },
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  accepted: 'Accepted',
  rejected: 'Rejected',
  resolved: 'Resolved',
};

export function dialogueView(item: DialogueItem): DialogueView {
  const meta = META[item.type];
  return {
    type: item.type,
    label: meta.label,
    toneClass: meta.toneClass,
    // anonymity: never expose authorId when anonymous (spec §24)
    authorLabel: item.anonymous ? 'Anonymous reviewer' : `User ${item.authorId.slice(0, 8)}…`,
    statusLabel: item.status ? STATUS_LABEL[item.status] : undefined,
  };
}

/** Thread renders in chronological order. */
export function sortThread(items: DialogueItem[]): DialogueItem[] {
  return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
