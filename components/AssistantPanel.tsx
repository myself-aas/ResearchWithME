/**
 * Shared research assistant surface — used by the Next app (app/assistant/page.tsx) and the
 * Pages target (cloudflare-pages/src/routes/assistant.tsx). One source of truth
 * for the markup and behavior in both runtimes until Task 16 retires Next.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { ArrowRight, Copy, FileText, Send } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { BlogPost, INITIAL_BLOG_POSTS } from '@/lib/blog-data';
import { EASING } from '@/lib/motion/tokens';
import { Spinner } from '@/components/motion/LoadingState';
import SuccessCheck from '@/components/motion/SuccessCheck';
import { Text } from '@/components/primitives';
import { WorkflowDisclosure } from '@/components/workflows';
import { RESEARCH_WORKFLOWS } from '@/lib/workflows/research-workflows';
import { SynthesizeMark } from '@/components/lottie';

interface Citation {
  id: string;
  title: string;
  author: string;
  category: string;
}

const SAMPLE_QUESTIONS = [
  'How does vLLM’s PagedAttention reduce GPU memory fragmentation?',
  'What did DeepSeek-R1 show about reasoning without human demonstrations?',
  'What does the trial evidence say about GLP-1 receptor agonists and cardiovascular risk?',
  'Why did the engineering team move from Kubernetes to Nomad on bare metal?',
];

/**
 * `initialArticles` — the catalogue from the server (metadata only), so the
 * route's HTML is complete without JavaScript. Optional: the Cloudflare Pages
 * build renders this without it and falls back to the client fetch below.
 */
