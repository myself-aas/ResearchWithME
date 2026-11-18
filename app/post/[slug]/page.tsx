import ArticleServiceNote from '@/components/billing/ArticleServiceNote';
import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import CoverImage from '@/components/media/CoverImage';
import { notFound } from 'next/navigation';
import { BookOpen, ChevronRight, FileText, GitBranch, Quote } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import AuthorProfileCard from '@/components/AuthorProfileCard';
import ArticleInteractions from '@/components/ArticleInteractions';
import DeferredDiscussion from '@/components/reader/DeferredDiscussion';
import ReadingProgress from '@/components/ReadingProgress';
import MarkdownBody from '@/components/MarkdownBody';
import ArticleSmoothScroll from '@/components/reader/ArticleSmoothScroll';
import ReadingProgressDock from '@/components/reader/ReadingProgressDock';
import InlineCitationPopover from '@/components/reader/InlineCitationPopover';
import SpecialistBadgePopover from '@/components/reader/SpecialistBadgePopover';
import { AUTHORS, categoryToSlug } from '@/lib/blog-data';
import { buildArticleCitationMap, renderWithInlineCitations } from '@/lib/citations-inline';
import { getCachedArticleCatalogue } from '@/lib/cms/catalogue';
import { pageMetadata } from '@/lib/seo';
import { articleJsonLd, jsonLdScript } from '@/lib/seo/jsonld';
import { Card, Text } from '@/components/primitives';
import { WorkflowDisclosure } from '@/components/workflows';
import { RESEARCH_WORKFLOWS } from '@/lib/workflows/research-workflows';

export const revalidate = 30;

const catalogue = cache(getCachedArticleCatalogue);

