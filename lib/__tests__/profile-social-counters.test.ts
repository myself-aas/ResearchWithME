import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeSocialCounts, socialStats } from '@/lib/profile/counters';

describe('profile social counters', () => {
  it('reads the single-row RPC payload', () => {
    expect(
      normalizeSocialCounts([{ followers: 3, saves_received: 12, published_reviews: 4 }]),
    ).toEqual({ followers: 3, savesReceived: 12, publishedReviews: 4 });
  });

  it('accepts a single row object and numeric strings', () => {
    expect(
      normalizeSocialCounts({ followers: '0', saves_received: '7', published_reviews: 1 }),
    ).toEqual({ followers: 0, savesReceived: 7, publishedReviews: 1 });
  });

  it('returns null when the aggregate is unavailable, rather than zero', () => {
    expect(normalizeSocialCounts(null)).toBeNull();
    expect(normalizeSocialCounts([])).toBeNull();
    expect(normalizeSocialCounts([{ followers: 1 }])).toBeNull();
    expect(normalizeSocialCounts([{ followers: -1, saves_received: 0, published_reviews: 0 }])).toBeNull();
    expect(normalizeSocialCounts([{ followers: 'many', saves_received: 0, published_reviews: 0 }])).toBeNull();
  });

  it('formats singular and plural counts truthfully', () => {
    const zero = socialStats({ followers: 0, savesReceived: 0, publishedReviews: 0 }, { isSelf: true });
    expect(zero.map((stat) => stat.display)).toEqual([
      '0 published reviews',
      '0 followers',
      '0 saves of your work',
    ]);

    const one = socialStats({ followers: 1, savesReceived: 1, publishedReviews: 1 }, { isSelf: true });
    expect(one.map((stat) => stat.display)).toEqual([
      '1 published review',
      '1 follower',
      '1 save of your work',
    ]);
    expect(one.every((stat) => stat.value === 1)).toBe(true);
  });

  it('ships a security-definer aggregate that reads the real follow and library tables', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/20261117001500_v34_profile_social_counts.sql'),
      'utf8',
    );
    expect(sql).toContain('create or replace function public.v34_profile_social_counts');
    expect(sql).toContain('security definer');
    expect(sql).toContain('set search_path = public, pg_temp');
    expect(sql).toContain('v34_user_follows');
    expect(sql).toContain('v34_library_items');
    expect(sql).toContain("c.lifecycle = 'published'");
    expect(sql).toContain('grant execute on function public.v34_profile_social_counts(uuid) to authenticated');
    expect(sql).toContain('revoke all on function public.v34_profile_social_counts(uuid) from anon');
  });
});