export default function AssistantPanel({ initialArticles }: { initialArticles?: BlogPost[] } = {}) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [articles, setArticles] = useState<BlogPost[]>(initialArticles ?? INITIAL_BLOG_POSTS);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function loadArticles() {
      try {
        const res = await fetch('/api/articles', { headers: { accept: 'application/json' } });
        if (!res.ok) return;
        const data: { articles?: BlogPost[] } = await res.json();
        if (active && Array.isArray(data.articles) && data.articles.length > 0) {
          setArticles(data.articles);
        }
      } catch {
        // The bundled catalog remains available when the API is unreachable.
      }
    }
    loadArticles();
    return () => {
      active = false;
    };
  }, []);

  async function runQuery(inquiry: string) {
    const trimmed = inquiry.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setAnswer(null);
    setCitations([]);

    try {
      let finalQuery = trimmed;
      if (scope !== 'all') {
        const targeted = articles.find((article) => article.id === scope);
        if (targeted) {
          finalQuery = `Regarding the article "${targeted.title}" by ${targeted.author.name}: ${trimmed}`;
        }
      }

      const res = await fetch('/api/research-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: finalQuery }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'The assistant could not complete this request.');
      }

      const data: { answer?: string; citations?: Citation[] } = await res.json();
      if (!data.answer) throw new Error('The assistant returned an empty answer. Try a narrower question.');
      setAnswer(data.answer);
      setCitations(Array.isArray(data.citations) ? data.citations : []);
      window.setTimeout(() => answerRef.current?.focus(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The assistant could not complete this request.');
    } finally {
      setLoading(false);
    }
  }

  async function copyAnswer() {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError('Clipboard access was blocked. Select the answer text and copy it manually.');
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />

      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <header className="border-b border-line pb-8">
          <h1 className="max-w-3xl font-serif text-3xl font-bold tracking-tight text-ink sm:text-5xl">
            Ask the archive a question
          </h1>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-ink">
            The assistant answers from this platform&apos;s own catalog. Without a configured model key it returns a deterministic, cited summary; with one, the model receives the same catalog text and is asked to cite its sources.
          </p>
        </header>

        <section aria-labelledby="assistant-form-heading" className="py-8">
          <h2 id="assistant-form-heading" className="sr-only">
            Ask a research question
          </h2>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              runQuery(query);
            }}
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_18rem]">
              <div>
                <label htmlFor="assistant-query" className="mb-1.5 block text-sm font-medium text-ink">
                  Question
                </label>
                <textarea
                  id="assistant-query"
                  rows={3}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  disabled={loading}
                  placeholder="What evidence supports the claim that paged attention improves throughput?"
                  className="w-full rounded-md border border-border-strong bg-surface-raised px-3 py-2.5 text-base text-ink placeholder:text-ink-secondary"
                />
              </div>

              <div>
                <label htmlFor="assistant-scope" className="mb-1.5 block text-sm font-medium text-ink">
                  Scope
                </label>
                <select
                  id="assistant-scope"
                  value={scope}
                  onChange={(event) => setScope(event.target.value)}
                  disabled={loading}
                  className="h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-ink"
                >
                  <option value="all">Entire catalog ({articles.length} articles)</option>
                  {articles.map((article) => (
                    <option key={article.id} value={article.id}>
                      {article.title}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  Narrowing the scope keeps the answer anchored to one review.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                {loading ? (
                  <Spinner size={16} className="text-on-primary" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{loading ? 'Searching the archive…' : 'Ask the archive'}</span>
              </button>
              <p className="text-sm text-ink-secondary">Answers summarize published work; verify claims against the linked article.</p>
            </div>
          </form>

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-ink">Try one of these</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {SAMPLE_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setQuery(question);
                    runQuery(question);
                  }}
                  className="max-w-full rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-left text-sm text-ink transition-colors hover:border-border-strong disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div role="alert" className="mt-6 border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <p className="font-medium">The request did not complete.</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={() => runQuery(query)}
                className="mt-2 min-h-9 font-semibold underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          )}

          <AnimatePresence initial={false}>
            {loading ? (
              <m.p
                key="assistant-loading"
                role="status"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [...EASING.standard] }}
                className="mt-6 flex items-center gap-2 text-sm text-ink-secondary"
              >
                <Spinner size={16} className="text-brand" />
                <span>Reading the catalog and drafting a cited answer…</span>
              </m.p>
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
          {answer && (
            <m.div
              key="assistant-answer"
              ref={answerRef}
              tabIndex={-1}
              aria-labelledby="answer-heading"
              initial={{ opacity: 0, y: 10, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease: [...EASING.enter] }}
              className="mt-8 rounded-lg border border-line bg-surface-raised"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
                <h2 id="answer-heading" className="flex items-center gap-2 font-serif text-lg font-semibold text-ink">
                  {/* Synthesize pattern: plays once per new answer (evidence → result). */}
                  <SynthesizeMark size={16} playKey={answer} className="text-brand-hover" />
                  <span>Answer</span>
                </h2>
                <button
                  type="button"
                  onClick={copyAnswer}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-border-strong"
                >
                  <AnimatePresence initial={false} mode="wait">
                    <m.span
                      key={copied ? 'copied' : 'idle'}
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      transition={{ duration: 0.16, ease: [...EASING.emphasize] }}
                      className="inline-flex text-success"
                      aria-hidden="true"
                    >
                      {copied ? <SuccessCheck size={16} /> : <Copy className="h-4 w-4" />}
                    </m.span>
                  </AnimatePresence>
                  <span>{copied ? 'Copied' : 'Copy answer'}</span>
                </button>
              </div>

              <div className="whitespace-pre-line px-5 py-5 text-base leading-relaxed text-ink">{answer}</div>

              {citations.length > 0 && (
                <div className="border-t border-line px-5 py-4">
                  <h3 className="text-sm font-semibold text-ink">Sources in this answer</h3>
                  <ul className="mt-2 divide-y divide-line">
                    {citations.map((citation) => {
                      const slug = articles.find((article) => article.id === citation.id)?.slug ?? citation.id;
                      return (
                        <li key={citation.id}>
                          <Link
                            href={`/post/${slug}`}
                            className="group flex items-start justify-between gap-3 py-2 text-sm text-ink transition-colors hover:text-brand"
                          >
                            <span>
                              <span className="font-medium">{citation.title}</span>
                              <span className="mt-0.5 block text-ink-secondary">
                                {citation.author} · {citation.category}
                              </span>
                            </span>
                            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-secondary group-hover:text-brand" aria-hidden="true" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </m.div>
          )}
          </AnimatePresence>
        </section>

        <section aria-labelledby="assistant-limits" className="border-t border-line py-8">
          <Text id="assistant-limits" as="h2" variant="card-title">
            What this tool does and does not do
          </Text>
          <ul className="mt-3 grid gap-3 text-base leading-relaxed text-ink sm:grid-cols-2">
            <li className="flex gap-2">
              <FileText className="mt-1 h-4 w-4 shrink-0 text-brand-hover" aria-hidden="true" />
              <span>It searches the published catalog and links every cited article.</span>
            </li>
            <li className="flex gap-2">
              <FileText className="mt-1 h-4 w-4 shrink-0 text-brand-hover" aria-hidden="true" />
              <span>It does not search outside this platform or access paywalled literature.</span>
            </li>
            <li className="flex gap-2">
              <FileText className="mt-1 h-4 w-4 shrink-0 text-brand-hover" aria-hidden="true" />
              <span>It cannot verify a factual claim; it summarizes what a review already established.</span>
            </li>
            <li className="flex gap-2">
              <FileText className="mt-1 h-4 w-4 shrink-0 text-brand-hover" aria-hidden="true" />
              <span>It stores nothing you type and keeps no conversation history.</span>
            </li>
          </ul>
        </section>

        <section aria-label="How discovery works" className="border-t border-line py-8">
          <WorkflowDisclosure workflow={RESEARCH_WORKFLOWS.discovery} heading="h2" summary="How discovery and synthesis work" />
        </section>
      </main>

      <BlogFooter />
    </div>
  );
}
