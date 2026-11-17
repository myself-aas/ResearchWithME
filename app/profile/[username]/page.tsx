import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, FileCheck2, PlusCircle } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { getAuthorArchive } from '@/lib/author-directory';
import { CONTRIBUTION_CATALOG } from '@/lib/v34/contracts';
import { listContributions } from '@/lib/v34/store';
import { withSupabaseReadTimeout } from '@/lib/v34/supabase-sync';
import { getRecognitionSummary } from '@/lib/v34/wave3-store';
import { getPublicProfileByUsername } from '@/lib/v34/wave7-store';
import { formatDate } from '@/lib/formatting/locale';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username} — Contributor Profile`,
    description: `Scholarly contributions, verified reviews, and non-vanity research recognition for @${username} on ResearchWithME.`,
  };
}

export default async function ContributorProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const contributions = listContributions({ authorHandle: username });
  const archive = await withSupabaseReadTimeout(() => getAuthorArchive(username).catch(() => null), null);

  if (contributions.length === 0 && !archive) {
    notFound();
  }

  const displayName = archive?.author.name ?? contributions[0]?.authorName ?? username;
  const bio =
    archive?.author.bio ??
    'Open-access researcher contributing evidence-linked paper reviews, tool benchmarks, and replication studies.';

  const { summary: recognitionSummary } = getRecognitionSummary(username);
  const publicProfile = getPublicProfileByUsername(username);

  const totals = contributions.reduce(
    (acc, c) => ({
      helpfulReviews: acc.helpfulReviews + c.recognition.helpfulReviews,
      referenced: acc.referenced + c.recognition.referenced,
      saved: acc.saved + c.recognition.saved,
      evidenceUsed: acc.evidenceUsed + c.recognition.evidenceUsed,
      replications: acc.replications + c.recognition.replications,
    }),
    { helpfulReviews: 0, referenced: 0, saved: 0, evidenceUsed: 0, replications: 0 },
  );

  const displayTotals = {
    helpfulReviews: Math.max(totals.helpfulReviews, recognitionSummary.helpfulReviews),
    referenced: Math.max(totals.referenced, recognitionSummary.referencedContributions),
    saved: totals.saved,
    evidenceUsed: Math.max(totals.evidenceUsed, recognitionSummary.evidenceReuse),
    replications: Math.max(totals.replications, recognitionSummary.replicationReports),
    acceptedCorrections: recognitionSummary.acceptedCorrections,
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pb-16">
        <div className="mb-4">
          <Link
            href="/feed"
            className="inline-flex min-h-11 items-center gap-1.5 font-sans text-sm text-ink-secondary hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to research feed</span>
          </Link>
        </div>

        <header className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              <h1 className="font-serif text-3xl font-semibold text-ink">{displayName}</h1>
              <p className="mt-1 font-mono text-xs text-ink-secondary">
                Research contributor · @{username}
              </p>
              <p className="mt-2 font-sans text-sm leading-relaxed text-ink-secondary">{bio}</p>
            </div>
            <Link
              href="/contribute"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand px-4 py-2 font-sans text-sm font-semibold text-on-primary hover:opacity-90"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              <span>New contribution</span>
            </Link>
          </div>

          {/* Event-derived non-vanity scholarly recognition metrics (v3.4 §11 — no composite scores) */}
          <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-line pt-5 sm:grid-cols-6">
            <div className="rounded-md bg-surface-subtle/60 p-3">
              <dt className="font-sans text-xs text-ink-secondary">Helpful reviews</dt>
              <dd className="mt-1 font-mono text-lg font-semibold text-ink">{displayTotals.helpfulReviews}</dd>
            </div>
            <div className="rounded-md bg-surface-subtle/60 p-3">
              <dt className="font-sans text-xs text-ink-secondary">Referenced</dt>
              <dd className="mt-1 font-mono text-lg font-semibold text-ink">{displayTotals.referenced}</dd>
            </div>
            <div className="rounded-md bg-surface-subtle/60 p-3">
              <dt className="font-sans text-xs text-ink-secondary">Saved</dt>
              <dd className="mt-1 font-mono text-lg font-semibold text-ink">{displayTotals.saved}</dd>
            </div>
            <div className="rounded-md bg-surface-subtle/60 p-3">
              <dt className="font-sans text-xs text-ink-secondary">Evidence reused</dt>
              <dd className="mt-1 font-mono text-lg font-semibold text-ink">{displayTotals.evidenceUsed}</dd>
            </div>
            <div className="rounded-md bg-surface-subtle/60 p-3">
              <dt className="font-sans text-xs text-ink-secondary">Replications</dt>
              <dd className="mt-1 font-mono text-lg font-semibold text-ink">{displayTotals.replications}</dd>
            </div>
            <div className="rounded-md bg-surface-subtle/60 p-3">
              <dt className="font-sans text-xs text-ink-secondary">Accepted corrections</dt>
              <dd className="mt-1 font-mono text-lg font-semibold text-ink">{displayTotals.acceptedCorrections}</dd>
            </div>
          </dl>

          {publicProfile && (publicProfile.affiliations.length > 0 || publicProfile.expertise.length > 0) ? (
            <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
              {publicProfile.affiliations.length > 0 ? (
                <div>
                  <h2 className="font-mono text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                    Institutional Affiliations
                  </h2>
                  <ul className="mt-2 divide-y divide-line font-sans text-xs text-ink">
                    {publicProfile.affiliations.map((aff) => (
                      <li key={aff.id} className="py-2">
                        <span className="font-semibold">{aff.institution}</span>
                        <span className="block text-ink-secondary">
                          {aff.roleTitle}
                          {aff.startYear ? ` · ${aff.startYear}–${aff.endYear ?? 'present'}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {publicProfile.expertise.length > 0 ? (
                <div>
                  <h2 className="font-mono text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                    Verified Expertise &amp; Identifiers
                  </h2>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {publicProfile.expertise.map((exp) => (
                      <li
                        key={exp.id}
                        className="rounded-full border border-line bg-canvas px-3 py-1 font-sans text-xs text-ink"
                      >
                        {exp.label}
                      </li>
                    ))}
                  </ul>
                  {publicProfile.orcidId || publicProfile.githubHandle ? (
                    <p className="mt-2 font-mono text-xs text-ink-secondary">
                      {publicProfile.orcidId ? `ORCID: ${publicProfile.orcidId}` : ''}
                      {publicProfile.orcidId && publicProfile.githubHandle ? ' · ' : ''}
                      {publicProfile.githubHandle ? `GitHub: @${publicProfile.githubHandle}` : ''}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </header>

        <section aria-labelledby="profile-contributions" className="mt-8 space-y-4">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-brand" aria-hidden="true" />
            <h2 id="profile-contributions" className="font-serif text-2xl font-semibold text-ink">
              Research Contributions ({contributions.length})
            </h2>
          </div>

          {contributions.length === 0 ? (
            <p className="font-sans text-sm text-ink-secondary">
              No structured network contributions published yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {contributions.map((c) => (
                <li key={c.id} className="rounded-lg border border-line bg-surface p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-ink-secondary">
                    <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 font-semibold text-brand">
                      {CONTRIBUTION_CATALOG[c.contributionType].label}
                    </span>
                    <time dateTime={c.publishedAt ?? c.updatedAt}>
                      {formatDate(c.publishedAt ?? c.updatedAt)}
                    </time>
                  </div>
                  <h3 className="mt-2 font-serif text-lg font-semibold text-ink">
                    <Link href={`/contribution/${c.slug}`} className="hover:text-brand hover:underline">
                      {c.title}
                    </Link>
                  </h3>
                  <p className="mt-1 font-sans text-sm text-ink-secondary">{c.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {archive && archive.articles.length > 0 ? (
          <section aria-labelledby="profile-articles" className="mt-10 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-brand" aria-hidden="true" />
              <h2 id="profile-articles" className="font-serif text-2xl font-semibold text-ink">
                Editorial Articles ({archive.articles.length})
              </h2>
            </div>
            <ul className="space-y-3">
              {archive.articles.map((post) => (
                <li key={post.slug} className="rounded-lg border border-line bg-surface p-4">
                  <h3 className="font-serif text-lg font-semibold text-ink">
                    <Link href={`/post/${post.slug}`} className="hover:text-brand hover:underline">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-1 font-sans text-sm text-ink-secondary">{post.summary}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
      <BlogFooter />
    </div>
  );
}
