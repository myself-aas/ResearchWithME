'use client';

import React, { useState } from 'react';
import { X, Upload, CheckCircle2, ShieldCheck, FileText, AlertCircle } from 'lucide-react';
import { RESEARCH_TOPICS } from '@/lib/research-data';

interface SubmitPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (newPaperTitle: string) => void;
}

export default function SubmitPaperModal({
  isOpen,
  onClose,
  onSubmitSuccess,
}: SubmitPaperModalProps) {
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [orcid, setOrcid] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('Open Infrastructure');
  const [abstract, setAbstract] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [licenseAgreed, setLicenseAgreed] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [trackingId, setTrackingId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !authors.trim() || !abstract.trim()) {
      return;
    }

    const randomId = 'RWM-SUB-' + Math.floor(100000 + Math.random() * 900000);
    setTrackingId(randomId);
    setSubmitted(true);
    if (onSubmitSuccess) {
      onSubmitSuccess(title);
    }
  };

  const resetForm = () => {
    setTitle('');
    setAuthors('');
    setOrcid('');
    setAffiliation('');
    setEmail('');
    setAbstract('');
    setDataUrl('');
    setFileName(null);
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div>
            <h3 className="font-serif font-bold text-lg text-stone-900">
              Submit Scholarly Manuscript
            </h3>
            <p className="text-xs text-stone-500">
              Diamond Open Access · Zero Article Processing Charges · Double-Blind Peer Review
            </p>
          </div>
          <button
            onClick={resetForm}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="font-serif text-2xl font-bold text-stone-900">
              Manuscript Successfully Logged
            </h4>
            <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
              Your submission &ldquo;<strong className="text-stone-900">{title}</strong>&rdquo; has been assigned tracking ID:
            </p>
            <div className="p-3 bg-stone-100 border border-stone-200 rounded-lg font-mono text-sm font-bold text-stone-900 inline-block">
              {trackingId}
            </div>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Our automated reproducibility sandbox is performing pre-flight verification. The editorial desk will assign reviewers within 3 business days.
            </p>
            <div className="pt-4">
              <button
                onClick={resetForm}
                className="bg-stone-900 hover:bg-stone-800 text-stone-50 px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-colors"
              >
                Return to Archive
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Manuscript Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Longitudinal Verification of Open Science Infrastructure"
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Primary Author(s) *
                </label>
                <input
                  type="text"
                  required
                  value={authors}
                  onChange={(e) => setAuthors(e.target.value)}
                  placeholder="e.g. Dr. Jane Smith, John Doe"
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Lead Author ORCID iD
                </label>
                <input
                  type="text"
                  value={orcid}
                  onChange={(e) => setOrcid(e.target.value)}
                  placeholder="0000-0000-0000-0000"
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Institutional Affiliation
                </label>
                <input
                  type="text"
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  placeholder="e.g. Institute of Technology, Zurich"
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Primary Research Discipline
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                >
                  {RESEARCH_TOPICS.filter(t => t !== 'All Fields').map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Structured Abstract *
              </label>
              <textarea
                required
                rows={4}
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                placeholder="Include Background, Methodology, Key Findings, and Scholarly Implications..."
                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 leading-relaxed font-serif"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Open Data / Code Repository URL
              </label>
              <input
                type="url"
                value={dataUrl}
                onChange={(e) => setDataUrl(e.target.value)}
                placeholder="https://github.com/... or https://zenodo.org/record/..."
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 font-mono"
              />
            </div>

            {/* Document Upload Area */}
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Manuscript PDF / LaTeX Package
              </label>
              <div 
                onClick={() => setFileName('manuscript_draft_v1.pdf')}
                className="border-2 border-dashed border-stone-300 hover:border-stone-400 rounded-lg p-4 text-center cursor-pointer bg-stone-50/50 transition-colors"
              >
                {fileName ? (
                  <div className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-800">
                    <FileText className="w-4 h-4" />
                    <span>{fileName} attached (ready for sandbox audit)</span>
                  </div>
                ) : (
                  <div className="space-y-1 text-xs text-stone-500">
                    <Upload className="w-5 h-5 text-stone-400 mx-auto" />
                    <p className="font-medium text-stone-700">Click to attach draft PDF or tar.gz archive</p>
                    <p className="text-[11px] text-stone-400">PDF, LaTeX, or Markdown up to 50MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Open Access Attribution Agreement */}
            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="licenseAgree"
                checked={licenseAgreed}
                onChange={(e) => setLicenseAgreed(e.target.checked)}
                className="mt-0.5 rounded border-stone-300 text-stone-900 focus:ring-stone-400"
              />
              <label htmlFor="licenseAgree" className="text-xs text-stone-600 leading-relaxed cursor-pointer">
                I agree to publish this manuscript under the <strong className="text-stone-800">Creative Commons Attribution 4.0 International (CC BY 4.0)</strong> license with no author fees or transfer of copyright upon acceptance.
              </label>
            </div>

            {/* Submit Toolbar */}
            <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
              <span className="text-xs text-stone-400">No submission or processing charges.</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!licenseAgreed}
                  className="bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-stone-50 px-5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-xs"
                >
                  Submit for Peer Review
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
