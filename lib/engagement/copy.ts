/**
 * Engagement copy — the reviewed-once strings for CTAs, empty states and errors.
 *
 * These are exported constants, reviewed here, so the same honest phrasing is
 * reused instead of re-invented (and re-drifting into manufactured urgency) at
 * each call site. Banned outright — enforced by `lib/__tests__/forbidden-copy.test.ts`:
 *
 *   1. Confirmshaming ("i'll risk it", "risk it anyway") — never guilt a reader.
 *   2. Fake scarcity ("only N seats left", "selling fast", "last chance",
 *      "before it's gone", "don't miss out") — capacity is stated exactly, or not at all.
 *   3. Win-back guilt ("we miss you", "we've missed you") — absence is not a debt.
 *
 * "just <n>% of" anchoring against a different unit is also banned; regex cannot
 * see unit mismatch, so it is a review rule documented in DESIGN.md §Do not.
 *
 * Tone rules honoured here: state the real reason or nothing; CTAs name the
 * action, never the emotion; no shouting (no `!`, no caps lock).
 */

export const ENGAGEMENT_COPY = {
  streakEmpty: 'Read your first review today to start a streak.',
  streakAlive: 'Keep it alive — open one review today.',
  streakPaused: 'Streak paused — read today to start it again.',
  publishable: "You're publishable.",
  profileStrengthLabel: 'Profile strength',
  noNewInLibrary: 'Nothing new in your library.',
} as const;

export type EngagementCopyKey = keyof typeof ENGAGEMENT_COPY;
