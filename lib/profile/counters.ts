/**
 * Social counters for the profile header.
 *
 * Every number here comes from a real aggregate over persisted rows:
 * `v34_user_follows`, `v34_library_items`, and `v34_contributions`
 * (see `supabase/migrations/20261117001500_v34_profile_social_counts.sql`).
 * When the aggregate is unavailable the summary is `null` and the header
 * renders no counters at all — never a placeholder.
 */

export interface ProfileSocialCounts {
  followers: number;
  savesReceived: number;
  publishedReviews: number;
}

export interface ProfileSocialStat {
  key: keyof ProfileSocialCounts;
  label: string;
  value: number;
  /** The unit in its correct number, e.g. "follower" / "followers". */
  noun: string;
  /** Full sentence for tooltips/tests, e.g. "3 followers". */
  display: string;
}

function toCount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return Math.trunc(parsed);
  }
  return null;
}

function plural(value: number, singular: string, pluralLabel: string): string {
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

/**
 * Normalizes the RPC payload (an array with one row, a single row object, or
 * `null`) into typed counts. Any missing/invalid field yields `null` so the
 * caller can omit the counters rather than under-report.
 */
export function normalizeSocialCounts(row: unknown): ProfileSocialCounts | null {
  const candidate = Array.isArray(row) ? row[0] : row;
  if (!candidate || typeof candidate !== 'object') return null;
  const record = candidate as Record<string, unknown>;

  const followers = toCount(record.followers);
  const savesReceived = toCount(record.saves_received ?? record.savesReceived);
  const publishedReviews = toCount(record.published_reviews ?? record.publishedReviews);

  if (followers === null || savesReceived === null || publishedReviews === null) return null;
  return { followers, savesReceived, publishedReviews };
}

function unit(value: number, singular: string, pluralLabel: string): string {
  return value === 1 ? singular : pluralLabel;
}

export function socialStats(
  counts: ProfileSocialCounts,
  options: { isSelf: boolean },
): ProfileSocialStat[] {
  const reviews = unit(counts.publishedReviews, 'published review', 'published reviews');
  const followers = unit(counts.followers, 'follower', 'followers');
  const saves = unit(
    counts.savesReceived,
    options.isSelf ? 'save of your work' : 'save received',
    options.isSelf ? 'saves of your work' : 'saves received',
  );

  return [
    {
      key: 'publishedReviews',
      label: 'Published reviews',
      value: counts.publishedReviews,
      noun: reviews,
      display: plural(counts.publishedReviews, 'published review', 'published reviews'),
    },
    {
      key: 'followers',
      label: 'Followers',
      value: counts.followers,
      noun: followers,
      display: plural(counts.followers, 'follower', 'followers'),
    },
    {
      key: 'savesReceived',
      label: options.isSelf ? 'Saves of your work' : 'Saves received',
      value: counts.savesReceived,
      noun: saves,
      display: plural(
        counts.savesReceived,
        options.isSelf ? 'save of your work' : 'save received',
        options.isSelf ? 'saves of your work' : 'saves received',
      ),
    },
  ];
}
