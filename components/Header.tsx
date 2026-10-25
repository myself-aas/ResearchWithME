'use client';

import React from 'react';
import { BookOpen, Search, FileText, Bot, Users, PlusCircle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'archive' | 'editions' | 'mcp' | 'editorial';
  setActiveTab: (tab: 'archive' | 'editions' | 'mcp' | 'editorial') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenSubmit: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onOpenSubmit,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('archive')}
              className="flex items-center gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 rounded-md"
            >
              <div className="w-10 h-10 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-xl font-bold tracking-tight shadow-sm group-hover:bg-stone-800 transition-colors">
                R
              </div>
              <div>
                <span className="font-serif text-xl font-bold tracking-tight text-stone-900 block leading-tight">
                  ResearchWith<span className="text-amber-800">.me</span>
                </span>
                <span className="text-xs text-stone-600 font-sans tracking-wide block">
                  Open Scholarly Publishing & Archive
                </span>
              </div>
            </button>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 font-sans text-sm">
            <button
              onClick={() => setActiveTab('archive')}
              className={`flex items-center gap-1.5 px-3 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'archive'
                  ? 'border-amber-800 text-amber-900 font-semibold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Publications</span>
            </button>

            <button
              onClick={() => setActiveTab('editions')}
              className={`flex items-center gap-1.5 px-3 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'editions'
                  ? 'border-amber-800 text-amber-900 font-semibold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>PDF Editions</span>
            </button>

            <button
              onClick={() => setActiveTab('mcp')}
              className={`flex items-center gap-1.5 px-3 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'mcp'
                  ? 'border-amber-800 text-amber-900 font-semibold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>MCP AI Assistant</span>
            </button>

            <button
              onClick={() => setActiveTab('editorial')}
              className={`flex items-center gap-1.5 px-3 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'editorial'
                  ? 'border-amber-800 text-amber-900 font-semibold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Editorial Board</span>
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Quick search input */}
            <div className="relative hidden lg:block w-56">
              <input
                type="text"
                placeholder="Search by title, DOI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-800 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white transition-all"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Submit paper button */}
            <button
              onClick={onOpenSubmit}
              className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 px-3.5 py-2 rounded-lg text-xs font-medium tracking-wide transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Submit Manuscript</span>
            </button>
          </div>
        </div>

        {/* Mobile secondary navigation */}
        <div className="flex md:hidden items-center justify-between border-t border-stone-100 py-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('archive')}
            className={`px-2.5 py-1 font-medium whitespace-nowrap ${
              activeTab === 'archive' ? 'text-amber-900 font-semibold' : 'text-stone-600'
            }`}
          >
            Publications
          </button>
          <button
            onClick={() => setActiveTab('editions')}
            className={`px-2.5 py-1 font-medium whitespace-nowrap ${
              activeTab === 'editions' ? 'text-amber-900 font-semibold' : 'text-stone-600'
            }`}
          >
            PDF Editions
          </button>
          <button
            onClick={() => setActiveTab('mcp')}
            className={`px-2.5 py-1 font-medium whitespace-nowrap ${
              activeTab === 'mcp' ? 'text-amber-900 font-semibold' : 'text-stone-600'
            }`}
          >
            MCP Assistant
          </button>
          <button
            onClick={() => setActiveTab('editorial')}
            className={`px-2.5 py-1 font-medium whitespace-nowrap ${
              activeTab === 'editorial' ? 'text-amber-900 font-semibold' : 'text-stone-600'
            }`}
          >
            Editorial Board
          </button>
        </div>
      </div>
    </header>
  );
}
