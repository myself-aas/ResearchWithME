import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Change,
  DashboardFooter,
  DashboardHeader,
  DetailTable,
  Kpi,
  KpiGrid,
  Panel,
  RankedBars,
  StatusLabel,
  TrendChart,
  idleLabel,
} from '@/components/dashboard/overview/primitives';
import { primaryButtonClass, secondaryButtonClass } from '@/components/cms/styles';
import { getDashboardUser } from '@/lib/cms/auth';
import { loadStudioData, loadWriterIdentity } from '@/lib/dashboard/data';
import {
  STALLED_DRAFT_DAYS,
  buildWriterMetrics,
  comparisonText,
  describeGaps,
  parsePeriod,
  plural,
  publishingInsight,
  type ArticleRow,
  type DraftRow,
} from '@/lib/dashboard/metrics';
import { formatDate } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Editorial Studio — My Writing',
    description:
      'Your own articles on ResearchWithMe: what to finish next, how your publishing compares with the previous period, and how readers responded.',
    path: '/dashboard/writing',
    type: 'website',
  }),
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

const PATH = '/dashboard/writing';

/**
 * One writer's view of their own byline. The question is "what should I finish
 * next, and is anyone reading it" — so drafts lead, and the reader-response
 * figures are compared with something the writer can act on.
 */
