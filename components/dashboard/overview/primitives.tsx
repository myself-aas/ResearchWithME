/**
 * Building blocks shared by the desk, writing, and reading dashboards.
 *
 * Server components: every figure is in the HTML, nothing here needs
 * JavaScript, and nothing animates — these are measurements to study, not a
 * feed (reme §7: no animation of research measurements).
 *
 * Hierarchy, top to bottom: page title that names the period, the period
 * filter, headline figures (the first one largest), charts whose titles state
 * the finding, tables for investigation, then the data source and timestamp.
 *
 * Colour: brand for the selected period, a neutral rule for the comparison
 * period, and a status dot that is always paired with a word.
 */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus, RotateCw } from 'lucide-react';
import { PERIODS, plural, type Comparison, type Period, type RankedRow, type TrendBucket } from '@/lib/dashboard/metrics';
import { cn } from '@/lib/utils';

export type Tone = 'good' | 'caution' | 'alert' | 'neutral';

const TONE_DOT: Record<Tone, string> = {
  good: 'bg-success',
  caution: 'bg-trust-uncertain',
  alert: 'bg-destructive',
  neutral: 'bg-border-strong',
};

const longDate = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const stamp = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

export function formatLongDate(date: Date): string {
  return longDate.format(date);
}

/** Status as a dot plus a word. The dot is decoration; the word is the status. */
export function StatusLabel({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-ink">
      <span aria-hidden="true" className={cn('h-2 w-2 shrink-0 rounded-full', TONE_DOT[tone])} />
      {children}
    </span>
  );
}

interface DashboardHeaderProps {
  title: string;
  /** The question this dashboard answers, in a sentence. */
  question: string;
  period: Period;
  now: Date;
  /** Route path, used to build the period links. */
  path: string;
}

/**
 * The title names the period it covers, and the one filter sits directly under
 * it. Links rather than a client control: the choice lives in the URL, so a
 * view can be bookmarked or shared, and it works before hydration.
 */
