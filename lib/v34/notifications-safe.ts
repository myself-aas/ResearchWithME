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

/**
 * Part V §18.14 — Integrity and security alerts cannot be fully suppressed.
 */
export const NON_SUPPRESSIBLE_NOTIFICATION_CATEGORIES = [
  'integrity_alert',
  'security_alert',
] as const;

export type NotificationCategory =
  | (typeof NON_SUPPRESSIBLE_NOTIFICATION_CATEGORIES)[number]
  | 'review_deadline'
  | 'mention'
  | 'topic_digest'
  | 'assistant_suggestion';

export interface EffectiveChannelDecision {
  category: NotificationCategory;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  suppressible: boolean;
  overrideReason: string | null;
}

export function resolveEffectiveNotificationPolicy(input: {
  category: NotificationCategory;
  userMuted?: boolean;
  inQuietHours?: boolean;
  digestOff?: boolean;
}): EffectiveChannelDecision {
  const isMandatory = (NON_SUPPRESSIBLE_NOTIFICATION_CATEGORIES as readonly string[]).includes(
    input.category,
  );
  if (isMandatory) {
    return {
      category: input.category,
      inAppEnabled: true,
      pushEnabled: true,
      suppressible: false,
      overrideReason:
        'Integrity and security alerts cannot be fully suppressed (Part V §18.14).',
    };
  }

  const muted = Boolean(input.userMuted || (input.category === 'topic_digest' && input.digestOff));
  return {
    category: input.category,
    inAppEnabled: !muted,
    pushEnabled: !muted && !input.inQuietHours,
    suppressible: true,
    overrideReason: null,
  };
}
