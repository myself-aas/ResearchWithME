'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { 
  FileText, 
  Download, 
  BookOpen, 
  Check, 
  ArrowRight, 
  Calendar, 
  Layers, 
  User, 
  ExternalLink,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import { PDF_EDITIONS_DATA, PUBLICATIONS_DATA } from '@/lib/research-data';

export default function EditionsArchivePage() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);

  const handleDownload = (id: string) => {
    setDownloadingId(id);
    setTimeout(() => {
      setDownloadingId(null);
      setDownloadedId(id);
      setTimeout(() => setDownloadedId(null), 3000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans antialiased selection:bg-amber-900 selection:text-white">
      <BlogHeader />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between text-xs text-stone-500 font-sans">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-stone-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </Link>
          <span className="font-mono text-stone-400">PDF Archival Compendiums</span>
        </div>

        {/* Hero Header */}
        <div className="border-b border-stone-200 pb-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900">
            <Layers className="w-4 h-4 text-amber-900" />
            <span>Curated Thematic & Quarterly Releases</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Archival PDF Compendiums & Editions
          </h1>
          <p className="text-sm sm:text-base text-stone-600 font-serif max-w-3xl leading-relaxed">
            Curated print-ready editions typeset for archival longevity, university libraries, and offline reading. Each volume collects verified manuscripts, empirical figures, and complete peer audit reports.
          </p>
        </div>

        {/* Editions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {PDF_EDITIONS_DATA.map((edition) => {
            const featuredPapers = PUBLICATIONS_DATA.filter((p) =>
              edition.featuredArticleIds.includes(p.id)
            );
            const isDownloading = downloadingId === edition.id;
            const isDownloaded = downloadedId === edition.id;

            return (
              <div
                key={edition.id}
                className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between"
              >
                <div className="p-6 sm:p-8 space-y-5">
                  {/* Top Volume Tag */}
                  <div className="flex items-center justify-between text-xs font-mono text-stone-500 border-b border-stone-100 pb-3">
                    <span className="font-semibold text-amber-900 uppercase tracking-wider">
                      {edition.period}
                    </span>
                    <span>{edition.volume}, {edition.issue}</span>
                  </div>

                  {/* Title & Theme */}
                  <div className="space-y-1.5">
                    <h2 className="font-serif text-2xl font-bold text-stone-900 leading-snug">
                      {edition.title}
                    </h2>
                    <div className="text-xs font-medium text-amber-900">
                      Curated Focus: {edition.theme}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-stone-600 font-serif leading-relaxed">
                    {edition.description}
                  </p>

                  {/* Stats & Curating Editor */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 font-mono block">Articles</span>
                      <span className="font-bold text-stone-900">{edition.articleCount} papers</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 font-mono block">Volume Pages</span>
                      <span className="font-bold text-stone-900">{edition.pages} pp.</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 font-mono block">Editor</span>
                      <span className="font-bold text-stone-900 truncate block">{edition.editor.split(',')[0]}</span>
                    </div>
                  </div>

                  {/* Curated Papers inside this edition */}
                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Featured Papers in This Volume:
                    </h3>
                    <div className="space-y-1.5">
                      {featuredPapers.map((paper) => (
                        <Link
                          key={paper.id}
                          href={`/paper/${paper.slug}`}
                          className="p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors flex items-center justify-between text-xs group block border border-transparent hover:border-stone-200"
                        >
                          <span className="font-medium text-stone-800 line-clamp-1 group-hover:text-amber-900">
                            {paper.title}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Download Action */}
                <div className="p-6 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between gap-3 text-xs">
                  <span className="font-mono text-stone-400 text-[11px]">
                    DOI: 10.5555/rwm.ed.{edition.id}
                  </span>

                  <button
                    onClick={() => handleDownload(edition.id)}
                    disabled={isDownloading}
                    className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-xs"
                  >
                    {isDownloaded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Compendium Downloaded</span>
                      </>
                    ) : isDownloading ? (
                      <span>Compiling Volume ({edition.pages}pp)...</span>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Complete PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
