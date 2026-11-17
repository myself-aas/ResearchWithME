import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, FileCheck2, Link2, ShieldAlert, Sparkles } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import ResponsivePaneLayout from '@/components/layout/ResponsivePaneLayout';
import TrustAssessmentSummary from '@/components/scholarly/TrustAssessmentSummary';
import IntegrityNotice from '@/components/scholarly/IntegrityNotice';
import SaveToLibraryButton from '@/components/v34/SaveToLibraryButton';
import { DiscussionSection } from '@/components/v34/DiscussionSection';
import { PeerReviewSection } from '@/components/v34/PeerReviewSection';
import { ProvenanceGraphExplorer } from '@/components/v34/ProvenanceGraphExplorer';
import { CONTRIBUTION_CATALOG } from '@/lib/v34/contracts';
import {
  getClaimEvidenceLinks,
  getContributionById,
  getSourceWithDetails,
  listClaims,
  listEvidence,
} from '@/lib/v34/store';
import {
  toProvenanceGraphData,
  toScholarlyAssessment,
  toScholarlyIntegrityEvent,
} from '@/lib/v34/scholarly-adapter';
import { listFormalReviews } from '@/lib/v34/wave2-store';
import { listDiscussions } from '@/lib/v34/wave3-store';
import { formatDate } from '@/lib/formatting/locale';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const contrib = getContributionById(id);
  if (!contrib) return { title: 'Contribution not found' };
  return {
    title: contrib.title,
    description: contrib.summary,
  };
}

