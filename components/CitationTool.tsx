/**
 * Shared citation tool surface — used by the Next app (app/cite/page.tsx) and the
 * Pages target (cloudflare-pages/src/routes/cite.tsx). One source of truth
 * for the markup and behavior in both runtimes until Task 16 retires Next.
 */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Download, Quote } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { BlogPost, INITIAL_BLOG_POSTS } from '@/lib/blog-data';
import { CITATION_FORMATS, CitationFormat, buildCitation, citationFileExtension } from '@/lib/citations';
import { cleanText, safeExternalUrl, slugify } from '@/lib/validation';
import { Text, Link as TextLink } from '@/components/primitives';
import { VerifyMark } from '@/components/lottie';

const inputClass =
  'input min-h-11 w-full border-border-strong bg-surface-raised px-3 text-base text-ink focus:border-brand-hover';

/**
 * `initialArticles` — the catalogue from the server (metadata only), so the
 * route's HTML is complete without JavaScript. Optional: the Cloudflare Pages
 * build renders this without it and falls back to the client fetch below.
 */
export default function CitationTool({ initialArticles }: { initialArticles?: BlogPost[] } = {}) {
  const [articles, setArticles] = useState<BlogPost[]>(initialArticles ?? INITIAL_BLOG_POSTS);
  const [selectedSlug, setSelectedSlug] = useState<string>((initialArticles ?? INITIAL_BLOG_POSTS)[0]?.slug ?? '');
  const [format, setFormat] = useState<CitationFormat>('apa');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [isCustomPaper, setIsCustomPaper] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [customYear, setCustomYear] = useState('');
  const [customDoi, setCustomDoi] = useState('');
  const [customJournal, setCustomJournal] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch('/api/articles', { headers: { accept: 'application/json' } });
        if (!res.ok) return;
        const data: { articles?: BlogPost[] } = await res.json();
        if (active && Array.isArray(data.articles) && data.articles.length > 0) {
          setArticles(data.articles);
        }
      } catch {
        // The bundled catalog remains available when the API cannot be reached.
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const currentArticle = articles.find((article) => article.slug === selectedSlug) ?? articles[0];

  const source = useMemo(() => {
    const date = currentArticle?.dateISO || currentArticle?.publishedAt || '';
    const parsedDate = date ? new Date(date) : null;
    const publicationYear = parsedDate && !Number.isNaN(parsedDate.getTime()) ? String(parsedDate.getUTCFullYear()) : '';
    return {
      title: isCustomPaper ? cleanText(customTitle, 240) : currentArticle?.title ?? '',
      author: isCustomPaper ? cleanText(customAuthor, 120) : currentArticle?.author.name ?? '',
      year: isCustomPaper ? cleanText(customYear, 4) : publicationYear,
      journal: isCustomPaper ? cleanText(customJournal, 160) : '',
      doi: isCustomPaper ? cleanText(customDoi, 120) : '',
      url: isCustomPaper || !currentArticle?.slug ? undefined : `https://researchwith.me/post/${currentArticle.slug}`,
      publisher: null,
      kind: isCustomPaper ? undefined : 'webpage' as const,
    };
  }, [currentArticle, customAuthor, customDoi, customJournal, customTitle, customYear, isCustomPaper]);

  const citationText = useMemo(() => buildCitation(format, source), [format, source]);
  const citationEmpty = !source.title.trim();

  async function handleCopy() {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(citationText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
      setCopyError('Your browser blocked clipboard access. Select the citation text and copy it manually.');
    }
  }

  function handleDownloadFile() {
    const extension = citationFileExtension(format);
    const blob = new Blob([citationText], { type: 'text/plain;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `citation-${slugify(source.author) || 'research'}.${extension}`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }

  const cleanDoi = source.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').trim();
  const doiLink = /^10\.\d{4,9}\/\S+$/i.test(cleanDoi) ? safeExternalUrl(`https://doi.org/${cleanDoi}`) : null;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />

      <main tabIndex={-1} id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-ink-secondary">
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-ink hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Platform</span>
          </Link>
          <span aria-hidden="true" className="text-ink-secondary">/</span>
          <span className="font-medium text-brand">Citation builder</span>
        </nav>

        <header className="border-b border-line pb-8">
          <h1 className="max-w-3xl font-serif text-3xl font-bold tracking-tight text-ink sm:text-5xl">
            Build a citation that travels
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink">
            Choose a published review or an external paper, then copy a formatted citation for LaTeX, Zotero, Mendeley, EndNote, or a reference list. Every format uses the same source details; confirm them against the publisher record.
          </p>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <form className="space-y-8" onSubmit={(event) => event.preventDefault()}>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-ink">1. Choose the source</legend>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomPaper(false)}
                  aria-pressed={!isCustomPaper}
                  className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    !isCustomPaper
                      ? 'border-ink bg-surface-inverse text-text-inverse'
                      : 'border-border-strong bg-surface-raised text-ink hover:border-border-strong'
                  }`}
                >
                  Published in ResearchWithMe
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomPaper(true)}
                  aria-pressed={isCustomPaper}
                  className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    isCustomPaper
                      ? 'border-ink bg-surface-inverse text-text-inverse'
                      : 'border-border-strong bg-surface-raised text-ink hover:border-border-strong'
                  }`}
                >
                  External paper or DOI
                </button>
              </div>

              {!isCustomPaper ? (
                <div>
                  <label htmlFor="citation-source" className="mb-1.5 block text-sm font-medium text-ink">
                    Publication
                  </label>
                  <select
                    id="citation-source"
                    value={selectedSlug}
                    onChange={(event) => setSelectedSlug(event.target.value)}
                    className="select min-h-11 w-full border-border-strong bg-surface-raised text-base text-ink"
                  >
                    {articles.map((article) => (
                      <option key={article.id} value={article.slug}>
                        {article.title} — {article.author.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 max-w-xl text-sm text-ink-secondary">
                    {currentArticle ? `${currentArticle.category} · ${currentArticle.publishedAt} · ${currentArticle.readTime}` : 'No published articles are available.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="custom-title" className="mb-1.5 block text-sm font-medium text-ink">
                      Paper title <span className="text-ink-secondary">(required)</span>
                    </label>
                    <input
                      id="custom-title"
                      type="text"
                      value={customTitle}
                      onChange={(event) => setCustomTitle(event.target.value)}
                      required
                      autoComplete="off"
                      placeholder="A reproducible benchmark for open sensor networks"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="custom-author" className="mb-1.5 block text-sm font-medium text-ink">
                      Author
                    </label>
                    <input
                      id="custom-author"
                      type="text"
                      value={customAuthor}
                      onChange={(event) => setCustomAuthor(event.target.value)}
                      autoComplete="off"
                      placeholder="Dr. Jane Doe"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="custom-year" className="mb-1.5 block text-sm font-medium text-ink">
                      Year
                    </label>
                    <input
                      id="custom-year"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={customYear}
                      onChange={(event) => setCustomYear(event.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="2026"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="custom-journal" className="mb-1.5 block text-sm font-medium text-ink">
                      Journal or venue
                    </label>
                    <input
                      id="custom-journal"
                      type="text"
                      value={customJournal}
                      onChange={(event) => setCustomJournal(event.target.value)}
                      autoComplete="off"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="custom-doi" className="mb-1.5 block text-sm font-medium text-ink">
                      DOI or arXiv identifier
                    </label>
                    <input
                      id="custom-doi"
                      type="text"
                      value={customDoi}
                      onChange={(event) => setCustomDoi(event.target.value)}
                      autoComplete="off"
                      placeholder="10.1038/s41587-026-01234-5"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-ink">2. Choose a style</legend>
              <div className="flex flex-wrap gap-2">
                {CITATION_FORMATS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFormat(item)}
                    aria-pressed={format === item}
                    className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
                      format === item
                        ? 'border-brand bg-brand text-on-primary'
                        : 'border-border-strong bg-surface-raised text-ink hover:border-border-strong'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label htmlFor="citation-output" className="text-sm font-semibold text-ink">
                  3. Review and copy
                </label>
                <span className="font-mono text-sm text-ink-secondary">{format.toUpperCase()} · UTF-8</span>
              </div>
              <textarea
                id="citation-output"
                readOnly
                rows={format === 'bibtex' || format === 'ris' ? 10 : 5}
                value={citationEmpty ? '' : citationText}
                aria-describedby="citation-hint"
                className="textarea w-full resize-y border-border-strong bg-surface-raised p-4 font-mono text-base leading-relaxed text-ink"
              />
              <p id="citation-hint" className="text-sm text-ink-secondary">
                {citationEmpty
                  ? isCustomPaper ? 'Add a paper title to generate a citation.' : 'Choose an available published article to generate a citation.'
                  : 'Always confirm the DOI and page numbers against the publisher record before submitting.'}
              </p>

              {copyError && (
                <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {copyError}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={citationEmpty}
                  className="btn btn-primary min-h-11 rounded-full px-5"
                >
                  {copied ? <VerifyMark size={16} /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  <span>{copied ? 'Copied to clipboard' : 'Copy citation'}</span>
                </button>

                {(format === 'bibtex' || format === 'ris') && (
                  <button
                    type="button"
                    onClick={handleDownloadFile}
                    disabled={citationEmpty}
                    className="btn btn-outline min-h-11 rounded-full px-5"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    <span>Download .{citationFileExtension(format)}</span>
                  </button>
                )}

                {currentArticle && !isCustomPaper && (
                  <Link
                    href={`/post/${currentArticle.slug}`}
                    className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline underline-offset-4 hover:text-brand-pressed"
                  >
                    Read the cited article
                  </Link>
                )}
              </div>
            </div>
          </form>

          <aside aria-label="Citation details" className="card h-fit space-y-4 border border-line bg-surface p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Quote className="h-4 w-4 text-brand-hover" aria-hidden="true" />
              <span>Record details</span>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-ink-secondary">Author</dt>
                <dd className="font-medium text-ink">{source.author || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-ink-secondary">Year</dt>
                <dd className="font-medium text-ink">{source.year || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-ink-secondary">Venue</dt>
                <dd className="font-medium text-ink">{source.journal || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-ink-secondary">DOI</dt>
                <dd className="break-words font-mono text-ink">{source.doi || 'Not assigned'}</dd>
              </div>
            </dl>
            {doiLink && (
              <a
                href={doiLink}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex text-sm font-medium text-brand underline underline-offset-4 hover:text-brand-pressed"
              >
                Resolve DOI at doi.org
              </a>
            )}
            <p className="border-t border-line pt-4 text-sm leading-relaxed text-ink-secondary">
              Prefer reusable metadata? Choose BibTeX or RIS and download the file for your reference manager.
            </p>
          </aside>
        </div>

        <section aria-labelledby="citation-standards-heading" className="mt-12 border-t border-line pt-8">
          <Text id="citation-standards-heading" as="h2" variant="card-title">
            Scholarly provenance and reference verification
          </Text>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-secondary">
            Formatted references are generated from published article metadata and any primary DOI, URL, or identifier
            attached to the reviewed work. Downloaded <code className="font-mono text-xs">.bib</code> and{' '}
            <code className="font-mono text-xs">.ris</code> records import directly into Zotero, JabRef, Mendeley, and
            LaTeX workflows. Query primary sources interactively in the{' '}
            <TextLink href="/assistant">research assistant</TextLink>.
          </p>
        </section>
      </main>

      <BlogFooter />
    </div>
  );
}
