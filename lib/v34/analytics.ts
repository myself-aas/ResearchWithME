/**
 * ResearchWithME v3.4 Part I §17 & Part V §18.15 — Privacy-Safe Product Analytics
 * and Funnel Event Taxonomy.
 *
 * Strictly enforces:
 *  - Only the 14 normative Part I §17 funnel & retention events are accepted.
 *  - Never records sensitive research text, quotations, draft bodies, MDX,
 *    emails, bearer tokens, IP addresses, or anonymous reviewer identities.
 *  - Strips all custom properties when classification is CONFIDENTIAL or RESTRICTED.
 */

export const V34_ANALYTICS_EVENTS = [
  'feed_viewed',
  'contribution_cta_clicked',
  'contribution_type_selected',
  'source_selected',
  'assistant_interview_started',
  'draft_generated',
  'evidence_added',
  'contribution_published',
  'contribution_abandoned',
  'item_saved',
  'account_created',
  'second_contribution_started',
  'review_referenced',
  'contribution_saved_by_other',
] as const;

export type V34AnalyticsEventName = (typeof V34_ANALYTICS_EVENTS)[number];

export type AnalyticsClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export interface RawAnalyticsEventInput {
  event: V34AnalyticsEventName;
  subjectBucket?: string;
  experimentId?: string;
  experimentVariant?: string;
  classification?: AnalyticsClassification;
  properties?: Record<string, unknown>;
}

export interface SanitizedAnalyticsEvent {
  event: V34AnalyticsEventName;
  timestamp: string;
  subjectBucket: string;
  experimentId: string | null;
  experimentVariant: string | null;
  classification: AnalyticsClassification;
  properties: Record<string, string | number | boolean>;
  redactedFields: string[];
}

const FORBIDDEN_KEY_PATTERN =
  /email|mail|phone|token|secret|cookie|authorization|password|ip|quote|quotation|excerpt|body|text|content|mdx|draft|reviewer|author_?name|notes?|snippet|statement|abstract/i;

const INLINE_EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const INLINE_TOKEN_RE = /(?:bearer\s+[A-Za-z0-9._-]+|sk_[A-Za-z0-9_-]{8,}|eyJ[A-Za-z0-9_-]{10,})/gi;

const ALLOWED_SAFE_KEYS = new Set([
  'surface',
  'contributionType',
  'sourceType',
  'locatorKind',
  'entityType',
  'resultCount',
  'filterCount',
  'isReturning',
  'step',
  'mode',
  'abandonedStep',
  'offline',
]);

const recentEvents: SanitizedAnalyticsEvent[] = [];
const MAX_RECENT_EVENTS = 200;

export function sanitizeAnalyticsEvent(input: RawAnalyticsEventInput): SanitizedAnalyticsEvent {
  const classification: AnalyticsClassification = input.classification ?? 'PUBLIC';
  const redactedFields: string[] = [];
  const safeProperties: Record<string, string | number | boolean> = {};

  if (input.properties && typeof input.properties === 'object') {
    if (classification === 'CONFIDENTIAL' || classification === 'RESTRICTED') {
      // Never emit custom properties on confidential/restricted research workspaces
      for (const key of Object.keys(input.properties)) {
        redactedFields.push(key);
      }
    } else {
      for (const [key, rawVal] of Object.entries(input.properties)) {
        if (FORBIDDEN_KEY_PATTERN.test(key) || !ALLOWED_SAFE_KEYS.has(key)) {
          redactedFields.push(key);
          continue;
        }
        if (typeof rawVal === 'number' && Number.isFinite(rawVal)) {
          safeProperties[key] = rawVal;
        } else if (typeof rawVal === 'boolean') {
          safeProperties[key] = rawVal;
        } else if (typeof rawVal === 'string') {
          if (INLINE_EMAIL_RE.test(rawVal) || INLINE_TOKEN_RE.test(rawVal)) {
            INLINE_EMAIL_RE.lastIndex = 0;
            INLINE_TOKEN_RE.lastIndex = 0;
            redactedFields.push(key);
            continue;
          }
          safeProperties[key] = rawVal.slice(0, 64);
        } else {
          redactedFields.push(key);
        }
      }
    }
  }

  return {
    event: input.event,
    timestamp: new Date().toISOString(),
    subjectBucket: (input.subjectBucket ?? 'anonymous').slice(0, 48),
    experimentId: input.experimentId ? input.experimentId.slice(0, 64) : null,
    experimentVariant: input.experimentVariant ? input.experimentVariant.slice(0, 48) : null,
    classification,
    properties: safeProperties,
    redactedFields,
  };
}

export function recordAnalyticsEvent(input: RawAnalyticsEventInput): SanitizedAnalyticsEvent {
  const sanitized = sanitizeAnalyticsEvent(input);
  recentEvents.unshift(sanitized);
  if (recentEvents.length > MAX_RECENT_EVENTS) {
    recentEvents.length = MAX_RECENT_EVENTS;
  }
  return sanitized;
}

export function listRecentAnalyticsEvents(limit = 25): SanitizedAnalyticsEvent[] {
  return recentEvents.slice(0, Math.max(1, Math.min(limit, MAX_RECENT_EVENTS)));
}
