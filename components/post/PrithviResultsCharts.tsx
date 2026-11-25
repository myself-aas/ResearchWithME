'use client';

import { useState } from 'react';
import { ChartNoAxesColumnIncreasing, Sparkles } from 'lucide-react';

const chartColors = [
  'var(--reme-chart-series-1)',
  'var(--reme-chart-series-2)',
  'var(--reme-chart-series-3)',
  'var(--reme-chart-series-4)',
  'var(--reme-chart-series-7)',
] as const;

const floodModels = [
  { name: 'Prithvi-EO-1.0', label: 'EO-1.0 · 100M', miou: 88.3, mf1: 97.3, water: 79.6, color: chartColors[4] },
  { name: 'Prithvi-EO-2.0-300M', label: 'EO-2.0 · 300M · plain', miou: 89.7, mf1: 97.6, water: 82.2, color: chartColors[1] },
  { name: 'Prithvi-EO-2.0-300M-TL', label: 'EO-2.0 · 300M · TL', miou: 90.0, mf1: 97.7, water: 82.6, color: chartColors[2] },
  { name: 'Prithvi-EO-2.0-600M', label: 'EO-2.0 · 600M · plain', miou: 89.9, mf1: 97.6, water: 82.5, color: chartColors[3] },
  { name: 'Prithvi-EO-2.0-600M-TL', label: 'EO-2.0 · 600M · TL', miou: 90.3, mf1: 97.7, water: 83.1, color: chartColors[0] },
] as const;

type FloodMetric = 'miou' | 'mf1' | 'water';
const floodMetrics: { id: FloodMetric; label: string; longLabel: string }[] = [
  { id: 'miou', label: 'mIoU', longLabel: 'mean intersection over union' },
  { id: 'mf1', label: 'mF1', longLabel: 'mean F1 score' },
  { id: 'water', label: 'Water IoU', longLabel: 'water-class intersection over union' },
];

const pastisModels = [
  { name: 'DOFA', shortName: 'DOFA', ten: 20.4, full: 37.0, group: 'GFM' },
  { name: 'Satlas', shortName: 'Satlas', ten: 15.8, full: 31.5, group: 'GFM' },
  { name: 'Presto', shortName: 'Presto', ten: 20.1, full: 28.1, group: 'GFM' },
  { name: 'U-TAE (baseline)', shortName: 'U-TAE · baseline', ten: 36.9, full: 52.9, group: 'baseline' },
  { name: 'Prithvi-EO-2.0-300M', shortName: 'Prithvi · 300M', ten: 36.3, full: 51.6, group: '300M' },
  { name: 'Prithvi-EO-2.0-600M', shortName: 'Prithvi · 600M', ten: 37.4, full: 53.4, group: '600M' },
] as const;

type PastisSplit = 'ten' | 'full';
const pastisSplits: { id: PastisSplit; label: string }[] = [
  { id: 'ten', label: '10% · ≈200 images' },
  { id: 'full', label: '100% · full training set' },
];

function ControlButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center rounded-xl border px-3.5 font-sans text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:text-sm ${
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-xs'
          : 'border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function ChartHeading({ title, source, id }: { title: string; source: string; id: string }) {
  return (
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
      <h4 id={id} className="mt-3 font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h4>
    </header>
  );
}

function ScrollHint() {
  return (
    <p className="px-5 pb-2 font-mono text-[0.625rem] text-muted-foreground sm:hidden">
      Swipe horizontally to inspect every label and value.
    </p>
  );
}

