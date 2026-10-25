'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Download, 
  FileText, 
  BookOpen, 
  Check, 
  Calendar, 
  Layers, 
  User, 
  ArrowRight 
} from 'lucide-react';
import { PDF_EDITIONS_DATA, PdfEdition, PUBLICATIONS_DATA, Publication } from '@/lib/research-data';

interface PdfEditionsSectionProps {
  onSelectPaper?: (paper: Publication) => void;
}

export default function PdfEditionsSection({ onSelectPaper }: PdfEditionsSectionProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);

  const handleDownloadEdition = (editionId: string) => {
    setDownloadingId(editionId);
    setTimeout(() => {
      setDownloadingId(null);
      setDownloadedId(editionId);
      setTimeout(() => setDownloadedId(null), 3000);
    }, 1000);
  };

  return (
    <section id="pdf-editions" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="border-b border-stone-200 pb-6 mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900 mb-1">
          <FileText className="w-4 h-4" />
          <span>rwm-pdf-editions Archive</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          Quarterly & Thematic PDF Compendiums
        </h2>
        <p className="text-sm text-stone-600 font-sans mt-1 max-w-3xl">
          Curated print-ready editions typeset for archival longevity, academic libraries, and offline research. Every edition compiles verified manuscripts, empirical figures, and complete peer audit reports.
        </p>
      </div>

      {/* Editions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {PDF_EDITIONS_DATA.map((edition) => {
          const featuredPapers = PUBLICATIONS_DATA.filter((p) =>
            edition.featuredArticleIds.includes(p.id)
          );

          return (
            <div
              key={edition.id}
              className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs hover:border-stone-300 transition-all flex flex-col"
            >
              {/* Top Banner / Cover */}
              <div className="relative h-48 w-full bg-stone-900 overflow-hidden">
                <Image
                  src={edition.coverImage}
                  alt={edition.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover opacity-75 group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/40 to-transparent" />
                
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="flex items-center gap-2 text-xs font-mono text-stone-300 mb-1">
                    <span>{edition.volume} · {edition.issue}</span>
                    <span>·</span>
                    <span>{edition.period}</span>
                  </div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold leading-snug">
                    {edition.title}
                  </h3>
                </div>
              </div>

              {/* Edition Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5 font-sans">
                <div className="space-y-4">
                  <p className="text-sm text-stone-700 leading-relaxed">
                    {edition.description}
                  </p>

                  {/* Metadata points (Zero-pill compliant) */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-stone-100 text-xs text-stone-600">
                    <div className="space-y-0.5">
                      <span className="text-stone-400 block text-[11px]">Articles</span>
                      <strong className="text-stone-900">{edition.articleCount} papers</strong>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-stone-400 block text-[11px]">Page Count</span>
                      <strong className="text-stone-900">{edition.pages} pages</strong>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-stone-400 block text-[11px]">Format</span>
                      <strong className="text-stone-900">PDF / A-1b</strong>
                    </div>
                  </div>

                  {/* Curated editor note */}
                  <div className="text-xs text-stone-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    <span>Issue Editor: <strong className="text-stone-700">{edition.editor}</strong></span>
                  </div>

                  {/* Included Key Articles preview */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 block">
                      Featured In This Volume:
                    </span>
                    <div className="space-y-1.5">
                      {featuredPapers.map((paper) => (
                        <Link
                          key={paper.id}
                          href={`/paper/${paper.slug}`}
                          className="w-full text-left p-2 rounded-md bg-stone-50 hover:bg-stone-100 transition-colors flex items-center justify-between text-xs group block"
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

                {/* Download / Action Row */}
                <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                  <span className="text-xs text-stone-500 font-mono">
                    DOI Minted: 10.5555/rwm.ed.{edition.id}
                  </span>

                  <button
                    onClick={() => handleDownloadEdition(edition.id)}
                    disabled={downloadingId === edition.id}
                    className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 px-4 py-2 rounded-lg text-xs font-medium transition-colors shadow-xs"
                  >
                    {downloadedId === edition.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Edition Downloaded</span>
                      </>
                    ) : downloadingId === edition.id ? (
                      <span>Packaging PDF ({edition.pages}pp)...</span>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Compendium</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
