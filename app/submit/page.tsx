'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { 
  UploadCloud, 
  CheckCircle2, 
  ArrowLeft, 
  ShieldCheck, 
  FileText, 
  Send,
  HelpCircle
} from 'lucide-react';
import { CATEGORIES, BlogCategory } from '@/lib/blog-data';

export default function SubmitPage() {
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<BlogCategory>('Research Reviews');
  const [abstract, setAbstract] = useState('');
  const [repoOrDoi, setRepoOrDoi] = useState('');
  const [dataAvailability, setDataAvailability] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !authorName.trim() || !abstract.trim()) return;

    const id = 'RWM-REV-' + Math.floor(100000 + Math.random() * 900000);
    setSubmittedId(id);
  };

  return (
    <div className="min-h-screen bg-white text-stone-900 flex flex-col font-sans antialiased selection:bg-amber-900 selection:text-white">
      <BlogHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-6 font-sans">
          <Link href="/" className="hover:text-stone-900 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Feed</span>
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-amber-900">Submissions & Guest Reviews</span>
        </div>

        {/* Header */}
        <div className="border-b border-stone-200 pb-6 mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900 mb-1">
            <UploadCloud className="w-4 h-4" />
            <span>Peer Review & Editorial Intake</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Submit a Review or Manuscript
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-sans mt-1">
            We welcome domain-expert breakdowns of published research papers, in-depth open-source repo teardowns, and analytical essays across STEM, health, and sociology.
          </p>
        </div>

        {submittedId ? (
          <div className="p-8 sm:p-12 text-center bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              Manuscript Successfully Logged
            </h2>
            <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
              Your submission &ldquo;<strong className="text-stone-900">{title}</strong>&rdquo; has been assigned tracking ID:
            </p>
            <div className="p-3 bg-white border border-stone-200 rounded-lg font-mono text-sm font-bold text-stone-900 inline-block shadow-xs">
              {submittedId}
            </div>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Our editorial desk reviews submissions for empirical rigor, code reproducibility, and conflict-of-interest transparency. You will receive reviewer notes within 5 business days.
            </p>
            <div className="pt-4 flex justify-center gap-3">
              <Link
                href="/"
                className="bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-colors"
              >
                Return to Feed
              </Link>
              <button
                onClick={() => setSubmittedId(null)}
                className="bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 px-4 py-2.5 rounded-lg text-xs font-medium"
              >
                Submit Another Review
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-stone-50 border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-6 text-xs">
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Manuscript / Review Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Architectural Review of the Astral uv Python Package Manager"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg px-3.5 py-2 text-xs text-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">
                    Author / Reviewer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Jordan Rivera"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3.5 py-2 text-xs text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-800 mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="author@institution.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3.5 py-2 text-xs text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">
                    Primary Domain / Column
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as BlogCategory)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-900"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-800 mb-1">
                    Reviewed Repo or Paper DOI (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. github.com/astral-sh/uv or 10.1038/s41587"
                    value={repoOrDoi}
                    onChange={(e) => setRepoOrDoi(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3.5 py-2 text-xs text-stone-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Structured Abstract / Review Summary *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Summarize the core analytical thesis, benchmark results, or clinical findings..."
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg p-3 text-xs text-stone-900 font-serif leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Open Data / Code Benchmark Repository
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/... or https://zenodo.org/..."
                  value={dataAvailability}
                  onChange={(e) => setDataAvailability(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg px-3.5 py-2 text-xs text-stone-900 font-mono"
                />
              </div>

              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="agree"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded text-amber-800"
                />
                <label htmlFor="agree" className="text-stone-600 leading-relaxed cursor-pointer">
                  I confirm that all empirical claims cite verified artifacts and that I have disclosed any relevant corporate or funding conflicts of interest. Upon publication, the article will be released under <strong className="text-stone-800">CC BY 4.0</strong>.
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
              <span className="text-stone-500">Zero publication or article processing fees.</span>
              <button
                type="submit"
                disabled={!agreed}
                className="bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit for Editorial Review</span>
              </button>
            </div>
          </form>
        )}
      </main>

      <BlogFooter onCategorySelect={() => {}} onOpenWriteModal={() => {}} />
    </div>
  );
}
