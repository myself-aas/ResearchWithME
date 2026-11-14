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
import { loadApplications, loadStudioData } from '@/lib/dashboard/data';
import {
  APPLICATION_TARGET_DAYS,
  STALLED_DRAFT_DAYS,
  buildDeskMetrics,
  comparisonText,
  coverageInsight,
  describeGaps,
  parsePeriod,
  plural,
  publishingInsight,
  type DraftRow,
  type PendingApplicationRow,
  type WriterRow,
} from '@/lib/dashboard/metrics';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Editorial Studio — Desk Overview',
    description:
      'What needs an editor today: writer applications waiting for a decision, stalled drafts, new comments, and how publishing compares with the previous period.',
    path: '/dashboard/desk',
    type: 'website',
  }),
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

const PATH = '/dashboard/desk';

/**
 * The editor's view of the whole desk. It answers one question — what needs a
 * decision today — so the lead figure is the queue an editor alone can clear,
 * and every figure links to the page where the action is taken.
 */
export default async function DeskOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const period = parsePeriod((await searchParams).period);
  const now = new Date();
  const [studio, applications] = await Promise.all([loadStudioData(), loadApplications()]);
  const metrics = buildDeskMetrics({ ...studio, applications, now, period });
  const href = period.key === '4w' ? PATH : `${PATH}?period=${period.key}`;

  const pending = metrics.pendingApplications;
  const overdue = pending?.filter((row) => row.overdue).length ?? 0;
  const drafts = metrics.drafts.slice(0, 8);

  return (
    <div>
      <DashboardHeader
        title="Desk overview"
        question="What needs an editor today, and is the desk publishing more or less than it was?"
        period={period}
        now={now}
        path={PATH}
      />

      {!studio.ok && (
        <p role="alert" className="mt-5 border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
          The archive could not be read, so the figures below are empty rather than zero. Refresh to try again.
        </p>
      )}

      <KpiGrid label="Headline figures">
        <Kpi
          lead
          label="Applications awaiting a decision"
          value={pending ? String(pending.length) : '—'}
          comparison={
            pending === null ? (
              <StatusLabel tone="neutral">The queue needs Supabase</StatusLabel>
            ) : pending.length === 0 ? (
              <StatusLabel tone="good">Queue is clear</StatusLabel>
            ) : (
              <>
                <StatusLabel tone={overdue > 0 ? 'alert' : 'good'}>
                  {overdue > 0 ? `${overdue} past the ${APPLICATION_TARGET_DAYS}-day target` : 'Within target'}
                </StatusLabel>
                <span className="mt-1 block">
                  Oldest has waited {plural(metrics.oldestApplicationDays ?? 0, 'day')}; target is {APPLICATION_TARGET_DAYS}.
                </span>
              </>
            )
          }
          action={pending ? { href: '/dashboard/applications', label: 'Review applications' } : undefined}
        />
        <Kpi
          label={`Published, last ${period.noun}`}
          value={String(metrics.published.current)}
          comparison={<Change comparison={metrics.published} text={comparisonText(metrics.published, period)} />}
          action={{ href: '/dashboard/manage', label: 'Open articles' }}
        />
        <Kpi
          label={`Drafts idle ${STALLED_DRAFT_DAYS}+ days`}
          value={String(metrics.stalledDrafts)}
          comparison={
            <>
              <StatusLabel tone={metrics.stalledDrafts > 0 ? 'caution' : 'good'}>
                {metrics.stalledDrafts > 0 ? 'Above the target of 0' : 'On target'}
              </StatusLabel>
              <span className="mt-1 block">Of {plural(metrics.totals.drafts, 'draft')} in progress.</span>
            </>
          }
          action={{ href: '#drafts', label: 'See the drafts' }}
        />
        <Kpi
          label={`Comments, last ${period.noun}`}
          value={String(metrics.comments.current)}
          comparison={
            <Change comparison={metrics.comments} text={comparisonText(metrics.comments, period)} upIs="neutral" />
          }
          action={{ href: '/dashboard/comments', label: 'Moderate comments' }}
        />
      </KpiGrid>

      <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-5">
        <Panel
          className="lg:col-span-3"
          title={publishingInsight(metrics.published, period)}
          metric={`Articles published per ${period.bucketDays} days`}
        >
          <TrendChart buckets={metrics.trend} period={period} unit="Articles published" />
        </Panel>

        <Panel
          className="lg:col-span-2"
          title={coverageInsight(metrics.coverage, period)}
          metric={`Articles published by discipline, last ${period.noun}`}
        >
          <RankedBars rows={metrics.coverage} unit="articles" />
        </Panel>
      </div>

      <div id="drafts" className="mt-10 scroll-mt-6">
        <Panel
          title={
            metrics.totals.drafts === 0
              ? 'No drafts are in progress'
              : metrics.stalledDrafts > 0
                ? `${plural(metrics.stalledDrafts, 'draft')} of ${metrics.totals.drafts} ${metrics.stalledDrafts === 1 ? 'has' : 'have'} not been touched in ${STALLED_DRAFT_DAYS} days`
                : `All ${plural(metrics.totals.drafts, 'draft')} were edited in the last ${STALLED_DRAFT_DAYS} days`
          }
          metric={
            metrics.drafts.length > drafts.length
              ? `Drafts by days since the last edit, longest first — ${drafts.length} of ${metrics.drafts.length} shown`
              : 'Drafts by days since the last edit, longest first'
          }
          action={{ href: '/dashboard/manage', label: 'All articles' }}
        >
          <DetailTable<DraftRow>
            caption="Drafts in progress"
            rows={drafts}
            rowKey={(row) => row.id}
            empty={
              <>
                Nothing is waiting. <Link href="/dashboard" className="font-semibold underline underline-offset-4">Start an article</Link>.
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
              { key: 'writer', nowrap: true, header: 'Writer', render: (row) => row.authorName },
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

      <div className="mt-10 grid grid-cols-1 gap-y-10">
        <Panel
          title={
            metrics.writers.length === 0
              ? 'No writer has an article yet'
              : `${plural(metrics.writers.filter((row) => row.publishedInPeriod > 0).length, 'writer')} of ${metrics.writers.length} published in the last ${period.noun}`
          }
          metric={`Articles by writer, last ${period.noun}`}
        >
          <DetailTable<WriterRow>
            caption="Writers"
            rows={metrics.writers.slice(0, 8)}
            rowKey={(row) => row.authorId || row.authorName}
            empty="Writers appear here once an article carries their byline."
            columns={[
              { key: 'name', header: 'Writer', render: (row) => row.authorName },
              { key: 'period', header: 'Published', numeric: true, render: (row) => row.publishedInPeriod },
              { key: 'total', header: 'All time', numeric: true, render: (row) => row.publishedTotal },
              { key: 'drafts', header: 'Drafts', numeric: true, render: (row) => row.drafts },
              { key: 'idle', nowrap: true, header: 'Last active', render: (row) => idleLabel(row.idleDays) },
            ]}
          />
        </Panel>

        <Panel
          title={
            pending === null
              ? 'The application queue is not available here'
              : pending.length === 0
                ? 'No application is waiting for a decision'
                : `${plural(pending.length, 'application')} waiting, ${overdue} past the ${APPLICATION_TARGET_DAYS}-day target`
          }
          metric="Pending writer applications, longest wait first"
          action={pending ? { href: '/dashboard/applications', label: 'Review' } : undefined}
        >
          <DetailTable<PendingApplicationRow>
            caption="Pending writer applications"
            rows={(pending ?? []).slice(0, 8)}
            rowKey={(row) => String(row.id)}
            empty={
              pending === null
                ? 'Applications are stored in Postgres. Connect Supabase to see the queue.'
                : 'Every application has a decision.'
            }
            columns={[
              { key: 'name', header: 'Applicant', render: (row) => row.displayName },
              { key: 'identity', header: 'Identity', render: (row) => `${row.provider === 'orcid' ? 'ORCID' : 'GitHub'} · ${row.handle}` },
              {
                key: 'wait', nowrap: true,
                header: 'Waiting',
                render: (row) => (
                  <StatusLabel tone={row.overdue ? 'alert' : 'good'}>
                    {row.waitingDays === null ? 'Not recorded' : plural(row.waitingDays, 'day')}
                    {row.overdue ? ' — overdue' : ''}
                  </StatusLabel>
                ),
              },
            ]}
          />
        </Panel>
      </div>

      <DashboardFooter
        source="the studio archive (posts, comments) and the writer application queue, read with your editor session."
        now={now}
        href={href}
      />
    </div>
  );
}
