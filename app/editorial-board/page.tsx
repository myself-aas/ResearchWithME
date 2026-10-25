'use client';

import React from 'react';
import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { 
  Users, 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  ExternalLink, 
  GraduationCap, 
  ArrowLeft,
  FileCheck2,
  Lock,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { EDITORIAL_BOARD } from '@/lib/research-data';

export default function EditorialBoardPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans antialiased selection:bg-amber-900 selection:text-white">
      <BlogHeader />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-stone-500 font-sans">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-stone-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </Link>
          <span className="font-mono text-stone-400">Governance & Review Integrity</span>
        </div>

        {/* Hero Section */}
        <div className="border-b border-stone-200 pb-8 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900">
            <Users className="w-4 h-4 text-amber-900" />
            <span>Governance & Peer Review Standards</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-900 tracking-tight">
            Editorial Board & Review Collective
          </h1>
          <p className="text-base sm:text-lg text-stone-600 font-serif max-w-3xl leading-relaxed">
            ResearchWithMe is governed by an independent collective of researchers, software architects, clinicians, and data librarians dedicated to reproducible, non-commercial, and open scholarly communication.
          </p>
        </div>

        {/* Board Members Grid */}
        <div className="space-y-4">
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            Editorial Leadership & Section Editors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {EDITORIAL_BOARD.map((member) => (
              <div
                key={member.orcid}
                className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-7 shadow-xs hover:border-stone-300 transition-colors space-y-4 flex flex-col justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-lg font-bold shrink-0 shadow-xs">
                    {member.avatarInitials}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="font-serif text-lg font-bold text-stone-900">
                        {member.name}
                      </h3>
                      <span className="text-[11px] font-mono font-medium text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        {member.role}
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 font-medium">
                      {member.institution}
                    </div>

                    <p className="text-xs text-stone-500 leading-relaxed pt-1 font-serif">
                      <strong className="text-stone-700">Focus:</strong> {member.focus}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-mono text-stone-500">
                  <a
                    href={`https://orcid.org/${member.orcid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-950 font-medium transition-colors"
                  >
                    <GraduationCap className="w-4 h-4 text-emerald-700" />
                    <span>ORCID: {member.orcid}</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>

                  <span className="text-stone-400">Verified Scholar</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peer Review & Editorial Principles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5 text-amber-800" />
            </div>
            <h3 className="font-serif text-base font-bold text-stone-900">
              1. Empirical Verification
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              Every manuscript reviewing a research paper or GitHub repository must link to executable code, publicly accessible preprint repositories (arXiv, bioRxiv), or audited datasets.
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-900 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="font-serif text-base font-bold text-stone-900">
              2. Domain Credentials Gate
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              To eradicate unvetted AI slop and corporate PR spins, authors must authenticate domain expertise via ORCID, GitHub repo commits, or an accredited university email before publishing.
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-900 flex items-center justify-center">
              <Award className="w-5 h-5 text-sky-800" />
            </div>
            <h3 className="font-serif text-base font-bold text-stone-900">
              3. Diamond Open Access
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              No subscription paywalls for readers. No author article processing charges (APCs). Content is permanently released under Creative Commons CC BY 4.0.
            </p>
          </div>
        </div>

        {/* Call to Action Bar */}
        <div className="bg-stone-900 text-stone-100 rounded-2xl p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1">
            <h3 className="font-serif text-xl sm:text-2xl font-bold">
              Interested in Reviewing or Submitting?
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 font-sans max-w-xl">
              We welcome guest analyses, computational replications, and open-source infrastructure teardowns from verified domain practitioners.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/verify"
              className="px-4 py-2.5 rounded-xl border border-stone-700 hover:bg-stone-800 text-xs font-semibold transition-colors"
            >
              Verify Domain ID
            </Link>
            <Link
              href="/submit"
              className="px-4 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-700 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              Submit Manuscript
            </Link>
          </div>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
