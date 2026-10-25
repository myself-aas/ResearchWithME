'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Quote, FileCode, BookMarked } from 'lucide-react';
import { Publication } from '@/lib/research-data';

interface CitationBuilderModalProps {
  paper: Publication | null;
  onClose: () => void;
}

export default function CitationBuilderModal({
  paper,
  onClose,
}: CitationBuilderModalProps) {
  const [format, setFormat] = useState<'apa' | 'chicago' | 'mla' | 'bibtex' | 'ris'>('apa');
  const [copied, setCopied] = useState(false);

  if (!paper) return null;

  const authorsString = paper.authors.map(a => a.name).join(', ');
  const leadAuthorLast = paper.authors[0].name.split(' ').pop();
  const leadAuthorFirstInitial = paper.authors[0].name.split(' ')[0][0];

  const citations: Record<string, string> = {
    apa: `${leadAuthorLast}, ${leadAuthorFirstInitial}. (${paper.year}). ${paper.title}. ${paper.journal}, ${paper.volume.replace('Vol. ', '')}(${paper.issue.replace('Issue ', '')}), ${paper.pages}. https://doi.org/${paper.doi}`,
    mla: `${leadAuthorLast}, ${paper.authors[0].name.split(' ')[0]}. "${paper.title}." ${paper.journal}, vol. ${paper.volume.replace('Vol. ', '')}, no. ${paper.issue.replace('Issue ', '')}, ${paper.year}, pp. ${paper.pages}, https://doi.org/${paper.doi}.`,
    chicago: `${leadAuthorLast}, ${paper.authors[0].name.split(' ')[0]}. "${paper.title}." ${paper.journal} ${paper.volume.replace('Vol. ', '')}, no. ${paper.issue.replace('Issue ', '')} (${paper.year}): ${paper.pages}. https://doi.org/${paper.doi}.`,
    bibtex: `@article{${leadAuthorLast?.toLowerCase()}${paper.year}${paper.id.split('-').pop()},
  title = {${paper.title}},
  author = {${paper.authors.map(a => a.name).join(' and ')}},
  journal = {${paper.journal}},
  volume = {${paper.volume.replace('Vol. ', '')}},
  number = {${paper.issue.replace('Issue ', '')}},
  pages = {${paper.pages}},
  year = {${paper.year}},
  doi = {${paper.doi}},
  publisher = {ResearchWithMe Press}
}`,
    ris: `TY  - JOUR
TI  - ${paper.title}
AU  - ${paper.authors.map(a => a.name).join('\nAU  - ')}
JO  - ${paper.journal}
VL  - ${paper.volume.replace('Vol. ', '')}
IS  - ${paper.issue.replace('Issue ', '')}
SP  - ${paper.pages.split('–')[0]}
EP  - ${paper.pages.split('–')[1] || paper.pages}
PY  - ${paper.year}
DO  - ${paper.doi}
ER  - `,
  };

  const currentCitation = citations[format];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCitation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white border border-stone-200 rounded-xl w-full max-w-2xl shadow-xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2 text-stone-900 font-serif font-bold text-lg">
            <Quote className="w-5 h-5 text-amber-800" />
            <span>Cite This Publication</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="space-y-1">
            <h4 className="font-serif font-bold text-base text-stone-900 line-clamp-2">
              {paper.title}
            </h4>
            <p className="text-xs text-stone-500 font-sans">
              {authorsString} · {paper.publishedDate}
            </p>
          </div>

          {/* Format Tabs (Interactive button controls) */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg overflow-x-auto text-xs">
            {(['apa', 'mla', 'chicago', 'bibtex', 'ris'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`px-3 py-1.5 font-medium rounded-md uppercase transition-all whitespace-nowrap ${
                  format === fmt
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Citation Text Box */}
          <div className="relative">
            <textarea
              readOnly
              value={currentCitation}
              rows={format === 'bibtex' || format === 'ris' ? 7 : 3}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3.5 text-xs text-stone-800 font-mono leading-relaxed focus:outline-none"
            />
          </div>

          {/* Copy Button & DOI note */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-stone-500 font-mono">
              DOI: {paper.doi}
            </span>

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Citation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
