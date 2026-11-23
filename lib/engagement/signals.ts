/**
 * Engagement signals — honest math only.
 *
 * No signal is ever fabricated or inferred from looking busy. Every function
 * here is pure: same inputs, same outputs, no I/O, no clock (the caller passes
 * `today`). A streak is earned consecutive days, not a score; strength is the
 * plain sum of completed onboarding steps, nothing more.
 *
 * Sources for the signals (wired in the dashboard, not here):
 *  - emailVerified        → Supabase session user (server-read)
 *  - identityLinked       → providers/identities (lib/supabase/use-session)
 *  - applicationApproved  → writer application state (lib/applications)
 *  - firstDraftSaved      → first persisted draft
 *  - firstSubmission      → first submitted contribution
 *  - firstArticlePublished→ first public article by the author
 */

export interface EngagementSignals {
  emailVerified: boolean;
  identityLinked: boolean;
  applicationApproved: boolean;
  firstDraftSaved: boolean;
  firstSubmission: boolean;
  firstArticlePublished: boolean;
}

export type EngagementSignalKey = keyof EngagementSignals;

/** Signup order — the order a new writer actually walks through. */
export const ONBOARDING_ORDER: readonly EngagementSignalKey[] = [
  'emailVerified',
  'identityLinked',
  'applicationApproved',
  'firstDraftSaved',
  'firstSubmission',
  'firstArticlePublished',
] as const;

/** Column weights; sum is exactly 100 so a complete profile reads as 100. */
export const SIGNAL_WEIGHTS: Readonly<Record<EngagementSignalKey, number>> = {
  emailVerified: 15,
  identityLinked: 20,
  applicationApproved: 15,
  firstDraftSaved: 20,
  firstSubmission: 15,
  firstArticlePublished: 15,
} as const;

/** Honest sum of completed steps. Never exceeds 100, never fabricates credit. */
export function profileStrength(signals: EngagementSignals): number {
  let total = 0;
  for (const key of ONBOARDING_ORDER) {
    if (signals[key]) total += SIGNAL_WEIGHTS[key];
  }
  return total;
}

const NEXT_STEP: Readonly<Record<EngagementSignalKey, { label: string; href: string }>> = {
  // Sign-in is where this app explains the email-confirmation path end to end
  // (see mapAuthError in components/auth/LoginForm.tsx).
  emailVerified: { label: 'Confirm your email address', href: '/login' },
  // The Writer access page owns verified-identity linking (ORCID / GitHub).
  identityLinked: { label: 'Connect a verified identity', href: '/dashboard/access' },
  applicationApproved: { label: 'Complete your writer application', href: '/dashboard/access' },
  firstDraftSaved: { label: 'Write your first draft', href: '/write' },
  firstSubmission: { label: 'Submit your first article', href: '/write' },
  firstArticlePublished: { label: 'Publish your first article', href: '/write' },
} as const;

/**
 * The single most valuable next step: lowest-weight incomplete step, ties broken
 * by onboarding order. `null` when the profile is complete.
 */
export function nextStep(signals: EngagementSignals): { label: string; href: string } | null {
  let best: EngagementSignalKey | null = null;
  for (const key of ONBOARDING_ORDER) {
    if (signals[key]) continue;
    if (best === null || SIGNAL_WEIGHTS[key] < SIGNAL_WEIGHTS[best]) best = key;
  }
  return best === null ? null : NEXT_STEP[best];
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since the epoch for a UTC calendar day; `null` when malformed. */
function dayToUtcMs(day: string): number | null {
  const match = DAY.exec(day);
  if (!match) return null;
  const [, y, m, d] = match;
  const ms = Date.UTC(Number(y), Number(m) - 1, Number(d));
  // Reject overflow dates like 2026-02-31 (Date.UTC rolls them over).
  const check = new Date(ms);
  if (
    check.getUTCFullYear() !== Number(y) ||
    check.getUTCMonth() !== Number(m) - 1 ||
    check.getUTCDate() !== Number(d)
  ) {
    return null;
  }
  return ms;
}

/**
 * Consecutive UTC-day streak ending today.
 *
 * - `today` is passed in (UTC day, `YYYY-MM-DD`) — no hidden clock.
 * - Missing today breaks the streak to 0 — showing "4 days" to someone who has
 *   not shown up today would be a lie about the present.
 * - Future dates are ignored, malformed dates are ignored, duplicates count once.
 */
export function honestStreak(events: ReadonlyArray<{ day: string }>, today: string): number {
  const todayMs = dayToUtcMs(today);
  if (todayMs === null) return 0;
  const days = new Set<number>();
  for (const event of events) {
    const ms = dayToUtcMs(event?.day ?? '');
    if (ms === null || ms > todayMs) continue;
    days.add(ms);
  }
  if (!days.has(todayMs)) return 0;
  let streak = 0;
  for (let ms = todayMs; days.has(ms); ms -= 86_400_000) {
    streak += 1;
  }
  return streak;
}