export default async function MyWritingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const period = parsePeriod((await searchParams).period);
  const now = new Date();
  const [user, studio] = await Promise.all([getDashboardUser(), loadStudioData()]);
  const identity = await loadWriterIdentity(user, studio.posts);
  const href = period.key === '4w' ? PATH : `${PATH}?period=${period.key}`;

  const header = (
    <DashboardHeader
      title="My writing"
      question="What should I finish next, and how did readers respond to what I published?"
      period={period}
      now={now}
      path={PATH}
    />
  );

  if (!identity) {
    return (
      <div>
        {header}
        <div className="mt-8 max-w-2xl">
          <h2 className="font-sans text-lg font-semibold text-ink">No byline to report on yet</h2>
          <p className="mt-2 text-base leading-relaxed text-ink">
            This dashboard follows the articles published under your author profile, and this account does not have
            one yet. A profile is created when a writer application is approved; once an article carries your byline
            it appears here.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/dashboard" className={primaryButtonClass}>
              Start an article
            </Link>
            <Link href="/dashboard/access" className={secondaryButtonClass}>
              Check your profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const metrics = buildWriterMetrics({ ...studio, authorId: identity.authorId, now, period });
  const active = metrics.totals.drafts - metrics.stalledDrafts;
  const mine = metrics.likesPerArticle;
  const desk = metrics.deskLikesPerArticle;
  const topArticles = metrics.articles.slice(0, 5);

  return (
    <div>
      {header}

      {identity.inferred && (
        <p className="mt-5 border-l-2 border-trust-uncertain bg-surface px-4 py-3 text-sm leading-relaxed text-ink">
          Demo mode has no accounts, so this shows the byline with the most articles:{' '}
          <span className="font-semibold">{identity.displayName}</span>.
        </p>
      )}
      {!identity.published && (
        <p role="status" className="mt-5 border-l-2 border-trust-uncertain bg-surface px-4 py-3 text-sm leading-relaxed text-ink">
          <span className="font-semibold">Your author profile is not published.</span> Drafts can be saved, but an
          article cannot be published under an unpublished profile.{' '}
          <Link href="/dashboard/access" className="font-semibold underline underline-offset-4">
            Open your profile
          </Link>
          .
        </p>
      )}
      {!studio.ok && (
        <p role="alert" className="mt-5 border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
          The archive could not be read, so the figures below are empty rather than zero. Refresh to try again.
        </p>
      )}

      <KpiGrid label="Headline figures">
        <Kpi
          lead
          label="Drafts in progress"
          value={String(metrics.totals.drafts)}
          comparison={
            metrics.totals.drafts === 0 ? (
              <StatusLabel tone="neutral">Nothing waiting on you</StatusLabel>
            ) : (
              <>
                <StatusLabel tone={metrics.stalledDrafts > 0 ? 'caution' : 'good'}>
                  {metrics.stalledDrafts > 0
                    ? `${metrics.stalledDrafts} idle ${STALLED_DRAFT_DAYS}+ days`
                    : `All edited within ${STALLED_DRAFT_DAYS} days`}
                </StatusLabel>
                <span className="mt-1 block">
                  {metrics.readyDrafts > 0
                    ? `${plural(metrics.readyDrafts, 'draft')} ready to publish.`
                    : `${active} active, none ready to publish yet.`}
                </span>
              </>
            )
          }
          action={{ href: '#drafts', label: 'See what is missing' }}
        />
        <Kpi
          label={`Published, last ${period.noun}`}
          value={String(metrics.published.current)}
          comparison={<Change comparison={metrics.published} text={comparisonText(metrics.published, period)} />}
          action={{ href: '/dashboard', label: 'New article' }}
        />
        <Kpi
          label="Likes per article"
          value={mine === null ? '—' : String(mine)}
          comparison={
            mine === null ? (
              'Counted once you have a published article.'
            ) : desk === null ? (
              `${plural(metrics.likes, 'like')} across ${plural(metrics.totals.published, 'article')}. No other writer to compare with yet.`
            ) : (
              <>
                <StatusLabel tone={mine >= desk ? 'good' : 'neutral'}>
                  {mine > desk ? 'Above' : mine === desk ? 'Level with' : 'Below'} the desk average of {desk}
                </StatusLabel>
                <span className="mt-1 block">
                  {plural(metrics.likes, 'like')} across {plural(metrics.totals.published, 'article')}, all time.
                </span>
              </>
            )
          }
        />
        <Kpi
          label={`Comments on my articles, last ${period.noun}`}
          value={String(metrics.comments.current)}
          comparison={
            <Change comparison={metrics.comments} text={comparisonText(metrics.comments, period)} upIs="neutral" />
          }
          action={{ href: '/dashboard/comments', label: 'Read comments' }}
        />
      </KpiGrid>

      <div id="drafts" className="mt-10 scroll-mt-6">
        <Panel
          title={
            metrics.totals.drafts === 0
              ? 'You have no drafts in progress'
              : metrics.readyDrafts > 0
                ? `${plural(metrics.readyDrafts, 'draft')} of ${metrics.totals.drafts} ${metrics.readyDrafts === 1 ? 'is' : 'are'} ready to publish`
                : `None of your ${plural(metrics.totals.drafts, 'draft')} is ready to publish yet`
          }
          metric="Your drafts by days since the last edit, longest first"
          action={{ href: '/dashboard/manage', label: 'All articles' }}
        >
          <DetailTable<DraftRow>
            caption="Your drafts"
            rows={metrics.drafts}
            rowKey={(row) => row.id}
            empty={
              <>
                Nothing is waiting on you. <Link href="/dashboard" className="font-semibold underline underline-offset-4">Start an article</Link>.
              </>
            }
            columns={[
              {
                key: 'title',
                header: 'Draft',
                render: (row) => (
                  <Link href={`/dashboard/edit/${row.id}`} className="underline decoration-border-strong underline-offset-4 hover:decoration-ink">
                    {row.title}
                  </Link>
                ),
              },
              {
                key: 'idle', nowrap: true,
                header: 'Last edited',
                render: (row) =>
                  row.stalled ? <StatusLabel tone="caution">{idleLabel(row.idleDays)}</StatusLabel> : idleLabel(row.idleDays),
              },
              {
                key: 'gaps',
                header: 'Still missing',
                render: (row) =>
                  row.gaps.length === 0 ? <StatusLabel tone="good">Ready to publish</StatusLabel> : describeGaps(row.gaps),
              },
            ]}
          />
        </Panel>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-5">
        <Panel
          className="lg:col-span-3"
          title={publishingInsight(metrics.published, period, 'Your publishing')}
          metric={`Your articles published per ${period.bucketDays} days`}
        >
          <TrendChart buckets={metrics.trend} period={period} unit="Articles published" />
        </Panel>

        <Panel
          className="lg:col-span-2"
          title={
            topArticles.length === 0
              ? 'No published article to rank yet'
              : topArticles[0].likes === 0
                ? 'None of your articles has a like yet'
                : `“${topArticles[0].title}” is your most liked article`
          }
          metric={
            metrics.articles.length > topArticles.length
              ? `Likes per article, all time — top ${topArticles.length} of ${metrics.articles.length}`
              : 'Likes per article, all time'
          }
        >
          <RankedBars
            rows={topArticles.map((article) => ({
              label: article.title,
              value: article.likes,
              context: article.comments,
              href: `/post/${article.slug}`,
            }))}
            unit="likes"
            contextUnit="comment"
            emptyLabel="Published articles are ranked here by reader likes."
          />
        </Panel>
      </div>

      <div className="mt-10">
        <Panel
          title={
            metrics.totals.published === 0
              ? 'Nothing published under your byline yet'
              : `${plural(metrics.totals.published, 'article')} published under your byline`
          }
          metric="Your published articles, most liked first, all time"
        >
          <DetailTable<ArticleRow>
            caption="Your published articles"
            rows={metrics.articles.slice(0, 10)}
            rowKey={(row) => row.id}
            empty="Your published articles are listed here with their likes and comments."
            columns={[
              {
                key: 'title',
                header: 'Article',
                render: (row) => (
                  <Link href={`/post/${row.slug}`} className="underline decoration-border-strong underline-offset-4 hover:decoration-ink">
                    {row.title}
                  </Link>
                ),
              },
              { key: 'published', nowrap: true, header: 'Published', render: (row) => formatDate(row.publishedAt ?? undefined, { month: 'short' }) || 'Not recorded' },
              { key: 'likes', header: 'Likes', numeric: true, render: (row) => row.likes },
              { key: 'comments', header: 'Comments', numeric: true, render: (row) => row.comments },
              {
                key: 'edit', nowrap: true,
                header: 'Edit',
                render: (row) => (
                  <Link href={`/dashboard/edit/${row.id}`} className="font-semibold underline underline-offset-4">
                    Edit<span className="sr-only"> {row.title}</span>
                  </Link>
                ),
              },
            ]}
          />
        </Panel>
      </div>

      <DashboardFooter
        source={`the studio archive, filtered to the byline ${identity.displayName}. Likes are a running total with no history, so they are compared with the desk average rather than with a previous period.`}
        now={now}
        href={href}
      />
    </div>
  );
}
