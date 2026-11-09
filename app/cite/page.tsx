'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Copy, Download, Quote } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { BlogPost, INITIAL_BLOG_POSTS } from '@/lib/blog-data';
import { CITATION_FORMATS, CitationFormat, buildCitation, citationFileExtension } from '@/lib/citations';
import { cleanText, safeExternalUrl, slugify } from '@/lib/validation';

const inputClass =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 transition-colors focus:border-brand-hover';

export default function CitePage() {
  const [articles, setArticles] = useState<BlogPost[]>(INITIAL_BLOG_POSTS);
  const [selectedSlug, setSelectedSlug] = useState<string>(INITIAL_BLOG_POSTS[0]?.slug ?? '');
  const [format, setFormat] = useState<CitationFormat>('apa');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [isCustomPaper, setIsCustomPaper] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [customYear, setCustomYear] = useState('2026');
  const [customDoi, setCustomDoi] = useState('');
  const [customJournal, setCustomJournal] = useState('ResearchWithMe Studies');

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
    const fallbackYear = '2026';
    const articleDoi = currentArticle?.reviewedArtifact?.identifier ?? '';
    return {
      title: isCustomPaper && customTitle ? cleanText(customTitle, 240) : currentArticle?.title ?? 'Untitled article',
      author: isCustomPaper && customAuthor ? cleanText(customAuthor, 120) : currentArticle?.author.name ?? 'ResearchWithMe Editors',
      year: isCustomPaper ? cleanText(customYear, 4) || fallbackYear : fallbackYear,
      journal: isCustomPaper && customJournal ? cleanText(customJournal, 160) : 'ResearchWithMe Technical Reviews',
      doi: isCustomPaper ? cleanText(customDoi, 120) : articleDoi,
      url: currentArticle?.slug ? `https://researchwith.me/post/${currentArticle.slug}` : 'https://researchwith.me',
    };
  }, [currentArticle, customAuthor, customDoi, customJournal, customTitle, customYear, isCustomPaper]);

  const citationText = useMemo(() => buildCitation(format, source), [format, source]);
  const citationEmpty = isCustomPaper && !source.title.trim();

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

  const doiLink = safeExternalUrl(`https://doi.org/${source.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')}`);

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <BlogHeader />

      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-stone-600">
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-stone-900 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Platform</span>
          </Link>
          <span aria-hidden="true" className="text-stone-400">/</span>
          <span className="font-medium text-brand">Citation builder</span>
        </nav>

        <header className="border-b border-stone-200 pb-8">
          <h1 className="max-w-3xl font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Build a citation that travels
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-700">
            Choose a published review or an external paper, then copy a formatted citation for LaTeX, Zotero, Mendeley, EndNote, or a reference list. Every format uses the same verified metadata.
          </p>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <form className="space-y-8" onSubmit={(event) => event.preventDefault()}>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-stone-900">1. Choose the source</legend>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomPaper(false)}
                  aria-pressed={!isCustomPaper}
                  className={`min-h-11 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                    !isCustomPaper
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-300 bg-white text-stone-800 hover:border-stone-400'
                  }`}
                >
                  Published in ResearchWithMe
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomPaper(true)}
                  aria-pressed={isCustomPaper}
                  className={`min-h-11 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                    isCustomPaper
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-300 bg-white text-stone-800 hover:border-stone-400'
                  }`}
                >
                  External paper or DOI
                </button>
              </div>

              {!isCustomPaper ? (
                <div>
                  <label htmlFor="citation-source" className="mb-1.5 block text-sm font-medium text-stone-800">
                    Publication
                  </label>
                  <select
                    id="citation-source"
                    value={selectedSlug}
                    onChange={(event) => setSelectedSlug(event.target.value)}
                    className={inputClass}
                  >
                    {articles.map((article) => (
                      <option key={article.id} value={article.slug}>
                        {article.title} — {article.author.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 max-w-xl text-sm text-stone-600">
                    {currentArticle?.category ?? 'Research'} · {currentArticle?.publishedAt ?? 'Published'} · {currentArticle?.readTime ?? 'Reading time available on the article'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="custom-title" className="mb-1.5 block text-sm font-medium text-stone-800">
                      Paper title <span className="text-stone-600">(required)</span>
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
                    <label htmlFor="custom-author" className="mb-1.5 block text-sm font-medium text-stone-800">
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
                    <label htmlFor="custom-year" className="mb-1.5 block text-sm font-medium text-stone-800">
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
                    <label htmlFor="custom-journal" className="mb-1.5 block text-sm font-medium text-stone-800">
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
                    <label htmlFor="custom-doi" className="mb-1.5 block text-sm font-medium text-stone-800">
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
              <legend className="text-sm font-semibold text-stone-900">2. Choose a style</legend>
              <div className="flex flex-wrap gap-2">
                {CITATION_FORMATS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFormat(item)}
                    aria-pressed={format === item}
                    className={`min-h-11 rounded-md border px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
                      format === item
                        ? 'border-brand bg-brand text-white'
                        : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label htmlFor="citation-output" className="text-sm font-semibold text-stone-900">
                  3. Review and copy
                </label>
                <span className="font-mono text-sm text-stone-600">{format.toUpperCase()} · UTF-8</span>
              </div>
              <textarea
                id="citation-output"
                readOnly
                rows={format === 'bibtex' || format === 'ris' ? 10 : 5}
                value={citationEmpty ? '' : citationText}
                aria-describedby="citation-hint"
                className="w-full resize-y rounded-lg border border-stone-300 bg-white p-4 font-mono text-sm leading-relaxed text-stone-900"
              />
              <p id="citation-hint" className="text-sm text-stone-600">
                {citationEmpty
                  ? 'Add a paper title to generate a citation.'
                  : 'Always confirm the DOI and page numbers against the publisher record before submitting.'}
              </p>

              {copyError && (
                <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                  {copyError}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={citationEmpty}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
                >
                  {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  <span>{copied ? 'Copied to clipboard' : 'Copy citation'}</span>
                </button>

                {(format === 'bibtex' || format === 'ris') && (
                  <button
                    type="button"
                    onClick={handleDownloadFile}
                    disabled={citationEmpty}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 transition-colors hover:border-stone-400 disabled:opacity-50"
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

          <aside aria-label="Citation details" className="h-fit space-y-4 rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <Quote className="h-4 w-4 text-brand-hover" aria-hidden="true" />
              <span>Record details</span>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-stone-600">Author</dt>
                <dd className="font-medium text-stone-900">{source.author}</dd>
              </div>
              <div>
                <dt className="text-stone-600">Year</dt>
                <dd className="font-medium text-stone-900">{source.year}</dd>
              </div>
              <div>
                <dt className="text-stone-600">Venue</dt>
                <dd className="font-medium text-stone-900">{source.journal}</dd>
              </div>
              <div>
                <dt className="text-stone-600">DOI</dt>
                <dd className="break-words font-mono text-stone-900">{source.doi || 'Not assigned'}</dd>
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
            <p className="border-t border-stone-200 pt-4 text-sm leading-relaxed text-stone-600">
              Prefer reusable metadata? Choose BibTeX or RIS and download the file for your reference manager.
            </p>
          </aside>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
