import type { Metadata } from 'next';
import { NewArticlesPanel, ReadNextPanel, ReadingListKpi } from '@/components/dashboard/overview/ReadingList';
import {
  Change,
  DashboardFooter,
  DashboardHeader,
  Kpi,
  KpiGrid,
  Panel,
  RankedBars,
  StatusLabel,
} from '@/components/dashboard/overview/primitives';
import { getDashboardUser } from '@/lib/cms/auth';
import { loadApplicationState, loadReadingArticles, type ApplicationState } from '@/lib/dashboard/data';
import {
  buildReadingMetrics,
  comparisonText,
  coverageInsight,
  daysSince,
  parsePeriod,
  plural,
} from '@/lib/dashboard/metrics';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'My Reading — What to Read Next',
    description:
      'Your reading list on ResearchWithMe, what is new in the archive since the previous period, and the state of your writer application.',
    path: '/dashboard/reading',
    type: 'website',
  }),
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

const PATH = '/dashboard/reading';

interface AccessView {
  value: string;
  tone: 'good' | 'caution' | 'neutral';
  status: string;
  detail: string;
  action?: { href: string; label: string };
}

function accessView(state: ApplicationState, now: Date): AccessView {
  switch (state.kind) {
    case 'editor':
    case 'approved':
      return {
        value: 'Writer',
        tone: 'good',
        status: 'Approved',
        detail: 'This account can publish.',
        action: { href: '/dashboard/writing', label: 'Open my writing' },
      };
    case 'pending': {
      const days = daysSince(state.since, now);
      return {
        value: 'Reader',
        tone: 'caution',
        status: 'Application under review',
        detail: days === null ? 'An editor has not decided yet.' : `Submitted ${days === 0 ? 'today' : `${plural(days, 'day')} ago`}.`,
        action: { href: '/dashboard/access', label: 'View your application' },
      };
    }
    case 'rejected':
      return {
        value: 'Reader',
        tone: 'neutral',
        status: 'Application declined',
        detail: state.note ? 'The editor left a note, and you can apply again.' : 'You can apply again.',
        action: { href: '/dashboard/access', label: 'Read the note' },
      };
    case 'none':
      return {
        value: 'Reader',
        tone: 'neutral',
        status: 'No application',
        detail: 'Reading needs nothing more. Publishing needs an approved application.',
        action: { href: '/dashboard/access', label: 'Apply to write' },
      };
    default:
      return {
        value: 'Reader',
        tone: 'neutral',
        status: 'Not available',
        detail: 'Writer applications need Supabase, which is not connected here.',
      };
  }
}

/**
 * Every signed-in account gets this one. A reader makes one decision here —
 * what to read next — so there are three figures, not four, and the reading
 * list leads.
 */
export default async function MyReadingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const period = parsePeriod((await searchParams).period);
  const now = new Date();
  const [user, articles] = await Promise.all([getDashboardUser(), loadReadingArticles()]);
  const access = accessView(await loadApplicationState(user), now);
  const metrics = buildReadingMetrics({ articles, now, period });
  const href = period.key === '4w' ? PATH : `${PATH}?period=${period.key}`;

  return (
    <div>
      <DashboardHeader
        title="My reading"
        question="What should I read next, and what has been published since I last looked?"
        period={period}
        now={now}
        path={PATH}
      />

      <KpiGrid label="Headline figures" columns={3}>
        <ReadingListKpi articles={articles} />
        <Kpi
          label={`New in the archive, last ${period.noun}`}
          value={String(metrics.published.current)}
          comparison={<Change comparison={metrics.published} text={comparisonText(metrics.published, period)} />}
          action={{ href: '#new', label: 'See the new articles' }}
        />
        <Kpi
          label="Account access"
          value={access.value}
          comparison={
            <>
              <StatusLabel tone={access.tone}>{access.status}</StatusLabel>
              <span className="mt-1 block">{access.detail}</span>
            </>
          }
          action={access.action}
        />
      </KpiGrid>

      <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-5">
        <div id="read-next" className="min-w-0 scroll-mt-6 lg:col-span-3">
          <ReadNextPanel articles={articles} />
        </div>
        <Panel
          className="lg:col-span-2"
          title={coverageInsight(metrics.coverage, period)}
          metric={`New articles by discipline, last ${period.noun}`}
        >
          <RankedBars rows={metrics.coverage} unit="articles" />
        </Panel>
      </div>

      <div id="new" className="mt-10 scroll-mt-6">
        <NewArticlesPanel recent={metrics.recent} articles={articles} period={period} />
      </div>

      <DashboardFooter
        source={`the public archive (${plural(metrics.archiveTotal, 'published article')}). Your reading list is stored in this browser only, so it is not shared between devices.`}
        now={now}
        href={href}
      />
    </div>
  );
}
