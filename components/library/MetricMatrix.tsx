'use client';

import { useState } from 'react';
import FigureChrome, { READOUT_CLASS } from './FigureChrome';
import { cycleSort, sortRows, type MatrixColumn, type MatrixRow, type SortState } from '@/lib/figures/matrix';

/**
 * MetricMatrix — archetype `column-sort-matrix`.
 *
 * A sortable evidence matrix: activating a header sorts the rows by that
 * column (asc → desc → data order), with `aria-sort` carrying the state.
 * Where the race playback orders rows by one value over time, this figure
 * lets the reader *choose the ordering* of static evidence — the interaction
 * is the sort itself. SSR renders the data's own order.
 */
export default function MetricMatrix({
  title,
  subtitle,
  columns,
  rows,
  caption,
}: {
  title: string;
  subtitle: string;
  columns: MatrixColumn[];
  rows: MatrixRow[];
  caption?: string;
}) {
  const [sort, setSort] = useState<SortState>(null);
  const sorted = sortRows(rows, columns, sort);

  return (
    <FigureChrome title={title} subtitle={subtitle}>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full border-collapse font-sans text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas">
              <th scope="col" className="px-4 py-2.5 text-left font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-ink">
                {caption ?? 'Row'}
              </th>
              {columns.map((column) => {
                const active = sort?.key === column.key;
                return (
                  <th key={column.key} scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={() => setSort(cycleSort(sort, column.key))}
                      className={`inline-flex min-h-11 items-center gap-1.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                        active ? 'text-brand' : 'text-ink-secondary'
                      }`}
                    >
                      {column.label}
                      <span aria-hidden="true" className="w-3">
                        {active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.label} className="border-b border-line bg-surface last:border-b-0">
                <th scope="row" className="px-4 py-2.5 text-left font-sans text-sm font-medium text-ink">
                  {row.label}
                </th>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-2.5 font-mono text-xs text-ink-secondary">
                    {row.cells[column.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p aria-live="polite" className={`${READOUT_CLASS} mt-4`}>
        {sort
          ? `Sorted by ${columns.find((column) => column.key === sort.key)?.label ?? sort.key}, ${sort.dir === 'asc' ? 'ascending' : 'descending'}.`
          : 'In the review\u2019s own order — activate a column heading to sort.'}
      </p>
    </FigureChrome>
  );
}
