/**
 * The data table behind every chart.
 *
 * DESIGN §32 requires a chart to "provide a data table or accessible textual
 * equivalent". This is that equivalent, and it does three jobs at once:
 *
 * 1. It is the accessible table a screen-reader user reads instead of the plot.
 * 2. It is what renders when JavaScript has not loaded — the SVG chart is
 *    client-side, so without this the figure would be blank on first paint.
 * 3. It is what prints. `@media print` reveals it and hides the plot.
 *
 * Missing values render as `Not reported`, per §32: a blank or a zero would both
 * misstate the data.
 */
import type { ChartSpec } from '@/lib/charts/spec';

function format(value: number | null): string {
  if (value === null) return 'Not reported';
  return new Intl.NumberFormat('en', { maximumSignificantDigits: 4 }).format(value);
}

export interface ChartDataTableProps {
  spec: ChartSpec;
  /** Hides the table visually but keeps it available to assistive tech. */
  srOnly?: boolean;
}

export function ChartDataTable({ spec, srOnly = false }: ChartDataTableProps) {
  return (
    <div className={srOnly ? 'sr-only' : 'mt-4 overflow-x-auto'}>
      <table className="w-full border-collapse text-left font-sans text-sm">
        <caption className="sr-only">
          {spec.title} — data table
        </caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="px-2 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              {spec.xLabel || 'Category'}
            </th>
            {spec.series.map((series) => (
              <th
                key={series.name}
                scope="col"
                className="px-2 py-1.5 text-right font-mono text-xs font-semibold uppercase tracking-wider text-ink-secondary"
              >
                {series.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spec.points.map((point) => (
            <tr key={point.x} className="border-b border-line/60 last:border-0">
              <th scope="row" className="px-2 py-1.5 font-normal text-ink">{point.x}</th>
              {point.values.map((value, index) => (
                <td
                  key={spec.series[index]?.name ?? index}
                  className={`px-2 py-1.5 text-right tabular-nums ${value === null ? 'text-ink-secondary italic' : 'text-ink'}`}
                >
                  {format(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {spec.notes ? (
        <p className="mt-2 font-sans text-xs text-ink-secondary">{spec.notes}</p>
      ) : null}
    </div>
  );
}
