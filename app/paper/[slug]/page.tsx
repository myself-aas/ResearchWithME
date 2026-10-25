'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { 
  ArrowLeft, 
  Download, 
  Quote, 
  Share2, 
  Check, 
  ExternalLink, 
  FileText, 
  BookOpen, 
  GraduationCap, 
  Calendar, 
  ShieldCheck, 
  Bookmark, 
  CheckCircle2, 
  Layers,
  ChevronRight,
  Twitter,
  Linkedin,
  Copy
} from 'lucide-react';
import { Publication, PUBLICATIONS_DATA } from '@/lib/research-data';

export default function PaperDetailPage(props: { params: Promise<{ slug: string }> }) {
  const params = use(props.params);
  const slug = params.slug;

  const [paper, setPaper] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
  }, []);

  useEffect(() => {
    async function loadPaper() {
      setLoading(true);
      try {
        const res = await fetch(`/api/papers/${encodeURIComponent(slug)}`);
        if (res.ok) {
          const data = await res.json();
          setPaper(data.paper);
        } else {
          // fallback to local static data
          const found = PUBLICATIONS_DATA.find((p) => p.slug === slug || p.id === slug);
          if (found) setPaper(found);
        }
      } catch (err) {
        console.warn('API fetch error, using local fallback:', err);
        const found = PUBLICATIONS_DATA.find((p) => p.slug === slug || p.id === slug);
        if (found) setPaper(found);
      } finally {
        setLoading(false);
      }
    }
    loadPaper();
  }, [slug]);

  const shareUrl = currentUrl || (paper ? `https://doi.org/${paper.doi}` : '');
  const twitterShareUrl = paper
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(`"${paper.title}" (${paper.year}) — DOI: ${paper.doi} via @ResearchWithMe:`)}&url=${encodeURIComponent(shareUrl)}`
    : '';
  const linkedInShareUrl = paper
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    : '';

  const handleCopyLink = () => {
    if (!paper) return;
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(`https://doi.org/${paper.doi}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleDownloadPdf = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }, 1000);
  };

  const handleToggleSave = () => {
    if (!paper) return;
    try {
      const stored = localStorage.getItem('rwm_saved_papers');
      const ids: string[] = stored ? JSON.parse(stored) : [];
      let next: string[];
      if (ids.includes(paper.id)) {
        next = ids.filter((id) => id !== paper.id);
        setIsSaved(false);
      } else {
        next = [...ids, paper.id];
        setIsSaved(true);
      }
      localStorage.setItem('rwm_saved_papers', JSON.stringify(next));
    } catch (e) {
      console.warn(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
        <BlogHeader />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
          <div className="w-10 h-10 border-2 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-stone-600 font-serif">
            Loading peer-reviewed research manuscript from archive...
          </p>
        </main>
        <BlogFooter />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
        <BlogHeader />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-24 text-center space-y-5">
          <BookOpen className="w-12 h-12 text-stone-400 mx-auto" />
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            Paper Not Found
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans">
            We could not locate a research publication matching identifier <code className="bg-stone-200 px-1.5 py-0.5 rounded font-mono text-xs">{slug}</code>.
          </p>
          <div className="pt-2">
            <Link
              href="/papers"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Browse All Research Papers</span>
            </Link>
          </div>
        </main>
        <BlogFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans antialiased selection:bg-amber-900 selection:text-white">
      <BlogHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-stone-500 font-sans flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Link href="/" className="hover:text-stone-900 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3 h-3 text-stone-400" />
            <Link href="/papers" className="hover:text-stone-900 transition-colors">
              Papers Archive
            </Link>
            <ChevronRight className="w-3 h-3 text-stone-400" />
            <span className="text-stone-900 font-medium truncate max-w-[200px]">
              {paper.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-stone-500 text-[11px]">DOI: {paper.doi}</span>
          </div>
        </div>

        {/* Paper Main Header Card */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 shadow-xs space-y-6">
          {/* Metadata badges */}
          <div className="flex items-center gap-2 text-xs text-stone-500 font-sans flex-wrap">
            <span className="font-semibold text-amber-900 uppercase tracking-wider">{paper.topic}</span>
            <span aria-hidden="true">·</span>
            <span>{paper.journal}</span>
            <span aria-hidden="true">·</span>
            <span>{paper.volume}, {paper.issue}</span>
            <span aria-hidden="true">·</span>
            <span>{paper.publishedDate}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-stone-400">{paper.readTime}</span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-900 leading-tight">
            {paper.title}
          </h1>

          {paper.subtitle && (
            <p className="text-sm sm:text-base text-stone-600 font-serif leading-relaxed">
              {paper.subtitle}
            </p>
          )}

          {/* Authors List with ORCID Badges */}
          <div className="pt-4 border-t border-stone-100 flex flex-wrap gap-4 text-xs font-sans">
            {paper.authors.map((author, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-xs font-bold shrink-0">
                  {author.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <span>{author.name}</span>
                    {author.orcid && (
                      <a
                        href={`https://orcid.org/${author.orcid}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 hover:text-emerald-900"
                        title={`ORCID: ${author.orcid}`}
                      >
                        <GraduationCap className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-500">{author.affiliation}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions Toolbar */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PDF Downloaded</span>
                  </>
                ) : isDownloading ? (
                  <span>Packaging PDF...</span>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF ({paper.pdfFileName})</span>
                  </>
                )}
              </button>

              <Link
                href={`/cite?paper=${encodeURIComponent(paper.id)}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-lg text-xs font-medium transition-colors"
              >
                <Quote className="w-3.5 h-3.5 text-stone-500" />
                <span>Cite Paper</span>
              </Link>

              {/* Share on X */}
              <a
                href={twitterShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-200 bg-white hover:bg-stone-900 hover:text-white hover:border-stone-900 text-stone-700 rounded-lg text-xs font-medium transition-colors"
                title="Share paper on X / Twitter"
              >
                <Twitter className="w-3.5 h-3.5 text-sky-500 fill-current" />
                <span className="hidden sm:inline">Share on X</span>
              </a>

              {/* Share on LinkedIn */}
              <a
                href={linkedInShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-200 bg-white hover:bg-[#0077b5] hover:text-white hover:border-[#0077b5] text-stone-700 rounded-lg text-xs font-medium transition-colors"
                title="Share paper on LinkedIn"
              >
                <Linkedin className="w-3.5 h-3.5 text-[#0077b5]" />
                <span className="hidden sm:inline">LinkedIn</span>
              </a>

              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-lg text-xs font-medium transition-colors"
                title="Copy permanent DOI URL"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">DOI Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-500" />
                    <span>Copy DOI</span>
                  </>
                )}
              </button>
            </div>

            <button
              onClick={handleToggleSave}
              className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                isSaved 
                  ? 'bg-amber-50 border-amber-300 text-amber-900' 
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
              title={isSaved ? 'Saved to reading queue' : 'Save paper'}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-900' : ''}`} />
            </button>
          </div>
        </div>

        {/* Abstract Box */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-3 shadow-xs">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-900">
            Abstract
          </h2>
          <p className="text-sm sm:text-base text-stone-800 leading-relaxed font-serif">
            {paper.abstract}
          </p>

          <div className="pt-3 flex flex-wrap gap-1.5">
            {paper.keywords.map((k) => (
              <span
                key={k}
                className="text-[11px] font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded"
              >
                #{k}
              </span>
            ))}
          </div>
        </div>

        {/* Structured Manuscript Body */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 space-y-8 shadow-xs font-serif text-stone-800">
          {/* Background */}
          {paper.fullContent?.background && (
            <section className="space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                1. Context & Research Problem
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-stone-700">
                {paper.fullContent.background}
              </p>
            </section>
          )}

          {/* Methodology */}
          {paper.fullContent?.methodology && (
            <section className="space-y-3 pt-6 border-t border-stone-100">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                2. Methodology & Observational Setup
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-stone-700">
                {paper.fullContent.methodology}
              </p>
            </section>
          )}

          {/* Key Findings */}
          {paper.fullContent?.findings && paper.fullContent.findings.length > 0 && (
            <section className="space-y-4 pt-6 border-t border-stone-100">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                3. Empirical Findings & Benchmarks
              </h2>
              <ul className="space-y-3">
                {paper.fullContent.findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100 font-sans text-xs sm:text-sm text-stone-800">
                    <span className="w-6 h-6 rounded-full bg-amber-900 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Discussion */}
          {paper.fullContent?.discussion && (
            <section className="space-y-3 pt-6 border-t border-stone-100">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                4. Technical Discussion & Trade-offs
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-stone-700">
                {paper.fullContent.discussion}
              </p>
            </section>
          )}

          {/* Implications */}
          {paper.fullContent?.implications && (
            <section className="space-y-3 pt-6 border-t border-stone-100">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                5. Systemic Implications for Practitioners
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-stone-700">
                {paper.fullContent.implications}
              </p>
            </section>
          )}

          {/* Academic References */}
          {paper.fullContent?.references && paper.fullContent.references.length > 0 && (
            <section className="space-y-3 pt-6 border-t border-stone-100 font-sans text-xs">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                References & Primary Literature
              </h3>
              <ol className="list-decimal list-inside space-y-1.5 text-stone-600">
                {paper.fullContent.references.map((ref, idx) => (
                  <li key={idx} className="leading-relaxed">{ref}</li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* Dedicated Social Sharing & Scholarly Discussion Section */}
        <section className="p-6 sm:p-7 rounded-2xl bg-stone-900 text-stone-100 border border-stone-800 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-semibold flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Share This Peer-Reviewed Paper</span>
              </span>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
                Disseminate empirical findings across your scientific network
              </h3>
              <p className="text-xs sm:text-sm text-stone-400 max-w-xl">
                Encourage open academic peer discussion and reproducibility checks by sharing this publication with direct DOI resolution.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <a
                href={twitterShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-stone-800 text-white border border-stone-700 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-xs"
              >
                <Twitter className="w-3.5 h-3.5 text-sky-400 fill-current" />
                <span>Post on X</span>
              </a>

              <a
                href={linkedInShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0077b5] hover:bg-[#006097] text-white rounded-lg text-xs font-semibold tracking-wide transition-all shadow-xs"
              >
                <Linkedin className="w-3.5 h-3.5 text-white" />
                <span>Share on LinkedIn</span>
              </a>

              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-xs font-semibold tracking-wide transition-all"
                title="Copy permanent DOI citation link"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">DOI Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-400" />
                    <span>Copy DOI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* License & Peer Review Certification */}
        <div className="bg-stone-100/70 border border-stone-200 rounded-xl p-5 text-xs text-stone-600 space-y-2 font-sans">
          <div className="flex items-center gap-2 font-semibold text-stone-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Open Access & Archival Assurance</span>
          </div>
          <p className="leading-relaxed">
            This article is published under the <strong>{paper.license}</strong>. Full text, data supplements, and empirical figures are permanently archived with DOI resolution for academic citation integrity.
          </p>
          <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-stone-500">
            <span>Archival Hash: SHA256:{paper.id.replace(/[^a-z0-9]/gi, '')}</span>
            <span>Citations: {paper.citationCount}</span>
          </div>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
