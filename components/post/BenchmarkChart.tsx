'use client';

import { useId, useState } from 'react';
import { ChartNoAxesColumnIncreasing, Sparkles, Table2 } from 'lucide-react';

export interface BenchmarkSeries {
  id: string;
  label: string;
  longLabel?: string;
  unit?: string;
  maxValue?: number;
}

export interface BenchmarkRow {
  name: string;
  shortLabel: string;
  group?: string;
  color: string;
  highlight?: boolean;
  values: Record<string, number>;
}

export interface BenchmarkLegendItem {
  label: string;
  color: string;
}

export interface BenchmarkChartProps {
  id: string;
  title: string;
  source: string;
  controlLabel: string;
  series: BenchmarkSeries[];
  defaultSeriesId?: string;
  rows: BenchmarkRow[];
  legend?: BenchmarkLegendItem[];
  caption: (activeSeries: BenchmarkSeries) => string;
  deltaLabel?: (activeSeries: BenchmarkSeries, rows: BenchmarkRow[]) => string;
}

/**
 * Responsive, accessible benchmark comparison chart for MDX essays.
 * Renders fluid HTML/CSS bar rows on all viewports with an interactive
 * data-table toggle (and always prints as a clean table via `[data-chart]`).
 */
export default function BenchmarkChart({
  id,
  title,
  source,
  controlLabel,
  series,
  defaultSeriesId,
  rows,
  legend,
  caption,
  deltaLabel,
}: BenchmarkChartProps) {
  const [activeId, setActiveId] = useState(defaultSeriesId ?? series[0]?.id ?? '');
  const [showTable, setShowTable] = useState(false);
  const headingId = useId();

  const activeSeries = series.find((s) => s.id === activeId) ?? series[0];
  if (!activeSeries) return null;

  const maxVal =
    activeSeries.maxValue ??
    Math.max(1, ...rows.map((r) => r.values[activeSeries.id] ?? 0));
  const unit = activeSeries.unit ?? '%';
  const delta = deltaLabel?.(activeSeries, rows);

  return (
    <figure
      data-chart={id}
      aria-labelledby={headingId}
      className="my-9 overflow-hidden rounded-3xl border border-border bg-card shadow-raised"
    >
      <header className="border-b border-border bg-gradient-to-br from-muted/80 via-card to-card px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-primary">
            <ChartNoAxesColumnIncreasing className="h-4 w-4" aria-hidden="true" />
            Interactive data figure
          </p>
          <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
            {source}
          </span>
        </div>
        <h4 id={headingId} className="mt-3 font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h4>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6" data-ui-only>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {controlLabel}
          </p>
          <div role="group" aria-label={controlLabel} className="flex flex-wrap gap-2">
            {series.map((option) => {
              const active = option.id === activeSeries.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveId(option.id)}
                  className={`inline-flex min-h-9 items-center justify-center rounded-xl border px-3 font-sans text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:text-sm ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          aria-pressed={showTable}
          onClick={() => setShowTable((prev) => !prev)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
          {showTable ? 'Bar view' : 'Data table'}
        </button>
      </div>

      {legend && legend.length > 0 && !showTable && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 px-5 pt-4 sm:px-6" aria-label="Chart legend" data-ui-only>
          {legend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2 font-mono text-[0.625rem] text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden="true" />
              {item.label}
            </span>
          ))}
        </div>
      )}

      {!showTable && (
        <div className="space-y-3 px-5 py-5 sm:px-6" data-ui-only>
          {rows.map((row) => {
            const value = row.values[activeSeries.id] ?? 0;
            const pct = Math.min(100, Math.max(0, (value / maxVal) * 100));
            return (
              <div key={row.name} className="grid gap-1.5 sm:grid-cols-[12.5rem_minmax(0,1fr)_3.75rem] sm:items-center sm:gap-4">
                <div className="flex items-baseline justify-between gap-2 sm:block">
                  <span
                    className={`font-sans text-xs sm:text-[0.8125rem] ${
                      row.highlight ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'
                    }`}
                  >
                    {row.shortLabel}
                  </span>
                  <span className="font-mono text-xs font-bold tabular-nums text-foreground sm:hidden">
                    {value.toFixed(1)}
                    {unit === '%' ? '%' : ''}
                  </span>
                </div>

                <div className="h-3.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${pct}%`, backgroundColor: row.color }}
                  />
                </div>

                <span className="hidden text-right font-mono text-xs font-bold tabular-nums text-foreground sm:block">
                  {value.toFixed(1)}
                  {unit === '%' ? '%' : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {showTable && (
        <div className="overflow-x-auto px-5 py-4 sm:px-6" role="table" aria-label={`${title} data table`}>
          <div role="rowgroup">
            <div
              role="row"
              className="grid items-center border-b border-border py-2 text-left font-sans text-xs font-semibold text-foreground sm:text-sm"
              style={{ gridTemplateColumns: `minmax(9rem, 1.6fr) repeat(${series.length}, minmax(4.5rem, 1fr))` }}
            >
              <div role="columnheader" className="pr-4">Model</div>
              {series.map((s) => (
                <div key={s.id} role="columnheader" className="px-2 text-right font-mono text-xs">
                  {s.label}
                </div>
              ))}
            </div>
          </div>
          <div role="rowgroup">
            {rows.map((row) => (
              <div
                key={row.name}
                role="row"
                className="grid items-center border-b border-border/60 py-2 font-sans text-xs last:border-b-0 sm:text-sm"
                style={{ gridTemplateColumns: `minmax(9rem, 1.6fr) repeat(${series.length}, minmax(4.5rem, 1fr))` }}
              >
                <div role="cell" className={`pr-4 ${row.highlight ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                  {row.name}
                </div>
                {series.map((s) => (
                  <div key={s.id} role="cell" className="px-2 text-right font-mono tabular-nums text-foreground">
                    {(row.values[s.id] ?? 0).toFixed(1)}
                    {s.unit === '%' ? '%' : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <figcaption className="flex flex-col gap-2 border-t border-border bg-muted/35 px-5 py-4 font-sans text-xs leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>{caption(activeSeries)}</span>
        {delta && (
          <span aria-live="polite" className="inline-flex items-center gap-2 font-mono font-semibold text-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            {delta}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
