/**
 * Pure metric maths for the three overview dashboards (desk, writing, reading).
 *
 * No I/O, no Next, no `Date.now()`: every function takes `now` so the pages
 * pass one timestamp and every panel on a dashboard agrees on the period. The
 * same instant is printed in the dashboard footer as "data as of".
 *
 * Rules the dashboards rely on:
 *  - Every headline number is compared with the period immediately before it,
 *    or with a stated target. A number on its own is not shown.
 *  - One period filter drives every panel. The trend chart spans the selected
 *    period and the one before it, so it shows the same comparison the
 *    headline numbers make.
 *  - Targets are constants here, not copy in a component.
 */

import type { AuthorApplication } from '@/lib/applications';
import { CATEGORIES, type BlogCategory } from '@/lib/blog-data';
import type { CmsComment, CmsPost } from '@/lib/cms/types';

const DAY_MS = 86_400_000;

/** A draft nobody has edited for this long is reported as stalled. */
export const STALLED_DRAFT_DAYS = 14;
/** A writer application should have a decision within this many days. */
export const APPLICATION_TARGET_DAYS = 7;

export const PERIODS = [
  { key: '4w', days: 28, bucketDays: 7, label: '4 weeks', noun: '4 weeks' },
  { key: '12w', days: 84, bucketDays: 14, label: '12 weeks', noun: '12 weeks' },
  { key: '52w', days: 364, bucketDays: 56, label: '52 weeks', noun: '52 weeks' },
] as const;

export type Period = (typeof PERIODS)[number];
export type PeriodKey = Period['key'];

export const DEFAULT_PERIOD: Period = PERIODS[0];

/** Unknown or missing values fall back to the most common view. */
export function parsePeriod(value: string | string[] | undefined | null): Period {
  const key = Array.isArray(value) ? value[0] : value;
  return PERIODS.find((period) => period.key === key) ?? DEFAULT_PERIOD;
}

export interface PeriodWindow {
  /** Inclusive start of the selected period. */
  start: number;
  /** Inclusive start of the period immediately before it. */
  previousStart: number;
  /** Exclusive end: the instant the dashboard was computed. */
  end: number;
}

export function periodWindow(now: Date, period: Period): PeriodWindow {
  const end = now.getTime();
  return { start: end - period.days * DAY_MS, previousStart: end - 2 * period.days * DAY_MS, end };
}

