import React from 'react';

export interface ResponsiveColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  /** Explicit missing-value fallback per Part III §27.3 (never show ambiguous blanks). */
  missingLabel?: string;
  /** Render monospace LTR for identifiers, DOIs, dates, or counts. */
  monoLtr?: boolean;
}

interface ResponsiveDataTableProps<T> {
  caption: string;
  rows: T[];
  rowKey: (row: T) => string;
  columns: Array<ResponsiveColumn<T>>;
  emptyMessage?: string;
}

/**
 * ResearchWithME v3.4 — Part III §27 Responsive Data Table & Record View.
 * - Desktop (`>= md`): semantic `<table>` inside a horizontal scroll container.
 * - Mobile (`< md`): stacked accessible `<dl>` record cards without cramped multi-column truncation.
 * - Missing values render an explicit label (`Not reported`) instead of blank cells.
 */
export function ResponsiveDataTable<T>({
  caption,
  rows,
  rowKey,
  columns,
  emptyMessage = 'No records available.',
}: ResponsiveDataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface p-6 text-sm text-ink-secondary">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Desktop semantic table view */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-line bg-canvas/70 text-xs uppercase tracking-wider text-ink-secondary">
            <tr>
              {columns.map((col) => (
                <th key={col.key} scope="col" className="px-4 py-3 font-mono font-semibold">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-canvas/40">
                {columns.map((col) => {
                  const val = col.render(row);
                  const isEmpty = val === null || val === undefined || val === '';
                  return (
                    <td
                      key={col.key}
                      dir={col.monoLtr ? 'ltr' : undefined}
                      className={`px-4 py-3 align-top text-ink ${
                        col.monoLtr ? 'font-mono text-xs' : ''
                      }`}
                    >
                      {isEmpty ? (
                        <span className="text-ink-secondary italic">
                          {col.missingLabel ?? 'Not reported'}
                        </span>
                      ) : (
                        val
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked record cards (< 768px) */}
      <div className="space-y-3 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <article
            key={rowKey(row)}
            className="rounded-xl border border-line bg-surface p-4"
          >
            <dl className="space-y-2 text-xs">
              {columns.map((col) => {
                const val = col.render(row);
                const isEmpty = val === null || val === undefined || val === '';
                return (
                  <div
                    key={col.key}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/60 pb-1.5 last:border-b-0 last:pb-0"
                  >
                    <dt className="font-mono font-semibold uppercase text-ink-secondary">
                      {col.header}
                    </dt>
                    <dd
                      dir={col.monoLtr ? 'ltr' : undefined}
                      className={`text-right text-ink ${col.monoLtr ? 'font-mono' : ''}`}
                    >
                      {isEmpty ? (
                        <span className="text-ink-secondary italic">
                          {col.missingLabel ?? 'Not reported'}
                        </span>
                      ) : (
                        val
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
