/**
 * Pure logic for the MetricMatrix figure (archetype: column-sort-matrix).
 * A sortable evidence matrix: clicking a header sorts the rows by that
 * column, cycling ascending → descending. Sorting is stable and
 * deterministic; SSR renders the data's own order.
 */

export type MatrixColumn = {
  key: string;
  label: string;
  /** Numeric columns sort numerically; everything else compares as text. */
  numeric?: boolean;
}

export type MatrixRow = {
  label: string;
  cells: Record<string, string | number>;
}

export type SortState = { key: string; dir: 'asc' | 'desc' } | null;

/** Next sort state when `key` is activated: asc → desc → clear. */
export function cycleSort(current: SortState, key: string): SortState {
  if (current?.key !== key) return { key, dir: 'asc' };
  if (current.dir === 'asc') return { key, dir: 'desc' };
  return null;
}

/** Stable sort of the rows by a column; the data order is the tiebreak. */
export function sortRows(rows: MatrixRow[], columns: MatrixColumn[], sort: SortState): MatrixRow[] {
  if (!sort) return rows;
  const column = columns.find((entry) => entry.key === sort.key);
  if (!column) return rows;
  const indexed = rows.map((row, index) => ({ row, index }));
  indexed.sort((a, b) => {
    const av = a.row.cells[sort.key];
    const bv = b.row.cells[sort.key];
    let compared: number;
    if (column.numeric) {
      compared = (typeof av === 'number' ? av : Number(av) || 0) - (typeof bv === 'number' ? bv : Number(bv) || 0);
    } else {
      compared = String(av ?? '').localeCompare(String(bv ?? ''));
    }
    if (compared !== 0) return sort.dir === 'asc' ? compared : -compared;
    return a.index - b.index;
  });
  return indexed.map((entry) => entry.row);
}
