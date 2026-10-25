'use client';

import React, { useState, useEffect, Suspense, use } from 'react';
import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { 
  Quote, 
  Copy, 
  Check, 
  Download, 
  ArrowLeft, 
  BookOpen, 
  FileCode, 
  ExternalLink,
  PlusCircle
} from 'lucide-react';
import { BlogPost, INITIAL_BLOG_POSTS } from '@/lib/blog-data';

function CitationBuilderContent({ initialArticleSlug }: { initialArticleSlug?: string }) {
  const [articles, setArticles] = useState<BlogPost[]>(INITIAL_BLOG_POSTS);
  const [selectedSlug, setSelectedSlug] = useState<string>(initialArticleSlug || 'inside-vllm-and-paged-attention');
  const [format, setFormat] = useState<'apa' | 'chicago' | 'mla' | 'bibtex' | 'ris' | 'ieee'>('apa');
  const [copied, setCopied] = useState(false);

  // Custom article fields (if user wants to cite an external research paper)
  const [isCustomPaper, setIsCustomPaper] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [customYear, setCustomYear] = useState('2026');
  const [customDoi, setCustomDoi] = useState('');
  const [customJournal, setCustomJournal] = useState('ResearchWithMe Studies');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/articles');
        if (res.ok) {
          const data = await res.json();
          if (data.articles) {
            setArticles(data.articles);
            if (initialArticleSlug) {
              setSelectedSlug(initialArticleSlug);
            } else if (data.articles.length > 0) {
              setSelectedSlug(data.articles[0].slug);
            }
          }
        }
      } catch (e) {
        console.warn(e);
      }
    }
    load();
  }, [initialArticleSlug]);

  const currentArticle = articles.find((a) => a.slug === selectedSlug || a.id === selectedSlug) || articles[0];

  const title = isCustomPaper && customTitle ? customTitle : currentArticle?.title || 'Untitled Article';
  const author = isCustomPaper && customAuthor ? customAuthor : currentArticle?.author.name || 'Author';
  const year = isCustomPaper ? customYear : '2026';
  const journal = isCustomPaper && customJournal ? customJournal : 'ResearchWithMe Technical Reviews';
  const doi = isCustomPaper && customDoi ? customDoi : (currentArticle?.reviewedArtifact?.identifier || '10.5555/rwm.2026.0401');

  const leadAuthorLast = author.split(' ').pop() || 'Author';
  const leadAuthorInitial = author.split(' ')[0][0] || 'A';

  const citations: Record<string, string> = {
    apa: `${leadAuthorLast}, ${leadAuthorInitial}. (${year}). ${title}. ${journal}. https://doi.org/${doi}`,
    mla: `${leadAuthorLast}, ${author.split(' ')[0]}. "${title}." ${journal}, ${year}, https://doi.org/${doi}.`,
    chicago: `${leadAuthorLast}, ${author.split(' ')[0]}. "${title}." ${journal} (${year}). https://doi.org/${doi}.`,
    ieee: `[1] ${leadAuthorInitial}. ${leadAuthorLast}, "${title}," ${journal}, ${year}. doi: ${doi}.`,
    bibtex: `@article{${leadAuthorLast.toLowerCase()}${year},
  title = {${title}},
  author = {${author}},
  journal = {${journal}},
  year = {${year}},
  doi = {${doi}},
  url = {https://researchwith.me/post/${currentArticle?.slug || 'review'}},
  publisher = {ResearchWithMe Press}
}`,
    ris: `TY  - JOUR
TI  - ${title}
AU  - ${author}
JO  - ${journal}
PY  - ${year}
DO  - ${doi}
UR  - https://researchwith.me/post/${currentArticle?.slug || 'review'}
ER  - `,
  };

  const citationText = citations[format] || citations['apa'];

  const handleCopy = () => {
    navigator.clipboard.writeText(citationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const ext = format === 'ris' ? 'ris' : 'bib';
    const blob = new Blob([citationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citation-${leadAuthorLast.toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white text-stone-900 flex flex-col font-sans antialiased selection:bg-amber-900 selection:text-white">
      <BlogHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-6 font-sans">
          <Link href="/" className="hover:text-stone-900 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Feed</span>
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-amber-900">Citation Generator</span>
        </div>

        {/* Header */}
        <div className="border-b border-stone-200 pb-6 mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900 mb-1">
            <Quote className="w-4 h-4" />
            <span>Bibliographic Standards & Citation Formatter</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Scholarly Citation & BibTeX Exporter
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-sans mt-1">
            Generate standardized citations for peer-reviewed research papers, technical teardowns, and essays in 6 academic styles.
          </p>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Article Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-800">
                Select Article from Catalog:
              </label>
              <button
                onClick={() => setIsCustomPaper(!isCustomPaper)}
                className="text-xs text-amber-900 hover:underline font-medium"
              >
                {isCustomPaper ? '← Select from published catalog' : '+ Cite an external paper / DOI'}
              </button>
            </div>

            {!isCustomPaper ? (
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
              >
                {articles.map((a) => (
                  <option key={a.id} value={a.slug}>
                    {a.title} — {a.author.name} ({a.category})
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Paper Title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Author (e.g. Dr. Jane Doe)"
                    value={customAuthor}
                    onChange={(e) => setCustomAuthor(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="DOI or arXiv (e.g. 10.1038/s41587)"
                    value={customDoi}
                    onChange={(e) => setCustomDoi(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg p-2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Format Tabs (Interactive button controls) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-700 block">
              Citation Style Format:
            </label>
            <div className="flex items-center gap-1.5 p-1 bg-stone-200/80 rounded-xl overflow-x-auto text-xs">
              {(['apa', 'mla', 'chicago', 'ieee', 'bibtex', 'ris'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold uppercase transition-all whitespace-nowrap ${
                    format === fmt
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Formatted Citation Output Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="font-semibold uppercase text-stone-700">{format} Standard</span>
              <span className="font-mono text-[11px]">UTF-8 Encoded</span>
            </div>

            <textarea
              readOnly
              value={citationText}
              rows={format === 'bibtex' || format === 'ris' ? 9 : 4}
              className="w-full bg-white border border-stone-300 rounded-xl p-4 text-xs font-mono text-stone-900 leading-relaxed focus:outline-none shadow-xs"
            />
          </div>

          {/* Action Toolbar */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-200">
            <div className="text-xs text-stone-500">
              Open Access · Ready for LaTeX, Overleaf, Zotero, Mendeley & EndNote
            </div>

            <div className="flex items-center gap-2">
              {(format === 'bibtex' || format === 'ris') && (
                <button
                  onClick={handleDownloadFile}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .{format === 'ris' ? 'ris' : 'bib'}</span>
                </button>
              )}

              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white px-5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied Citation!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Citation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      <BlogFooter onCategorySelect={() => {}} onOpenWriteModal={() => {}} />
    </div>
  );
}

export default function CitePage(props: {
  searchParams?: Promise<{ article?: string }>;
}) {
  const searchParams = props.searchParams ? React.use(props.searchParams) : undefined;
  const initialArticleSlug = typeof searchParams?.article === 'string' ? searchParams.article : undefined;

  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading citation tool...</div>}>
      <CitationBuilderContent initialArticleSlug={initialArticleSlug} />
    </Suspense>
  );
}