export function DashboardHeader({ title, question, period, now, path }: DashboardHeaderProps) {
  return (
    <header className="border-b border-line pb-5">
      <h1 className="text-balance font-serif text-3xl font-bold tracking-tight text-ink">
        {title}
        <span className="block font-sans text-base font-normal tracking-normal text-ink-secondary sm:mt-1">
          {period.label} to {formatLongDate(now)}
        </span>
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink">{question}</p>

      <nav aria-label="Period" className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-sans text-sm font-medium text-ink-secondary">Period</span>
        <ul className="inline-flex rounded-md border border-border-strong bg-surface-raised p-0.5">
          {PERIODS.map((option) => {
            const active = option.key === period.key;
            return (
              <li key={option.key}>
                <Link
                  href={option.key === PERIODS[0].key ? path : `${path}?period=${option.key}`}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'inline-flex min-h-10 items-center rounded px-3 font-sans text-sm font-medium transition-colors',
                    active ? 'bg-surface-inverse text-text-inverse' : 'text-ink hover:bg-surface',
                  )}
                >
                  {option.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <span className="font-sans text-sm text-ink-secondary">
          Every figure below compares this period with the {period.noun} before it.
        </span>
      </nav>
    </header>
  );
}

export function KpiGrid({
  children,
  label,
  columns = 4,
}: {
  children: ReactNode;
  label: string;
  /** Four for the operational dashboards, three for the reader's. */
  columns?: 3 | 4;
}) {
  return (
    <section aria-label={label} className="mt-6">
      <ul
        className={cn(
          'grid gap-px overflow-hidden rounded-lg border border-line bg-line',
          columns === 3 ? 'md:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4',
        )}
      >
        {children}
      </ul>
    </section>
  );
}

interface KpiProps {
  label: string;
  value: string;
  /** What the value is compared with: a previous period or a target. */
  comparison: ReactNode;
  /** The lead figure of the dashboard: larger, and first in reading order. */
  lead?: boolean;
  action?: { href: string; label: string };
}

export function Kpi({ label, value, comparison, lead = false, action }: KpiProps) {
  return (
    <li className="flex min-w-0 flex-col bg-surface-raised p-5">
      <p className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-secondary">{label}</p>
      <p
        className={cn(
          'mt-2 font-serif font-bold leading-none tracking-tight text-ink tabular-nums',
          lead ? 'text-5xl' : 'text-4xl',
        )}
      >
        {value}
      </p>
      <div className="mt-3 font-sans text-sm leading-snug text-ink-secondary">{comparison}</div>
      {action && (
        <p className="mt-auto pt-4">
          <Link
            href={action.href}
            className="inline-flex min-h-10 items-center gap-1.5 font-sans text-sm font-semibold text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
          >
            {action.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </p>
      )}
    </li>
  );
}

/**
 * A period-over-period change. `upIs` says whether growth is good news
 * (publishing), or simply more work (comments), so green is never used for a
 * change nobody chose.
 */
export function Change({
  comparison,
  text,
  upIs = 'good',
}: {
  comparison: Comparison;
  text: string;
  upIs?: 'good' | 'neutral';
}) {
  const Icon = comparison.direction === 'up' ? ArrowUpRight : comparison.direction === 'down' ? ArrowDownRight : Minus;
  const tone =
    upIs === 'neutral' || comparison.direction === 'flat'
      ? 'text-ink-secondary'
      : comparison.direction === 'up'
        ? 'text-success'
        : 'text-ink';
  return (
    <span className="inline-flex items-start gap-1.5">
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone)} aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}

interface PanelProps {
  /** The finding, as a sentence. */
  title: string;
  /** The metric and its period, for anyone checking the finding. */
  metric: string;
  children: ReactNode;
  className?: string;
  action?: { href: string; label: string };
}

export function Panel({ title, metric, children, className, action }: PanelProps) {
  return (
    <section className={cn('min-w-0', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 className="text-balance font-sans text-lg font-semibold leading-snug text-ink">{title}</h2>
          <p className="mt-1 font-sans text-sm text-ink-secondary">{metric}</p>
        </div>
        {action && (
          <Link
            href={action.href}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 font-sans text-sm font-semibold text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
          >
            {action.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Vertical bars for the selected period and the one before it. Every bar is
 * labelled with its value, so there is no legend to look up and no axis to
 * read off. The bars are decoration for assistive technology: the same
 * figures follow as a table.
 */
export function TrendChart({
  buckets,
  period,
  unit,
}: {
  buckets: TrendBucket[];
  period: Period;
  /** Plural noun for the counted thing, e.g. "articles". */
  unit: string;
}) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  // With many bars, label every other one so the axis stays legible at 320px.
  const labelEvery = buckets.length > 8 ? 2 : 1;

  return (
    <figure className="relative">
      <div aria-hidden="true" className="flex h-44 items-stretch gap-1 border-b border-border-strong sm:gap-2">
        {buckets.map((bucket) => (
          <div key={bucket.startISO} className="flex min-w-0 flex-1 flex-col justify-end">
            <span className="mb-1 text-center font-sans text-xs font-semibold text-ink tabular-nums">
              {bucket.count > 0 ? bucket.count : ''}
            </span>
            <span
              className={cn('block w-full rounded-t-sm', bucket.inPeriod ? 'bg-brand' : 'bg-border-strong')}
              style={{ height: bucket.count === 0 ? '1px' : `${Math.max(6, (bucket.count / max) * 80)}%` }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="mt-1.5 flex gap-1 sm:gap-2">
        {buckets.map((bucket, index) => (
          <span
            key={bucket.startISO}
            className="flex min-w-0 flex-1 justify-center whitespace-nowrap font-sans text-xs text-ink-secondary"
          >
            {(buckets.length - 1 - index) % labelEvery !== 0 ? (
              ''
            ) : (
              // On a phone every second label is dropped so the rest stay whole.
              <span className={cn((buckets.length - 1 - index) % (labelEvery * 2) !== 0 && 'max-sm:hidden')}>
                {bucket.label}
              </span>
            )}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-sans text-sm text-ink-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-brand" />
          Last {period.noun}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-border-strong" />
          {period.noun} before
        </span>
        <span>Each bar is {period.bucketDays} days, labelled with {period.bucketDays < 28 ? 'its first day' : 'the month it starts in'} (UTC).</span>
      </figcaption>
      <table className="sr-only">
        <caption>
          {unit} per {period.bucketDays} days
        </caption>
        <thead>
          <tr>
            <th scope="col">{period.bucketDays} days from</th>
            <th scope="col">{unit}</th>
            <th scope="col">Period</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => (
            <tr key={bucket.startISO}>
              <th scope="row">{bucket.label}</th>
              <td>{bucket.count}</td>
              <td>{bucket.inPeriod ? 'Selected' : 'Previous'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/**
 * A ranked horizontal bar list: the right chart for comparing more than a few
 * categories, and readable as a plain list with the bars removed.
 */
export function RankedBars({
  rows,
  unit,
  contextUnit,
  emptyLabel = 'Nothing to rank yet.',
}: {
  rows: RankedRow[];
  /** Plural noun for the value column, used in the accessible name. */
  unit: string;
  /** Singular noun for the secondary figure, when rows carry one. */
  contextUnit?: string;
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <p className="font-sans text-sm text-ink-secondary">{emptyLabel}</p>;
  }
  const max = Math.max(1, ...rows.map((row) => Math.max(row.value, row.context ?? 0)));

  return (
    <ol className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 font-sans text-sm">
            {row.href ? (
              <Link
                href={row.href}
                className="min-w-0 truncate font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
              >
                {row.label}
              </Link>
            ) : (
              <span className="min-w-0 truncate font-medium text-ink">{row.label}</span>
            )}
            <span className="shrink-0 text-ink tabular-nums">
              <span className="font-semibold">{row.value}</span>
              <span className="sr-only"> {unit}</span>
              {row.context !== undefined && contextUnit && (
                <span className="text-ink-secondary">
                  {' '}
                  · {plural(row.context, contextUnit)}
                </span>
              )}
            </span>
          </div>
          <div aria-hidden="true" className="mt-1.5 h-2 rounded-sm bg-surface-subtle">
            <div
              className={cn('h-2 rounded-sm', row.value > 0 ? 'bg-brand' : 'bg-transparent')}
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  numeric?: boolean;
  /** Keep short values (dates, durations, statuses) on one line. */
  nowrap?: boolean;
  render: (row: T) => ReactNode;
}

/**
 * Detail table. Scrolls inside its own region on narrow screens so the page
 * itself never scrolls sideways; the first column is the row header.
 */
export function DetailTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  empty,
}: {
  caption: string;
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  empty: ReactNode;
}) {
  if (rows.length === 0) {
    return <div className="rounded-md border border-line px-4 py-5 font-sans text-sm leading-relaxed text-ink">{empty}</div>;
  }
  return (
    <div className="relative overflow-x-auto rounded-md border border-line" role="region" aria-label={caption} tabIndex={0}>
      <table className="w-full border-collapse font-sans text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border-strong bg-surface">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'whitespace-nowrap px-4 py-2.5 font-semibold text-ink-secondary',
                  column.numeric ? 'text-right' : 'text-left',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-line last:border-b-0">
              {columns.map((column, index) =>
                index === 0 ? (
                  <th key={column.key} scope="row" className="min-w-48 px-4 py-3 text-left font-medium text-ink">
                    {column.render(row)}
                  </th>
                ) : (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3 text-ink',
                      column.numeric ? 'whitespace-nowrap text-right tabular-nums' : 'text-left',
                      column.nowrap && 'whitespace-nowrap',
                    )}
                  >
                    {column.render(row)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Where the numbers come from and when they were read. There is no automatic
 * refresh: a dashboard someone is studying should not change under them.
 */
export function DashboardFooter({ source, now, href }: { source: string; now: Date; href: string }) {
  return (
    <footer className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-4 font-sans text-sm text-ink-secondary">
      <p className="max-w-2xl leading-relaxed">
        <span className="font-semibold text-ink">Source:</span> {source}
      </p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Data as of <time dateTime={now.toISOString()}>{stamp.format(now)} UTC</time>
        </span>
        <Link
          href={href}
          prefetch={false}
          className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Link>
      </p>
    </footer>
  );
}

export function idleLabel(days: number | null): string {
  if (days === null) return 'Not recorded';
  if (days === 0) return 'Today';
  return days === 1 ? '1 day ago' : `${days} days ago`;
}
