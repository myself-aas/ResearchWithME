/**
 * Shared quarterly editions archive surface — used by the Next app (app/editions/page.tsx) and the
 * Pages target (cloudflare-pages/src/routes/editions.tsx). One source of truth
 * for the markup and behavior in both runtimes until Task 16 retires Next.
 */
import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import PrintButton from '@/components/PrintButton';
import VideoEmbed from '@/components/VideoEmbed';
import { PDF_EDITIONS_DATA, PUBLICATIONS_DATA } from '@/lib/research-data';

export default function EditionsArchive() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <BlogHeader />

      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <header className="border-b border-stone-200 pb-8">
          <h1 className="max-w-4xl font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Quarterly editions for offline reading
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-stone-700">
            Thematic compendiums that gather a quarter&apos;s reviews, methods, and corrections into one printable volume. Use the print action to save a volume as a PDF through your browser.
          </p>
        </header>

        <p className="mt-6 max-w-3xl border-l-2 border-brand-hover bg-indigo-50 px-4 py-3 text-sm leading-relaxed text-brand-pressed">
          Print-ready compilation is a browser feature in this prototype. A hosted archival PDF and its DOI would be issued by the production publishing pipeline.
        </p>

        <ul className="mt-8 grid gap-8 lg:grid-cols-2">
          {PDF_EDITIONS_DATA.map((edition, editionIndex) => {
            const featuredPapers = PUBLICATIONS_DATA.filter((paper) =>
              edition.featuredArticleIds.includes(paper.id),
            );

            return (
              <li key={edition.id} className="flex">
                <article
                  aria-labelledby={`edition-${edition.id}-title`}
                  className="flex w-full flex-col rounded-lg border border-stone-200 bg-white"
                >
                  <div className="border-b border-stone-200 px-6 py-4">
                    <p className="flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
                      <span className="font-medium text-brand">{edition.period}</span>
                      <span>
                        Volume {edition.volume}, Issue {edition.issue}
                      </span>
                    </p>
                  </div>

                  <div className="flex-1 px-6 py-6">
                    <h2 id={`edition-${edition.id}-title`} className="font-serif text-2xl font-semibold leading-snug text-stone-900">
                      {edition.title}
                    </h2>
                    <p className="mt-2 text-sm font-medium text-brand">{edition.theme}</p>
                    <p className="mt-3 max-w-prose text-base leading-relaxed text-stone-700">{edition.description}</p>

                    {editionIndex === 0 && (
                      <div className="mt-5">
                        <span className="inline-flex items-center rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-brand mb-3">
                          Edition trailer
                        </span>
                        <VideoEmbed
                          src="/videos/edition-trailer.mp4"
                          label={`Trailer for ${edition.title}`}
                        />
                      </div>
                    )}

                    <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-stone-200 py-4 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="text-stone-600">Articles</dt>
                        <dd className="mt-0.5 font-semibold text-stone-900">{edition.articleCount}</dd>
                      </div>
                      <div>
                        <dt className="text-stone-600">Pages</dt>
                        <dd className="mt-0.5 font-semibold text-stone-900">{edition.pages}</dd>
                      </div>
                      <div>
                        <dt className="text-stone-600">Published</dt>
                        <dd className="mt-0.5 font-semibold text-stone-900">{edition.publicationDate}</dd>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <dt className="text-stone-600">Editor</dt>
                        <dd className="mt-0.5 font-semibold text-stone-900">{edition.editor}</dd>
                      </div>
                    </dl>

                    <h3 className="mt-6 text-sm font-semibold text-stone-900">Papers in this volume</h3>
                    {featuredPapers.length > 0 ? (
                      <ul className="mt-2 divide-y divide-stone-200">
                        {featuredPapers.map((paper) => (
                          <li key={paper.id}>
                            <Link
                              href={`/paper/${paper.slug}`}
                              className="group flex items-start justify-between gap-3 py-3 text-sm text-stone-800 transition-colors hover:text-brand"
                            >
                              <span className="font-medium">{paper.title}</span>
                              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-stone-500 group-hover:text-brand" aria-hidden="true" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-stone-600">This volume&apos;s contents are being prepared.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 px-6 py-4">
                    <span className="font-mono text-sm text-stone-600">DOI 10.5555/rwm.ed.{edition.id}</span>
                    <PrintButton label={`Print volume ${edition.volume}.${edition.issue}`} />
                  </div>
                </article>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-6">
          <p className="text-sm text-stone-600">
            Looking for a single paper? The paper archive keeps every record with its own citation metadata.
          </p>
          <Link
            href="/papers"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand underline underline-offset-4 hover:text-brand-pressed"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>Browse papers</span>
          </Link>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
