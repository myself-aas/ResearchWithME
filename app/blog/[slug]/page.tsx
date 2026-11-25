import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3 } from 'lucide-react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import MdxContent from '@/components/mdx/MdxContent';
import ReadingProgress from '@/components/ReadingProgress';
import TocNav from '@/components/post/TocNav';
import PostCover from '@/components/post/PostCover';
import FAQAccordion from '@/components/post/FAQAccordion';
import CiteBox from '@/components/post/CiteBox';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import { getAdjacentPosts, getPostBySlug, getPostSlugs, getRelatedPosts } from '@/lib/content/posts';
import { extractToc } from '@/lib/content/toc';
import { tagToSlug } from '@/lib/content/slug';
import { formatDate, formatDateShort, readingTimeLabel, toDateTime } from '@/lib/content/format';
import { absoluteUrl, pageMetadata } from '@/lib/seo';
import { articleJsonLd, jsonLdScript, type Crumb } from '@/lib/seo/jsonld';
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
    imagePath: `/blog/${post.slug}/opengraph-image`,
    publishedTime: toDateTime(post.date),
    modifiedTime: toDateTime(post.updated ?? post.date),
    tags: post.tags,
    noIndex: post.draft,
    markdownPath: `${post.href}/markdown`,
  });
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const toc = post.toc
    ? [
        ...extractToc(post.body),
        ...(post.faq.length > 0 ? [{ id: 'faq-heading', text: 'Questions', level: 2 as const }] : []),
      ]
    : [];
  const related = getRelatedPosts(post.slug);
  const { newer, older } = getAdjacentPosts(post.slug);
  const citation = `${AUTHOR.name}. “${post.title}.” ${SITE.name}, ${formatDate(post.date)}. ${absoluteUrl(post.href)}.`;

  const crumbs: Crumb[] = [
    { name: 'Home', href: '/' },
    { name: 'Writing', href: '/blog' },
    { name: post.title },
  ];

  const jsonLd = articleJsonLd({
    title: post.title,
    description: post.description,
    path: post.href,
    datePublished: toDateTime(post.date),
    dateModified: toDateTime(post.updated ?? post.date),
    tags: post.tags,
    imagePath: `/blog/${post.slug}/opengraph-image`,
    canonical: post.canonical,
    wordCount: post.wordCount,
    crumbs,
    faq: post.faq,
  });

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <ReadingProgress />
      <SiteHeader />

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-5 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <Breadcrumbs crumbs={crumbs} className="mb-8" />

        <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_16rem] xl:gap-14">
          <article aria-labelledby="post-title" className="min-w-0">
            <header>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs text-muted-foreground">
                <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-primary/10 px-3 font-semibold uppercase tracking-wider text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                  Research note
                </span>
                <span>{post.wordCount.toLocaleString()} words</span>
              </div>

              {post.tags.length > 0 && (
                <ul aria-label="Topics" className="mt-5 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <li key={tag}>
                      <Link
                        href={`/tags/${tagToSlug(tag)}`}
                        className="inline-flex min-h-8 items-center rounded-full border border-border bg-card px-3 font-mono text-[0.6875rem] text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        #{tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <h1
                id="post-title"
                className="mt-5 max-w-5xl font-serif text-[clamp(2.35rem,5.1vw,4.35rem)] font-bold leading-[1.02] tracking-[-0.04em] text-foreground text-balance"
              >
                {post.title}
              </h1>

              <p className="mt-5 max-w-3xl font-sans text-lg leading-relaxed text-muted-foreground sm:text-xl">
                {post.description}
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-y border-border py-4">
                <Link href="/about" className="group flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-serif text-sm font-bold text-primary transition-transform group-hover:scale-105"
                  >
                    {AUTHOR.initials}
                  </span>
                  <span>
                    <span className="block font-sans text-sm font-semibold text-foreground group-hover:text-primary">{AUTHOR.name}</span>
                    <span className="mt-0.5 block font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">{AUTHOR.role}</span>
                  </span>
                </Link>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    <time dateTime={toDateTime(post.date)}>{formatDateShort(post.date)}</time>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{readingTimeLabel(post.readingTimeMinutes)}</span>
                  </span>
                  {post.updated && (
                    <span className="rounded-full border border-border px-2.5 py-1">
                      Updated {formatDateShort(post.updated)}
                    </span>
                  )}
                </div>
              </div>
            </header>

            <figure className="mt-8 overflow-hidden rounded-2xl border border-border bg-muted shadow-raised">
              <PostCover post={post} priority sizes="(max-width: 1024px) 100vw, 72vw" className="aspect-[16/9] rounded-2xl border-0" />
            </figure>

            {toc.length >= 2 && (
              <div className="mt-8">
                <TocNav entries={toc} />
              </div>
            )}

            <div className="mx-auto mt-10 w-full max-w-[68ch]">
              <MdxContent source={post.body} />
            </div>

            {post.faq.length > 0 && <FAQAccordion items={post.faq} />}

            {post.tags.length > 0 && (
              <ul aria-label="More topics" className="mx-auto mt-12 flex max-w-[68ch] flex-wrap gap-2 border-t border-border pt-6">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <Link
                      href={`/tags/${tagToSlug(tag)}`}
                      className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3.5 font-sans text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      #{tag}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <footer className="mx-auto mt-10 max-w-[68ch]">
              <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-muted/60 p-5 shadow-xs sm:p-7">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-serif text-sm font-bold text-primary"
                  >
                    {AUTHOR.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="font-serif text-lg font-semibold text-foreground">{AUTHOR.name}</p>
                    <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
                      {AUTHOR.role}
                    </p>
                  </div>
                </div>
                <p className="mt-4 font-sans text-sm leading-relaxed text-muted-foreground">{AUTHOR.bio}</p>
                <div className="mt-4 flex flex-wrap gap-4">
                  <Link
                    href="/about"
                    className="font-sans text-sm font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
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
                        className="font-sans text-sm font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
                      >
                        {link.label}
                      </a>
                    ))}
                </div>
              </div>
            </footer>

            <nav aria-label="More essays" className="mx-auto mt-8 grid max-w-[68ch] gap-3 sm:grid-cols-2">
              {newer ? (
                <Link
                  href={newer.href}
                  className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex items-center gap-1 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
                    <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                    Newer
                  </span>
                  <span className="mt-1.5 block font-serif text-lg font-semibold leading-snug text-foreground group-hover:text-primary">
                    {newer.title}
                  </span>
                </Link>
              ) : (
                <span aria-hidden="true" />
              )}
              {older && (
                <Link
                  href={older.href}
                  className="group rounded-2xl border border-border bg-card p-5 text-right transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:col-start-2"
                >
                  <span className="flex items-center justify-end gap-1 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
                    Older
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <span className="mt-1.5 block font-serif text-lg font-semibold leading-snug text-foreground group-hover:text-primary">
                    {older.title}
                  </span>
                </Link>
              )}
            </nav>

            {related.length > 0 && (
              <section aria-labelledby="related-heading" className="mx-auto mt-12 max-w-[68ch]">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary">More to explore</p>
                <h2 id="related-heading" className="mt-2 font-serif text-2xl font-bold tracking-tight text-foreground">
                  Keep reading
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {related.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={item.href}
                        className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatDateShort(item.date)} · {readingTimeLabel(item.readingTimeMinutes)}
                        </span>
                        <span className="mt-2 font-serif text-lg font-semibold leading-snug text-foreground group-hover:text-primary">
                          {item.title}
                        </span>
                        <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                          {item.description}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>

          <aside aria-label="Essay tools" className="h-fit space-y-4 xl:sticky xl:top-24">
            <CiteBox citation={citation} />
            <p className="rounded-2xl border border-border bg-card p-5 font-sans text-xs leading-relaxed text-muted-foreground">
              Licensed{' '}
              <a
                href={SITE.licenseUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
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
