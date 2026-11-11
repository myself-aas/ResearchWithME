import { Link, useLoaderData } from 'react-router-dom';
import { BookOpen, ChevronRight, FileText, GitBranch, Quote } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import AuthorProfileCard from '@/components/AuthorProfileCard';
import ArticleInteractions from '@/components/ArticleInteractions';
import ArticleDiscussion from '@/components/ArticleDiscussion';
import ReadingProgress from '@/components/ReadingProgress';
import MarkdownBody from '@/components/MarkdownBody';
import VideoEmbed from '@/components/VideoEmbed';
import { AUTHORS, categoryToSlug } from '@/lib/blog-data';
import { articleJsonLd, jsonLdScript } from '@/lib/seo/jsonld';
import type { PostLoaderData } from './data';

/**
 * /post/:slug — the reader. Ported from app/post/[slug]/page.tsx; data comes
 * from the loader (full article + related), never from client fetches, so
 * the no-JS document carries the complete text.
 */
export default function PostRoute() {
  const { article, related } = useLoaderData() as PostLoaderData;

  const authorProfile = AUTHORS[article.author.id];

  const paragraphs = article.content.flatMap((block) => block.split(/\n{2,}/)).filter(Boolean);

  const jsonLd = articleJsonLd({
    title: article.title,
    description: article.summary,
    path: `/post/${article.slug}`,
    authorName: article.author.name,
    datePublished: article.dateISO ?? article.publishedAt,
    imagePath: article.coverImage,
  });

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <ReadingProgress />
      <BlogHeader />

      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-stone-600">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link to="/" className="hover:text-stone-900 hover:underline">
                Platform
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-stone-500" />
            </li>
            <li>
              <Link to={`/category/${categoryToSlug(article.category)}`} className="hover:text-stone-900 hover:underline">
                {article.category}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-stone-500" />
            </li>
            <li aria-current="page" className="max-w-[22rem] truncate font-medium text-stone-900">
              {article.title}
            </li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-14">
          <article aria-labelledby="article-title" className="min-w-0">
            <header className="border-b border-stone-200 pb-8">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600">
                <span className="font-medium text-brand">{article.category}</span>
                <span aria-hidden="true">·</span>
                <span>{article.format}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={article.dateISO ?? article.publishedAt}>{article.publishedAt}</time>
                <span aria-hidden="true">·</span>
                <span>{article.readTime}</span>
              </p>

              <h1 id="article-title" className="mt-3 font-serif text-3xl font-bold leading-tight tracking-tight text-stone-900 sm:text-4xl lg:text-5xl">
                {article.title}
              </h1>

              <p className="mt-4 max-w-prose break-words font-serif text-xl leading-relaxed text-stone-700">{article.subtitle}</p>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                {authorProfile ? (
                  <Link
                    to={`/author/${article.author.id}`}
                    className="flex min-w-0 items-center gap-3 text-sm hover:text-brand"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-stone-900 font-serif text-sm font-bold text-stone-50"
                    >
                      {article.author.avatar}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-stone-900">{article.author.name}</span>
                      <span className="block truncate text-stone-600">{article.author.role}</span>
                    </span>
                  </Link>
                ) : (
                  <div className="flex min-w-0 items-center gap-3 text-sm">
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-stone-900 font-serif text-sm font-bold text-stone-50"
                    >
                      {article.author.avatar}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-stone-900">{article.author.name}</span>
                      <span className="block truncate text-stone-600">{article.author.role}</span>
                    </span>
                  </div>
                )}

                <ArticleInteractions
                  postId={article.id}
                  title={article.title}
                  initialLikes={article.likes}
                />
              </div>
            </header>

            <figure className="mt-8">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-stone-900">
                {article.coverImage && article.coverImage.startsWith('data:') ? (
                  <picture className="h-full w-full">
                    <source srcSet={article.coverImage} type="image/avif" />
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      className="h-full w-full object-cover"
                    />
                  </picture>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={article.coverImage && article.coverImage.trim() !== '' ? article.coverImage : '/images/folio-hero.jpeg'}
                    alt=""
                    loading="eager"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
              </div>
              <figcaption className="mt-2 text-sm text-stone-600">
                Editorial imagery for this review. Reviewed artifacts are linked in the record below.
              </figcaption>
            </figure>

            {/* HyperFrames explainer video — rendered per article slug */}
            <section aria-labelledby="explainer-video-heading" className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-brand">
                  Visual explainer
                </span>
              </div>
              <VideoEmbed
                src={`/videos/explainer-${article.slug}.mp4`}
                label={`Animated explainer for: ${article.title}`}
              />
            </section>

            <section aria-labelledby="takeaways-heading" className="mt-10 border-y border-stone-200 py-6">
              <h2 id="takeaways-heading" className="font-serif text-xl font-semibold text-stone-900">
                Key takeaways
              </h2>
              <ul className="mt-3 space-y-2">
                {article.keyTakeaways.map((takeaway) => (
                  <li key={takeaway} className="flex gap-3 text-base leading-relaxed text-stone-800">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-hover" />
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </section>

            {article.bodyMarkdown ? (
              <div className="mt-10">
                <MarkdownBody markdown={article.bodyMarkdown} />
              </div>
            ) : (
              <div className="reading-prose drop-cap mt-10 space-y-6">
                {paragraphs.map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 24)}`} className="max-w-prose break-words text-lg leading-relaxed text-stone-800">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {article.reviewedArtifact && (
              <section aria-labelledby="artifact-heading" className="mt-10 rounded-lg border border-stone-200 bg-white p-5">
                <h2 id="artifact-heading" className="font-serif text-xl font-semibold text-stone-900">
                  Artifact under review
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-700">
                  {article.reviewedArtifact.type === 'github' ? (
                    <GitBranch className="h-4 w-4 text-stone-700" aria-hidden="true" />
                  ) : (
                    <FileText className="h-4 w-4 text-brand-hover" aria-hidden="true" />
                  )}
                  <span className="break-all font-mono text-stone-900">{article.reviewedArtifact.identifier}</span>
                  <span aria-hidden="true">·</span>
                  <span>{article.reviewedArtifact.meta}</span>
                </div>
                <p className="mt-2 text-base text-stone-700">{article.reviewedArtifact.title}</p>
                <a
                  href={article.reviewedArtifact.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-brand underline underline-offset-4 hover:text-brand-pressed"
                >
                  Open the reviewed artifact
                </a>
              </section>
            )}

            <div className="mt-10 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/?search=${encodeURIComponent(tag)}`}
                  className="rounded border border-stone-300 bg-white px-2 py-1 font-mono text-sm text-stone-700 hover:border-stone-400"
                >
                  #{tag}
                </Link>
              ))}
            </div>

            <div className="mt-10">
              <AuthorProfileCard author={article.author} compact />
            </div>

            <div className="mt-10">
              <ArticleDiscussion postId={article.id} commentCount={article.commentsCount} />
            </div>

            {related.length > 0 && (
              <section aria-labelledby="related-heading" className="mt-12 border-t border-stone-200 pt-8">
                <h2 id="related-heading" className="font-serif text-2xl font-bold text-stone-900">
                  Related reviews
                </h2>
                <ul className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
                  {related.map((item) => (
                    <li key={item.id}>
                      <Link
                        to={`/post/${item.slug}`}
                        className="group flex flex-col gap-1 py-4 hover:text-brand"
                      >
                        <span className="text-sm text-stone-600">
                          {item.category} · {item.readTime}
                        </span>
                        <span className="font-serif text-xl font-semibold text-stone-900 group-hover:text-brand">
                          {item.title}
                        </span>
                        <span className="max-w-prose text-sm leading-relaxed text-stone-700">{item.summary}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>

          <aside aria-label="Article tools" className="h-fit space-y-6 lg:sticky lg:top-24">
            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="font-serif text-lg font-semibold text-stone-900">Cite this review</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Build an APA, MLA, Chicago, IEEE, BibTeX, or RIS citation from this record.
              </p>
              <Link
                to={`/cite?article=${encodeURIComponent(article.slug)}`}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                <Quote className="h-4 w-4" aria-hidden="true" />
                <span>Open citation builder</span>
              </Link>
            </div>

            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="font-serif text-lg font-semibold text-stone-900">Article record</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-stone-600">Domain</dt>
                  <dd className="text-stone-900">{article.category}</dd>
                </div>
                <div>
                  <dt className="text-stone-600">Format</dt>
                  <dd className="text-stone-900">{article.format}</dd>
                </div>
                <div>
                  <dt className="text-stone-600">Published</dt>
                  <dd className="text-stone-900">{article.publishedAt}</dd>
                </div>
                <div>
                  <dt className="text-stone-600">Reading time</dt>
                  <dd className="text-stone-900">{article.readTime}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-stone-200 bg-stone-100 p-5 text-sm leading-relaxed text-stone-700">
              <p className="flex items-center gap-2 font-semibold text-stone-900">
                <BookOpen className="h-4 w-4 text-brand-hover" aria-hidden="true" />
                <span>Reading note</span>
              </p>
              <p className="mt-2">
                This is a prototype article. Sample claims and citations are illustrative; verify any production reference against its primary source.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