async function findArticle(slug: string) {
  const articles = await catalogue();
  return articles.find((article) => article.slug === slug || article.id === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await findArticle(slug);
  if (!article) notFound();
  return pageMetadata({
    title: article.title,
    description: article.summary,
    path: `/post/${article.slug}`,
    type: 'article',
  });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await findArticle(slug);

  if (!article) {
    notFound();
  }

  const authorProfile = AUTHORS[article.author.id];
  const related = (await catalogue())
    .filter((candidate) => candidate.slug !== article.slug)
    .map((candidate) => ({
      article: candidate,
      score:
        (candidate.category === article.category ? 2 : 0) +
        candidate.tags.filter((tag) => article.tags.includes(tag)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.article);

  const paragraphs = article.content.flatMap((block) => block.split(/\n{2,}/)).filter(Boolean);
  const canonicalUrl = `/post/${article.slug}`;
  const citeHref = `/cite?article=${encodeURIComponent(article.slug)}`;
  const citationMap = buildArticleCitationMap(article);

  const authorSameAs = [
    article.author.orcid
      ? article.author.orcid.startsWith('http')
        ? article.author.orcid
        : `https://orcid.org/${article.author.orcid}`
      : undefined,
    article.author.github
      ? article.author.github.startsWith('http')
        ? article.author.github
        : `https://github.com/${article.author.github.replace(/^@/, '')}`
      : undefined,
    article.author.website,
    article.author.scholar,
  ].filter((entry): entry is string => Boolean(entry));

  const coverPath =
    article.coverImage && article.coverImage.trim() !== '' && !article.coverImage.startsWith('data:')
      ? article.coverImage
      : '/images/folio-hero.jpeg';

  const jsonLd = articleJsonLd({
    title: article.title,
    description: article.summary,
    path: `/post/${article.slug}`,
    authorName: article.author.name,
    authorId: article.author.id,
    authorSameAs,
    datePublished: article.dateISO ?? article.publishedAt,
    imagePath: article.coverImage,
  });

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      {/* Only claim Article schema: explainer videos are not published assets yet. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <ReadingProgress />
      <ArticleSmoothScroll />
      <BlogHeader
        variant="reading"
        backHref="/feed"
        backLabel="Feed"
        contextTitle={article.title}
      />

      <main tabIndex={-1} id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-5 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-10">
        <nav aria-label="Breadcrumb" className="mb-6 font-mono text-xs text-ink-secondary">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-ink hover:underline">
                Index
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5 text-ink-secondary" />
            </li>
            <li>
              <Link href={`/category/${categoryToSlug(article.category)}`} className="hover:text-ink hover:underline">
                {article.category}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5 text-ink-secondary" />
            </li>
            <li aria-current="page" className="min-w-0 max-w-[22rem] truncate font-medium text-ink">
              {article.title}
            </li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12">
          <article aria-labelledby="article-title" className="min-w-0">
            <header className="pb-2">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-2 font-sans text-xs text-ink-secondary">
                {article.publicationType === 'editorial' && (
                  <span className="rounded-full bg-brand px-3 py-1.5 font-semibold text-on-primary">Editorial</span>
                )}
                <span className="rounded-full bg-selection px-3 py-1.5 font-semibold text-brand">{article.category}</span>
                <span aria-hidden="true">·</span>
                <span>{article.format}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={article.dateISO ?? article.publishedAt}>{article.publishedAt}</time>
                <span aria-hidden="true">·</span>
                <span>{article.readTime}</span>
              </p>

              <h1 id="article-title" className="mt-5 max-w-4xl break-words font-sans text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl lg:text-5xl">
                {article.title}
              </h1>

              <p className="mt-4 reading-column break-words font-sans text-lg leading-relaxed text-ink-secondary">
                {article.subtitle}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {authorProfile ? (
                    <Link
                      href={`/author/${article.author.id}`}
                      className="flex min-w-0 items-center gap-3 font-sans text-sm hover:text-brand"
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface font-sans text-xs font-semibold text-ink"
                      >
                        {article.author.avatar}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{article.author.name}</span>
                        <span className="block truncate text-xs text-ink-secondary">{article.author.role}</span>
                      </span>
                    </Link>
                  ) : (
                    <div className="flex min-w-0 items-center gap-3 font-sans text-sm">
                      <span
                        aria-hidden="true"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface font-sans text-xs font-semibold text-ink"
                      >
                        {article.author.avatar}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{article.author.name}</span>
                        <span className="block truncate text-xs text-ink-secondary">{article.author.role}</span>
                      </span>
                    </div>
                  )}
                  <SpecialistBadgePopover author={article.author} />
                </div>

                <ArticleInteractions
                  postId={article.id}
                  title={article.title}
                  initialLikes={article.likes}
                />
              </div>
            </header>

            <figure className="mt-8 reading-column">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-line bg-surface">
                {article.coverImage && article.coverImage.startsWith('data:') ? (
                  <picture className="h-full w-full">
                    <source srcSet={article.coverImage} type="image/avif" />
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      width={1280}
                      height={720}
                      className="h-full w-full object-cover"
                    />
                  </picture>
                ) : (
                  <CoverImage
                    src={coverPath}
                    alt=""
                    width={1280}
                    height={720}
                    priority
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <figcaption className="mt-2 font-mono text-xs text-ink-secondary">
                Editorial figure{article.reviewedArtifact ? ' · The reviewed artifact is linked below.' : ''}
              </figcaption>
            </figure>

            {article.keyTakeaways.length > 0 && (
              <section aria-labelledby="takeaways-heading" className="mt-10 reading-column rounded-2xl border border-line bg-surface p-5 sm:p-6">
                <Text id="takeaways-heading" as="h2" variant="eyebrow" weight="semibold">
                  Key takeaways
                </Text>
                <ul className="mt-4 space-y-3">
                  {article.keyTakeaways.map((takeaway) => (
                    <li key={takeaway} className="flex gap-3 font-serif text-base leading-relaxed text-ink">
                      <span aria-hidden="true" className="font-mono text-brand">—</span>
                      <span className="break-words">{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {article.bodyMarkdown ? (
              <div className="mt-10">
                <MarkdownBody
                  markdown={article.bodyMarkdown}
                  citations={citationMap}
                  citeHref={citeHref}
                />
              </div>
            ) : (
              <div className="reading-prose drop-cap reading-column mt-10 space-y-6">
                {paragraphs.map((paragraph, index) => (
                  <p
                    key={`${index}-${paragraph.slice(0, 24)}`}
                    className="reading-column break-words font-serif text-lg leading-relaxed text-ink"
                  >
                    {renderWithInlineCitations(paragraph, citationMap, citeHref)}
                  </p>
                ))}
              </div>
            )}

            {article.reviewedArtifact && (
              <Card
                aria-labelledby="artifact-heading"
                as="section" padding="lg" radius="lg" className="mt-10 reading-column"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Text id="artifact-heading" as="h2" variant="eyebrow" weight="semibold">
                    Artifact under review
                  </Text>
                  <InlineCitationPopover
                    label="Cite artifact"
                    source={citationMap.artifact}
                    variant="control"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs text-ink-secondary">
                  {article.reviewedArtifact.type === 'github' ? (
                    <GitBranch className="h-4 w-4 text-brand" aria-hidden="true" />
                  ) : (
                    <FileText className="h-4 w-4 text-brand" aria-hidden="true" />
                  )}
                  <span className="break-all text-ink">{article.reviewedArtifact.identifier}</span>
                  <span aria-hidden="true">·</span>
                  <span>{article.reviewedArtifact.meta}</span>
                </div>
                <p className="mt-2 font-serif text-base text-ink">{article.reviewedArtifact.title}</p>
                <a
                  href={article.reviewedArtifact.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-flex min-h-11 items-center font-sans text-xs font-semibold uppercase tracking-wider text-brand underline underline-offset-4 hover:text-brand-pressed"
                >
                  Open the reviewed artifact
                </a>
              </Card>
            )}

            {article.tags.length > 0 && (
              <div className="mt-10 reading-column flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/?${new URLSearchParams({ search: tag }).toString()}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-3 py-1.5 font-sans text-xs text-ink-secondary transition-colors hover:border-brand hover:text-ink"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-10 reading-column">
              <AuthorProfileCard author={article.author} compact />
            </div>

            <div className="mt-8 reading-column">
              <ArticleServiceNote format={article.format} />
            </div>

            <ReadingProgressDock
              inline
              itemId={article.id}
              itemKind="post"
              readTime={article.readTime}
              citationSource={citationMap.rwm}
              citeHref={citeHref}
              discussionAnchor="#discussion"
            />

            <div className="mt-10 reading-column">
              <DeferredDiscussion postId={article.id} commentCount={article.commentsCount} />
            </div>

            {related.length > 0 && (
              <section aria-labelledby="related-heading" className="mt-12 reading-column pt-2">
                <h2 id="related-heading" className="font-serif text-2xl font-bold text-ink">
                  Related reviews
                </h2>
                <ul className="mt-4 space-y-3">
                  {related.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/post/${item.slug}`}
                        className="group flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 transition-colors hover:bg-surface-subtle hover:text-brand"
                      >
                        <span className="font-mono text-xs text-ink-secondary">
                          {item.category} · {item.readTime}
                        </span>
                        <span className="font-serif text-xl font-semibold text-ink transition-colors group-hover:text-brand">
                          {item.title}
                        </span>
                        <span className="reading-column font-sans text-sm leading-relaxed text-ink-secondary">
                          {item.summary}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>

          <aside
            aria-label="Article tools"
            className="h-fit space-y-4 border-t border-line pt-8 lg:sticky lg:top-24 lg:border-t-0 lg:pt-0"
          >
            <Card padding="lg" radius="lg">
              <Text as="h2" variant="eyebrow" weight="semibold">
                Cite this review
              </Text>
              <p className="mt-2 font-sans text-xs leading-relaxed text-ink-secondary">
                Export APA, MLA, Chicago, IEEE, BibTeX, or RIS records, or inspect inline references directly.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <InlineCitationPopover
                  label="Cite"
                  source={citationMap.rwm}
                  citeHref={citeHref}
                  variant="control"
                />
              </div>
              <Link
                href={citeHref}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-action-primary px-6 py-2 font-sans text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
              >
                <Quote className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Open citation builder</span>
              </Link>
            </Card>

            <Card padding="lg" radius="lg">
              <Text as="h2" variant="eyebrow" weight="semibold">
                Archival Record
              </Text>
              <dl className="mt-3 space-y-3 font-mono text-xs">
                <div>
                  <dt className="uppercase tracking-wider text-ink-secondary">URL</dt>
                  <dd className="mt-0.5 break-all text-ink">
                    <Link href={canonicalUrl} className="underline-offset-4 hover:underline">
                      researchwith.me{canonicalUrl}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-ink-secondary">Licence</dt>
                  <dd className="mt-0.5 text-ink">CC BY 4.0</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-ink-secondary">Column</dt>
                  <dd className="mt-0.5 font-sans text-ink">{article.category}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-ink-secondary">Format</dt>
                  <dd className="mt-0.5 font-sans text-ink">{article.format}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-ink-secondary">Published</dt>
                  <dd className="mt-0.5 font-sans text-ink">{article.publishedAt}</dd>
                </div>
              </dl>
            </Card>

            <Card padding="lg" radius="lg">
              <WorkflowDisclosure workflow={RESEARCH_WORKFLOWS.publication} summary="How this review was published" />
            </Card>

            <Card padding="lg" radius="lg" className="font-sans text-xs leading-relaxed text-ink-secondary">
              <p className="flex items-center gap-2 font-mono uppercase tracking-wider text-ink">
                <BookOpen className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                <span>Verification note</span>
              </p>
              <p className="mt-2">
                {article.reviewedArtifact
                  ? 'Verify primary equations, benchmarks, and commits against the linked upstream artifact when citing in formal manuscripts.'
                  : 'Verify claims against their primary sources when citing in formal manuscripts.'}
              </p>
            </Card>

            <Card padding="lg" radius="lg" className="space-y-3 font-sans text-xs">
              <p className="font-mono font-semibold uppercase tracking-wider text-brand">
                Contribute to this Record
              </p>
              <p className="leading-relaxed text-ink-secondary">
                Extend this review with structured evidence, replication notes, or formal peer review
                in the ResearchWithME knowledge network.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/contribute"
                  className="inline-flex min-h-11 items-center rounded-lg bg-brand px-3 py-1.5 font-semibold text-on-primary hover:opacity-90"
                >
                  Add Evidence / Review →
                </Link>
                <Link
                  href="/sources"
                  className="inline-flex min-h-11 items-center rounded-lg border border-line bg-canvas px-3 py-1.5 font-medium text-ink hover:border-brand"
                >
                  Canonical Sources
                </Link>
              </div>
            </Card>
          </aside>
        </div>
      </main>



      <BlogFooter />
    </div>
  );
}
