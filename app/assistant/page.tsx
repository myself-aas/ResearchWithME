'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { 
  Sparkles, 
  Send, 
  RefreshCw, 
  BookOpen, 
  ExternalLink, 
  Copy, 
  Check, 
  ArrowLeft, 
  HelpCircle,
  FileText,
  GitBranch,
  Bot
} from 'lucide-react';
import { BlogPost, INITIAL_BLOG_POSTS } from '@/lib/blog-data';

export default function AssistantPage() {
  const [query, setQuery] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [citations, setCitations] = useState<{ id: string; title: string; author: string; category: string }[]>([]);
  const [articles, setArticles] = useState<BlogPost[]>(INITIAL_BLOG_POSTS);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load articles from DB
  useEffect(() => {
    async function loadArticles() {
      try {
        const res = await fetch('/api/articles');
        if (res.ok) {
          const data = await res.json();
          if (data.articles && data.articles.length > 0) {
            setArticles(data.articles);
          }
        }
      } catch (err) {
        console.warn('Failed to load articles for assistant:', err);
      }
    }
    loadArticles();
  }, []);

  const samplePrompts = [
    'How does vLLM\'s PagedAttention address memory fragmentation in GPU inference?',
    'What was the primary empirical insight in DeepSeek-R1 regarding emergent reasoning without human SFT?',
    'What does the latest clinical trial data indicate for GLP-1 receptor agonists and cardiovascular protection?',
    'Why did the engineering team migrate from Kubernetes to Nomad and single-node bare metal servers?',
    'Contrast the economics of commercial Article Processing Charges (APCs) against community Diamond Open Access.',
    'How does compact CRISPR-Cas12f solve the in vivo delivery bottleneck compared to standard SpCas9?',
  ];

  const handleRunQuery = async (inquiryText: string) => {
    if (!inquiryText.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    setCitations([]);

    try {
      let finalQuery = inquiryText;
      if (selectedArticleId !== 'all') {
        const targeted = articles.find((a) => a.id === selectedArticleId);
        if (targeted) {
          finalQuery = `Regarding the article "${targeted.title}" by ${targeted.author.name}: ${inquiryText}`;
        }
      }

      const res = await fetch('/api/research-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: finalQuery }),
      });

      if (!res.ok) {
        throw new Error('Synthesis generation failed');
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

  const handleCopy = () => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white text-stone-900 flex flex-col font-sans antialiased selection:bg-amber-900 selection:text-white">
      <BlogHeader />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-6 font-sans">
          <Link href="/" className="hover:text-stone-900 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Feed</span>
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-amber-900">AI Synthesizer</span>
        </div>

        {/* Page Header Container */}
        <div className="bg-stone-950 text-stone-100 rounded-2xl p-6 sm:p-10 shadow-xl border border-stone-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Editorial Literature Synthesizer</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
                Grounded Research & Repo Intelligence
              </h1>
              <p className="text-xs sm:text-sm text-stone-400 max-w-2xl font-sans leading-relaxed">
                Query our entire publication catalog with strictly grounded citations. Every answer cites our authors&apos; published research reviews, GitHub repo teardowns, and analytical essays without hallucinated sources.
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-xs text-stone-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Gemini 3.8 Flash Grounded</span>
            </div>
          </div>

          {/* Target Article Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
            <label className="text-xs text-stone-300 font-medium shrink-0">
              Target Scope:
            </label>
            <select
              value={selectedArticleId}
              onChange={(e) => setSelectedArticleId(e.target.value)}
              className="bg-stone-900 border border-stone-700 text-xs text-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-auto font-sans"
            >
              <option value="all">Entire ResearchWithMe Catalog ({articles.length} articles)</option>
              {articles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.author.name})
                </option>
              ))}
            </select>
          </div>

          {/* Suggested Prompts */}
          <div className="space-y-2 pt-2">
            <span className="text-xs text-stone-400 font-medium block">
              Popular Inquiries:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {samplePrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setQuery(p);
                    handleRunQuery(p);
                  }}
                  disabled={loading}
                  className="text-left text-xs bg-stone-900 hover:bg-stone-850 hover:border-stone-700 text-stone-300 p-2.5 rounded-xl border border-stone-800 transition-colors disabled:opacity-50"
                >
                  &ldquo;{p}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Query Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunQuery(query);
            }}
            className="relative flex items-center pt-2"
          >
            <input
              type="text"
              placeholder="Ask a technical or research question about any article, repo, or paper..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              className="w-full bg-stone-900 border border-stone-700 rounded-xl pl-4 pr-28 py-3.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wide flex items-center gap-1.5 shadow-sm transition-opacity"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <span>Synthesize</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs">
              {error}
            </div>
          )}

          {/* Response Container */}
          {response && (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Synthesized Academic Analysis</span>
                </div>

                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors"
                >
                  {copiedResponse ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Response Markdown-style Text */}
              <div className="text-stone-200 text-sm leading-relaxed whitespace-pre-line font-sans space-y-3">
                {response}
              </div>

              {/* Citations Footer */}
              {citations.length > 0 && (
                <div className="border-t border-stone-800 pt-4 space-y-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-stone-400 block">
                    Grounded Catalog References:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {citations.map((c) => (
                      <Link
                        key={c.id}
                        href={`/post/${articles.find(a => a.id === c.id)?.slug || c.id}`}
                        className="p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-700/60 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-medium text-stone-200 line-clamp-1 group-hover:text-amber-400 transition-colors">
                            {c.title}
                          </div>
                          <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                            By {c.author} · {c.category}
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-stone-500 group-hover:text-amber-400 shrink-0 ml-2" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <BlogFooter onCategorySelect={() => {}} onOpenWriteModal={() => {}} />
    </div>
  );
}
