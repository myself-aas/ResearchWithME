'use client';

/** Lazy Recharts bridge with a server-rendered, no-JavaScript data equivalent. */
import { createContext, useContext } from 'react';
import dynamic from 'next/dynamic';
import { parseChartSpec, type ChartSpec } from '@/lib/charts/spec';
import { ChartDataTable } from './ChartDataTable';

// next/dynamic's loading component has no access to the eventual plot props.
// Per-figure context lets its SSR/loading fallback retain the real caption and
// data rather than the previous empty "Loading chart" box. Separate providers
// prevent neighboring article figures from sharing data.
const LoadingSpec = createContext<ChartSpec | null>(null);

function ChartLoading() {
  const spec = useContext(LoadingSpec);
  if (!spec) return null;
  return (
    <figure className="mt-8 mb-8 rounded-sm border border-line bg-surface p-4" data-chart={spec.type}>
      <figcaption className="mb-3">
        <span className="block font-serif text-lg font-semibold text-ink">{spec.title}</span>
        <span className="mt-1 block font-sans text-sm text-ink-secondary">{spec.caption}</span>
      </figcaption>
      {spec.yScale === 'log' ? (
        <p className="font-sans text-xs text-ink-secondary">Numeric axis is logarithmic.</p>
      ) : null}
      <ChartDataTable spec={spec} />
    </figure>
  );
}

const ResearchChart = dynamic(() => import('./ResearchChart').then((mod) => mod.ResearchChart), {
  ssr: false,
  loading: ChartLoading,
});

export default function ChartBlock({ source }: { source: string }) {
  const result = parseChartSpec(source);

  if (!result.ok) {
    return (
      <div className="mt-6 mb-6 rounded-sm border border-trust-contested/50 bg-surface p-4">
        <p className="font-sans text-sm font-semibold text-ink">This chart could not be drawn</p>
        <p className="mt-1 font-sans text-sm text-ink-secondary">
          {result.error}
          {result.line ? ` (line ${result.line})` : ''}
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xs border border-line bg-surface-subtle p-3 font-mono text-xs text-ink">
          {source.trim()}
        </pre>
      </div>
    );
  }

  return (
    <LoadingSpec.Provider value={result.spec}>
      <ResearchChart spec={result.spec} />
    </LoadingSpec.Provider>
  );
}