function timeOf(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/** Whole days between an ISO timestamp and `now`; null when it cannot be read. */
export function daysSince(value: string | null | undefined, now: Date): number | null {
  const time = timeOf(value);
  if (time === null) return null;
  return Math.max(0, Math.floor((now.getTime() - time) / DAY_MS));
}

export interface Comparison {
  current: number;
  previous: number;
  delta: number;
  direction: 'up' | 'down' | 'flat';
}

export function compare(current: number, previous: number): Comparison {
  const delta = current - previous;
  return { current, previous, delta, direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat' };
}

/** Counts timestamps in the selected period and in the one before it. */
export function comparePeriods(
  values: Array<string | null | undefined>,
  window: PeriodWindow,
): Comparison {
  let current = 0;
  let previous = 0;
  for (const value of values) {
    const time = timeOf(value);
    if (time === null || time >= window.end) continue;
    if (time >= window.start) current += 1;
    else if (time >= window.previousStart) previous += 1;
  }
  return compare(current, previous);
}

export interface TrendBucket {
  /** ISO date (UTC) of the first day in the bucket. */
  startISO: string;
  /** Short axis label: "Oct 17", or "Oct ’26" when a bucket is longer than a month. */
  label: string;
  count: number;
  /** False for buckets that belong to the comparison period. */
  inPeriod: boolean;
}

const dayLabel = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

function bucketLabel(start: Date, bucketDays: number): string {
  if (bucketDays < 28) return dayLabel.format(start);
  // Long periods span two calendar years, so the year disambiguates the month.
  return `${monthLabel.format(start)} ’${String(start.getUTCFullYear()).slice(-2)}`;
}

/**
 * Splits the selected period and the one before it into equal buckets, oldest
 * first. Buckets are anchored on `now`, so the last bar always ends today and
 * the bars of the selected period sum to the headline number.
 */
export function trendSeries(
  values: Array<string | null | undefined>,
  now: Date,
  period: Period,
): TrendBucket[] {
  const window = periodWindow(now, period);
  const size = period.bucketDays * DAY_MS;
  const total = Math.round((2 * period.days) / period.bucketDays);
  const buckets: TrendBucket[] = Array.from({ length: total }, (_, index) => {
    const start = window.previousStart + index * size;
    return {
      startISO: new Date(start).toISOString().slice(0, 10),
      label: bucketLabel(new Date(start), period.bucketDays),
      count: 0,
      inPeriod: start >= window.start,
    };
  });

  for (const value of values) {
    const time = timeOf(value);
    if (time === null || time < window.previousStart || time >= window.end) continue;
    const index = Math.min(total - 1, Math.floor((time - window.previousStart) / size));
    buckets[index].count += 1;
  }
  return buckets;
}

export interface RankedRow {
  label: string;
  value: number;
  /** Optional secondary figure shown as grey context. */
  context?: number;
  href?: string;
}

/** Every discipline, ranked, including the ones with nothing: a gap is the finding. */
export function categoryCoverage(
  posts: Array<{ category: string; publishedAt: string | null | undefined }>,
  window: PeriodWindow,
): RankedRow[] {
  const counts = new Map<string, number>(CATEGORIES.map((category) => [category, 0]));
  for (const post of posts) {
    const time = timeOf(post.publishedAt);
    if (time === null || time < window.start || time >= window.end) continue;
    counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

export type ReadinessGap = 'body' | 'summary' | 'takeaways' | 'cover' | 'artifact';

const READINESS_LABEL: Record<ReadinessGap, string> = {
  body: 'body under 200 characters',
  summary: 'summary',
  takeaways: 'key takeaway',
  cover: 'cover image',
  artifact: 'reviewed work',
};

/**
 * What stands between a draft and publication. `body` and `takeaways` are the
 * server's own publishing rules (lib/cms/schema.ts); the rest are what the
 * public article page shows and a reader would miss.
 */
export function draftGaps(post: CmsPost): ReadinessGap[] {
  const gaps: ReadinessGap[] = [];
  if (post.content.trim().length < 200) gaps.push('body');
  if (!post.summary.trim()) gaps.push('summary');
  if (post.keyTakeaways.filter((item) => item.trim()).length === 0) gaps.push('takeaways');
  if (!post.coverImage) gaps.push('cover');
  if (!post.artifact) gaps.push('artifact');
  return gaps;
}

export function describeGaps(gaps: ReadinessGap[]): string {
  return gaps.map((gap) => READINESS_LABEL[gap]).join(', ');
}

export interface DraftRow {
  id: string;
  title: string;
  authorName: string;
  /** Days since the last edit; null when the timestamp is unreadable. */
  idleDays: number | null;
  stalled: boolean;
  gaps: ReadinessGap[];
}

function draftRows(posts: CmsPost[], now: Date): DraftRow[] {
  return posts
    .filter((post) => post.status === 'draft')
    .map((post) => {
      const idleDays = daysSince(post.updatedAt, now);
      return {
        id: post.id,
        title: post.title,
        authorName: post.authorName,
        idleDays,
        stalled: idleDays !== null && idleDays >= STALLED_DRAFT_DAYS,
        gaps: draftGaps(post),
      };
    })
    .sort((a, b) => (b.idleDays ?? -1) - (a.idleDays ?? -1));
}

export interface WriterRow {
  authorId: string;
  authorName: string;
  publishedInPeriod: number;
  publishedTotal: number;
  drafts: number;
  /** Days since this writer last saved anything. */
  idleDays: number | null;
}

function writerRows(posts: CmsPost[], window: PeriodWindow, now: Date): WriterRow[] {
  const rows = new Map<string, WriterRow & { latest: number }>();
  for (const post of posts) {
    const key = post.authorId ?? post.authorName;
    const row =
      rows.get(key) ??
      ({
        authorId: post.authorId ?? '',
        authorName: post.authorName,
        publishedInPeriod: 0,
        publishedTotal: 0,
        drafts: 0,
        idleDays: null,
        latest: 0,
      } satisfies WriterRow & { latest: number });

    if (post.status === 'published') {
      row.publishedTotal += 1;
      const time = timeOf(post.publishedAt);
      if (time !== null && time >= window.start && time < window.end) row.publishedInPeriod += 1;
    } else {
      row.drafts += 1;
    }
    row.latest = Math.max(row.latest, timeOf(post.updatedAt) ?? 0);
    rows.set(key, row);
  }

  return [...rows.values()]
    .map(({ latest, ...row }) => ({
      ...row,
      idleDays: latest ? daysSince(new Date(latest).toISOString(), now) : null,
    }))
    .sort(
      (a, b) =>
        b.publishedInPeriod - a.publishedInPeriod ||
        b.publishedTotal - a.publishedTotal ||
        a.authorName.localeCompare(b.authorName),
    );
}

export interface PendingApplicationRow {
  id: number;
  displayName: string;
  provider: string;
  handle: string;
  waitingDays: number | null;
  overdue: boolean;
}

export interface DeskMetrics {
  published: Comparison;
  comments: Comparison;
  trend: TrendBucket[];
  coverage: RankedRow[];
  drafts: DraftRow[];
  stalledDrafts: number;
  writers: WriterRow[];
  /** Null when the queue could not be read (demo mode, or a failed query). */
  pendingApplications: PendingApplicationRow[] | null;
  oldestApplicationDays: number | null;
  totals: { published: number; drafts: number; comments: number };
}

export function buildDeskMetrics(input: {
  posts: CmsPost[];
  comments: CmsComment[];
  applications: AuthorApplication[] | null;
  now: Date;
  period: Period;
}): DeskMetrics {
  const { posts, comments, applications, now, period } = input;
  const window = periodWindow(now, period);
  const published = posts.filter((post) => post.status === 'published');
  const publishedDates = published.map((post) => post.publishedAt);
  const drafts = draftRows(posts, now);

  const pendingApplications =
    applications === null
      ? null
      : applications
          .filter((application) => application.status === 'pending')
          .map((application) => {
            // A re-application resets updated_at, which is when the wait began.
            const waitingDays = daysSince(application.updated_at || application.created_at, now);
            return {
              id: application.id,
              displayName: application.display_name,
              provider: application.provider,
              handle: application.handle,
              waitingDays,
              overdue: waitingDays !== null && waitingDays > APPLICATION_TARGET_DAYS,
            };
          })
          .sort((a, b) => (b.waitingDays ?? -1) - (a.waitingDays ?? -1));

  return {
    published: comparePeriods(publishedDates, window),
    comments: comparePeriods(
      comments.map((comment) => comment.insertedAt),
      window,
    ),
    trend: trendSeries(publishedDates, now, period),
    coverage: categoryCoverage(published, window),
    drafts,
    stalledDrafts: drafts.filter((draft) => draft.stalled).length,
    writers: writerRows(posts, window, now),
    pendingApplications,
    oldestApplicationDays: pendingApplications?.[0]?.waitingDays ?? null,
    totals: { published: published.length, drafts: drafts.length, comments: comments.length },
  };
}

export interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  likes: number;
  comments: number;
  publishedAt: string | null;
}

export interface WriterMetrics {
  published: Comparison;
  comments: Comparison;
  trend: TrendBucket[];
  drafts: DraftRow[];
  stalledDrafts: number;
  /** Drafts with nothing left to add. */
  readyDrafts: number;
  /** Published articles, most liked first. */
  articles: ArticleRow[];
  likes: number;
  /** Mean likes per published article, to one decimal. */
  likesPerArticle: number | null;
  /** The same mean across every other writer's published articles. */
  deskLikesPerArticle: number | null;
  totals: { published: number; drafts: number };
}

function mean(total: number, count: number): number | null {
  return count > 0 ? Math.round((total / count) * 10) / 10 : null;
}

export function buildWriterMetrics(input: {
  /** Every post on the desk; the writer's own are selected by `authorId`. */
  posts: CmsPost[];
  comments: CmsComment[];
  authorId: string;
  now: Date;
  period: Period;
}): WriterMetrics {
  const { posts, comments, authorId, now, period } = input;
  const window = periodWindow(now, period);
  const mine = posts.filter((post) => post.authorId === authorId);
  const myIds = new Set(mine.map((post) => post.id));
  const published = mine.filter((post) => post.status === 'published');
  const others = posts.filter((post) => post.status === 'published' && post.authorId !== authorId);
  const myComments = comments.filter((comment) => myIds.has(comment.postId));
  const commentCounts = new Map<string, number>();
  for (const comment of myComments) {
    commentCounts.set(comment.postId, (commentCounts.get(comment.postId) ?? 0) + 1);
  }

  const drafts = draftRows(mine, now);
  const likes = published.reduce((total, post) => total + post.likes, 0);

  return {
    published: comparePeriods(
      published.map((post) => post.publishedAt),
      window,
    ),
    comments: comparePeriods(
      myComments.map((comment) => comment.insertedAt),
      window,
    ),
    trend: trendSeries(
      published.map((post) => post.publishedAt),
      now,
      period,
    ),
    drafts,
    stalledDrafts: drafts.filter((draft) => draft.stalled).length,
    readyDrafts: drafts.filter((draft) => draft.gaps.length === 0).length,
    articles: published
      .map((post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        likes: post.likes,
        comments: commentCounts.get(post.id) ?? 0,
        publishedAt: post.publishedAt,
      }))
      .sort((a, b) => b.likes - a.likes || b.comments - a.comments || a.title.localeCompare(b.title)),
    likes,
    likesPerArticle: mean(likes, published.length),
    deskLikesPerArticle: mean(
      others.reduce((total, post) => total + post.likes, 0),
      others.length,
    ),
    totals: { published: published.length, drafts: drafts.length },
  };
}

/** The slice of a public article the reading dashboard needs. */
export interface ReadingArticle {
  id: string;
  slug: string;
  title: string;
  category: BlogCategory;
  authorName: string;
  /** ISO publication date. */
  publishedAt: string | null;
  readMinutes: number;
}

export interface ReadingMetrics {
  published: Comparison;
  coverage: RankedRow[];
  /** Articles published in the selected period, newest first. */
  recent: ReadingArticle[];
  archiveTotal: number;
}

export function buildReadingMetrics(input: {
  articles: ReadingArticle[];
  now: Date;
  period: Period;
}): ReadingMetrics {
  const { articles, now, period } = input;
  const window = periodWindow(now, period);
  const recent = articles
    .filter((article) => {
      const time = timeOf(article.publishedAt);
      return time !== null && time >= window.start && time < window.end;
    })
    .sort((a, b) => (timeOf(b.publishedAt) ?? 0) - (timeOf(a.publishedAt) ?? 0));

  return {
    published: comparePeriods(
      articles.map((article) => article.publishedAt),
      window,
    ),
    coverage: categoryCoverage(articles, window),
    recent,
    archiveTotal: articles.length,
  };
}

/** "12 min read" -> 12. Unreadable values count as zero rather than guessing. */
export function parseReadMinutes(readTime: string | undefined): number {
  const minutes = Number.parseInt(readTime ?? '', 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
}

/** 95 -> "1 h 35 min". Reading time is an estimate, so no finer than a minute. */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** "2 more than the previous 4 weeks" — the comparison every headline number carries. */
export function comparisonText(comparison: Comparison, period: Period): string {
  const span = `the previous ${period.noun}`;
  if (comparison.direction === 'flat') return `Same as ${span}`;
  const amount = Math.abs(comparison.delta);
  return `${amount} ${comparison.direction === 'up' ? 'more' : 'fewer'} than ${span}`;
}

/** Chart titles state the finding, not the name of the metric. */
export function publishingInsight(comparison: Comparison, period: Period, subject = 'Publishing'): string {
  const { current, previous } = comparison;
  if (current === 0 && previous === 0) return `Nothing has been published in the last ${2 * period.days} days`;
  if (current === 0) return `${subject} stopped: nothing in the last ${period.noun}, ${previous} in the ${period.noun} before`;
  if (comparison.direction === 'flat') return `${subject} held steady at ${plural(current, 'article')} per ${period.noun}`;
  const verb = comparison.direction === 'up' ? 'is up' : 'is down';
  return `${subject} ${verb}: ${plural(current, 'article')} in the last ${period.noun}, ${previous} in the ${period.noun} before`;
}

export function coverageInsight(rows: RankedRow[], period: Period): string {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (total === 0) return `No discipline had a new article in the last ${period.noun}`;
  const leader = rows[0];
  const empty = rows.filter((row) => row.value === 0).length;
  const tied = rows.filter((row) => row.value === leader.value).length > 1;
  const lead = tied
    ? `New articles are spread evenly across ${plural(rows.length - empty, 'discipline')}`
    : `${leader.label} leads with ${leader.value} of ${plural(total, 'new article')}`;
  if (empty === 0) return lead;
  return `${lead}; ${plural(empty, 'discipline')} had none`;
}
