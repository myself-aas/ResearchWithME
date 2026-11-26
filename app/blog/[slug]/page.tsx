import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import SiteHeader from '@/components/layout/SiteHeader';
import SocialIcons from '@/components/layout/SocialIcons';
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
  const postUrl = absoluteUrl(post.href);
  const citation = `${AUTHOR.name}. “${post.title}.” ${SITE.name}, ${formatDate(post.date)}. ${postUrl}.`;
  const bibKey = `${AUTHOR.name.split(' ').pop()?.toLowerCase() ?? 'author'}${post.date.slice(0, 4)}${post.slug.split('-')[0] ?? 'essay'}`;
  const bibtex = `@article{${bibKey},\n  author = {${AUTHOR.name}},\n  title = {${post.title}},\n  journal = {${SITE.name}},\n  year = {${post.date.slice(0, 4)}},\n  url = {${postUrl}}\n}`;
  const markdownCitation = `[${post.title}](${postUrl}) — ${AUTHOR.name}, ${SITE.name} (${formatDateShort(post.date)})`;

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
            {/* Minimalist hero, one order for every cover style: the title and a
                single quiet byline row sit above the cover image. The dense
                furniture (badge, word count, tag chips, description block,
                author card) moved out — tags live at the article's end, the
                description stays in metadata/JSON-LD, and the body's answer
                paragraph does the introducing. */}
            <header className="mb-8">
              <h1
                id="post-title"
                className="max-w-4xl font-serif text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.08] tracking-[-0.03em] text-ink text-balance"
              >
                {post.title}
              </h1>
              <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-ink-secondary">
                <span>
                  By{' '}
                  <Link
                    href="/about"
                    className="font-semibold text-brand underline underline-offset-4 hover:text-brand-pressed"
                  >
                    {AUTHOR.name}
                  </Link>
                </span>
                <span aria-hidden="true">·</span>
                <time dateTime={toDateTime(post.date)}>{formatDate(post.date)}</time>
                {post.updated && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      Updated{' '}
                      <time dateTime={toDateTime(post.updated)}>{formatDateShort(post.updated)}</time>
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>{readingTimeLabel(post.readingTimeMinutes)}</span>
              </p>
            </header>

            <figure className="overflow-hidden rounded-2xl">
              <PostCover
                post={post}
                priority
                sizes="(max-width: 1024px) 100vw, 72vw"
                aspect={post.coverStyle === 'hero' && post.cover ? 'aspect-[21/9]' : 'aspect-[16/9]'}
                className="rounded-2xl border-0"
              />
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
                  <Image
                    src={AUTHOR.avatar}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded-full border border-primary/20 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-serif text-lg font-semibold text-foreground">{AUTHOR.name}</p>
                    <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
                      {AUTHOR.role}
                    </p>
                  </div>
                </div>
                <p className="mt-4 font-sans text-sm leading-relaxed text-muted-foreground">{AUTHOR.bio}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <Link
                    href="/about"
                    className="font-sans text-sm font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
                  >
                    More about the author
                  </Link>
                  <SocialIcons className="gap-1.5 [&_a]:h-8 [&_a]:w-8 [&_a]:rounded-lg [&_a]:border-0 [&_a]:bg-transparent [&_a]:text-primary [&_a:hover]:text-primary/70" />
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
            <CiteBox citation={citation} bibtex={bibtex} markdown={markdownCitation} />
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
