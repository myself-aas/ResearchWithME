'use client';

import React from 'react';
import Link from 'next/link';
import { Users, ArrowRight, GitBranch, GraduationCap, Building2, CheckCircle2 } from 'lucide-react';
import { AUTHORS, Author } from '@/lib/blog-data';

interface AuthorSpotlightProps {
  onSelectAuthor?: (authorName: string) => void;
}

export default function AuthorSpotlight({ onSelectAuthor }: AuthorSpotlightProps) {
  const authorList = Object.values(AUTHORS);

  const getVerificationIcon = (author: Author) => {
    switch (author.verifiedVia) {
      case 'orcid':
        return <GraduationCap className="w-3 h-3 text-emerald-600" />;
      case 'github':
        return <GitBranch className="w-3 h-3 text-stone-700" />;
      case 'institution':
      default:
        return <Building2 className="w-3 h-3 text-sky-700" />;
    }
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-stone-200">
      <div className="flex items-center justify-between pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900 mb-1">
            <Users className="w-4 h-4" />
            <span>Our Contributing Writers & Domain Specialists</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Practitioners Writing from the Frontlines
          </h2>
          <p className="text-xs text-stone-500 mt-1 font-sans">
            Every author must validate identity via ORCID, GitHub, or Institutional OAuth to publish peer essays and teardowns.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
        {authorList.map((author) => (
          <Link
            key={author.id}
            href={`/author/${author.id}`}
            className="p-5 bg-white border border-stone-200 rounded-xl shadow-xs hover:border-stone-300 hover:shadow-sm transition-all flex flex-col justify-between group space-y-4 block"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-sm font-bold group-hover:bg-amber-900 transition-colors">
                    {author.avatar}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-2xs">
                    {getVerificationIcon(author)}
                  </div>
                </div>
                <span className="text-[11px] text-stone-400 font-mono">
                  {author.articleCount} Articles
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-serif text-base font-bold text-stone-900 group-hover:text-amber-900 transition-colors">
                    {author.name}
                  </h3>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>
                <span className="text-xs text-amber-900 font-medium block">
                  {author.role}
                </span>
                <span className="text-[11px] text-stone-500 block mt-0.5 line-clamp-1">
                  {author.domain}
                </span>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
                {author.bio}
              </p>
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-medium text-stone-700 group-hover:text-amber-900">
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-stone-500">
                <span>{author.verifiedTitle.split(' ')[0]} Verified</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span>View Complete Bio & Archive</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
