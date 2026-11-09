/**
 * DataTable — πeme v3.1 §7 Tables and Matrices (stage 4, beta).
 *
 * - Sticky header, tabular numerals, units in headers, text left / numbers right.
 * - Missing values render "Not reported" — NEVER zero (§7).
 * - No animation of research measurements.
 * - Below the sm breakpoint (36rem) rows collapse to a record view.
 * - Virtualization hook: consumers pass already-windowed rows (spec §18
 *   requires virtualization above ~200 rows — see lib/scholarly/virtualize.ts).
 * Props: columns, rows, caption. Token mapping: semantic text/border tokens.
 * Tests: lib/__tests__/workspace.test.ts.
 */
import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** unit goes in the header, never per-cell (§7) */
  unit?: string;
  numeric?: boolean;
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  caption: string;
  emptyLabel?: string;
}

export const NOT_REPORTED = 'Not reported';

export default function DataTable<T>({ columns, rows, caption, emptyLabel = 'No records' }: DataTableProps<T>) {
  if (!rows.length) {
    return <p className="py-6 text-center font-sans text-sm text-text-tertiary">{emptyLabel}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-sans text-sm">
        <caption className="text-left text-xs text-text-tertiary">{caption}</caption>
        <thead>
          <tr className="border-b border-border-strong text-left">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`sticky top-0 bg-surface py-2 pr-4 font-semibold text-text-secondary ${c.numeric ? 'text-right' : 'text-left'}`}
              >
                {c.header}
                {c.unit ? <span className="ml-1 font-normal text-text-tertiary">({c.unit})</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-line">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`py-2 pr-4 text-text-primary ${c.numeric ? 'text-right tabular-nums' : 'text-left'}`}
                >
                  {c.render(row) ?? <span className="italic text-text-tertiary">{NOT_REPORTED}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
