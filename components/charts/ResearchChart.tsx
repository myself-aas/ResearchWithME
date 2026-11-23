'use client';

/**
 * Interactive, theme-aware research chart.
 *
 * Constraints this balances, in order:
 *
 * 1. **DESIGN §32.** Every figure has a caption (the text alternative), a data
 *    table, disclosed scale/smoothing, labelled missing values, and sample size
 *    when the author supplies one. The table is always rendered; `srOnly` hides
 *    it visually only for readers who already have the plot in view.
 * 2. **Server rendering.** recharts needs the DOM, so this component renders the
 *    table first and the plot after mount. A reader on a slow connection, with
 *    JS blocked, or on first paint sees the data rather than an empty box.
 * 3. **Theme.** Colours come from `lib/charts/tokens.ts`, which reads the
 *    generated token module, and the plot re-renders when the theme flips.
 * 4. **forced-colors.** Windows High Contrast discards `fill`/`stroke`, so the
 *    plot is marked `forced-colors:hidden` and the data table is what remains —
 *    honest, rather than a chart the OS has flattened into a solid block.
 *
 * Interaction is deliberately small: hover/focus reads a value, and a legend
 * toggle isolates a series. No zoom, no drag, no animated data — research
 * measurements must not move (§32, §9).
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  Legend,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartSpec } from '@/lib/charts/spec';
import { DARK_CHART_THEME, LIGHT_CHART_THEME, seriesColor } from '@/lib/charts/tokens';
import { ChartDataTable } from './ChartDataTable';

function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains('dark'));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

/**
 * True once the plot can measure itself.
 *
 * `ResponsiveContainer` needs a layout pass to learn its width. Guarding on
 * `ResizeObserver` means an environment that cannot measure (old browsers, some
 * test and embed contexts) never mounts an SVG that would render at zero size
 * and look like an empty figure — it keeps the data table, which is the
 * accessible equivalent anyway.
 */
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    setMounted(true);
  }, []);
  return mounted;
}

const numberFormat = new Intl.NumberFormat('en', { maximumSignificantDigits: 4 });

