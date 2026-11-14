import { describe, expect, it } from 'vitest';
import type { AuthorApplication } from '@/lib/applications';
import type { CmsComment, CmsPost } from '@/lib/cms/types';
import {
  APPLICATION_TARGET_DAYS,
  DEFAULT_PERIOD,
  PERIODS,
  STALLED_DRAFT_DAYS,
  buildDeskMetrics,
  buildReadingMetrics,
  buildWriterMetrics,
  comparePeriods,
  comparisonText,
  coverageInsight,
  draftGaps,
  formatMinutes,
  parsePeriod,
  parseReadMinutes,
  periodWindow,
  publishingInsight,
  trendSeries,
  type ReadingArticle,
} from '@/lib/dashboard/metrics';

const NOW = new Date('2026-11-14T12:00:00.000Z');
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

let nextId = 1;
function post(overrides: Partial<CmsPost> = {}): CmsPost {
  const id = String(nextId++);
  return {
    id,
    title: `Article ${id}`,
    slug: `article-${id}`,
    content: 'x'.repeat(240),
    status: 'published',
    subtitle: '',
    summary: 'Summary',
    category: 'Research Reviews',
    format: 'Paper Review',
    authorId: 'writer-a',
    authorName: 'Writer A',
    coverImage: '/cover.jpg',
    tags: [],
    keyTakeaways: ['One'],
    readTime: '6 min read',
    featured: false,
    likes: 0,
    publishedAt: ago(1),
    insertedAt: ago(2),
    updatedAt: ago(1),
    artifact: { type: 'paper', title: 'Work', url: 'https://example.org', identifier: 'x', meta: '' },
    ...overrides,
  };
}

function comment(postId: string, days: number): CmsComment {
  return { id: `c${postId}-${days}`, postId, postTitle: '', authorName: 'R', authorRole: 'Reader', content: 'ok', insertedAt: ago(days) };
}

function application(id: number, status: AuthorApplication['status'], days: number): AuthorApplication {
  return {
    id,
    user_id: `u${id}`,
    provider: 'orcid',
    handle: '0000-0000-0000-0000',
    display_name: `Applicant ${id}`,
    statement: '',
    status,
    reviewed_by: null,
    reviewed_at: null,
    review_note: '',
    created_at: ago(days + 30),
    updated_at: ago(days),
  };
}

describe('periods', () => {
  it('falls back to the default view for unknown values', () => {
    expect(parsePeriod(undefined)).toBe(DEFAULT_PERIOD);
    expect(parsePeriod('nonsense')).toBe(DEFAULT_PERIOD);
    expect(parsePeriod(['12w', '52w']).key).toBe('12w');
  });

  it('gives every period a whole number of trend buckets', () => {
    for (const period of PERIODS) {
      expect((2 * period.days) % period.bucketDays).toBe(0);
      expect((2 * period.days) / period.bucketDays).toBeLessThanOrEqual(13);
    }
  });

  it('counts the selected period and the one before it, and nothing else', () => {
    const window = periodWindow(NOW, DEFAULT_PERIOD);
    const result = comparePeriods([ago(1), ago(27), ago(29), ago(55), ago(57), ago(-1), null, 'not a date'], window);
    expect(result).toEqual({ current: 2, previous: 2, delta: 0, direction: 'flat' });
  });
});

describe('trendSeries', () => {
  it('sums to the headline comparison in both periods', () => {
    const dates = [1, 3, 8, 20, 27, 30, 40, 55, 70].map(ago);
    for (const period of PERIODS) {
      const buckets = trendSeries(dates, NOW, period);
      const totals = comparePeriods(dates, periodWindow(NOW, period));
      expect(buckets).toHaveLength((2 * period.days) / period.bucketDays);
      expect(buckets.filter((b) => b.inPeriod).reduce((sum, b) => sum + b.count, 0)).toBe(totals.current);
      expect(buckets.filter((b) => !b.inPeriod).reduce((sum, b) => sum + b.count, 0)).toBe(totals.previous);
    }
  });

  it('labels long buckets with a month and year', () => {
    expect(trendSeries([], NOW, PERIODS[0]).at(-1)?.label).toBe('Nov 7');
    expect(trendSeries([], NOW, PERIODS[2]).at(-1)?.label).toBe('Sep ’26');
  });
});

