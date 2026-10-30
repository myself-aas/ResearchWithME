import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, FileText, GraduationCap, Quote, ShieldCheck } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import ReadingActions from '@/components/ReadingActions';
import { PUBLICATIONS_DATA } from '@/lib/research-data';
import { pageMetadata } from '@/lib/seo';

export function generateStaticParams() {
  return PUBLICATIONS_DATA.map((paper) => ({ slug: paper.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const paper = PUBLICATIONS_DATA.find((item) => item.slug === slug);
  if (!paper) notFound();
  return pageMetadata({
    title: paper?.title ?? 'Research Paper',
    description: paper?.abstract ?? 'Read the full publication: method, findings, references, and citation details.',
    path: `/paper/${slug}`,
    type: 'article',
  });
}

const sections = [
  { key: 'background', heading: '1. Background and problem' },
  { key: 'methodology', heading: '2. Method' },
  { key: 'findings', heading: '3. Findings' },
  { key: 'discussion', heading: '4. Discussion' },
  { key: 'implications', heading: '5. What practitioners can use' },
] as const;

export default async function PaperDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const paper = PUBLICATIONS_DATA.find((item) => item.slug === slug || item.id === slug);

  if (!paper) {
    notFound();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <BlogHeader />

      <main id="main-content" className="page-container page-main max-w-wide flex-1">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-stone-600">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-stone-900 hover:underline">
                Journal
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-stone-500" />
            </li>
            <li>
              <Link href="/papers" className="hover:text-stone-900 hover:underline">
                Papers
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-stone-500" />
            </li>
            <li aria-current="page" className="max-w-[24rem] truncate font-medium text-stone-900">
              {paper.title}
            </li>
          </ol>
        </nav>

        <div className="article-grid">
          <article aria-labelledby="paper-title" className="min-w-0">
            <header className="border-b border-stone-200 pb-8">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600">
                <span className="font-medium text-amber-900">{paper.topic}</span>
                <span aria-hidden="true">·</span>
                <span>{paper.journal}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {paper.volume}, {paper.issue}
                </span>
                <span aria-hidden="true">·</span>
                <time dateTime={paper.publishedDate}>{paper.publishedDate}</time>
                <span aria-hidden="true">·</span>
                <span>{paper.readTime}</span>
              </p>

              <h1 id="paper-title" className="mt-3 font-serif text-3xl font-bold leading-tight tracking-tight text-stone-900 sm:text-4xl lg:text-5xl">
                {paper.title}
              </h1>

              {paper.subtitle && <p className="mt-4 max-w-prose text-lg leading-relaxed text-stone-700">{paper.subtitle}</p>}

              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {paper.authors.map((author) => (
                  <li key={author.name} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-900 font-serif text-sm font-bold text-stone-50"
                    >
                      {author.name
                        .split(' ')
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <span className="min-w-0 text-sm">
                      <span className="flex flex-wrap items-center gap-1.5 font-semibold text-stone-900">
                        <span>{author.name}</span>
                        {author.orcid && (
                          <a
                            href={`https://orcid.org/${author.orcid}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 text-emerald-800 underline-offset-4 hover:underline"
                          >
                            <GraduationCap className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">ORCID record for {author.name}</span>
                          </a>
                        )}
                      </span>
                      <span className="block text-stone-600">{author.affiliation}</span>
                      <span className="block text-stone-600">{author.role}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <ReadingActions itemId={paper.id} storageKey="rwm_saved_papers" title={paper.title} doi={paper.doi} showPrint />
              </div>
            </header>

            <section aria-labelledby="abstract-heading" className="border-b border-stone-200 py-8">
              <h2 id="abstract-heading" className="font-serif text-2xl font-semibold text-stone-900">
                Abstract
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-stone-800">{paper.abstract}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {paper.keywords.map((keyword) => (
                  <li key={keyword} className="rounded border border-stone-300 bg-white px-2 py-1 font-mono text-sm text-stone-700">
                    {keyword}
                  </li>
                ))}
              </ul>
            </section>

            <div className="space-y-10 py-8">
              {sections.map((section) => {
                const value = paper.fullContent?.[section.key];
                if (!value) return null;
                return (
                  <section key={section.key} aria-labelledby={`section-${section.key}`}>
                    <h2 id={`section-${section.key}`} className="font-serif text-2xl font-semibold text-stone-900">
                      {section.heading}
                    </h2>
                    {Array.isArray(value) ? (
                      <ul className="mt-4 space-y-3">
                        {value.map((item) => (
                          <li key={item} className="flex gap-3 text-lg leading-relaxed text-stone-800">
                            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-800" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 break-words text-lg leading-relaxed text-stone-800">{value}</p>
                    )}
                  </section>
                );
              })}
            </div>

            {paper.fullContent?.references && paper.fullContent.references.length > 0 && (
              <section aria-labelledby="references-heading" className="border-t border-stone-200 py-8">
                <h2 id="references-heading" className="font-serif text-2xl font-semibold text-stone-900">
                  References
                </h2>
                <ol className="mt-4 space-y-3">
                  {paper.fullContent.references.map((reference, index) => (
                    <li key={reference} className="flex gap-3 text-base leading-relaxed text-stone-700">
                      <span className="font-mono text-sm text-stone-600">{index + 1}.</span>
                      <span className="min-w-0 break-words">{reference}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <footer className="border-t border-stone-200 py-8">
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/cite?article=${encodeURIComponent(paper.slug)}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
                >
                  <Quote className="h-4 w-4" aria-hidden="true" />
                  <span>Cite this paper</span>
                </Link>
                <Link
                  href="/papers"
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 transition-colors hover:border-stone-400 hover:bg-white"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  <span>All papers</span>
                </Link>
              </div>
            </footer>
          </article>

          <aside aria-label="Record" className="h-fit space-y-6 lg:sticky lg:top-24">
            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="font-serif text-lg font-semibold text-stone-900">Record</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-stone-600">DOI</dt>
                  <dd className="break-all font-mono text-stone-900">{paper.doi}</dd>
                </div>
                <div>
                  <dt className="text-stone-600">Journal</dt>
                  <dd className="text-stone-900">{paper.journal}</dd>
                </div>
                <div>
                  <dt className="text-stone-600">Volume and issue</dt>
                  <dd className="text-stone-900">
                    {paper.volume}, {paper.issue}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-600">Pages</dt>
                  <dd className="text-stone-900">{paper.pages}</dd>
                </div>
                <div>
                  <dt className="text-stone-600">License</dt>
                  <dd className="text-stone-900">{paper.license}</dd>
                </div>
                <div>
                  <dt className="text-stone-600">Citations</dt>
                  <dd className="text-stone-900">{paper.citationCount}</dd>
                </div>
                <div>
                  <dt className="text-stone-600">Data and code</dt>
                  <dd className="break-all text-stone-900">
                    {paper.dataUrl ? (
                      <a
                        href={paper.dataUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-amber-900 underline underline-offset-4 hover:text-amber-950"
                      >
                        Open the repository
                      </a>
                    ) : (
                      'None listed'
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-stone-200 bg-stone-100 p-5 text-sm leading-relaxed text-stone-700">
              <p className="flex items-center gap-2 font-semibold text-stone-900">
                <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <span>Note on this record</span>
              </p>
              <p className="mt-2">
                This record belongs to a prototype archive. The DOI and license are sample values, so check any citation against the issuing registry before you use it.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
