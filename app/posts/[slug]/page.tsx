import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import MdxContent from '@/components/mdx/MdxContent';
import ReadingProgress from '@/components/ReadingProgress';
import TocNav from '@/components/post/TocNav';
import PostCover from '@/components/post/PostCover';
import CiteBox from '@/components/post/CiteBox';
import { getAdjacentPosts, getPostBySlug, getPostSlugs, getRelatedPosts } from '@/lib/content/posts';
import { extractToc } from '@/lib/content/toc';
import { tagToSlug } from '@/lib/content/slug';
import { formatDate, formatDateShort, readingTimeLabel, toDateTime } from '@/lib/content/format';
import { absoluteUrl, pageMetadata } from '@/lib/seo';
import { articleJsonLd, jsonLdScript } from '@/lib/seo/jsonld';
import { AUTHOR, SITE } from '@/lib/site';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

/** Every post is pre-rendered from the MDX files at build time. */
export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

/** An unknown slug is a real 404, not an on-demand render. */
export const dynamicParams = false;

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return pageMetadata({
    title: post.title,
    description: post.description,
    path: post.href,
    type: 'article',
    imagePath: `/posts/${post.slug}/opengraph-image`,
    publishedTime: toDateTime(post.date),
    modifiedTime: toDateTime(post.updated ?? post.date),
    tags: post.tags,
    noIndex: post.draft,
  });
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const toc = post.toc ? extractToc(post.body) : [];
  const related = getRelatedPosts(post.slug);
  const { newer, older } = getAdjacentPosts(post.slug);
  const citation = `${AUTHOR.name}. “${post.title}.” ${SITE.name}, ${formatDate(post.date)}. ${absoluteUrl(post.href)}.`;

  const jsonLd = articleJsonLd({
    title: post.title,
    description: post.description,
    path: post.href,
    datePublished: toDateTime(post.date),
    dateModified: toDateTime(post.updated ?? post.date),
    tags: post.tags,
    imagePath: post.cover,
    canonical: post.canonical,
  });

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <ReadingProgress />
      <SiteHeader />

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-8 font-mono text-xs text-ink-secondary">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-ink hover:underline">
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li>
              <Link href="/posts" className="hover:text-ink hover:underline">
                Writing
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li aria-current="page" className="min-w-0 max-w-[22rem] truncate text-ink">
              {post.title}
            </li>
          </ol>
        </nav>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-14">
          <article aria-labelledby="post-title" className="min-w-0">
            <header>
              {post.tags.length > 0 && (
                <ul className="flex flex-wrap gap-2 font-mono text-[0.6875rem] uppercase tracking-wider">
                  {post.tags.map((tag) => (
                    <li key={tag}>
                      <Link
                        href={`/tags/${tagToSlug(tag)}`}
                        className="inline-flex min-h-7 items-center rounded-full bg-selection px-2.5 py-1 font-semibold text-brand transition-colors hover:bg-brand hover:text-on-primary"
                      >
                        #{tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <h1
                id="post-title"
                className="mt-4 max-w-4xl font-serif text-[clamp(2.1rem,4.6vw,3.6rem)] font-bold leading-[1.06] tracking-[-0.025em] text-ink text-balance"
              >
                {post.title}
              </h1>

              <p className="mt-4 max-w-2xl font-sans text-lg leading-relaxed text-ink-secondary">
                {post.description}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-line py-4">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-selection font-serif text-xs font-bold text-brand"
                  >
                    {AUTHOR.initials}
                  </span>
                  <div>
                    <p className="font-sans text-sm font-semibold text-ink">{AUTHOR.name}</p>
                    <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
                      {AUTHOR.role}
                    </p>
                  </div>
                </div>
                <p className="ml-auto flex flex-wrap items-center gap-2 font-mono text-xs text-ink-secondary">
                  <time dateTime={toDateTime(post.date)}>{formatDate(post.date)}</time>
                  <span aria-hidden="true">·</span>
                  <span>{readingTimeLabel(post.readingTimeMinutes)}</span>
                  {post.updated && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Updated {formatDateShort(post.updated)}</span>
                    </>
                  )}
                </p>
              </div>
            </header>

            {post.cover && (
              <div className="mt-8">
                <PostCover post={post} priority sizes="(max-width: 1024px) 100vw, 66vw" />
              </div>
            )}

            <div className="mt-9">
              <MdxContent source={post.body} />
            </div>

            {post.tags.length > 0 && (
              <ul className="mt-12 flex flex-wrap gap-2 border-t border-line pt-6">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <Link
                      href={`/tags/${tagToSlug(tag)}`}
                      className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-3.5 py-1.5 font-sans text-xs text-ink-secondary transition-colors hover:border-brand hover:text-ink"
                    >
                      #{tag}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <footer className="mt-10">
              <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-selection font-serif text-sm font-bold text-brand"
                  >
                    {AUTHOR.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="font-serif text-lg font-semibold text-ink">{AUTHOR.name}</p>
                    <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
                      {AUTHOR.role}
                    </p>
                  </div>
                </div>
                <p className="mt-4 font-sans text-sm leading-relaxed text-ink-secondary">{AUTHOR.bio}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/about"
                    className="font-sans text-sm font-semibold text-brand underline underline-offset-4 hover:text-brand-pressed"
                  >
                    More about the author
                  </Link>
                  {AUTHOR.links
                    .filter((link) => link.href.startsWith('http'))
                    .map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-sans text-sm font-semibold text-brand underline underline-offset-4 hover:text-brand-pressed"
                      >
                        {link.label}
                      </a>
                    ))}
                </div>
              </div>
            </footer>

            <nav aria-label="More essays" className="mt-8 grid gap-3 sm:grid-cols-2">
              {newer ? (
                <Link
                  href={newer.href}
                  className="group rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <span className="flex items-center gap-1 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
                    <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                    Newer
                  </span>
                  <span className="mt-1.5 block font-serif text-lg font-semibold leading-snug text-ink group-hover:text-brand">
                    {newer.title}
                  </span>
                </Link>
              ) : (
                <span aria-hidden="true" />
              )}
              {older && (
                <Link
                  href={older.href}
                  className="group rounded-2xl border border-line bg-surface p-5 text-right transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:col-start-2"
                >
                  <span className="flex items-center justify-end gap-1 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
                    Older
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <span className="mt-1.5 block font-serif text-lg font-semibold leading-snug text-ink group-hover:text-brand">
                    {older.title}
                  </span>
                </Link>
              )}
            </nav>

            {related.length > 0 && (
              <section aria-labelledby="related-heading" className="mt-12">
                <h2 id="related-heading" className="font-serif text-2xl font-bold tracking-tight text-ink">
                  Keep reading
                </h2>
                <ul className="mt-4 divide-y divide-line border-t border-line">
                  {related.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={item.href}
                        className="group block py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        <span className="font-mono text-xs text-ink-secondary">
                          {formatDateShort(item.date)} · {readingTimeLabel(item.readingTimeMinutes)}
                        </span>
                        <span className="mt-1 block font-serif text-xl font-semibold leading-snug text-ink group-hover:text-brand">
                          {item.title}
                        </span>
                        <span className="mt-1 block max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary">
                          {item.description}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>

          <aside aria-label="Essay tools" className="h-fit space-y-5 lg:sticky lg:top-24">
            <TocNav entries={toc} />
            <CiteBox citation={citation} />
            <p className="rounded-2xl border border-line bg-surface p-4 font-sans text-xs leading-relaxed text-ink-secondary">
              Licensed{' '}
              <a
                href={SITE.licenseUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-brand underline underline-offset-4 hover:text-brand-pressed"
              >
                {SITE.license}
              </a>
              . Quotes and figures are welcome with attribution.
            </p>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
