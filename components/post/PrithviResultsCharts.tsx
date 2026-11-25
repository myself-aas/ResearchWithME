'use client';

import BenchmarkChart, { type BenchmarkRow, type BenchmarkSeries } from './BenchmarkChart';

const chartColors = [
  'var(--reme-chart-series-1)',
  'var(--reme-chart-series-2)',
  'var(--reme-chart-series-3)',
  'var(--reme-chart-series-4)',
  'var(--reme-chart-series-7)',
] as const;

const floodSeries: BenchmarkSeries[] = [
  { id: 'miou', label: 'mIoU', longLabel: 'mean intersection over union', unit: '%', maxValue: 100 },
  { id: 'mf1', label: 'mF1', longLabel: 'mean F1 score', unit: '%', maxValue: 100 },
  { id: 'water', label: 'Water IoU', longLabel: 'water-class intersection over union', unit: '%', maxValue: 100 },
];

const floodRows: BenchmarkRow[] = [
  { name: 'Prithvi-EO-1.0', shortLabel: 'EO-1.0 · 100M', color: chartColors[4], values: { miou: 88.3, mf1: 97.3, water: 79.6 } },
  { name: 'Prithvi-EO-2.0-300M', shortLabel: 'EO-2.0 · 300M · plain', color: chartColors[1], values: { miou: 89.7, mf1: 97.6, water: 82.2 } },
  { name: 'Prithvi-EO-2.0-300M-TL', shortLabel: 'EO-2.0 · 300M · TL', color: chartColors[2], values: { miou: 90.0, mf1: 97.7, water: 82.6 } },
  { name: 'Prithvi-EO-2.0-600M', shortLabel: 'EO-2.0 · 600M · plain', color: chartColors[3], values: { miou: 89.9, mf1: 97.6, water: 82.5 } },
  { name: 'Prithvi-EO-2.0-600M-TL', shortLabel: 'EO-2.0 · 600M · TL', color: chartColors[0], highlight: true, values: { miou: 90.3, mf1: 97.7, water: 83.1 } },
];

const pastisSeries: BenchmarkSeries[] = [
  { id: 'ten', label: '10% · ≈200 images', unit: 'mIoU', maxValue: 60 },
  { id: 'full', label: '100% · full training set', unit: 'mIoU', maxValue: 60 },
];

const pastisRows: BenchmarkRow[] = [
  { name: 'DOFA', shortLabel: 'DOFA', group: 'GFM', color: chartColors[3], values: { ten: 20.4, full: 37.0 } },
  { name: 'Satlas', shortLabel: 'Satlas', group: 'GFM', color: chartColors[3], values: { ten: 15.8, full: 31.5 } },
  { name: 'Presto', shortLabel: 'Presto', group: 'GFM', color: chartColors[3], values: { ten: 20.1, full: 28.1 } },
  { name: 'U-TAE (baseline)', shortLabel: 'U-TAE · baseline', group: 'baseline', color: chartColors[4], values: { ten: 36.9, full: 52.9 } },
  { name: 'Prithvi-EO-2.0-300M', shortLabel: 'Prithvi · 300M', group: '300M', color: chartColors[1], values: { ten: 36.3, full: 51.6 } },
  { name: 'Prithvi-EO-2.0-600M', shortLabel: 'Prithvi · 600M', group: '600M', color: chartColors[0], highlight: true, values: { ten: 37.4, full: 53.4 } },
];

/** Metric-switchable test-set comparison for the Sen1Floods11 results. */
export function FloodResultsChart() {
  return (
    <BenchmarkChart
      id="sen1floods11"
      title="Sen1Floods11 · choose a metric"
      source="Paper Table IV · test set"
      controlLabel="Measure"
      series={floodSeries}
      defaultSeriesId="water"
      rows={floodRows}
      caption={(active) =>
        `Showing ${active.longLabel ?? active.label}. Error bars are omitted here; standard deviations are reported in the paper's table.`
      }
      deltaLabel={(active, rows) => {
        const diff = (rows[rows.length - 1]?.values[active.id] ?? 0) - (rows[0]?.values[active.id] ?? 0);
        return `600M-TL vs EO-1.0: +${diff.toFixed(1)} percentage points`;
      }}
    />
  );
}

/** Training-data switcher for the paper's PASTIS multi-temporal crop results. */
export function PastisResultsChart() {
  return (
    <BenchmarkChart
      id="pastis"
      title="PASTIS · crop segmentation mIoU"
      source="Paper Table XII"
      controlLabel="Training data"
      series={pastisSeries}
      defaultSeriesId="full"
      rows={pastisRows}
      legend={[
        { label: 'Other foundation models', color: chartColors[3] },
        { label: 'U-TAE baseline', color: chartColors[4] },
        { label: 'Prithvi 300M', color: chartColors[1] },
        { label: 'Prithvi 600M', color: chartColors[0] },
      ]}
      caption={() => 'mIoU is shown on a 0–60 scale; values are reported scores.'}
      deltaLabel={(active, rows) => {
        const best = Math.max(...rows.map((r) => r.values[active.id] ?? 0));
        const uTae = rows.find((r) => r.group === 'baseline')?.values[active.id] ?? 0;
        return `600M vs U-TAE: +${(best - uTae).toFixed(1)} mIoU points`;
      }}
    />
  );
}
