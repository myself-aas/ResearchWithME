'use client';

import React, { useState } from 'react';
import { Bot, Send, Sparkles, BookOpen, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { Publication } from '@/lib/research-data';

interface McpAssistantPanelProps {
  onSelectPaperByDoi?: (doi: string) => void;
}

export default function McpAssistantPanel({ onSelectPaperByDoi }: McpAssistantPanelProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [citations, setCitations] = useState<{ id: string; title: string; doi: string; leadAuthor: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const samplePrompts = [
    'What are the longitudinal failure modes of grant-funded scientific software tools?',
    'How does containerized verification reduce replication gaps in peer review?',
    'What is the real unit cost per article in Diamond Open Access journals compared to commercial APCs?',
    'How does the Model Context Protocol (MCP) prevent citation hallucinations in academic AI tools?',
  ];

  const handleAsk = async (userQuery: string) => {
    if (!userQuery.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    setCitations([]);

    try {
      const res = await fetch('/api/research-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery }),
      });

      if (!res.ok) {
        throw new Error(`Failed to generate synthesis: ${res.statusText}`);
      }

      const data = await res.json();
      setResponse(data.answer);
      if (data.citations) {
        setCitations(data.citations);
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to complete research synthesis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="mcp-assistant" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 sm:p-10 shadow-xl border border-stone-800">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-wider mb-1">
              <Bot className="w-4 h-4" />
              <span>rwm-mcp-server / Literature Synthesis Protocol</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Autonomous Scholarly Literature Assistant
            </h2>
            <p className="text-sm text-stone-400 font-sans mt-1 max-w-2xl">
              Query the ResearchWithMe peer-reviewed corpus with grounded citation verification. Every response is anchored strictly in empirical data points without hallucinated references.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800/80 border border-stone-700/60 text-xs text-stone-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>MCP Protocol v1.4 Active</span>
          </div>
        </div>

        {/* Suggested Queries */}
        <div className="space-y-2 mb-6">
          <span className="text-xs text-stone-400 font-medium block">
            Suggested Inquiries from Catalog:
          </span>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  setQuery(prompt);
                  handleAsk(prompt);
                }}
                disabled={loading}
                className="text-left text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 px-3 py-1.5 rounded-lg border border-stone-700/60 transition-colors disabled:opacity-50"
              >
                &ldquo;{prompt}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(query);
          }}
          className="relative flex items-center mb-6"
        >
          <input
            type="text"
            placeholder="Ask a scholarly question about open infrastructure, peer review, climate telemetry, or diamond OA..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-4 pr-28 py-3.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-sans"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-opacity shadow-sm"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <span>Query</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-center gap-2 mb-6">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Response Box */}
        {response && (
          <div className="bg-stone-950/90 border border-stone-800 rounded-xl p-6 sm:p-8 space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
              <span className="text-xs font-mono text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Grounded Research Synthesis</span>
              </span>
              <span className="text-xs text-stone-500 font-mono">100% Corpus Grounded</span>
            </div>

            <div className="text-stone-200 text-sm leading-relaxed font-sans whitespace-pre-line space-y-3">
              {response}
            </div>

            {/* Citations Footer */}
            {citations.length > 0 && (
              <div className="border-t border-stone-800 pt-4 space-y-2">
                <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold block">
                  Cited Literature:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {citations.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-medium text-stone-200 line-clamp-1">{c.title}</div>
                        <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                          {c.leadAuthor} et al. · DOI: {c.doi}
                        </div>
                      </div>
                      {onSelectPaperByDoi && (
                        <button
                          onClick={() => onSelectPaperByDoi(c.doi)}
                          className="text-amber-400 hover:text-amber-300 ml-2 shrink-0 p-1"
                          title="Open paper"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
