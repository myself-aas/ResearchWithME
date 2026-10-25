'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { 
  Users, 
  Search, 
  GraduationCap, 
  GitBranch, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { AUTHORS, Author } from '@/lib/blog-data';

export default function AuthorsDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [credentialFilter, setCredentialFilter] = useState<'All' | 'orcid' | 'github' | 'institution'>('All');

  const authorsList = Object.values(AUTHORS);

  const filteredAuthors = useMemo(() => {
    return authorsList.filter((author) => {
      if (credentialFilter !== 'All' && author.verifiedVia !== credentialFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        author.name.toLowerCase().includes(q) ||
        author.role.toLowerCase().includes(q) ||
        author.domain.toLowerCase().includes(q) ||
        (author.institution && author.institution.toLowerCase().includes(q)) ||
        author.bio.toLowerCase().includes(q)
      );
    });
  }, [authorsList, credentialFilter, searchQuery]);

  const getVerificationIcon = (author: Author) => {
    switch (author.verifiedVia) {
      case 'orcid':
        return <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />;
      case 'github':
        return <GitBranch className="w-3.5 h-3.5 text-stone-800" />;
      case 'institution':
      default:
        return <Building2 className="w-3.5 h-3.5 text-sky-800" />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans antialiased selection:bg-amber-900 selection:text-white">
      <BlogHeader />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-stone-500 font-sans">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-stone-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </Link>
          <span className="font-mono text-stone-400">Contributing Authors Collective</span>
        </div>

        {/* Hero Section */}
        <div className="border-b border-stone-200 pb-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900">
            <Users className="w-4 h-4 text-amber-900" />
            <span>Verified Domain Contributors</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Contributing Writers & Technical Reviewers
          </h1>
          <p className="text-sm sm:text-base text-stone-600 font-serif max-w-3xl leading-relaxed">
            Every writer on ResearchWithMe has validated their identity and domain expertise via ORCID, GitHub repository maintenance, or an accredited university email (.edu).
          </p>
        </div>

        {/* Search & Credential Filters */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by author name, institution, or domain specialization..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
            <button
              onClick={() => setCredentialFilter('All')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                credentialFilter === 'All'
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200'
              }`}
            >
              All Contributors ({authorsList.length})
            </button>

            <button
              onClick={() => setCredentialFilter('orcid')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                credentialFilter === 'orcid'
                  ? 'bg-emerald-800 text-white font-semibold'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>ORCID Verified</span>
            </button>

            <button
              onClick={() => setCredentialFilter('github')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                credentialFilter === 'github'
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'bg-stone-100 text-stone-800 border border-stone-300 hover:bg-stone-200'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>GitHub Verified</span>
            </button>

            <button
              onClick={() => setCredentialFilter('institution')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                credentialFilter === 'institution'
                  ? 'bg-sky-900 text-white font-semibold'
                  : 'bg-sky-50 text-sky-900 border border-sky-200 hover:bg-sky-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Institutional (.edu)</span>
            </button>
          </div>
        </div>

        {/* Authors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAuthors.map((author) => (
            <Link
              key={author.id}
              href={`/author/${author.id}`}
              className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs hover:border-stone-300 hover:shadow-sm transition-all flex flex-col justify-between group space-y-4 block"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-lg font-bold group-hover:bg-amber-900 transition-colors shadow-2xs">
                      {author.avatar}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-2xs border border-stone-200">
                      {getVerificationIcon(author)}
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
                    {author.articleCount} Articles
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-serif text-lg font-bold text-stone-900 group-hover:text-amber-900 transition-colors">
                      {author.name}
                    </h2>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>
                  <div className="text-xs text-amber-900 font-medium">
                    {author.role}
                  </div>
                  {author.institution && (
                    <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5 line-clamp-1">
                      <Building2 className="w-3 h-3 text-stone-400 shrink-0" />
                      <span>{author.institution}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-stone-600 font-serif leading-relaxed line-clamp-3">
                  {author.bio}
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-medium text-stone-700 group-hover:text-amber-900">
                <span className="font-mono text-[11px] text-stone-500">
                  {author.verifiedTitle}
                </span>
                <span className="flex items-center gap-1">
                  <span>Dossier</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
