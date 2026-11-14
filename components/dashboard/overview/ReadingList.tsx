'use client';

/**
 * The parts of the reading dashboard that depend on the reader's saved list.
 *
 * Saved articles live in this browser (lib/stores/preferences-store.ts), not
 * in the database, so they cannot be rendered on the server. Until the store
 * has hydrated the figures read "—" with a line saying why; they never flash a
 * zero that is not true.
 */
import { useMemo } from 'react';
import Link from 'next/link';
import { formatMinutes, plural, type Period, type ReadingArticle } from '@/lib/dashboard/metrics';
import { formatDate } from '@/lib/format';
import { useHydratePreferences, usePreferencesStore } from '@/lib/stores/preferences-store';
import { DetailTable, Kpi, Panel, StatusLabel } from './primitives';

function useSavedArticles(articles: ReadingArticle[]) {
  const hydrated = useHydratePreferences();
  const savedPostIds = usePreferencesStore((state) => state.savedPostIds);

  return useMemo(() => {
    const ids = new Set(hydrated ? savedPostIds : []);
    const saved = articles.filter((article) => ids.has(article.id) || ids.has(article.slug));
    return {
      hydrated,
      saved,
      savedKeys: new Set(saved.map((article) => article.id)),
      minutes: saved.reduce((total, article) => total + article.readMinutes, 0),
    };
  }, [articles, hydrated, savedPostIds]);
}

const linkClass = 'underline decoration-border-strong underline-offset-4 hover:decoration-ink';

export function ReadingListKpi({ articles }: { articles: ReadingArticle[] }) {
  const { hydrated, saved, minutes } = useSavedArticles(articles);

  return (
    <Kpi
      lead
      label="On your reading list"
      value={hydrated ? String(saved.length) : '—'}
      comparison={
        !hydrated ? (
          'Reading the list saved in this browser.'
        ) : saved.length === 0 ? (
          `None of the ${plural(articles.length, 'article')} in the archive is saved yet.`
        ) : (
          <>
            <span className="block font-semibold text-ink">About {formatMinutes(minutes)} of reading</span>
            <span className="mt-1 block">
              {saved.length} of the {plural(articles.length, 'article')} in the archive.
            </span>
          </>
        )
      }
      action={
        hydrated && saved.length === 0
          ? { href: '#new', label: 'Find something to save' }
          : { href: '#read-next', label: 'Pick what to read next' }
      }
    />
  );
}

export function ReadNextPanel({ articles, className }: { articles: ReadingArticle[]; className?: string }) {
  const { hydrated, saved, minutes } = useSavedArticles(articles);
  // Shortest first: the next article is the one that fits the time available.
  const rows = useMemo(
    () => [...saved].sort((a, b) => a.readMinutes - b.readMinutes || a.title.localeCompare(b.title)).slice(0, 8),
    [saved],
  );

  return (
    <Panel
      className={className}
      title={
        !hydrated
          ? 'Your reading list'
          : saved.length === 0
            ? 'Your reading list is empty'
            : `${plural(saved.length, 'saved article')}, about ${formatMinutes(minutes)} of reading`
      }
      metric={
        saved.length > rows.length
          ? `Saved articles by reading time, shortest first — ${rows.length} of ${saved.length} shown`
          : 'Saved articles by reading time, shortest first'
      }
      action={{ href: '/bookmarks', label: 'Manage the list' }}
    >
      <DetailTable<ReadingArticle>
        caption="Your reading list"
        rows={rows}
        rowKey={(row) => row.id}
        empty={
          hydrated ? (
            <>
              Save an article with the bookmark control on any article page and it appears here, shortest first.{' '}
              <Link href="/" className="font-semibold underline underline-offset-4">
                Browse the archive
              </Link>
              .
            </>
          ) : (
            'Reading the list saved in this browser.'
          )
        }
        columns={[
          {
            key: 'title',
            header: 'Article',
            render: (row) => (
              <Link href={`/post/${row.slug}`} className={linkClass}>
                {row.title}
              </Link>
            ),
          },
          { key: 'category', header: 'Discipline', render: (row) => row.category },
          {
            key: 'time',
            header: 'Reading time',
            numeric: true,
            render: (row) => (row.readMinutes ? `${row.readMinutes} min` : 'Not recorded'),
          },
        ]}
      />
    </Panel>
  );
}

export function NewArticlesPanel({
  recent,
  articles,
  period,
}: {
  /** Articles published in the selected period, newest first. */
  recent: ReadingArticle[];
  /** The whole archive, to resolve the saved list against. */
  articles: ReadingArticle[];
  period: Period;
}) {
  const { hydrated, savedKeys } = useSavedArticles(articles);
  const rows = recent.slice(0, 8);
  const onList = recent.filter((article) => savedKeys.has(article.id)).length;

  return (
    <Panel
      title={
        recent.length === 0
          ? `Nothing new was published in the last ${period.noun}`
          : hydrated
            ? `${plural(recent.length, 'new article')} in the last ${period.noun}, ${onList} already on your list`
            : `${plural(recent.length, 'new article')} in the last ${period.noun}`
      }
      metric={
        recent.length > rows.length
          ? `Articles published in the last ${period.noun}, newest first — ${rows.length} of ${recent.length} shown`
          : `Articles published in the last ${period.noun}, newest first`
      }
      action={{ href: '/', label: 'Browse the archive' }}
    >
      <DetailTable<ReadingArticle>
        caption={`Articles published in the last ${period.noun}`}
        rows={rows}
        rowKey={(row) => row.id}
        empty="Choose a longer period above to see earlier articles."
        columns={[
          {
            key: 'title',
            header: 'Article',
            render: (row) => (
              <Link href={`/post/${row.slug}`} className={linkClass}>
                {row.title}
              </Link>
            ),
          },
          { key: 'category', header: 'Discipline', render: (row) => row.category },
          { key: 'author', nowrap: true, header: 'Writer', render: (row) => row.authorName },
          {
            key: 'published', nowrap: true,
            header: 'Published',
            render: (row) => formatDate(row.publishedAt ?? undefined, { month: 'short' }) || 'Not recorded',
          },
          {
            key: 'time',
            header: 'Reading time',
            numeric: true,
            render: (row) => (row.readMinutes ? `${row.readMinutes} min` : 'Not recorded'),
          },
          {
            key: 'saved', nowrap: true,
            header: 'Reading list',
            render: (row) =>
              !hydrated ? '—' : savedKeys.has(row.id) ? <StatusLabel tone="good">On your list</StatusLabel> : 'Not saved',
          },
        ]}
      />
    </Panel>
  );
}
