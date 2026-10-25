'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Download, 
  Quote, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2, 
  FileCheck, 
  ShieldCheck, 
  BookmarkCheck,
  BookOpen
} from 'lucide-react';
import { Publication } from '@/lib/research-data';

interface PaperReaderModalProps {
  paper: Publication | null;
  onClose: () => void;
  onOpenCite: (paper: Publication) => void;
}

export default function PaperReaderModal({
  paper,
  onClose,
  onOpenCite,
}: PaperReaderModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (paper) {
      router.push(`/paper/${paper.slug || paper.id}`);
      onClose();
    }
  }, [paper, onClose, router]);

  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!paper) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://doi.org/${paper.doi}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadPdf = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-4xl my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3 text-xs text-stone-500 font-sans">
            <span className="font-semibold text-amber-900">{paper.topic}</span>
            <span aria-hidden="true">·</span>
            <span>{paper.journal}</span>
            <span aria-hidden="true">·</span>
            <span>{paper.volume}, {paper.issue}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 border border-stone-200 rounded-md bg-white hover:bg-stone-50 transition-colors"
              title="Copy DOI permanent link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share DOI</span>
                </>
              )}
            </button>

            <button
              onClick={() => onOpenCite(paper)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 border border-stone-200 rounded-md bg-white hover:bg-stone-50 transition-colors"
            >
              <Quote className="w-3.5 h-3.5" />
              <span>Cite</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-medium rounded-md transition-colors shadow-xs"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PDF Ready</span>
                </>
              ) : isDownloading ? (
                <span>Generating...</span>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF Edition</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors ml-1"
              aria-label="Close manuscript reader"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 sm:p-10 space-y-8 font-sans">
          {/* Article Header */}
          <div className="space-y-4 border-b border-stone-200 pb-8">
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900 leading-tight">
              {paper.title}
            </h1>
            {paper.subtitle && (
              <p className="text-base sm:text-lg text-stone-600 font-serif italic">
                {paper.subtitle}
              </p>
            )}

            {/* Author info & affiliations */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {paper.authors.map((author) => (
                <div key={author.orcid} className="bg-stone-50 border border-stone-100 rounded-lg p-3 text-xs space-y-1">
                  <div className="font-semibold text-stone-900 flex items-center justify-between">
                    <span>{author.name}</span>
                    <span className="text-[11px] text-amber-900 font-normal">{author.role}</span>
                  </div>
                  <div className="text-stone-500">{author.affiliation}</div>
                  <div className="text-stone-400 font-mono text-[11px]">ORCID: {author.orcid}</div>
                </div>
              ))}
            </div>

            {/* Publication metadata badge strip */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-500 pt-2 font-mono">
              <span>Published: <strong className="text-stone-700">{paper.publishedDate}</strong></span>
              <span>DOI: <strong className="text-stone-700">{paper.doi}</strong></span>
              <span>Pages: <strong className="text-stone-700">{paper.pages}</strong></span>
              <span>License: <strong className="text-stone-700">{paper.license}</strong></span>
            </div>
          </div>

          {/* Abstract section */}
          <div className="bg-amber-50/40 border border-amber-900/15 rounded-xl p-6 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Structured Abstract
            </h3>
            <p className="text-sm sm:text-base text-stone-800 leading-relaxed font-serif">
              {paper.abstract}
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5 text-xs text-stone-600">
              <span className="font-semibold text-stone-700">Keywords:</span>
              {paper.keywords.map((kw, i) => (
                <span key={kw}>
                  {kw}{i < paper.keywords.length - 1 ? ' · ' : ''}
                </span>
              ))}
            </div>
          </div>

          {/* Key Findings List */}
          <div className="space-y-3">
            <h3 className="font-serif text-xl font-bold text-stone-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-800" />
              <span>Key Empirical Findings</span>
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {paper.fullContent.findings.map((finding, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-stone-50 border border-stone-200/70 p-3.5 rounded-lg text-sm text-stone-800 leading-relaxed">
                  <span className="font-mono text-xs font-bold text-amber-800 pt-0.5">
                    0{idx + 1}.
                  </span>
                  <div>{finding}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Methodology Section */}
          <div className="space-y-3">
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Methodology & Experimental Setup
            </h3>
            <p className="text-sm sm:text-base text-stone-700 leading-relaxed font-sans">
              {paper.fullContent.methodology}
            </p>
          </div>

          {/* Discussion & Implications */}
          <div className="space-y-3">
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Discussion & Policy Synthesis
            </h3>
            <p className="text-sm sm:text-base text-stone-700 leading-relaxed font-sans">
              {paper.fullContent.discussion}
            </p>
            <p className="text-sm sm:text-base text-stone-700 leading-relaxed font-sans pt-1">
              {paper.fullContent.implications}
            </p>
          </div>

          {/* References */}
          <div className="space-y-3 border-t border-stone-200 pt-6">
            <h3 className="font-serif text-lg font-bold text-stone-900">
              Primary References
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-stone-600 font-sans">
              {paper.fullContent.references.map((ref, idx) => (
                <li key={idx} className="leading-relaxed">
                  {ref}
                </li>
              ))}
            </ol>
          </div>

          {/* Peer Review Verification Box */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 flex items-center justify-between text-xs text-stone-600">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0" />
              <div>
                <div className="font-semibold text-stone-900">Verified Peer Review & Open Data Attestation</div>
                <div>This manuscript underwent double-anonymous peer review. Execution code and test artifacts are archived in the RWM Data Commons.</div>
              </div>
            </div>
            {paper.dataUrl && (
              <a
                href={paper.dataUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 ml-4 inline-flex items-center gap-1 text-amber-900 font-semibold hover:underline"
              >
                <span>Raw Data</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Modal Bottom Sticky Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <div>
            Published under <span className="font-semibold text-stone-700">Creative Commons CC BY 4.0</span>.
          </div>
          <button
            onClick={onClose}
            className="text-stone-700 hover:text-stone-900 font-medium px-3 py-1.5 rounded-md hover:bg-stone-100 transition-colors"
          >
            Close Reader
          </button>
        </div>
      </div>
    </div>
  );
}
