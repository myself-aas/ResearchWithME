import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { pageMetadata } from '@/lib/seo';
import { getSourceById } from '@/lib/v34/store';
import { getToolRepositoryByIdOrSlug } from '@/lib/v34/wave3-store';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolRepositoryByIdOrSlug(slug);
  return pageMetadata({
    title: tool ? `${tool.name} — Open-Source Tool` : 'Tool Repository',
    description: tool?.summary ?? 'Global deduplicated open-source research tool record.',
    path: `/tool/${slug}`,
    type: 'article',
  });
}

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getToolRepositoryByIdOrSlug(slug);
  if (!tool) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8 lg:pb-12"
      >
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink-secondary">
          <Link href="/tools" className="hover:text-brand hover:underline">
            Global Tool Registry
          </Link>{' '}
          / <span className="font-mono text-ink">{tool.slug}</span>
        </nav>

        <header className="rounded-xl border border-line bg-surface p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-ink-secondary">
              {tool.provider} · {tool.ownerName}/{tool.repoName}
            </span>
            {tool.latestReleaseTag && (
              <span className="rounded-full border border-brand/40 bg-brand/5 px-2.5 py-0.5 font-mono text-brand">
                Release {tool.latestReleaseTag}
              </span>
            )}
          </div>

          <h1 className="font-serif text-3xl font-bold text-ink">{tool.name}</h1>
          <p className="text-sm text-ink-secondary">{tool.summary}</p>

          <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs sm:grid-cols-4">
            <div className="rounded-lg border border-line bg-canvas p-3">
              <dt className="text-ink-secondary">License</dt>
              <dd className="mt-1 font-mono font-semibold text-ink">
                {tool.license ?? 'Not reported'}
              </dd>
            </div>
            <div className="rounded-lg border border-line bg-canvas p-3">
              <dt className="text-ink-secondary">Primary Language</dt>
              <dd className="mt-1 font-mono font-semibold text-ink">
                {tool.primaryLanguage ?? 'Not reported'}
              </dd>
            </div>
            <div className="rounded-lg border border-line bg-canvas p-3">
              <dt className="text-ink-secondary">Observed Stars (Non-Quality Signal)</dt>
              <dd className="mt-1 font-mono font-semibold text-ink">
                {tool.starsCount !== null ? tool.starsCount.toLocaleString('en-US') : 'Not reported'}
              </dd>
            </div>
            <div className="rounded-lg border border-line bg-canvas p-3">
              <dt className="text-ink-secondary">Last Observed</dt>
              <dd className="mt-1 font-mono font-semibold text-ink">
                {tool.observedAt.slice(0, 10)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
            <a
              href={tool.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-canvas px-4 py-2 font-medium text-ink hover:border-brand"
            >
              Open Upstream Repository
            </a>
            <Link
              href="/contribute"
              className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 font-medium text-on-primary hover:opacity-90"
            >
              Write Tool Review
            </Link>
          </div>
        </header>

        <section aria-labelledby="citable-software-sources" className="mt-8 space-y-3">
          <h2 id="citable-software-sources" className="font-serif text-xl font-bold text-ink">
            Linked Citable Software Sources ({tool.linkedSources.length})
          </h2>
          <p className="text-xs text-ink-secondary">
            Mutable Git repositories are kept distinct from immutable archived software releases
            used in scholarly citations.
          </p>
          {tool.linkedSources.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-secondary">
              No archived software release source linked yet. Link one via{' '}
              <code className="font-mono text-xs text-ink">POST /api/tools/{tool.id}/sources</code>.
            </p>
          ) : (
            <ul className="space-y-3">
              {tool.linkedSources.map((link) => {
                const src = getSourceById(link.sourceId);
                return (
                  <li
                    key={`${link.toolRepositoryId}-${link.sourceId}`}
                    className="rounded-xl border border-line bg-surface p-4 space-y-1"
                  >
                    <Link
                      href={`/source/${link.sourceId}`}
                      className="font-serif text-base font-semibold text-ink hover:text-brand hover:underline"
                    >
                      {src?.title ?? link.sourceId}
                    </Link>
                    <p className="font-mono text-xs text-ink-secondary">
                      {link.releaseTag ? `Tag: ${link.releaseTag}` : 'Snapshot'}{' '}
                      {link.commitSha ? `· Commit: ${link.commitSha.slice(0, 10)}` : ''}
                      {link.packageVersion ? ` · Package: ${link.packageVersion}` : ''}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <BlogFooter />
    </div>
  );
}
