'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles, Send, RefreshCw, AlertCircle, BookOpen } from 'lucide-react';
import { BlogPost } from '@/lib/blog-data';

interface AskAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPost: (post: BlogPost) => void;
  posts: BlogPost[];
}

export default function AskAssistantModal({
  isOpen,
  onClose,
  onSelectPost,
  posts,
}: AskAssistantModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      router.push('/assistant');
      onClose();
    }
  }, [isOpen, onClose, router]);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const samplePrompts = [
    'How does vLLM\'s PagedAttention compare to standard contiguous KV-cache allocation?',
    'What was the key insight in DeepSeek-R1 regarding emergent reasoning without human demonstrations?',
    'What does the 2026 clinical data say about GLP-1 receptor agonists and cardiovascular protection?',
    'Why did the engineering team migrate from Kubernetes to Nomad and bare metal servers?',
  ];

  if (!isOpen) return null;

  const handleQuery = async (inquiry: string) => {
    if (!inquiry.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/research-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: inquiry }),
      });

      if (!res.ok) {
        throw new Error('Failed to query assistant');
      }

      const data = await res.json();
      setResponse(data.answer);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred during synthesis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-stone-950 text-stone-100 border border-stone-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-serif font-bold text-base text-white">
                Editorial AI Synthesizer
              </h3>
              <p className="text-[11px] text-stone-400">
                Ask questions grounded in our authors&apos; research reviews, repo teardowns, and essays
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-5 text-xs">
          {/* Sample Prompts */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-stone-400 font-medium block">
              Popular Inquiries:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {samplePrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setQuery(p);
                    handleQuery(p);
                  }}
                  disabled={loading}
                  className="text-left text-[11px] bg-stone-900 hover:bg-stone-800 text-stone-300 px-2.5 py-1.5 rounded-md border border-stone-800 transition-colors"
                >
                  &ldquo;{p}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleQuery(query);
            }}
            className="relative flex items-center pt-2"
          >
            <input
              type="text"
              placeholder="Ask anything about the articles, repos, or research reviews..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              className="w-full bg-stone-900 border border-stone-700 rounded-xl pl-4 pr-24 py-3 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-opacity"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <span>Ask</span>
                  <Send className="w-3 h-3" />
                </>
              )}
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Response Container */}
          {response && (
            <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-5 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2 text-[11px] text-stone-400">
                <span className="text-amber-400 font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Synthesis Result</span>
                </span>
                <span>Grounded in ResearchWithMe Catalog</span>
              </div>

              <div className="text-stone-200 leading-relaxed whitespace-pre-line text-xs font-sans">
                {response}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
