'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { 
  FileText, 
  Search, 
  BookOpen, 
  Quote, 
  Share2, 
  Check, 
  ExternalLink, 
  ArrowRight, 
  GraduationCap, 
  Filter, 
  SlidersHorizontal,
  Bookmark,
  Building2,
  Calendar
} from 'lucide-react';
import { Publication, PUBLICATIONS_DATA, RESEARCH_TOPICS } from '@/lib/research-data';

export default function PapersArchivePage() {
  const [papers, setPapers] = useState<Publication[]>(PUBLICATIONS_DATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [sortBy, setSortBy] = useState<'date' | 'citations' | 'title'>('date');
  const [copiedDoi, setCopiedDoi] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadPapers() {
      try {
        const res = await fetch('/api/papers');
        if (res.ok) {
          const data = await res.json();
          if (data.papers && data.papers.length > 0) {
            setPapers(data.papers);
          }
        }
      } catch (e) {
        console.warn('API error, using static papers dataset:', e);
      }
    }
    loadPapers();

    try {
      const stored = localStorage.getItem('rwm_saved_papers');
      if (stored) setSavedIds(JSON.parse(stored));
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const handleCopyDoi = (doi: string, id: string) => {
    navigator.clipboard.writeText(`https://doi.org/${doi}`);
    setCopiedDoi(id);
    setTimeout(() => setCopiedDoi(null), 2000);
  };

  const handleToggleSave = (paperId: string) => {
    const next = savedIds.includes(paperId)
      ? savedIds.filter((id) => id !== paperId)
      : [...savedIds, paperId];
    setSavedIds(next);
    try {
      localStorage.setItem('rwm_saved_papers', JSON.stringify(next));
    } catch (e) {
      console.warn(e);
    }
  };

  const filteredPapers = useMemo(() => {
    return papers
      .filter((pub) => {
        if (selectedTopic !== 'All' && pub.topic !== selectedTopic) return false;
        if (!searchQuery.trim()) return true;

        const q = searchQuery.toLowerCase();
        return (
          pub.title.toLowerCase().includes(q) ||
          pub.abstract.toLowerCase().includes(q) ||
          pub.doi.toLowerCase().includes(q) ||
          pub.authors.some((a) => a.name.toLowerCase().includes(q) || a.affiliation.toLowerCase().includes(q)) ||
          pub.keywords.some((k) => k.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'citations') return b.citationCount - a.citationCount;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
      });
  }, [papers, selectedTopic, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans antialiased selection:bg-amber-900 selection:text-white">
      <BlogHeader />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
        {/* Page Header */}
        <div className="border-b border-stone-200 pb-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900">
            <BookOpen className="w-4 h-4 text-amber-900" />
            <span>Academic Manuscripts & Scientific Research Archive</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Peer-Reviewed Papers & Research Artifacts
          </h1>
          <p className="text-sm sm:text-base text-stone-600 font-serif max-w-3xl leading-relaxed">
            Every publication archived here undergoes double-blind methodology verification, reproducibility testing, and permanent digital object identifier (DOI) registration.
          </p>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, abstract, author, DOI, or keyword..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white transition-all"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
              >
                <option value="All">All Research Topics ({papers.length})</option>
                {RESEARCH_TOPICS.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
              >
                <option value="date">Most Recent</option>
                <option value="citations">Most Cited</option>
                <option value="title">Alphabetical (A–Z)</option>
              </select>
            </div>
          </div>

          {/* Quick topic buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 no-scrollbar">
            <span className="text-[11px] font-semibold text-stone-400 mr-1 shrink-0">Topics:</span>
            <button
              onClick={() => setSelectedTopic('All')}
              className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap text-xs font-medium ${
                selectedTopic === 'All'
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200'
              }`}
            >
              All Topics
            </button>
            {RESEARCH_TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic)}
                className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap text-xs font-medium ${
                  selectedTopic === topic
                    ? 'bg-stone-900 text-white font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Papers List Feed */}
        <div className="space-y-4">
          {filteredPapers.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="font-serif text-lg font-bold text-stone-900">
                No matching research manuscripts found
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Try searching with broader terms or resetting the topic filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTopic('All');
                }}
                className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-medium transition-colors"
              >
                Clear Search & Filters
              </button>
            </div>
          ) : (
            filteredPapers.map((paper) => {
              const isSaved = savedIds.includes(paper.id);
              const isCopied = copiedDoi === paper.id;

              return (
                <article
                  key={paper.id}
                  className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-stone-300 hover:shadow-xs transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-stone-500 font-sans flex-wrap">
                        <span className="font-semibold text-amber-900 uppercase tracking-wider">{paper.topic}</span>
                        <span aria-hidden="true">·</span>
                        <span>{paper.journal}</span>
                        <span aria-hidden="true">·</span>
                        <span>{paper.publishedDate}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-stone-400">{paper.readTime}</span>
                      </div>

                      <Link href={`/paper/${paper.slug}`} className="block group">
                        <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 group-hover:text-amber-900 transition-colors leading-snug">
                          {paper.title}
                        </h2>
                      </Link>

                      {paper.subtitle && (
                        <p className="text-xs sm:text-sm text-stone-600 font-serif leading-relaxed line-clamp-2">
                          {paper.subtitle}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start shrink-0">
                      <button
                        onClick={() => handleToggleSave(paper.id)}
                        className={`p-2 rounded-lg border text-xs transition-colors ${
                          isSaved ? 'bg-amber-50 border-amber-300 text-amber-900' : 'border-stone-200 text-stone-400 hover:bg-stone-50'
                        }`}
                        title={isSaved ? 'Saved to reading queue' : 'Save paper'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-900' : ''}`} />
                      </button>

                      <Link
                        href={`/paper/${paper.slug}`}
                        className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                      >
                        <span>Read Full Text</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Abstract Snippet */}
                  <p className="text-xs text-stone-700 leading-relaxed font-sans line-clamp-3 bg-stone-50/70 p-3 rounded-xl border border-stone-100">
                    {paper.abstract}
                  </p>

                  {/* Authors & Footer Actions */}
                  <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 text-stone-600 flex-wrap">
                      <span className="font-semibold text-stone-800">Authors:</span>
                      {paper.authors.map((a, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <span>{a.name}</span>
                          {a.orcid && (
                            <span title={`ORCID: ${a.orcid}`}>
                              <GraduationCap className="w-3 h-3 text-emerald-700" />
                            </span>
                          )}
                          {i < paper.authors.length - 1 && <span className="text-stone-300">,</span>}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 text-stone-500">
                      <button
                        onClick={() => handleCopyDoi(paper.doi, paper.id)}
                        className="hover:text-stone-900 font-mono text-[11px] flex items-center gap-1 transition-colors"
                        title="Copy permanent DOI"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700 font-sans font-medium">DOI Copied</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3 h-3" />
                            <span>{paper.doi}</span>
                          </>
                        )}
                      </button>

                      <Link
                        href={`/cite?paper=${encodeURIComponent(paper.id)}`}
                        className="hover:text-stone-900 flex items-center gap-1 transition-colors font-medium"
                      >
                        <Quote className="w-3 h-3" />
                        <span>Cite</span>
                      </Link>

                      <span className="font-mono text-[11px] text-stone-400">
                        {paper.citationCount} Citations
                      </span>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
