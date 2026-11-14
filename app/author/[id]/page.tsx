import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import AuthorArchiveLayout from '@/components/AuthorArchiveLayout';

import AuthorProfileCard from '@/components/AuthorProfileCard';
import BlogFooter from '@/components/BlogFooter';
import BlogHeader from '@/components/BlogHeader';
import { getAuthorArchive } from '@/lib/author-directory';
import { pageMetadata } from '@/lib/seo';
import { jsonLdScript, personJsonLd } from '@/lib/seo/jsonld';
import { Link as TextLink } from '@/components/primitives';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * No paths are prerendered: the directory is empty until an author publishes a
 * profile. `dynamicParams` stays at its default, so an unknown slug is rendered
 * on demand and `notFound()` below turns it into a real HTTP 404 rather than a
 * soft client-side one -- which is what makes /author/[slug] safe to index.
 *
 * This is a server component that reads Supabase directly through
 * lib/author-directory.ts. It deliberately does not fetch /api/authors/[id]:
 * on Workers/OpenNext that would be a subrequest back into the same Worker,
 * costing latency and per-request subrequest budget for rows already at hand.
 * The route handler calls the same function, so page and API cannot drift.
 */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const archive = await getAuthorArchive(id);

  if (!archive) return { title: 'Author not found' };

  const { author } = archive;
  return pageMetadata({
    title: `${author.name} — Specialist Reviews`,
    description:
      author.bio ||
      `Peer reviews, repository teardowns, and scholarly analyses by ${author.name}${author.institution ? ` at ${author.institution}` : ''} on ResearchWithMe.`,
    path: `/author/${author.id}`,
    type: 'website',
  });
}

export default async function AuthorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const archive = await getAuthorArchive(id);

  if (!archive) notFound();

  const { author, articles, metrics } = archive;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(personJsonLd(author)) }} />
      <BlogHeader />

      <main tabIndex={-1} id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-secondary">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-ink hover:underline">
                Platform
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-ink-secondary" />
            </li>
            <li>
              <Link href="/authors" className="hover:text-ink hover:underline">
                Authors
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-ink-secondary" />
            </li>
            <li aria-current="page" className="font-medium text-ink">
              {author.name}
            </li>
          </ol>
        </nav>

        <AuthorProfileCard author={author} metrics={metrics} headingLevel="h1" />

        <AuthorArchiveLayout articles={articles} />

        <p className="mt-10 border-t border-line pt-6 text-sm leading-relaxed text-ink-secondary">
          Articles by {author.name} are published openly under CC BY 4.0. Browse all{' '}
          <TextLink href="/authors">
            writers
          </TextLink>{' '}
          or read our{' '}
          <TextLink href="/editorial-board">
            editorial standards
          </TextLink>
          .
        </p>
      </main>

      <BlogFooter />
    </div>
  );
}
