import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { pageMetadata } from '@/lib/seo';
import { getContributionById, getSourceById } from '@/lib/v34/store';
import { getToolRepositoryByIdOrSlug } from '@/lib/v34/wave3-store';
import { listTopics } from '@/lib/v34/wave5-store';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topics = await listTopics();
  const topic = topics.find((t) => t.slug === slug || t.id === slug);
  return pageMetadata({
    title: topic ? `${topic.name} — Topic` : 'Scholarly Topic',
    description: topic?.description ?? 'FK-backed scholarly topic taxonomy page.',
    path: `/topics/${slug}`,
    type: 'website',
  });
}

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topics = await listTopics();
  const topic = topics.find((t) => t.slug === slug || t.id === slug);
  if (!topic) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8 lg:pb-12"
      >
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink-secondary">
          <Link href="/topics" className="hover:text-brand hover:underline">
            Topic Taxonomy
          </Link>{' '}
          / <span className="font-mono text-ink">{topic.slug}</span>
        </nav>

        <header className="border-b border-line pb-6 space-y-2">
          <h1 className="font-serif text-3xl font-bold text-ink">{topic.name}</h1>
          <p className="text-sm text-ink-secondary">
            {topic.description} ·{' '}
            <span className="font-mono text-xs text-ink">
              {topic.assignmentCount} linked scholarly object(s)
            </span>
          </p>
        </header>

        <section aria-labelledby="topic-assignments-heading" className="mt-8 space-y-3">
          <h2 id="topic-assignments-heading" className="font-serif text-xl font-bold text-ink">
            Assigned Scholarly Objects
          </h2>
          {topic.assignments.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-secondary">
              No canonical objects assigned to this topic yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {topic.assignments.map((a) => {
                let label = a.targetId;
                let href = '/feed';
                if (a.targetType === 'contribution') {
                  const c = getContributionById(a.targetId);
                  label = c?.title ?? a.targetId;
                  href = `/contribution/${c?.slug ?? a.targetId}`;
                } else if (a.targetType === 'source') {
                  const s = getSourceById(a.targetId);
                  label = s?.title ?? a.targetId;
                  href = `/source/${a.targetId}`;
                } else if (a.targetType === 'tool') {
                  const t = getToolRepositoryByIdOrSlug(a.targetId);
                  label = t?.name ?? a.targetId;
                  href = `/tool/${t?.slug ?? a.targetId}`;
                } else if (a.targetType === 'project') {
                  href = `/project/${a.targetId}`;
                }

                return (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-4"
                  >
                    <div>
                      <span className="rounded-full border border-line bg-canvas px-2 py-0.5 font-mono text-xs text-ink-secondary">
                        {a.targetType}
                      </span>
                      <Link
                        href={href}
                        className="mt-1 block font-serif text-base font-semibold text-ink hover:text-brand hover:underline"
                      >
                        {label}
                      </Link>
                    </div>
                    <Link href={href} className="text-xs font-medium text-brand hover:underline">
                      Open →
                    </Link>
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
