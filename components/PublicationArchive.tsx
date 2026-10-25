'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  ExternalLink, 
  Copy, 
  Check, 
  BookOpen, 
  Quote, 
  Database,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { Publication, RESEARCH_TOPICS } from '@/lib/research-data';

interface PublicationArchiveProps {
  publications: Publication[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedTopic: string;
  setSelectedTopic: (topic: string) => void;
  onSelectPaper?: (paper: Publication) => void;
  onOpenCiteModal?: (paper: Publication) => void;
}

export default function PublicationArchive({
  publications,
  searchQuery,
  setSearchQuery,
  selectedTopic,
  setSelectedTopic,
  onSelectPaper,
  onOpenCiteModal,
}: PublicationArchiveProps) {
  const [sortBy, setSortBy] = useState<'date' | 'citations' | 'title'>('date');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter and sort
  const filteredPublications = useMemo(() => {
    return publications
      .filter((pub) => {
        const matchesTopic =
          selectedTopic === 'All' ||
          selectedTopic === 'All Fields' ||
          !selectedTopic ||
          pub.topic === selectedTopic;

        if (!matchesTopic) return false;

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
        if (sortBy === 'citations') {
          return b.citationCount - a.citationCount;
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        // date default (newest first)
        return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
      });
  }, [publications, searchQuery, selectedTopic, sortBy]);

  const handleCopyBibtex = (e: React.MouseEvent, pub: Publication) => {
    e.stopPropagation();
    const bibtex = `@article{${pub.authors[0].name.split(' ').pop()?.toLowerCase()}${pub.year},
  title={${pub.title}},
  author={${pub.authors.map(a => a.name).join(' and ')}},
  journal={${pub.journal}},
  volume={${pub.volume}},
  number={${pub.issue}},
  pages={${pub.pages}},
  year={${pub.year}},
  doi={${pub.doi}}
}`;

    navigator.clipboard.writeText(bibtex);
    setCopiedId(pub.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <section id="publications-archive" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header & Filtering Toolbar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-stone-200">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Peer-Reviewed Articles & Working Papers
          </h2>
          <p className="text-sm text-stone-500 font-sans mt-1">
            Showing {filteredPublications.length} of {publications.length} cataloged manuscripts under CC BY 4.0
          </p>
        </div>

        {/* Controls: Topic filter & Sort options */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Topic Select */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-stone-400"
            >
              <option value="All">All Research Disciplines</option>
              {RESEARCH_TOPICS.filter(t => t !== 'All Fields').map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'citations' | 'title')}
              className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-stone-400"
            >
              <option value="date">Sort: Most Recent</option>
              <option value="citations">Sort: Most Cited</option>
              <option value="title">Sort: Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Articles List */}
      {filteredPublications.length === 0 ? (
        <div className="text-center py-16 bg-stone-50 border border-stone-200 rounded-xl mt-6">
          <BookOpen className="w-10 h-10 text-stone-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-stone-900">No publications matched your search criteria</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search terms or selecting &quot;All Research Disciplines&quot; to discover more articles.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedTopic('All');
            }}
            className="mt-4 inline-flex items-center text-xs font-medium text-amber-900 hover:text-amber-950 underline underline-offset-4"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="divide-y divide-stone-200 mt-2">
          {filteredPublications.map((pub) => (
            <article
              key={pub.id}
              onClick={() => onSelectPaper?.(pub)}
              className="py-8 group hover:bg-stone-50/60 transition-colors -mx-4 px-4 sm:-mx-6 sm:px-6 rounded-lg cursor-pointer"
            >
              <div className="space-y-3">
                {/* Clean unboxed metadata row (Zero-pill compliant) */}
                <div className="flex items-center gap-2 text-xs text-stone-500 font-sans flex-wrap">
                  <span className="font-semibold text-amber-900">{pub.topic}</span>
                  <span aria-hidden="true">·</span>
                  <span>{pub.publishedDate}</span>
                  <span aria-hidden="true">·</span>
                  <span>{pub.journal} ({pub.volume}, {pub.issue})</span>
                  <span aria-hidden="true">·</span>
                  <span>{pub.readTime}</span>
                  <span aria-hidden="true">·</span>
                  <span>{pub.citationCount} citations</span>
                </div>

                {/* Primary Title */}
                <div>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 group-hover:text-amber-900 transition-colors leading-snug">
                    {pub.title}
                  </h3>
                  {pub.subtitle && (
                    <p className="text-sm text-stone-600 font-sans mt-1">
                      {pub.subtitle}
                    </p>
                  )}
                </div>

                {/* Authors list with ORCID indicators */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-700">
                  <span className="text-stone-400 font-medium">Authors:</span>
                  {pub.authors.map((author, idx) => (
                    <span key={author.orcid} className="inline-flex items-center gap-1">
                      <span className="font-medium text-stone-900">{author.name}</span>
                      <span className="text-stone-400">({author.affiliation})</span>
                      {idx < pub.authors.length - 1 && <span className="text-stone-300">,</span>}
                    </span>
                  ))}
                </div>

                {/* Abstract Preview */}
                <p className="text-sm text-stone-600 font-sans leading-relaxed line-clamp-3">
                  {pub.abstract}
                </p>

                {/* Action Toolbar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/paper/${pub.slug}`}
                      className="inline-flex items-center gap-1.5 font-semibold text-stone-900 group-hover:text-amber-900 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Read Full Manuscript</span>
                    </Link>

                    <Link
                      href={`/cite?paper=${encodeURIComponent(pub.id)}`}
                      className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900 transition-colors"
                    >
                      <Quote className="w-3.5 h-3.5 text-stone-400" />
                      <span>Cite</span>
                    </Link>

                    <button
                      onClick={(e) => handleCopyBibtex(e, pub)}
                      className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900 transition-colors"
                      title="Copy BibTeX entry to clipboard"
                    >
                      {copiedId === pub.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-stone-400" />
                          <span>BibTeX</span>
                        </>
                      )}
                    </button>

                    {pub.dataUrl && (
                      <a
                        href={pub.dataUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900 transition-colors"
                      >
                        <Database className="w-3.5 h-3.5 text-stone-400" />
                        <span>Data Archive</span>
                      </a>
                    )}
                  </div>

                  {/* DOI & License info */}
                  <div className="flex items-center gap-3 text-stone-400 font-mono text-[11px]">
                    <span className="flex items-center gap-1">
                      <span>DOI:</span>
                      <span className="text-stone-600 hover:text-amber-900">{pub.doi}</span>
                    </span>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline font-sans text-stone-500">Open Access</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
