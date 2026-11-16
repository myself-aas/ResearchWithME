'use client';

/**
 * Bridge from a Markdown fenced block to the chart.
 *
 * Two reasons this is its own client component rather than a direct render:
 *
 * 1. **Bundle.** `MarkdownBody` renders every article. recharts is ~100 kB, so
 *    it is pulled in only when an article actually contains a chart.
 * 2. **Failure isolation.** A malformed spec must not take the article down with
 *    it. On a parse error this renders the raw block in a labelled box, so the
 *    author's text is never lost and the mistake is visible in review.
 */
import dynamic from 'next/dynamic';
import { parseChartSpec } from '@/lib/charts/spec';

const ResearchChart = dynamic(() => import('./ResearchChart').then((mod) => mod.ResearchChart), {
  ssr: false,
  loading: () => (
    <div className="mt-8 mb-8 rounded-sm border border-line bg-surface p-4">
      <p className="font-sans text-sm text-ink-secondary">Loading chart…</p>
    </div>
  ),
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

  return <ResearchChart spec={result.spec} />;
}
