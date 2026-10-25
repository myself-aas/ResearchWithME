'use client';

import React from 'react';
import { Users, Award, ShieldCheck, BookOpen, CheckCircle, ExternalLink } from 'lucide-react';
import { EDITORIAL_BOARD } from '@/lib/research-data';

export default function EditorialBoard() {
  return (
    <section id="editorial-board" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="border-b border-stone-200 pb-6 mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900 mb-1">
          <Users className="w-4 h-4" />
          <span>Governance & Review Integrity</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          Editorial Board & Peer Review Standards
        </h2>
        <p className="text-sm text-stone-600 font-sans mt-1 max-w-3xl">
          ResearchWithMe is governed by an independent collective of researchers, librarians, and data architects dedicated to transparent, reproducible, and non-commercial scientific communication.
        </p>
      </div>

      {/* Board Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {EDITORIAL_BOARD.map((member) => (
          <div
            key={member.orcid}
            className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs flex items-start gap-4 hover:border-stone-300 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-base font-bold shrink-0">
              {member.avatarInitials}
            </div>

            <div className="space-y-1.5 flex-1 font-sans">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-stone-900">
                  {member.name}
                </h3>
                <span className="text-xs text-amber-900 font-medium">{member.role}</span>
              </div>

              <div className="text-xs text-stone-600">
                {member.institution}
              </div>

              <div className="text-xs text-stone-500 leading-relaxed pt-1">
                <span className="font-medium text-stone-700">Research Focus:</span> {member.focus}
              </div>

              <div className="pt-2 text-xs font-mono text-stone-400 flex items-center gap-1.5">
                <span>ORCID:</span>
                <a
                  href={`https://orcid.org/${member.orcid}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-stone-600 hover:text-amber-900 underline underline-offset-2 flex items-center gap-0.5"
                >
                  <span>{member.orcid}</span>
                  <ExternalLink className="w-3 h-3 inline" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Peer Review Ethics & Standards Banner */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 sm:p-8 space-y-4">
        <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-800" />
          <span>Our 4-Pillar Peer Review Covenant</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-stone-700">
          <div className="p-3.5 bg-white border border-stone-200 rounded-lg space-y-1">
            <div className="font-bold text-stone-900">1. Automated Sandbox Execution</div>
            <p className="text-stone-600 leading-relaxed">
              Every computational manuscript is re-run in an isolated container to verify that tables, figures, and calculations match the published data.
            </p>
          </div>

          <div className="p-3.5 bg-white border border-stone-200 rounded-lg space-y-1">
            <div className="font-bold text-stone-900">2. Double-Blind Evaluation</div>
            <p className="text-stone-600 leading-relaxed">
              Reviewer identities and author affiliations remain strictly anonymous until final publication to eliminate institutional bias.
            </p>
          </div>

          <div className="p-3.5 bg-white border border-stone-200 rounded-lg space-y-1">
            <div className="font-bold text-stone-900">3. Inalienable Open Access</div>
            <p className="text-stone-600 leading-relaxed">
              Authors retain 100% copyright under CC BY 4.0. No paywalls, no embargos, and no fees are ever charged to readers or authors.
            </p>
          </div>

          <div className="p-3.5 bg-white border border-stone-200 rounded-lg space-y-1">
            <div className="font-bold text-stone-900">4. Perpetual Data Archiving</div>
            <p className="text-stone-600 leading-relaxed">
              Manuscripts and datasets are mirrored across redundant institutional repositories (Zenodo, LOCKSS, Software Heritage) for multi-decade survival.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
