'use client';

import React from 'react';
import { BookOpen, ShieldCheck, Github, ExternalLink } from 'lucide-react';

interface FooterProps {
  onNavClick: (tab: 'archive' | 'editions' | 'mcp' | 'editorial') => void;
}

export default function Footer({ onNavClick }: FooterProps) {
  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 font-sans mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-stone-100 text-stone-900 flex items-center justify-center font-serif text-lg font-bold">
                R
              </div>
              <span className="font-serif text-xl font-bold text-white tracking-tight">
                ResearchWith<span className="text-amber-500">.me</span>
              </span>
            </div>
            <p className="text-xs text-stone-400 max-w-md leading-relaxed">
              ResearchWithMe (ReMe) is an open-source scholarly publishing platform designed for fast, accessible research distribution, containerized reproducibility audits, and machine-verifiable literature.
            </p>
            <div className="text-xs text-stone-500 space-y-1 font-mono">
              <div>ISSN: 2994-0821 (Online) · DOI Prefix: 10.5555/rwm</div>
              <div>Published under Creative Commons Attribution 4.0 International (CC BY 4.0)</div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-200">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button
                  onClick={() => onNavClick('archive')}
                  className="hover:text-amber-400 transition-colors"
                >
                  Peer-Reviewed Articles
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavClick('editions')}
                  className="hover:text-amber-400 transition-colors"
                >
                  Quarterly PDF Compendiums
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavClick('mcp')}
                  className="hover:text-amber-400 transition-colors"
                >
                  MCP Autonomous Assistant
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavClick('editorial')}
                  className="hover:text-amber-400 transition-colors"
                >
                  Editorial Board & Standards
                </button>
              </li>
            </ul>
          </div>

          {/* Open Standards & Repositories */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-200">
              Open Science Commons
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <span className="text-stone-300">CrossRef DOI Registry</span>
              </li>
              <li>
                <span className="text-stone-300">Zenodo Data Mirrors</span>
              </li>
              <li>
                <span className="text-stone-300">Software Heritage Archiving</span>
              </li>
              <li>
                <span className="text-stone-300">Directory of Open Access Journals (DOAJ)</span>
              </li>
              <li>
                <span className="text-stone-300">Model Context Protocol Spec</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Attribution */}
        <div className="border-t border-stone-800/80 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <div>
            &copy; 2026 ResearchWithMe Publishing Collective. All research published under open access.
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-stone-400 transition-colors">Privacy & Data Policy</span>
            <span>·</span>
            <span className="hover:text-stone-400 transition-colors">Author Guidelines</span>
            <span>·</span>
            <span className="hover:text-stone-400 transition-colors">Ethics & COPE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
