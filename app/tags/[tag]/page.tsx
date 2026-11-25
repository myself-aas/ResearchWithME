import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { PostRow } from '@/components/post/PostCard';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import { getAllTags, getPostsByTag, getTagBySlug } from '@/lib/content/posts';
import { pageMetadata } from '@/lib/seo';
import { collectionPageJsonLd, jsonLdScript } from '@/lib/seo/jsonld';

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export function generateStaticParams() {
  return getAllTags().map((tag) => ({ tag: tag.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag: slug } = await params;
  const tag = getTagBySlug(slug);
  if (!tag) return {};
  return pageMetadata({
    title: `#${tag.tag}`,
    description: `Every essay on ResearchWithMe filed under ${tag.tag}: ${tag.count} published so far, with links to the full archive, related topics, and the RSS feed.`,
    path: `/tags/${tag.slug}`,
    // Thin archives are duplicates of `/blog` until they carry enough posts.
    noIndex: tag.count < 3,
  });
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag: slug } = await params;
  const tag = getTagBySlug(slug);
  if (!tag) notFound();

  const posts = getPostsByTag(tag.tag);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            collectionPageJsonLd({
              name: `#${tag.tag}`,
              description: `Every essay on ResearchWithMe filed under ${tag.tag}.`,
              path: `/tags/${tag.slug}`,
              posts,
            }),
          ),
        }}
      />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-5 pb-8 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { name: 'Home', href: '/' },
            { name: 'Topics', href: '/tags' },
            { name: `#${tag.tag}` },
          ]}
        />

        <header className="mt-6 max-w-2xl border-b border-line pb-8">
          <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
            Topic · {posts.length} {posts.length === 1 ? 'essay' : 'essays'}
          </p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            #{tag.tag}
          </h1>
          <p className="mt-3 font-sans text-base leading-relaxed text-ink-secondary">
            Everything filed under <span className="font-medium text-ink">{tag.tag}</span>, newest first. See the{' '}
            <Link href="/tags" className="text-brand underline underline-offset-4 hover:text-brand-pressed">
              full list of topics
            </Link>{' '}
            for other threads.
          </p>
        </header>

        <div className="mt-2 border-t border-line">
          {posts.map((post) => (
            <PostRow key={post.slug} post={post} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
