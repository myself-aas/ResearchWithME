import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { pageMetadata } from '@/lib/seo';
import {
  getClaimById,
  getClaimEvidenceLinks,
  getEvidenceById,
  getSourceById,
} from '@/lib/v34/store';
import { listEvidenceAssessments } from '@/lib/v34/wave8-store';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ev = getEvidenceById(id);
  return pageMetadata({
    title: ev ? `Evidence · ${ev.locator.value}` : 'Evidence Detail',
    description: ev?.statement ?? 'Canonical source-version-bound scholarly evidence record.',
    path: `/evidence/${id}`,
    type: 'article',
  });
}

export default async function EvidenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const evidence = getEvidenceById(id);
  if (!evidence) notFound();

  const source = getSourceById(evidence.sourceId);
  const claimLinks = getClaimEvidenceLinks().filter((l) => l.evidenceId === evidence.id);
  const assessments = listEvidenceAssessments(evidence.id);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8 lg:pb-12"
      >
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink-secondary">
          <Link href="/evidence" className="hover:text-brand hover:underline">
            Evidence Registry
          </Link>{' '}
          / <span className="font-mono text-ink">{evidence.id}</span>
        </nav>

        <header className="rounded-xl border border-line bg-surface p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-ink-secondary">
              {evidence.extractionType}
            </span>
            <span className="rounded-full border border-line bg-surface-raised px-2.5 py-0.5 font-mono text-ink">
              Locator · {evidence.locator.kind}: {evidence.locator.value}
            </span>
            <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-ink-secondary">
              SourceVersion: {evidence.sourceVersionId}
            </span>
          </div>

          <h1 className="font-serif text-2xl font-bold text-ink sm:text-3xl">
            {evidence.statement}
          </h1>

          {evidence.quote && (
            <blockquote className="border-l-2 border-brand pl-4 text-sm italic text-ink-secondary">
              “{evidence.quote}”
            </blockquote>
          )}

          {evidence.limitation && (
            <div className="rounded-lg border border-line bg-canvas p-3 text-sm text-ink-secondary">
              <strong className="text-ink">Explicit Limitation:</strong> {evidence.limitation}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs text-ink-secondary">
            <span>
              Anchored source:{' '}
              <Link href={`/source/${evidence.sourceId}`} className="font-medium text-brand hover:underline">
                {source?.title ?? evidence.sourceId}
              </Link>
            </span>
            <span>
              Deletion policy: {claimLinks.length > 0 ? 'RESTRICTED (linked to claims)' : 'Deletable by owner'}
            </span>
          </div>
        </header>

        <section aria-labelledby="linked-claims-heading" className="mt-8 space-y-3">
          <h2 id="linked-claims-heading" className="font-serif text-xl font-bold text-ink">
            Linked Canonical Claims ({claimLinks.length})
          </h2>
          {claimLinks.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-secondary">
              No claims currently reference this evidence unit.
            </p>
          ) : (
            <ul className="space-y-3">
              {claimLinks.map((link) => {
                const targetClaim = getClaimById(link.claimId)?.claim;
                return (
                  <li
                    key={`${link.claimId}-${link.evidenceId}`}
                    className="rounded-xl border border-line bg-surface p-4 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="rounded-full border border-brand/40 bg-brand/5 px-2.5 py-0.5 font-mono font-semibold text-brand">
                        {link.relationship}
                      </span>
                      <span className="font-mono text-ink-secondary">
                        Method: {link.assertionMethod}
                      </span>
                    </div>
                    <Link
                      href={`/claim/${link.claimId}`}
                      className="block font-serif text-base font-semibold text-ink hover:text-brand hover:underline"
                    >
                      {targetClaim?.statement ?? link.claimId}
                    </Link>
                    {link.rationale && (
                      <p className="text-xs text-ink-secondary">{link.rationale}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="assessments-heading" className="mt-8 space-y-3">
          <h2 id="assessments-heading" className="font-serif text-xl font-bold text-ink">
            Structured Evidence Assessments ({assessments.length})
          </h2>
          {assessments.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-secondary">
              No structured methodological assessments recorded yet. Submit assessments via{' '}
              <code className="font-mono text-xs text-ink">POST /api/evidence/{evidence.id}/assessments</code>.
            </p>
          ) : (
            <ul className="space-y-3">
              {assessments.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-line bg-surface p-4 text-sm space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-ink">Status: {a.status}</span>
                    <span className="font-mono text-ink-secondary">
                      Rigor: {Math.round(a.rigorScore * 100)}% · Verifiability:{' '}
                      {Math.round(a.verifiabilityScore * 100)}%
                    </span>
                  </div>
                  <p className="text-ink-secondary">{a.notes}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <BlogFooter />
    </div>
  );
}
