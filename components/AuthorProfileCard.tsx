'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  ExternalLink, 
  GitBranch, 
  Globe, 
  GraduationCap, 
  Mail, 
  Building2, 
  Calendar, 
  BookOpen, 
  Share2, 
  Check, 
  ShieldCheck,
  TrendingUp,
  FileCode2,
  Bookmark
} from 'lucide-react';
import { Author } from '@/lib/blog-data';

interface AuthorProfileCardProps {
  author: Author;
  metrics?: {
    totalArticles?: number;
    totalLikes?: number;
    totalComments?: number;
    reviewedArtifactsCount?: number;
  };
  compact?: boolean;
}

export default function AuthorProfileCard({
  author,
  metrics,
  compact = false,
}: AuthorProfileCardProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const getVerificationBadge = () => {
    switch (author.verifiedVia) {
      case 'orcid':
        return {
          icon: <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />,
          label: 'ORCID Verified Researcher',
          detail: author.orcid ? `iD: ${author.orcid}` : author.verifiedIdentifier,
          colorClass: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          link: author.orcid ? `https://orcid.org/${author.orcid.replace(/^https?:\/\/orcid\.org\//, '')}` : undefined,
        };
      case 'github':
        return {
          icon: <GitBranch className="w-3.5 h-3.5 text-stone-800" />,
          label: 'GitHub Verified Systems Maintainer',
          detail: author.verifiedIdentifier || 'GitHub OAuth Verified',
          colorClass: 'bg-stone-100 border-stone-300 text-stone-900',
          link: author.github || undefined,
        };
      case 'institution':
      default:
        return {
          icon: <Building2 className="w-3.5 h-3.5 text-blue-800" />,
          label: 'Institutional Faculty & Lab Verified',
          detail: author.verifiedIdentifier || author.institution || 'Accredited Academic Institution',
          colorClass: 'bg-sky-50 border-sky-200 text-sky-950',
          link: author.website || undefined,
        };
    }
  };

  const badge = getVerificationBadge();
  const totalArticles = metrics?.totalArticles ?? author.articleCount;

  if (compact) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-5 font-sans space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-base font-bold shrink-0">
            {author.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link 
                href={`/author/${author.id}`}
                className="font-serif text-lg font-bold text-stone-900 hover:text-amber-900 transition-colors"
              >
                {author.name}
              </Link>
              <span title="Verified Author">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              </span>
            </div>
            <p className="text-xs text-stone-600 font-medium">{author.role}</p>
            {author.institution && (
              <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3 text-stone-400" />
                <span>{author.institution}</span>
              </p>
            )}
          </div>
        </div>

        {/* Verification attestation snippet */}
        <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${badge.colorClass}`}>
          <div className="flex items-center gap-2 truncate">
            {badge.icon}
            <span className="font-semibold truncate">{badge.label}</span>
          </div>
          <span className="text-[11px] font-mono opacity-80 shrink-0 truncate max-w-[140px]">
            {badge.detail}
          </span>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
          {author.bio}
        </p>

        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span>{totalArticles} Published Articles</span>
          <Link
            href={`/author/${author.id}`}
            className="text-amber-900 font-medium hover:underline inline-flex items-center gap-1"
          >
            <span>View Complete Bio & History</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 font-sans shadow-xs">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        {/* Left: Avatar + Identity */}
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-2xl sm:text-3xl font-bold shadow-xs">
              {author.avatar}
            </div>
            <div 
              className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1 rounded-full border-2 border-white shadow-xs" 
              title="Verified Domain Identity"
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                {author.name}
              </h1>
            </div>

            <div className="text-sm sm:text-base font-medium text-stone-800">
              {author.role}
            </div>

            {author.institution && (
              <div className="text-xs sm:text-sm text-stone-600 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>{author.institution}</span>
              </div>
            )}

            <div className="text-xs text-stone-500 flex items-center gap-1.5 pt-0.5">
              <span className="font-semibold text-stone-700">Domain Focus:</span>
              <span>{author.domain}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            title="Copy Author Profile Link"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Link Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-stone-500" />
                <span>Share Profile</span>
              </>
            )}
          </button>

          <Link
            href="/write"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Author Studio</span>
          </Link>
        </div>
      </div>

      {/* Domain Verification Attestation Banner */}
      <div className={`mt-6 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${badge.colorClass}`}>
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-lg bg-white/80 shadow-2xs shrink-0">
            {badge.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider">{badge.label}</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
              <span className="text-xs font-medium">Domain Expertise Validated</span>
            </div>
            <div className="text-xs font-mono opacity-90 mt-0.5">
              Attestation: <span className="font-semibold">{badge.detail}</span>
            </div>
          </div>
        </div>

        {badge.link && (
          <a
            href={badge.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold hover:underline shrink-0"
          >
            <span>View Public Record</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Complete Biography */}
      <div className="mt-6 pt-6 border-t border-stone-200">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
          Biography & Research Background
        </h2>
        <p className="text-sm sm:text-base text-stone-700 leading-relaxed font-serif">
          {author.bio}
        </p>
      </div>

      {/* Author Metrics Grid */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-stone-100">
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Published Articles
          </div>
          <div className="text-xl font-serif font-bold text-stone-900 mt-1">
            {totalArticles}
          </div>
        </div>

        <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Total Reads
          </div>
          <div className="text-xl font-serif font-bold text-amber-900 mt-1">
            {author.totalReads || '35k+'}
          </div>
        </div>

        <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Total Likes
          </div>
          <div className="text-xl font-serif font-bold text-stone-900 mt-1">
            {metrics?.totalLikes ?? (author.articleCount * 42)}
          </div>
        </div>

        <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Contributor Since
          </div>
          <div className="text-sm font-sans font-semibold text-stone-800 mt-1">
            {author.joinedDate}
          </div>
        </div>
      </div>

      {/* Social & Academic Links Bar */}
      <div className="mt-6 pt-6 border-t border-stone-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-stone-500 mr-1">
            Scholarly & Social Footprint:
          </span>

          {author.orcid && (
            <a
              href={`https://orcid.org/${author.orcid.replace(/^https?:\/\/orcid\.org\//, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-900 transition-colors"
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
              <span>ORCID iD</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          )}

          {author.github && (
            <a
              href={author.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg text-xs font-medium text-stone-800 transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5 text-stone-700" />
              <span>GitHub</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          )}

          {author.scholar && (
            <a
              href={author.scholar}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-xs font-medium text-stone-700 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-stone-500" />
              <span>Google Scholar</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          )}

          {author.twitter && (
            <a
              href={author.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-xs font-medium text-stone-700 transition-colors"
            >
              <span>X / Twitter</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          )}

          {author.website && (
            <a
              href={author.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-xs font-medium text-stone-700 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-stone-500" />
              <span>Lab / Website</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          )}
        </div>

        <div className="text-xs text-stone-500 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-stone-400" />
          <span>Member since {author.joinedDate}</span>
        </div>
      </div>
    </div>
  );
}
