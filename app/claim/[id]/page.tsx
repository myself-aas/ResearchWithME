import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { pageMetadata } from '@/lib/seo';
import { getClaimById, getSourceById } from '@/lib/v34/store';
import { listClaimAssessments } from '@/lib/v34/wave8-store';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = getClaimById(id);
  return pageMetadata({
    title: detail ? `Claim · ${detail.claim.claimType}` : 'Claim Detail',
    description: detail?.claim.statement ?? 'Structured scholarly claim evaluated against evidence.',
    path: `/claim/${id}`,
    type: 'article',
  });
}

export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = getClaimById(id);
  if (!detail) notFound();

  const { claim, evidenceLinks, evidence } = detail;
  const evidenceMap = new Map(evidence.map((e) => [e.id, e]));
  const assessments = listClaimAssessments(claim.id);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8 lg:pb-12"
      >
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink-secondary">
          <Link href="/claims" className="hover:text-brand hover:underline">
            Claims Directory
          </Link>{' '}
          / <span className="font-mono text-ink">{claim.id}</span>
        </nav>

        <header className="rounded-xl border border-line bg-surface p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-ink-secondary">
              {claim.claimType}
            </span>
            <span className="rounded-full border border-line bg-surface-raised px-2.5 py-0.5 font-mono text-ink">
              Lifecycle: {claim.lifecycle}
            </span>
          </div>

          <h1 className="font-serif text-2xl font-bold text-ink sm:text-3xl">{claim.statement}</h1>

          <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs sm:grid-cols-4">
            <div className="rounded-lg border border-line bg-canvas p-3">
              <dt className="text-ink-secondary">Review status</dt>
              <dd className="mt-1 font-mono font-semibold text-ink">
                {claim.assessment.review}
              </dd>
            </div>
            <div className="rounded-lg border border-line bg-canvas p-3">
              <dt className="text-ink-secondary">Replication</dt>
              <dd className="mt-1 font-mono font-semibold text-ink">
                {claim.assessment.replication}
              </dd>
            </div>
            <div className="rounded-lg border border-line bg-canvas p-3">
              <dt className="text-ink-secondary">Certainty</dt>
              <dd className="mt-1 font-mono font-semibold text-ink">
                {claim.assessment.certainty}
              </dd>
            </div>
            <div className="rounded-lg border border-line bg-canvas p-3">
              <dt className="text-ink-secondary">Consensus</dt>
              <dd className="mt-1 font-mono font-semibold text-ink">
                {claim.assessment.consensus}
              </dd>
            </div>
          </dl>
        </header>

        <section aria-labelledby="claim-evidence-heading" className="mt-8 space-y-3">
          <h2 id="claim-evidence-heading" className="font-serif text-xl font-bold text-ink">
            Normalized Claim–Evidence Relationships ({evidenceLinks.length})
          </h2>
          {evidenceLinks.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-secondary">
              No evidence units linked to this claim yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {evidenceLinks.map((link) => {
                const ev = evidenceMap.get(link.evidenceId);
                const src = ev ? getSourceById(ev.sourceId) : null;
                return (
                  <li
                    key={`${link.claimId}-${link.evidenceId}`}
                    className="rounded-xl border border-line bg-surface p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="rounded-full border border-brand/40 bg-brand/5 px-2.5 py-0.5 font-mono font-semibold text-brand">
                        {link.relationship}
                      </span>
                      <span className="font-mono text-ink-secondary">
                        Assertion: {link.assertionMethod}
                      </span>
                    </div>
                    <Link
                      href={`/evidence/${link.evidenceId}`}
                      className="block font-serif text-base font-semibold text-ink hover:text-brand hover:underline"
                    >
                      {ev?.statement ?? link.evidenceId}
                    </Link>
                    {src && (
                      <p className="text-xs text-ink-secondary">
                        Source:{' '}
                        <Link href={`/source/${src.id}`} className="text-brand hover:underline">
                          {src.title}
                        </Link>
                      </p>
                    )}
                    {link.rationale && (
                      <p className="text-xs text-ink-secondary">{link.rationale}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="claim-assessments-heading" className="mt-8 space-y-3">
          <h2 id="claim-assessments-heading" className="font-serif text-xl font-bold text-ink">
            Structured Claim Assessments ({assessments.length})
          </h2>
          {assessments.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-secondary">
              No independent claim assessments recorded yet. Record assessments via{' '}
              <code className="font-mono text-xs text-ink">POST /api/claims/{claim.id}/assessments</code>.
            </p>
          ) : (
            <ul className="space-y-3">
              {assessments.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-line bg-surface p-4 text-sm space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-ink">Confidence: {a.confidenceLevel}</span>
                    <span className="font-mono text-ink-secondary">
                      Support score: {Math.round(a.evidenceSupportScore * 100)}%
                    </span>
                  </div>
                  <p className="text-ink-secondary">{a.rationale}</p>
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