interface TooltipPayloadItem {
  dataKey?: string | number;
  value?: number | null;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  spec,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  spec: ChartSpec;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-line bg-surface-raised px-3 py-2 text-ink shadow-floating">
      <p className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-secondary">
        {spec.xLabel ? `${spec.xLabel}: ` : ''}{label}
      </p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((item) => (
          <li key={String(item.dataKey)} className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
            <span className="text-ink-secondary">{item.dataKey}</span>
            <span className="ml-auto font-medium tabular-nums text-ink">
              {item.value === null || item.value === undefined ? 'Not reported' : numberFormat.format(item.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResearchChart({ spec, showTable = true }: { spec: ChartSpec; showTable?: boolean }) {
  const isDark = useIsDark();
  const mounted = useMounted();
  const theme = isDark ? DARK_CHART_THEME : LIGHT_CHART_THEME;
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const headingId = useId();
  const liveRef = useRef<HTMLParagraphElement>(null);

  const visibleSeries = spec.series.filter((series) => !hidden[series.name]);

  // recharts wants a row per x with one key per series.
  const rows = useMemo(
    () =>
      spec.points.map((point) => {
        const row: Record<string, string | number | null> = { x: point.x };
        spec.series.forEach((series, index) => {
          row[series.name] = point.values[index] ?? null;
        });
        return row;
      }),
    [spec],
  );

  const axisProps = {
    stroke: theme.axis,
    tick: { fill: theme.label, fontSize: 12 },
    tickLine: false,
  } as const;

  const grid = <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />;

  const horizontalBars = spec.type === 'bar' && spec.layout === 'vertical';
  const countData = spec.points.every((point) => point.values.every((value) => value === null || Number.isInteger(value)));

  const seriesElements = visibleSeries.map((series) => {
    const index = spec.series.indexOf(series);
    const colour = seriesColor(theme, index);
    const label = series.name;
    const dataKey = series.name;
    const uncertaintyKey = spec.uncertainty?.[index];
    const errorBar = uncertaintyKey
      ? <ErrorBar dataKey={dataKey} width={4} strokeWidth={1.5} direction="y" />
      : null;

    if (spec.type === 'bar') {
      return (
        <Bar key={label} dataKey={dataKey} name={label} fill={colour} radius={horizontalBars ? [0, 2, 2, 0] : [2, 2, 0, 0]} isAnimationActive={false}>
          {errorBar}
          {horizontalBars ? <LabelList dataKey={dataKey} position="right" fill={theme.label} fontSize={12} /> : null}
        </Bar>
      );
    }
    if (spec.type === 'area') {
      return (
        <Area
          key={label}
          dataKey={dataKey}
          name={label}
          stroke={colour}
          fill={colour}
          fillOpacity={0.18}
          strokeWidth={2}
          connectNulls={false}
          isAnimationActive={false}
          dot={{ r: 3, strokeWidth: 0, fill: colour }}
        />
      );
    }
    return (
      <Line
        key={label}
        dataKey={dataKey}
        name={label}
        stroke={colour}
        strokeWidth={2}
        connectNulls={false}
        isAnimationActive={false}
        dot={{ r: 3, strokeWidth: 0, fill: colour }}
        activeDot={{ r: 5 }}
      >
        {errorBar}
      </Line>
    );
  });

  // A legend click isolates a series and announces the change, so the state is
  // never colour-only and is perceivable without seeing the plot redraw.
  function onLegendClick(entry: { dataKey?: string | number | ((obj: unknown) => unknown) }) {
    // recharts allows a function dataKey; this grammar never produces one, so a
    // callable key is simply not a series we can toggle.
    if (typeof entry.dataKey === 'function') return;
    const name = String(entry.dataKey);
    const next = { ...hidden, [name]: !hidden[name] };
    if (Object.values(next).every(Boolean)) {
      setHidden({});
      if (liveRef.current) liveRef.current.textContent = `Showing all ${spec.series.length} series.`;
      return;
    }
    setHidden(next);
    if (liveRef.current) {
      liveRef.current.textContent = next[name]
        ? `${name} hidden. ${spec.series.length - Object.values(next).filter(Boolean).length} of ${spec.series.length} series shown.`
        : `${name} shown.`;
    }
  }

  const plotHeight = horizontalBars ? Math.max(280, spec.points.length * 34 + 60) : 320;

  return (
    <figure className="mt-8 mb-8 rounded-sm border border-line bg-surface p-4" data-chart={spec.type}>
      <figcaption id={headingId} className="mb-3">
        <span className="block font-serif text-lg font-semibold text-ink">{spec.title}</span>
        <span className="mt-1 block font-sans text-sm text-ink-secondary">{spec.caption}</span>
      </figcaption>

      {/* The plot. Hidden in forced-colors, where an OS-painted solid block would
          be worse than the table below. */}
      <div
        className="forced-colors:hidden"
        role="img"
        aria-labelledby={headingId}
        aria-describedby={spec.notes ? `${headingId}-notes` : undefined}
        data-ui-only
      >
        {mounted ? (
          <ResponsiveContainer width="100%" height={plotHeight}>
            {spec.type === 'bar' ? (
              <BarChart data={rows} layout={spec.layout ?? 'horizontal'} accessibilityLayer margin={{ top: 8, right: horizontalBars ? 48 : 8, bottom: horizontalBars ? 24 : 4, left: 0 }}>
                {grid}
                {horizontalBars ? (
                  <XAxis type="number" scale={spec.yScale} domain={spec.yScale === 'linear' ? [0, 'auto'] : ['auto', 'auto']} allowDecimals={!countData} {...axisProps} label={spec.yLabel ? { value: spec.yLabel, position: 'insideBottom', offset: -14, fill: theme.label, fontSize: 12 } : undefined} />
                ) : (
                  <XAxis dataKey="x" {...axisProps} label={spec.xLabel ? { value: spec.xLabel, position: 'insideBottom', offset: -2, fill: theme.label, fontSize: 12 } : undefined} />
                )}
                {horizontalBars ? (
                  <YAxis type="category" dataKey="x" width={122} interval={0} {...axisProps} />
                ) : (
                  <YAxis scale={spec.yScale} {...axisProps} tickFormatter={(v) => numberFormat.format(Number(v))} width={56} label={spec.yLabel ? { value: spec.yLabel, angle: -90, position: 'insideLeft', fill: theme.label, fontSize: 12 } : undefined} />
                )}
                <Tooltip content={<ChartTooltip spec={spec} />} cursor={{ fill: theme.grid, fillOpacity: 0.3 }} />
                {visibleSeries.length > 1 ? <Legend onClick={onLegendClick} /> : null}
                {seriesElements}
              </BarChart>
            ) : spec.type === 'area' ? (
              <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                {grid}
                <XAxis dataKey="x" {...axisProps} />
                <YAxis scale={spec.yScale} {...axisProps} tickFormatter={(v) => numberFormat.format(Number(v))} width={56} />
                <Tooltip content={<ChartTooltip spec={spec} />} />
                {visibleSeries.length > 1 ? <Legend onClick={onLegendClick} /> : null}
                {seriesElements}
              </AreaChart>
            ) : spec.type === 'scatter' ? (
              <ScatterChart margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                {grid}
                <XAxis dataKey="x" type="category" {...axisProps} />
                <YAxis scale={spec.yScale} {...axisProps} tickFormatter={(v) => numberFormat.format(Number(v))} width={56} />
                <Tooltip content={<ChartTooltip spec={spec} />} />
                {visibleSeries.length > 1 ? <Legend onClick={onLegendClick} /> : null}
                {visibleSeries.map((series) => {
                  const colour = seriesColor(theme, spec.series.indexOf(series));
                  return (
                    <Scatter key={series.name} data={rows} dataKey={series.name} name={series.name} isAnimationActive={false}>
                      {rows.map((row) => (
                        <Cell key={String(row.x)} fill={colour} />
                      ))}
                    </Scatter>
                  );
                })}
              </ScatterChart>
            ) : (
              <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                {grid}
                <XAxis dataKey="x" {...axisProps} />
                <YAxis scale={spec.yScale} {...axisProps} tickFormatter={(v) => numberFormat.format(Number(v))} width={56} />
                <Tooltip content={<ChartTooltip spec={spec} />} />
                {visibleSeries.length > 1 ? <Legend onClick={onLegendClick} /> : null}
                {seriesElements}
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : null}
      </div>

      <p ref={liveRef} role="status" aria-live="polite" className="sr-only" />

      {spec.notes ? (
        <p id={`${headingId}-notes`} className="mt-2 font-sans text-xs text-ink-secondary">
          {spec.notes}
        </p>
      ) : null}

      {/* Scale disclosure: DESIGN §32 requires a log axis to say so. */}
      {spec.yScale === 'log' ? (
        <p className="mt-1 font-sans text-xs text-ink-secondary">{horizontalBars ? 'Horizontal' : 'Vertical'} axis is logarithmic.</p>
      ) : null}

      {showTable ? <ChartDataTable spec={spec} /> : null}
    </figure>
  );
}

export default ResearchChart;
