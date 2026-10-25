'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BookOpen, 
  Search, 
  PenSquare, 
  Bookmark, 
  Sparkles, 
  GitBranch, 
  FileText,
  Quote,
  UploadCloud,
  ShieldCheck,
  CheckCircle2,
  Lock,
  User,
  GraduationCap
} from 'lucide-react';
import { BlogCategory } from '@/lib/blog-data';
import { useAuth } from '@/lib/auth-context';

interface BlogHeaderProps {
  selectedCategory?: string;
  setSelectedCategory?: (cat: string) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  savedCount?: number;
}

export default function BlogHeader({
  selectedCategory = 'All',
  setSelectedCategory,
  searchQuery = '',
  setSearchQuery,
  savedCount = 0,
}: BlogHeaderProps) {
  const pathname = usePathname();
  const { user, hasAuthorPermissions, switchRoleForTesting } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Platform Tagline */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 rounded-md"
            >
              <div className="w-10 h-10 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-xl font-bold tracking-tight shadow-xs group-hover:bg-amber-900 transition-colors">
                R
              </div>
              <div>
                <span className="font-serif text-xl font-bold tracking-tight text-stone-900 block leading-tight">
                  ResearchWith<span className="text-amber-800">.me</span>
                </span>
                <span className="text-xs text-stone-600 font-sans tracking-wide block">
                  Expert Essays, Research Reviews & Repo Teardowns
                </span>
              </div>
            </Link>
          </div>

          {/* Primary Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 font-sans text-xs font-medium">
            <Link
              href="/"
              className={`px-2.5 py-1.5 rounded-md transition-colors ${
                pathname === '/' && selectedCategory === 'All'
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              Articles
            </Link>

            <Link
              href="/papers"
              className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                pathname.startsWith('/papers') || pathname.startsWith('/paper')
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-stone-500" />
              <span>Papers</span>
            </Link>

            <Link
              href="/authors"
              className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                pathname.startsWith('/authors') || (pathname.startsWith('/author') && !pathname.includes('maya-lin'))
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <User className="w-3.5 h-3.5 text-stone-500" />
              <span>Authors</span>
            </Link>

            <Link
              href="/editions"
              className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                pathname.startsWith('/editions')
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-stone-500" />
              <span>Compendiums</span>
            </Link>

            <Link
              href="/assistant"
              className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                pathname.startsWith('/assistant')
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>AI Synthesizer</span>
            </Link>

            <Link
              href="/bookmarks"
              className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                pathname.startsWith('/bookmarks')
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Reading List</span>
              {savedCount > 0 && (
                <span className="bg-amber-900 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {savedCount}
                </span>
              )}
            </Link>

            <Link
              href="/cite"
              className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                pathname.startsWith('/cite')
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Quote className="w-3.5 h-3.5" />
              <span>Citations</span>
            </Link>

            <Link
              href="/submit"
              className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                pathname.startsWith('/submit')
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Submit</span>
            </Link>

            <Link
              href="/verify"
              className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                pathname.startsWith('/verify')
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verify ID</span>
            </Link>
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Search Input (when on root page) */}
            {setSearchQuery && (
              <div className="relative hidden xl:block w-44">
                <input
                  type="text"
                  placeholder="Search articles, repos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-900 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white transition-all font-sans"
                />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* User Identity & OAuth Status Badge - Links to dedicated /verify page */}
            <div className="flex items-center gap-1.5">
              <Link
                href="/verify"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  hasAuthorPermissions
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 hover:bg-emerald-100'
                    : 'bg-stone-100 border-stone-300 text-stone-800 hover:bg-stone-200'
                }`}
                title="Manage domain expertise & OAuth verification on dedicated page"
              >
                {hasAuthorPermissions ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="hidden sm:inline font-semibold">{user?.name || 'Verified Author'}</span>
                    <span className="sm:hidden font-semibold">Author</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                    <span className="hidden sm:inline">Reader (Gmail)</span>
                    <span className="sm:hidden">Reader</span>
                  </>
                )}
              </Link>

              {/* Quick Author Profile Link if logged in as Author */}
              {hasAuthorPermissions && user?.authorProfileId && (
                <Link
                  href={`/author/${user.authorProfileId}`}
                  className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                  title="View your public author profile & publication archive"
                >
                  <User className="w-3.5 h-3.5 text-stone-500" />
                  <span>My Profile</span>
                </Link>
              )}
            </div>

            {/* Mobile Bookmarks Link */}
            <Link
              href="/bookmarks"
              className="lg:hidden p-2 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors relative"
              title="Saved Articles"
            >
              <Bookmark className="w-4 h-4" />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-900 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {savedCount}
                </span>
              )}
            </Link>

            {/* Write an Article button -> Dedicated /write page */}
            <Link
              href="/write"
              className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-lg text-xs font-medium tracking-wide transition-colors shadow-xs ${
                pathname === '/write'
                  ? 'bg-amber-900 text-white'
                  : 'bg-stone-900 hover:bg-stone-800 text-white'
              }`}
            >
              <PenSquare className="w-3.5 h-3.5" />
              <span>Write & Review</span>
            </Link>
          </div>
        </div>

        {/* Mobile Horizontal Navigation Bar */}
        <div className="flex lg:hidden items-center gap-2 border-t border-stone-100 py-2.5 overflow-x-auto text-xs no-scrollbar">
          <Link
            href="/"
            className={`px-3 py-1 rounded-md whitespace-nowrap transition-colors font-medium ${
              pathname === '/'
                ? 'bg-stone-900 text-white font-semibold'
                : 'text-stone-600 hover:text-stone-900 bg-stone-50 border border-stone-200'
            }`}
          >
            All Articles
          </Link>
          <Link
            href="/papers"
            className={`px-3 py-1 rounded-md whitespace-nowrap transition-colors font-medium ${
              pathname.startsWith('/paper')
                ? 'bg-stone-900 text-white font-semibold'
                : 'text-stone-600 hover:text-stone-900 bg-stone-50 border border-stone-200'
            }`}
          >
            Papers Archive
          </Link>
          <Link
            href="/authors"
            className={`px-3 py-1 rounded-md whitespace-nowrap transition-colors font-medium ${
              pathname.startsWith('/author')
                ? 'bg-stone-900 text-white font-semibold'
                : 'text-stone-600 hover:text-stone-900 bg-stone-50 border border-stone-200'
            }`}
          >
            Authors Directory
          </Link>
          <Link
            href="/editions"
            className={`px-3 py-1 rounded-md whitespace-nowrap transition-colors font-medium ${
              pathname.startsWith('/editions')
                ? 'bg-stone-900 text-white font-semibold'
                : 'text-stone-600 hover:text-stone-900 bg-stone-50 border border-stone-200'
            }`}
          >
            Compendiums
          </Link>
          <Link
            href="/editorial-board"
            className={`px-3 py-1 rounded-md whitespace-nowrap transition-colors font-medium ${
              pathname.startsWith('/editorial')
                ? 'bg-stone-900 text-white font-semibold'
                : 'text-stone-600 hover:text-stone-900 bg-stone-50 border border-stone-200'
            }`}
          >
            Editorial Board
          </Link>
          <Link
            href="/assistant"
            className={`px-3 py-1 rounded-md whitespace-nowrap transition-colors font-medium flex items-center gap-1 ${
              pathname === '/assistant'
                ? 'bg-stone-900 text-white font-semibold'
                : 'text-stone-600 hover:text-stone-900 bg-stone-50 border border-stone-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>AI Synthesizer</span>
          </Link>
          <Link
            href="/bookmarks"
            className={`px-3 py-1 rounded-md whitespace-nowrap transition-colors font-medium ${
              pathname === '/bookmarks'
                ? 'bg-stone-900 text-white font-semibold'
                : 'text-stone-600 hover:text-stone-900 bg-stone-50 border border-stone-200'
            }`}
          >
            Reading List ({savedCount})
          </Link>
          <Link
            href="/cite"
            className={`px-3 py-1 rounded-md whitespace-nowrap transition-colors font-medium ${
              pathname === '/cite'
                ? 'bg-stone-900 text-white font-semibold'
                : 'text-stone-600 hover:text-stone-900 bg-stone-50 border border-stone-200'
            }`}
          >
            Citations
          </Link>
          <Link
            href="/submit"
            className={`px-3 py-1 rounded-md whitespace-nowrap transition-colors font-medium ${
              pathname === '/submit'
                ? 'bg-stone-900 text-white font-semibold'
                : 'text-stone-600 hover:text-stone-900 bg-stone-50 border border-stone-200'
            }`}
          >
            Submissions
          </Link>
          <Link
            href="/verify"
            className={`px-3 py-1 rounded-md whitespace-nowrap transition-colors font-medium text-emerald-800 bg-emerald-50 border border-emerald-200`}
          >
            Verify Domain ID
          </Link>
        </div>
      </div>
    </header>
  );
}