describe('draftGaps', () => {
  it('reports nothing for a complete draft and every gap for an empty one', () => {
    expect(draftGaps(post({ status: 'draft' }))).toEqual([]);
    expect(
      draftGaps(post({ status: 'draft', content: 'short', summary: ' ', keyTakeaways: [' '], coverImage: null, artifact: null })),
    ).toEqual(['body', 'summary', 'takeaways', 'cover', 'artifact']);
  });
});

describe('buildDeskMetrics', () => {
  const posts = [
    post({ publishedAt: ago(2), category: 'Research Reviews' }),
    post({ publishedAt: ago(10), category: 'Research Reviews', authorId: 'writer-b', authorName: 'Writer B' }),
    post({ publishedAt: ago(40), category: 'STEM & Tech' }),
    post({ status: 'draft', publishedAt: null, updatedAt: ago(STALLED_DRAFT_DAYS) }),
    post({ status: 'draft', publishedAt: null, updatedAt: ago(STALLED_DRAFT_DAYS - 1), authorId: 'writer-b', authorName: 'Writer B' }),
  ];
  const comments = [comment(posts[0].id, 1), comment(posts[0].id, 35)];
  const applications = [
    application(1, 'pending', APPLICATION_TARGET_DAYS + 1),
    application(2, 'pending', APPLICATION_TARGET_DAYS),
    application(3, 'approved', 90),
  ];
  const metrics = buildDeskMetrics({ posts, comments, applications, now: NOW, period: DEFAULT_PERIOD });

  it('compares publishing and comments with the previous period', () => {
    expect(metrics.published).toMatchObject({ current: 2, previous: 1, direction: 'up' });
    expect(metrics.comments).toMatchObject({ current: 1, previous: 1, direction: 'flat' });
  });

  it('flags drafts at the stall threshold, longest idle first', () => {
    expect(metrics.stalledDrafts).toBe(1);
    expect(metrics.drafts.map((d) => d.stalled)).toEqual([true, false]);
  });

  it('marks only applications past the target as overdue, oldest first', () => {
    expect(metrics.pendingApplications?.map((a) => [a.id, a.overdue])).toEqual([
      [1, true],
      [2, false],
    ]);
    expect(metrics.oldestApplicationDays).toBe(APPLICATION_TARGET_DAYS + 1);
  });

  it('keeps an unreadable queue distinct from an empty one', () => {
    const noQueue = buildDeskMetrics({ posts, comments, applications: null, now: NOW, period: DEFAULT_PERIOD });
    expect(noQueue.pendingApplications).toBeNull();
    const emptyQueue = buildDeskMetrics({ posts, comments, applications: [], now: NOW, period: DEFAULT_PERIOD });
    expect(emptyQueue.pendingApplications).toEqual([]);
  });

  it('lists every discipline, including the ones with no article', () => {
    expect(metrics.coverage).toHaveLength(6);
    expect(metrics.coverage[0]).toEqual({ label: 'Research Reviews', value: 2 });
    expect(metrics.coverage.filter((row) => row.value === 0)).toHaveLength(5);
  });

  it('summarises each writer', () => {
    expect(metrics.writers.map((w) => [w.authorName, w.publishedInPeriod, w.publishedTotal, w.drafts])).toEqual([
      ['Writer A', 1, 2, 1],
      ['Writer B', 1, 1, 1],
    ]);
  });
});