export default async function ContributionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contribution = getContributionById(id);
  if (!contribution) notFound();

  const sourceDetails = contribution.primarySourceId
    ? await getSourceWithDetails(contribution.primarySourceId)
    : null;
  const allEvidence = listEvidence();
  const linkedEvidence = allEvidence.filter((e) => contribution.evidenceIds.includes(e.id));
  const allClaims = listClaims();
  const linkedClaims = allClaims.filter((c) => contribution.claimIds.includes(c.id));
  const claimLinks = getClaimEvidenceLinks();
  const scopedLinks = claimLinks.filter(
    (link) =>
      linkedClaims.some((c) => c.id === link.claimId) ||
      linkedEvidence.some((e) => e.id === link.evidenceId),
  );
  const graphEvidence = allEvidence.filter(
    (e) =>
      linkedEvidence.some((le) => le.id === e.id) ||
      scopedLinks.some((link) => link.evidenceId === e.id),
  );
  const provenanceGraph = toProvenanceGraphData({
    sources: sourceDetails ? [sourceDetails.source] : [],
    evidence: graphEvidence,
    claims: linkedClaims,
    claimEvidence: scopedLinks,
    contributions: [contribution],
  });
  const formalReviews = listFormalReviews(contribution.id);
  const discussions = listDiscussions({ objectType: 'contribution', objectId: contribution.id });

  const latestIntegrityEvent = sourceDetails?.integrityEvents[0] ?? null;
  const scholarlyAssessment = toScholarlyAssessment(contribution.trustAssessment, {
    assessedAt: contribution.updatedAt,
  });

  const mainContent = (
    <article className="min-w-0 space-y-6">
      {/* §25 Integrity Notice MUST render before ordinary metadata */}
      {latestIntegrityEvent ? (
        <IntegrityNotice
          event={toScholarlyIntegrityEvent(latestIntegrityEvent, [contribution.id])}
          affectedCount={sourceDetails?.contributions.length ?? 1}
          publicationBlocked={latestIntegrityEvent.disposition === 'publication-blocked'}
        />
      ) : sourceDetails && sourceDetails.source.integrityStatus !== 'active' ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 font-sans text-sm text-destructive"
        >
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            Primary source integrity status is currently{' '}
            <strong className="uppercase">{sourceDetails.source.integrityStatus}</strong>. Original version is preserved for auditability.
          </span>
        </div>
      ) : null}

      <header className="border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-ink-secondary">
          <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 font-semibold text-brand">
            {CONTRIBUTION_CATALOG[contribution.contributionType].label}
          </span>
          <span>·</span>
          <Link
            href={`/profile/${encodeURIComponent(contribution.authorHandle)}`}
            className="font-sans font-semibold text-ink hover:text-brand hover:underline"
          >
            {contribution.authorName}
          </Link>
          <span>·</span>
          <time dateTime={contribution.publishedAt ?? contribution.updatedAt}>
            {formatDate(contribution.publishedAt ?? contribution.updatedAt)}
          </time>
          <span>·</span>
          <span>v{contribution.version}</span>
        </div>

        <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
          {contribution.title}
        </h1>

        {contribution.subtitle ? (
          <p className="mt-2 font-sans text-base text-ink-secondary">{contribution.subtitle}</p>
        ) : null}

        <p className="mt-4 rounded-lg border border-line bg-surface p-4 font-sans text-sm leading-relaxed text-ink">
          <strong className="font-semibold">Summary: </strong>
          {contribution.summary}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {contribution.topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-surface-subtle px-2.5 py-1 font-sans text-xs font-medium text-ink-secondary"
              >
                {topic}
              </span>
            ))}
          </div>
          <SaveToLibraryButton
            itemType="contribution"
            itemId={contribution.id}
            title={contribution.title}
            url={`/contribution/${contribution.slug}`}
          />
        </div>
      </header>

      {/* Safe Canonical Document Block Renderer (never executes raw HTML) */}
      <div className="space-y-4">
        {contribution.document.blocks.map((block) => {
          if (block.type === 'heading') {
            return (
              <h2 key={block.id} className="pt-2 font-serif text-2xl font-semibold text-ink">
                {block.text}
              </h2>
            );
          }
          if (block.type === 'evidence') {
            return (
              <section
                key={block.id}
                aria-label="Evidence unit"
                className="rounded-lg border border-brand/35 bg-surface p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-brand">
                  <span className="font-semibold uppercase">Evidence</span>
                  {block.locator ? <span>Locator: {block.locator}</span> : null}
                </div>
                <p className="mt-2 font-sans text-sm leading-relaxed text-ink">{block.text}</p>
                {block.limitation ? (
                  <p className="mt-2 font-sans text-xs italic text-ink-secondary">
                    Limitation: {block.limitation}
                  </p>
                ) : null}
              </section>
            );
          }
          if (block.type === 'claim') {
            return (
              <section
                key={block.id}
                aria-label="Scholarly claim"
                className="rounded-lg border border-line bg-surface p-4"
              >
                <p className="font-mono text-xs font-semibold uppercase text-ink-secondary">Claim</p>
                <p className="mt-1 font-serif text-base font-medium text-ink">{block.text}</p>
              </section>
            );
          }
          if (block.type === 'limitation') {
            return (
              <section
                key={block.id}
                aria-label="Methodological limitation"
                className="rounded-lg border border-line bg-surface-subtle p-4"
              >
                <p className="font-mono text-xs font-semibold uppercase text-ink-secondary">
                  Scope &amp; Limitations
                </p>
                <p className="mt-1 font-sans text-sm leading-relaxed text-ink">{block.text}</p>
              </section>
            );
          }
          if (block.type === 'code') {
            return (
              <pre
                key={block.id}
                className="overflow-x-auto rounded-lg border border-line bg-surface p-4 font-mono text-xs text-ink"
              >
                <code>{block.text}</code>
              </pre>
            );
          }
          return (
            <p key={block.id} className="font-sans text-base leading-relaxed text-ink">
              {block.text}
            </p>
          );
        })}
      </div>

      {/* Linked Claims & Explicit Support / Contradict / Qualify Graph */}
      {linkedClaims.length > 0 ? (
        <section aria-labelledby="claims-heading" className="space-y-3 border-t border-line pt-6">
          <h2 id="claims-heading" className="font-serif text-xl font-semibold text-ink">
            Structured Claims &amp; Evidence Links
          </h2>
          {linkedClaims.map((claim) => {
            const links = claimLinks.filter((l) => l.claimId === claim.id);
            return (
              <div key={claim.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-ink-secondary">
                  <span className="rounded-sm bg-surface-subtle px-2 py-0.5 uppercase font-semibold text-ink">
                    {claim.claimType} claim
                  </span>
                  <span>Status: {claim.lifecycle}</span>
                </div>
                <p className="mt-2 font-sans text-sm font-medium text-ink">{claim.statement}</p>
                {links.length > 0 ? (
                  <ul className="mt-3 space-y-2 border-t border-line pt-3">
                    {links.map((link) => {
                      const ev = allEvidence.find((item) => item.id === link.evidenceId);
                      return (
                        <li key={`${link.claimId}-${link.evidenceId}-${link.relationship}`} className="font-sans text-xs text-ink-secondary">
                          <span className="mr-2 rounded-sm border border-brand/30 bg-brand/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand">
                            {link.relationship}
                          </span>
                          <span className="text-ink">{ev?.statement ?? link.evidenceId}</span>
                          {ev ? (
                            <span className="ml-1 font-mono text-ink-secondary">
                              ({ev.locator.kind}: {ev.locator.value})
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

      {/* Wave 2: Interactive Claim–Evidence Provenance Graph */}
      <ProvenanceGraphExplorer
        heading="Contribution Claim–Evidence Provenance"
        description="Inspect the sources, located evidence units, claims, and AI-proposed edges supporting or qualifying this contribution."
        initialObjects={provenanceGraph.objects}
        initialRelationships={provenanceGraph.relationships}
        initialClaimEvidence={scopedLinks}
        showFullGraphLink
      />

      {/* Wave 2: Formal Peer Review & Rebuttal Thread (§6) */}
      <PeerReviewSection
        contributionId={contribution.id}
        contributionVersion={contribution.version}
        initialReviews={formalReviews}
      />

      {/* Wave 3: Informal Scholarly Discussion — explicitly separate from Formal Review (§6) */}
      <DiscussionSection
        objectType="contribution"
        objectId={contribution.id}
        initialDiscussions={discussions}
      />
    </article>
  );

  const rightRail = (
    <div className="space-y-4">
      <TrustAssessmentSummary assessment={scholarlyAssessment} showHeading />

      {sourceDetails ? (
        <section aria-label="Primary source" className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase text-brand">
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Primary canonical source</span>
          </div>
          <h3 className="mt-2 font-sans text-sm font-semibold text-ink">
            <Link href={`/source/${sourceDetails.source.id}`} className="hover:text-brand hover:underline">
              {sourceDetails.source.title}
            </Link>
          </h3>
          <p className="mt-1 font-sans text-xs text-ink-secondary">
            {sourceDetails.source.authors.join(', ')}
            {sourceDetails.source.venue ? ` · ${sourceDetails.source.venue}` : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/source/${sourceDetails.source.id}`}
              className="inline-flex min-h-10 items-center rounded-full border border-line bg-canvas px-3 py-1 font-sans text-xs font-medium text-ink hover:bg-surface-subtle"
            >
              Inspect source record
            </Link>
            {sourceDetails.source.canonicalUrl ? (
              <a
                href={sourceDetails.source.canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-1 rounded-full border border-line bg-canvas px-3 py-1 font-sans text-xs font-medium text-brand hover:bg-surface-subtle"
              >
                <span>Open original</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      <section aria-label="AI transparency" className="rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase text-ink-secondary">
          <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
          <span>AI Provenance</span>
        </div>
        <p className="mt-2 font-sans text-xs leading-relaxed text-ink">
          {contribution.aiProvenance?.usedAi
            ? `AI assisted (${contribution.aiProvenance.provider ?? 'disclosed provider'}${
                contribution.aiProvenance.model ? ` · ${contribution.aiProvenance.model}` : ''
              }). Human reviewed: ${contribution.aiProvenance.humanReviewed ? 'Yes' : 'Pending'}.`
            : 'Human-authored contribution. No generative AI assistance disclosed.'}
        </p>
      </section>

      <section aria-label="Scholarly recognition" className="rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase text-ink-secondary">
          <FileCheck2 className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
          <span>Scholarly recognition</span>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 font-sans text-xs">
          <div className="rounded-md border border-line bg-canvas p-2.5">
            <dt className="text-ink-secondary">Helpful reviews</dt>
            <dd className="mt-0.5 font-mono text-base font-semibold text-ink">
              {contribution.recognition.helpfulReviews}
            </dd>
          </div>
          <div className="rounded-md border border-line bg-canvas p-2.5">
            <dt className="text-ink-secondary">Referenced</dt>
            <dd className="mt-0.5 font-mono text-base font-semibold text-ink">
              {contribution.recognition.referenced}
            </dd>
          </div>
          <div className="rounded-md border border-line bg-canvas p-2.5">
            <dt className="text-ink-secondary">Saved</dt>
            <dd className="mt-0.5 font-mono text-base font-semibold text-ink">
              {contribution.recognition.saved}
            </dd>
          </div>
          <div className="rounded-md border border-line bg-canvas p-2.5">
            <dt className="text-ink-secondary">Linked evidence</dt>
            <dd className="mt-0.5 font-mono text-base font-semibold text-ink">
              {linkedEvidence.length}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pb-16">
        <div className="mb-4">
          <Link
            href="/feed"
            className="inline-flex min-h-11 items-center gap-1.5 font-sans text-sm text-ink-secondary hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to research feed</span>
          </Link>
        </div>

        <ResponsivePaneLayout
          main={mainContent}
          rightRail={rightRail}
          rightRailTitle="Trust & Source Inspector"
        />
      </main>
      <BlogFooter />
    </div>
  );
}
