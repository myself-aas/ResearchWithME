'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, Rss, Github, Mail, ShieldCheck, PenSquare } from 'lucide-react';
import { CATEGORIES } from '@/lib/blog-data';
import NewsletterSignup from '@/components/NewsletterSignup';

interface BlogFooterProps {
  onCategorySelect?: (category: string) => void;
  onOpenWriteModal?: () => void;
}

export default function BlogFooter({ onCategorySelect, onOpenWriteModal }: BlogFooterProps) {
  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 font-sans mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Weekly Research Digest Newsletter Signup Banner */}
        <NewsletterSignup />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pt-6">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-md bg-stone-100 text-stone-900 flex items-center justify-center font-serif text-lg font-bold group-hover:bg-amber-400 transition-colors">
                R
              </div>
              <span className="font-serif text-xl font-bold text-white tracking-tight">
                ResearchWith<span className="text-amber-500">.me</span>
              </span>
            </Link>

            <p className="text-xs text-stone-400 max-w-md leading-relaxed font-sans">
              An independent scholarly and technical blogging publication. We publish domain-expert essays, teardowns of open-source GitHub repositories, and analytical breakdowns of peer-reviewed literature across STEM, health, sociology, and economics.
            </p>

            <div className="text-xs text-stone-500 space-y-1 font-mono">
              <div>ISSN 2994-0821 (Digital Publication) · Creative Commons CC BY 4.0</div>
              <div>No paywalls · No behavioral ad trackers · Community & reader funded</div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/write"
                className="inline-flex items-center gap-1.5 bg-amber-800 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs"
              >
                <PenSquare className="w-3.5 h-3.5" />
                <span>Publish a Review</span>
              </Link>

              <Link
                href="/assistant"
                className="inline-flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold px-4 py-2 rounded-lg transition-colors border border-stone-700"
              >
                <span>AI Synthesizer</span>
              </Link>
            </div>
          </div>

          {/* Categories taxonomy */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-200">
              Domains & Columns
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              {CATEGORIES.map((cat) => (
                <li key={cat}>
                  <Link
                    href={`/?category=${encodeURIComponent(cat)}`}
                    className="hover:text-amber-400 transition-colors text-left block"
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Dedicated Page Directory */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-200">
              Publication Portals
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <Link href="/write" className="hover:text-amber-400 transition-colors">
                  Writer & Reviewer Studio
                </Link>
              </li>
              <li>
                <Link href="/papers" className="hover:text-amber-400 transition-colors">
                  Research Papers Archive
                </Link>
              </li>
              <li>
                <Link href="/authors" className="hover:text-amber-400 transition-colors">
                  Authors & Specialists Directory
                </Link>
              </li>
              <li>
                <Link href="/editions" className="hover:text-amber-400 transition-colors">
                  PDF Compendiums & Volumes
                </Link>
              </li>
              <li>
                <Link href="/editorial-board" className="hover:text-amber-400 transition-colors">
                  Editorial Board & Standards
                </Link>
              </li>
              <li>
                <Link href="/assistant" className="hover:text-amber-400 transition-colors">
                  Literature AI Synthesizer
                </Link>
              </li>
              <li>
                <Link href="/bookmarks" className="hover:text-amber-400 transition-colors">
                  Reading Queue & Bookmarks
                </Link>
              </li>
              <li>
                <Link href="/cite" className="hover:text-amber-400 transition-colors">
                  Citation & BibTeX Formatter
                </Link>
              </li>
              <li>
                <Link href="/submit" className="hover:text-amber-400 transition-colors">
                  Manuscript & Guest Submissions
                </Link>
              </li>
              <li>
                <Link href="/verify" className="hover:text-emerald-400 text-stone-300 transition-colors flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Domain OAuth Verification</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Attribution */}
        <div className="border-t border-stone-800/80 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <div>
            &copy; 2026 ResearchWithMe Publication. Written and curated with independence.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/submit" className="hover:text-stone-400 transition-colors">Editorial Guidelines</Link>
            <span>·</span>
            <Link href="/cite" className="hover:text-stone-400 transition-colors">Citation Export</Link>
            <span>·</span>
            <Link href="/assistant" className="hover:text-stone-400 transition-colors">MCP Protocol</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