describe('buildWriterMetrics', () => {
  const mineA = post({ likes: 9, publishedAt: ago(3) });
  const mineB = post({ likes: 2, publishedAt: ago(50) });
  const theirs = post({ likes: 4, authorId: 'writer-b', authorName: 'Writer B' });
  const theirDraft = post({ status: 'draft', publishedAt: null, likes: 99, authorId: 'writer-b' });
  const myDraft = post({ status: 'draft', publishedAt: null, summary: '' });
  const posts = [mineA, mineB, theirs, theirDraft, myDraft];
  const comments = [comment(mineA.id, 2), comment(theirs.id, 2)];
  const metrics = buildWriterMetrics({ posts, comments, authorId: 'writer-a', now: NOW, period: DEFAULT_PERIOD });

  it('only counts the writer’s own byline', () => {
    expect(metrics.totals).toEqual({ published: 2, drafts: 1 });
    expect(metrics.comments.current).toBe(1);
    expect(metrics.published).toMatchObject({ current: 1, previous: 1 });
  });

  it('compares likes per article with the other writers’ published work', () => {
    expect(metrics.likes).toBe(11);
    expect(metrics.likesPerArticle).toBe(5.5);
    expect(metrics.deskLikesPerArticle).toBe(4);
    expect(metrics.articles.map((a) => a.likes)).toEqual([9, 2]);
  });

  it('has no average to show before anything is published', () => {
    const empty = buildWriterMetrics({ posts: [myDraft], comments: [], authorId: 'writer-a', now: NOW, period: DEFAULT_PERIOD });
    expect(empty.likesPerArticle).toBeNull();
    expect(empty.deskLikesPerArticle).toBeNull();
    expect(empty.readyDrafts).toBe(0);
  });
});

describe('buildReadingMetrics', () => {
  const article = (id: string, days: number): ReadingArticle => ({
    id,
    slug: id,
    title: id,
    category: 'Data & Policy',
    authorName: 'Writer A',
    publishedAt: ago(days),
    readMinutes: 5,
  });

  it('lists what is new in the period, newest first', () => {
    const metrics = buildReadingMetrics({
      articles: [article('old', 100), article('b', 20), article('a', 2), article('prev', 30)],
      now: NOW,
      period: DEFAULT_PERIOD,
    });
    expect(metrics.recent.map((a) => a.id)).toEqual(['a', 'b']);
    expect(metrics.published).toMatchObject({ current: 2, previous: 1 });
    expect(metrics.archiveTotal).toBe(4);
  });
});

describe('copy helpers', () => {
  it('states the comparison in words', () => {
    expect(comparisonText({ current: 3, previous: 1, delta: 2, direction: 'up' }, DEFAULT_PERIOD)).toBe(
      '2 more than the previous 4 weeks',
    );
    expect(comparisonText({ current: 1, previous: 1, delta: 0, direction: 'flat' }, DEFAULT_PERIOD)).toBe(
      'Same as the previous 4 weeks',
    );
  });

  it('writes chart titles as findings', () => {
    expect(publishingInsight({ current: 0, previous: 0, delta: 0, direction: 'flat' }, DEFAULT_PERIOD)).toBe(
      'Nothing has been published in the last 56 days',
    );
    expect(publishingInsight({ current: 1, previous: 3, delta: -2, direction: 'down' }, DEFAULT_PERIOD)).toBe(
      'Publishing is down: 1 article in the last 4 weeks, 3 in the 4 weeks before',
    );
    expect(coverageInsight([{ label: 'A', value: 0 }], DEFAULT_PERIOD)).toBe(
      'No discipline had a new article in the last 4 weeks',
    );
    expect(
      coverageInsight(
        [
          { label: 'A', value: 3 },
          { label: 'B', value: 1 },
          { label: 'C', value: 0 },
        ],
        DEFAULT_PERIOD,
      ),
    ).toBe('A leads with 3 of 4 new articles; 1 discipline had none');
  });

  it('formats reading time without false precision', () => {
    expect(parseReadMinutes('12 min read')).toBe(12);
    expect(parseReadMinutes('soon')).toBe(0);
    expect(formatMinutes(44)).toBe('44 min');
    expect(formatMinutes(95)).toBe('1 h 35 min');
    expect(formatMinutes(120)).toBe('2 h');
  });
});
