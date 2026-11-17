import type { Metadata } from 'next';
import Link from 'next/link';
import { FolderKanban, GitBranch } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { ProvenanceGraphExplorer } from '@/components/v34/ProvenanceGraphExplorer';
import { toProvenanceGraphData } from '@/lib/v34/scholarly-adapter';
import {
  getClaimEvidenceLinks,
  listClaims,
  listContributions,
  listEvidence,
  listSources,
} from '@/lib/v34/store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Claim–Evidence Provenance Graph',
  description:
    'Interactive keyboard-accessible scholarly provenance explorer tracing primary sources, located evidence units, claims, and AI-proposed relationships.',
};

export default async function ProvenanceGraphPage() {
  const [sources, evidence, claims, contributions] = await Promise.all([
    listSources(),
    Promise.resolve(listEvidence()),
    Promise.resolve(listClaims()),
    Promise.resolve(listContributions()),
  ]);
  const claimEvidence = getClaimEvidenceLinks();
  const graph = toProvenanceGraphData({
    sources,
    evidence,
    claims,
    claimEvidence,
    contributions,
  });

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pb-16 space-y-6"
      >
        <header className="border-b border-line pb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-brand">
              <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
              Canonical Knowledge Network
            </div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Claim–Evidence Provenance Graph
            </h1>
            <p className="font-sans text-sm leading-relaxed text-ink-secondary sm:text-base">
              Trace how canonical primary sources anchor located evidence units, structured claims,
              and published contributions. Every relationship carries explicit text semantics, and
              AI-proposed edges require explicit human review before entering verified provenance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/workspaces"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 font-sans text-xs font-medium text-ink hover:border-brand hover:text-brand"
            >
              <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
              Research Workspaces
            </Link>
            <Link
              href="/feed"
              className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 font-sans text-xs font-medium text-on-primary hover:opacity-90"
            >
              Research Feed
            </Link>
          </div>
        </header>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            [
              ['Canonical sources', sources.length],
              ['Evidence units', evidence.length],
              ['Structured claims', claims.length],
              ['Provenance edges', graph.relationships.length],
            ] as Array<[string, number]>
          ).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-surface p-4">
              <dt className="font-sans text-xs text-ink-secondary">{label}</dt>
              <dd className="mt-1 font-mono text-2xl font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <ProvenanceGraphExplorer
          heading="Interactive Network Provenance"
          description="List mode is the keyboard-accessible default with an equivalent tabular edge inspector. Switch to Graph view to inspect node topology visually."
          initialObjects={graph.objects}
          initialRelationships={graph.relationships}
          initialClaimEvidence={claimEvidence}
        />
      </main>
      <BlogFooter />
    </div>
  );
}