/** Metric-switchable test-set comparison for the Sen1Floods11 results. */
export function FloodResultsChart() {
  const [metric, setMetric] = useState<FloodMetric>('water');
  const selectedMetric = floodMetrics.find((item) => item.id === metric)!;
  const baseline = floodModels[0][metric];
  const latest = floodModels[floodModels.length - 1][metric];
  const improvement = latest - baseline;
  const plotStart = 194;
  const plotWidth = 500;
  const chartHeight = 282;
  const rowStart = 45;
  const rowStep = 39;
  const gridTop = 29;
  const gridBottom = rowStart + (floodModels.length - 1) * rowStep + 25;
  const accessibleValues = floodModels
    .map((model) => `${model.name}: ${model[metric].toFixed(1)} percent`)
    .join('; ');

  return (
    <figure
      data-chart="sen1floods11"
      aria-labelledby="flood-figure-heading"
      className="my-9 overflow-hidden rounded-3xl border border-border bg-card shadow-raised"
    >
      <ChartHeading id="flood-figure-heading" title="Sen1Floods11 · choose a metric" source="Paper Table IV · test set" />
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Measure</p>
        <div role="group" aria-label="Choose the Sen1Floods11 metric" className="flex flex-wrap gap-2" data-ui-only>
          {floodMetrics.map((option) => (
            <ControlButton key={option.id} active={metric === option.id} onClick={() => setMetric(option.id)}>
              {option.label}
            </ControlButton>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto px-3 py-3 sm:px-5">
        <svg
          role="img"
          aria-labelledby="flood-chart-title flood-chart-description"
          aria-label={`Sen1Floods11 ${selectedMetric.longLabel}, full 0 to 100 percent scale. ${accessibleValues}.`}
          viewBox={`0 0 760 ${chartHeight}`}
          className="block min-w-[640px] w-full"
          data-ui-only
        >
          <title id="flood-chart-title">Sen1Floods11 model comparison</title>
          <desc id="flood-chart-description">{`Horizontal bars show the selected test-set score for each model on a full zero-to-one-hundred-percent scale. Exact model values: ${accessibleValues}.`}</desc>
          {[0, 25, 50, 75, 100].map((tick) => {
            const x = plotStart + (tick / 100) * plotWidth;
            return (
              <g key={tick}>
                <line x1={x} x2={x} y1={gridTop} y2={gridBottom} stroke="var(--reme-chart-grid)" strokeWidth="1" />
                <text x={x} y={chartHeight - 8} textAnchor="middle" fill="var(--reme-chart-label)" fontFamily="var(--font-mono)" fontSize="11">
                  {tick}
                </text>
              </g>
            );
          })}
          {floodModels.map((model, index) => {
            const value = model[metric];
            const y = rowStart + index * rowStep;
            const barWidth = (value / 100) * plotWidth;
            return (
              <g key={model.name}>
                <text x="12" y={y + 14} fill="var(--reme-chart-label)" fontFamily="var(--font-sans)" fontSize="12" fontWeight={index === floodModels.length - 1 ? 700 : 500}>
                  {model.label}
                </text>
                <rect x={plotStart} y={y} width={plotWidth} height="18" rx="9" fill="var(--reme-chart-grid)" opacity=".38" />
                <rect x={plotStart} y={y} width={barWidth} height="18" rx="9" fill={model.color}>
                  <title>{`${model.name}: ${value.toFixed(1)}% ${selectedMetric.label}`}</title>
                </rect>
                <text x={plotStart + barWidth + 8} y={y + 14} fill="var(--reme-chart-label)" fontFamily="var(--font-mono)" fontSize="12" fontWeight="700">
                  {value.toFixed(1)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <ScrollHint />
      <figcaption className="flex flex-col gap-2 border-t border-border bg-muted/35 px-5 py-4 font-sans text-xs leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>Showing {selectedMetric.longLabel}. Error bars are omitted here; the standard deviations are in the table above.</span>
        <span aria-live="polite" className="inline-flex items-center gap-2 font-mono font-semibold text-foreground">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
          600M-TL vs EO-1.0: +{improvement.toFixed(1)} percentage points
        </span>
      </figcaption>
    </figure>
  );
}

/** Training-data switcher for the paper's PASTIS multi-temporal crop results. */
export function PastisResultsChart() {
  const [split, setSplit] = useState<PastisSplit>('full');
  const selectedSplit = pastisSplits.find((item) => item.id === split)!;
  const values = pastisModels.map((model) => model[split]);
  const best = Math.max(...values);
  const uTae = pastisModels.find((model) => model.group === 'baseline')![split];
  const lead = best - uTae;
  const plotStart = 190;
  const plotWidth = 500;
  const chartHeight = 300;
  const rowStart = 39;
  const rowStep = 39;
  const gridTop = 25;
  const gridBottom = rowStart + (pastisModels.length - 1) * rowStep + 24;
  const accessibleValues = pastisModels
    .map((model) => `${model.name}: ${model[split]} mIoU`)
    .join('; ');
  const groupColor = (group: (typeof pastisModels)[number]['group']) => {
    if (group === '600M') return chartColors[0];
    if (group === '300M') return chartColors[1];
    if (group === 'baseline') return chartColors[4];
    return chartColors[3];
  };

  return (
    <figure
      data-chart="pastis"
      aria-labelledby="pastis-figure-heading"
      className="my-9 overflow-hidden rounded-3xl border border-border bg-card shadow-raised"
    >
      <ChartHeading id="pastis-figure-heading" title="PASTIS · crop segmentation mIoU" source="Paper Table XII" />
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Training data</p>
        <div role="group" aria-label="Choose the PASTIS training-data subset" className="flex flex-wrap gap-2" data-ui-only>
          {pastisSplits.map((option) => (
            <ControlButton key={option.id} active={split === option.id} onClick={() => setSplit(option.id)}>
              {option.label}
            </ControlButton>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 px-5 pt-4 sm:px-6" aria-label="Chart legend">
        {[
          { label: 'Other foundation models', color: chartColors[3] },
          { label: 'U-TAE baseline', color: chartColors[4] },
          { label: 'Prithvi 300M', color: chartColors[1] },
          { label: 'Prithvi 600M', color: chartColors[0] },
        ].map((item) => (
          <span key={item.label} className="inline-flex items-center gap-2 font-mono text-[0.625rem] text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden="true" />
            {item.label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto px-3 py-3 sm:px-5">
        <svg
          role="img"
          aria-labelledby="pastis-chart-title pastis-chart-description"
          aria-label={`PASTIS crop segmentation mean intersection over union, ${selectedSplit.label}. ${accessibleValues}.`}
          viewBox={`0 0 760 ${chartHeight}`}
          className="block min-w-[640px] w-full"
          data-ui-only
        >
          <title id="pastis-chart-title">PASTIS mIoU by model</title>
          <desc id="pastis-chart-description">{`Horizontal bars show reported mIoU scores on a zero-to-sixty scale for the selected training-data split. Exact model values: ${accessibleValues}.`}</desc>
          {[0, 15, 30, 45, 60].map((tick) => {
            const x = plotStart + (tick / 60) * plotWidth;
            return (
              <g key={tick}>
                <line x1={x} x2={x} y1={gridTop} y2={gridBottom} stroke="var(--reme-chart-grid)" strokeWidth="1" />
                <text x={x} y={chartHeight - 8} textAnchor="middle" fill="var(--reme-chart-label)" fontFamily="var(--font-mono)" fontSize="11">
                  {tick}
                </text>
              </g>
            );
          })}
          {pastisModels.map((model, index) => {
            const value = model[split];
            const y = rowStart + index * rowStep;
            const barWidth = (value / 60) * plotWidth;
            return (
              <g key={model.name}>
                <text x="12" y={y + 14} fill="var(--reme-chart-label)" fontFamily="var(--font-sans)" fontSize="12" fontWeight={model.group === '600M' ? 700 : 500}>
                  {model.shortName}
                </text>
                <rect x={plotStart} y={y} width={plotWidth} height="18" rx="9" fill="var(--reme-chart-grid)" opacity=".38" />
                <rect x={plotStart} y={y} width={barWidth} height="18" rx="9" fill={groupColor(model.group)}>
                  <title>{`${model.name}: ${value.toFixed(1)} mIoU on the ${selectedSplit.label} split`}</title>
                </rect>
                <text x={plotStart + barWidth + 8} y={y + 14} fill="var(--reme-chart-label)" fontFamily="var(--font-mono)" fontSize="12" fontWeight="700">
                  {value.toFixed(1)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <ScrollHint />
      <figcaption className="flex flex-col gap-2 border-t border-border bg-muted/35 px-5 py-4 font-sans text-xs leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>mIoU is shown on a 0–60 scale; values are reported scores.</span>
        <span aria-live="polite" className="inline-flex items-center gap-2 font-mono font-semibold text-foreground">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
          600M vs U-TAE: +{lead.toFixed(1)} mIoU points
        </span>
      </figcaption>
    </figure>
  );
}
