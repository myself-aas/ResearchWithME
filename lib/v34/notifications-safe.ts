/**
 * ResearchWithME v3.4 Part V §12.2–§12.3 Safe Notification Rendering & Dedupe Keys.
 *
 * Ensures non-public / restricted workspace titles or private research text
 * NEVER leak onto device lock screens or push previews, and provides
 * deterministic dedupe keys to avoid duplicate notifications.
 */
import type { DataClassification } from './wave6-contracts';

export function notificationPreview(
  classification: DataClassification,
  content: { publicTitle: string; restrictedTitle?: string },
): string {
  if (classification === 'PUBLIC') {
    return content.publicTitle;
  }
  return (
    content.restrictedTitle?.trim() ||
    'A protected ResearchWithME workspace has an update requiring your attention.'
  );
}

export type NotificationDedupeSpec =
  | { kind: 'integrity'; eventId: string; userId: string }
  | { kind: 'review-request'; reviewId: string; reviewerId: string }
  | { kind: 'draft-conflict'; draftId: string; userId: string; serverVersion: number }
  | { kind: 'generic'; category: string; targetId: string; userId: string };

export function buildNotificationDedupeKey(spec: NotificationDedupeSpec): string {
  switch (spec.kind) {
    case 'integrity':
      return `integrity:${spec.eventId}:${spec.userId}`;
    case 'review-request':
      return `review-request:${spec.reviewId}:${spec.reviewerId}`;
    case 'draft-conflict':
      return `draft-conflict:${spec.draftId}:${spec.userId}:${spec.serverVersion}`;
    case 'generic':
      return `${spec.category}:${spec.targetId}:${spec.userId}`;
  }
}
