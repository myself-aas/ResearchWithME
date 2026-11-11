import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, FileText, Quote, ShieldCheck } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import ReadingActions from '@/components/ReadingActions';
import ReadingProgress from '@/components/ReadingProgress';
import Reveal from '@/components/motion/Reveal';
import ArticleSmoothScroll from '@/components/reader/ArticleSmoothScroll';
import ReadingProgressDock from '@/components/reader/ReadingProgressDock';
import InlineCitationPopover from '@/components/reader/InlineCitationPopover';
import SpecialistBadgePopover from '@/components/reader/SpecialistBadgePopover';
import type { CitationSource } from '@/lib/citations';
import { PUBLICATIONS_DATA } from '@/lib/research-data';
import { pageMetadata } from '@/lib/seo';
import { scholarlyArticleJsonLd, jsonLdScript } from '@/lib/seo/jsonld';

export function generateStaticParams() {
  return PUBLICATIONS_DATA.map((paper) => ({ slug: paper.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const paper = PUBLICATIONS_DATA.find((item) => item.slug === slug);
  if (!paper) notFound();
  return pageMetadata({
    title: paper?.title ?? 'Research Paper',
    description: paper?.abstract ?? 'Read the full structured paper: methods, findings, references, and citation metadata.',
    path: `/paper/${slug}`,
    type: 'article',
  });
}

const sections = [
  { key: 'background', heading: '1. Context and research problem' },
  { key: 'methodology', heading: '2. Methodology and observational setup' },
  { key: 'findings', heading: '3. Empirical findings and benchmarks' },
  { key: 'discussion', heading: '4. Technical discussion and trade-offs' },
  { key: 'implications', heading: '5. Implications for practitioners' },
] as const;

export default async function PaperDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const paper = PUBLICATIONS_DATA.find((item) => item.slug === slug || item.id === slug);

  if (!paper) {
    notFound();
  }

  const citeHref = `/cite?article=${encodeURIComponent(paper.slug)}`;
  const paperCitationSource: CitationSource = {
    title: paper.title,
    author: paper.authors.map((a) => a.name).join(', ') || 'ResearchWithMe',
    year: String(paper.year),
    journal: paper.journal,
    doi: paper.doi,
    url: `https://researchwith.me/paper/${paper.slug}`,
  };

  const jsonLd = scholarlyArticleJsonLd({
    title: paper.title,
    description: paper.abstract,
    path: `/paper/${paper.slug}`,
    authors: paper.authors.map((a) => a.name),
    authorProfiles: paper.authors.map((a) => ({
      name: a.name,
      slug: a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      orcid: a.orcid,
    })),
    datePublished: paper.publishedDate,
    doi: paper.doi,
    journal: paper.journal,
  });

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <ReadingProgress />
      <ArticleSmoothScroll />
      <BlogHeader />

      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-8 sm:px-6 sm:pt-10 lg:px-8">
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
              <Link href="/papers" className="hover:text-ink hover:underline">
                Papers
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5 text-ink-secondary" />
            </li>
            <li aria-current="page" className="max-w-[24rem] truncate font-medium text-ink">
              {paper.title}
            </li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12">
          <article aria-labelledby="paper-title" className="min-w-0">
            <header className="border-b border-line pb-8">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-ink-secondary">
                <span className="font-semibold text-brand">{paper.topic}</span>
                <span aria-hidden="true">·</span>
                <span>{paper.journal}</span>
                <span aria-hidden="true">·</span>
                <span>
                  Vol. {paper.volume}, No. {paper.issue}
                </span>
                <span aria-hidden="true">·</span>
                <time dateTime={paper.publishedDate}>{paper.publishedDate}</time>
                <span aria-hidden="true">·</span>
                <span>{paper.readTime}</span>
              </p>

              <h1 id="paper-title" className="mt-3 max-w-4xl font-serif text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl lg:text-5xl">
                {paper.title}
              </h1>

              {paper.subtitle && (
                <p className="mt-4 reading-column font-serif text-xl leading-relaxed text-ink-secondary">
                  {paper.subtitle}
                </p>
              )}

              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {paper.authors.map((author) => {
                  const slugId = author.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  return (
                    <li key={author.name} className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-line bg-surface font-mono text-xs font-semibold text-ink"
                      >
                        {author.name
                          .split(' ')
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <span className="min-w-0 font-sans text-xs">
                        <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                          <span>{author.name}</span>
                          {author.orcid && (
                            <SpecialistBadgePopover
                              author={{
                                id: slugId,
                                name: author.name,
                                role: author.role,
                                institution: author.affiliation,
                                orcid: author.orcid,
                                verifiedVia: 'orcid',
                                verifiedIdentifier: author.orcid,
                              }}
                            />
                          )}
                        </span>
                        <span className="mt-0.5 block text-ink-secondary">{author.affiliation}</span>
                        <span className="block text-ink-secondary">{author.role}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6">
                <ReadingActions itemId={paper.id} storageKey="rwm_saved_papers" title={paper.title} doi={paper.doi} showPrint />
              </div>
            </header>

            <section aria-labelledby="abstract-heading" className="reading-column border-b border-line py-8">
              <h2 id="abstract-heading" className="font-mono text-xs font-semibold uppercase tracking-wider text-ink">
                Abstract
              </h2>
              <p className="mt-3 font-serif text-lg leading-relaxed text-ink">{paper.abstract}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {paper.keywords.map((keyword) => (
                  <li key={keyword} className="rounded-sm border border-line bg-surface px-2.5 py-1 font-mono text-xs text-ink-secondary">
                    {keyword}
                  </li>
                ))}
              </ul>
            </section>

            <div className="reading-prose reading-column space-y-10 py-8">
              {sections.map((section) => {
                const value = paper.fullContent?.[section.key];
                if (!value) return null;
                return (
                  <Reveal
                    as="section"
                    key={section.key}
                    aria-labelledby={`section-${section.key}`}
                    variant="rise"
                    amount={0.08}
                    delay={60}
                  >
                    <h2 id={`section-${section.key}`} className="font-serif text-2xl font-semibold text-ink">
                      {section.heading}
                    </h2>
                    {Array.isArray(value) ? (
                      <ul className="mt-4 space-y-3">
                        {value.map((item) => (
                          <li key={item} className="flex gap-3 font-serif text-lg leading-relaxed text-ink">
                            <span aria-hidden="true" className="font-mono text-brand">—</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 reading-column break-words font-serif text-lg leading-relaxed text-ink">
                        {value}
                      </p>
                    )}
                  </Reveal>
                );
              })}
            </div>

            {paper.fullContent?.references && paper.fullContent.references.length > 0 && (
              <Reveal
                as="section"
                variant="stage"
                aria-labelledby="references-heading"
                className="reading-column border-t border-line py-8"
              >
                <h2 id="references-heading" className="font-serif text-2xl font-semibold text-ink">
                  References and primary literature
                </h2>
                <ol className="mt-4 space-y-3">
                  {paper.fullContent.references.map((reference, index) => (
                    <li key={reference} className="flex gap-3 font-sans text-sm leading-relaxed text-ink-secondary">
                      <span className="font-mono text-xs text-brand">{String(index + 1).padStart(2, '0')}</span>
                      <span className="min-w-0 break-words">{reference}</span>
                    </li>
                  ))}
                </ol>
              </Reveal>
            )}

            <footer className="reading-column border-t border-line py-8">
              <div className="flex flex-wrap gap-3">
                <Link
                  href={citeHref}
                  className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-ink px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90"
                >
                  <Quote className="h-4 w-4" aria-hidden="true" />
                  <span>Build a citation</span>
                </Link>
                <Link
                  href="/papers"
                  className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-line bg-surface px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-subtle"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  <span>Back to the archive</span>
                </Link>
              </div>
            </footer>
          </article>

          <aside
            aria-label="Publication record"
            className="h-fit space-y-6 border-t border-line pt-8 lg:sticky lg:top-24 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"
          >
            <div className="rounded-sm border border-line bg-surface p-5">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-ink">
                Publication record
              </h2>
              <dl className="mt-4 space-y-3 font-mono text-xs">
                <div>
                  <dt className="uppercase tracking-wider text-ink-secondary">DOI</dt>
                  <dd className="mt-0.5 break-all text-ink">
                    <InlineCitationPopover
                      label={paper.doi}
                      source={paperCitationSource}
                      citeHref={citeHref}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-ink-secondary">ISSN</dt>
                  <dd className="mt-0.5 text-ink">2994-0821</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-ink-secondary">Journal</dt>
                  <dd className="mt-0.5 font-sans text-ink">{paper.journal}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-ink-secondary">Volume &amp; Issue</dt>
                  <dd className="mt-0.5 text-ink">
                    {paper.volume}, {paper.issue}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-ink-secondary">Pages</dt>
                  <dd className="mt-0.5 text-ink">{paper.pages}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-ink-secondary">License</dt>
                  <dd className="mt-0.5 text-ink">{paper.license}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-ink-secondary">Citations</dt>
                  <dd className="mt-0.5 text-ink">{paper.citationCount}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-ink-secondary">Data &amp; Code</dt>
                  <dd className="mt-0.5 break-all font-sans text-ink">
                    {paper.dataUrl ? (
                      <a
                        href={paper.dataUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-brand underline underline-offset-4 hover:text-brand-pressed"
                      >
                        Repository record
                      </a>
                    ) : (
                      'No public data deposit listed'
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-sm border border-line bg-surface p-5 font-sans text-xs leading-relaxed text-ink-secondary">
              <p className="flex items-center gap-2 font-mono uppercase tracking-wider text-ink">
                <ShieldCheck className="h-4 w-4 text-brand" aria-hidden="true" />
                <span>Archive note</span>
              </p>
              <p className="mt-2">
                Confirm formal DOI registrations and dataset checksums against the upstream repository when citing in peer-reviewed venues.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <ReadingProgressDock
        itemId={paper.id}
        itemKind="paper"
        readTime={paper.readTime}
        citationSource={paperCitationSource}
        citeHref={citeHref}
      />

      <BlogFooter />
    </div>
  );
}
