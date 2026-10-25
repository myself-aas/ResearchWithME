'use client';

import React from 'react';
import { Search, ArrowRight, ShieldCheck, Sparkles, BookMarked, Download } from 'lucide-react';
import { OVERVIEW_STATS, RESEARCH_TOPICS } from '@/lib/research-data';

interface HeroProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTopic: string;
  setSelectedTopic: (topic: string) => void;
  onExplorePapers: () => void;
  onOpenPdfEditions: () => void;
}

export default function Hero({
  searchQuery,
  setSearchQuery,
  selectedTopic,
  setSelectedTopic,
  onExplorePapers,
  onOpenPdfEditions,
}: HeroProps) {
  return (
    <section className="bg-stone-50 border-b border-stone-200 pt-12 pb-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Main Hero Copy */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-amber-900">
              <span className="w-2 h-2 rounded-full bg-amber-700"></span>
              <span>Diamond Open Access · Zero Article Processing Charges · Peer Reviewed</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl lg:text-5xl font-bold tracking-tight text-stone-900 leading-[1.15]">
              Rigorous scholarship, open science, and peer-reviewed fieldwork.
            </h1>

            <p className="text-base sm:text-lg text-stone-700 max-w-2xl leading-relaxed font-sans">
              An independent scholarly repository for computational infrastructure, environmental telemetry, verifiable research data, and community-owned academic publishing.
            </p>

            {/* Interactive Search Bar in Hero */}
            <div className="pt-2 max-w-2xl">
              <div className="relative flex items-center shadow-xs">
                <Search className="w-5 h-5 text-stone-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search 142 peer-reviewed articles by keyword, author, DOI, or topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg pl-11 pr-24 py-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-20 text-xs text-stone-600 hover:text-stone-700 px-2 py-1"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={onExplorePapers}
                  className="absolute right-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 px-3.5 py-2 rounded-md text-xs font-medium transition-colors"
                >
                  Explore
                </button>
              </div>

              {/* Research Topic Filters */}
              <div className="flex items-center gap-1.5 flex-wrap pt-3.5">
                <span className="text-xs text-stone-500 font-medium mr-1">Focus Areas:</span>
                {RESEARCH_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => setSelectedTopic(topic === 'All Fields' ? 'All' : topic)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                      (topic === 'All Fields' && (selectedTopic === 'All' || !selectedTopic)) ||
                      selectedTopic === topic
                        ? 'bg-amber-900 text-white shadow-xs'
                        : 'bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onExplorePapers}
                className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <span>Browse Recent Publications</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenPdfEditions}
                className="inline-flex items-center gap-2 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4 text-stone-500" />
                <span>Quarterly PDF Compendiums</span>
              </button>
            </div>
          </div>

          {/* Right Metrics & Editorial Card */}
          <div className="lg:col-span-4 bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Repository Overview
              </span>
              <span className="text-xs text-emerald-800 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Peer-Audited
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <div className="font-serif text-2xl font-bold text-stone-900">
                  {OVERVIEW_STATS.totalPublications}
                </div>
                <div className="text-xs text-stone-500">Indexed Articles</div>
              </div>

              <div className="space-y-0.5">
                <div className="font-serif text-2xl font-bold text-stone-900">
                  {OVERVIEW_STATS.peerReviewedCitations.toLocaleString()}
                </div>
                <div className="text-xs text-stone-500">Verified Citations</div>
              </div>

              <div className="space-y-0.5">
                <div className="font-serif text-2xl font-bold text-stone-900">
                  {OVERVIEW_STATS.openDatasets}
                </div>
                <div className="text-xs text-stone-500">Open Data Bundles</div>
              </div>

              <div className="space-y-0.5">
                <div className="font-serif text-2xl font-bold text-stone-900">
                  {OVERVIEW_STATS.averageReviewDays}d
                </div>
                <div className="text-xs text-stone-500">Avg. Review Latency</div>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3.5 text-xs text-stone-700 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-stone-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Model Context Protocol Enabled</span>
              </div>
              <p className="text-stone-600 leading-relaxed">
                All articles include machine-readable metadata schemas and RPC tool bindings via the <code className="text-amber-900 font-mono text-[11px]">rwm-mcp-server</code> plugin.
              </p>
            </div>

            <div className="pt-1 flex items-center justify-between text-xs text-stone-500 border-t border-stone-100">
              <span>ISSN 2994-0821 (Online)</span>
              <span>CC BY 4.0 International</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
