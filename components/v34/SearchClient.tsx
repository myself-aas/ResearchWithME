'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Plus, Search, Sparkles, WifiOff, X } from 'lucide-react';
import type { SearchHit, SearchResponse } from '@/lib/v34/search';
import type { SearchEntityType } from '@/lib/v34/wave6-contracts';

interface SearchClientProps {
  initialResponse: SearchResponse;
}

const TYPE_OPTIONS: Array<{ value: 'all' | SearchEntityType; label: string }> = [
  { value: 'all', label: 'All objects' },
  { value: 'source', label: 'Sources' },
  { value: 'contribution', label: 'Contributions' },
  { value: 'claim', label: 'Claims' },
  { value: 'tool', label: 'Tools' },
  { value: 'project', label: 'Projects' },
  { value: 'topic', label: 'Topics' },
];

export default function SearchClient({ initialResponse }: SearchClientProps) {
  const [query, setQuery] = useState(initialResponse.query);
  const [activeType, setActiveType] = useState<'all' | SearchEntityType>('all');
  const [hits, setHits] = useState<SearchHit[]>(initialResponse.hits);
  const [mode, setMode] = useState<'lexical' | 'identifier'>(initialResponse.mode);
  const [total, setTotal] = useState(initialResponse.total);
  const [latencyMs, setLatencyMs] = useState(initialResponse.latencyMs);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const [expansions, setExpansions] = useState<
    Array<{ term: string; reason: string; removable: true }>
  >([]);
  const [excludedTerms, setExcludedTerms] = useState<string[]>([]);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    const syncOnline = () => setOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    syncOnline();
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    return () => {
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
    };
  }, []);

  async function runSearch(nextQuery: string, nextType: 'all' | SearchEntityType) {
    setLoading(true);
    setErrorMsg(null);
    setSaveNotice(null);
    try {
      const params = new URLSearchParams();
      if (nextQuery.trim()) params.set('q', nextQuery.trim());
      if (nextType !== 'all') params.set('type', nextType);
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) {
        setErrorMsg('Search service returned an error. Please retry.');
        return;
      }
      const data = (await res.json()) as SearchResponse;
      setHits(data.hits);
      setMode(data.mode);
      setTotal(data.total);
      setLatencyMs(data.latencyMs);
    } catch {
      setErrorMsg('Could not reach search API. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await runSearch(query, activeType);
  }

  async function handleSuggestExpansions() {
    if (!query.trim()) return;
    setErrorMsg(null);
    try {
      const res = await fetch('/api/search/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), excludeTerms: excludedTerms }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        suggestedTerms: Array<{ term: string; reason: string; removable: true }>;
      };
      setExpansions(data.suggestedTerms);
    } catch {
      setErrorMsg('Could not load search term suggestions.');
    }
  }

  async function handleAddExpansionTerm(term: string) {
    const next = `${query.trim()} ${term}`.trim();
    setQuery(next);
    setExpansions((prev) => prev.filter((e) => e.term !== term));
    await runSearch(next, activeType);
  }

  function handleDismissExpansionTerm(term: string) {
    setExcludedTerms((prev) => [...prev, term]);
    setExpansions((prev) => prev.filter((e) => e.term !== term));
  }

  async function handleSaveAlert() {
    if (!query.trim()) return;
    setSaveNotice(null);
    try {
      const res = await fetch('/api/search/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Alert: ${query.trim().slice(0, 80)}`,
          query: query.trim(),
          filters: activeType === 'all' ? {} : { type: activeType },
          alertCadence: 'weekly',
        }),
      });
      if (res.ok) {
        setSaveNotice('Saved search with weekly digest alerts in your Library.');
      } else {
        setSaveNotice('Sign in to save searches and configure alert digests.');
      }
    } catch {
      setSaveNotice('Could not save search while offline.');
    }
  }

  return (
    <div className="space-y-6">
      {offline ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3 font-sans text-xs text-ink-secondary"
        >
          <WifiOff className="h-4 w-4 text-brand" aria-hidden="true" />
          <span>You appear offline. Showing the most recently loaded scholarly results.</span>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        role="search"
        aria-label="Search ResearchWithME knowledge network"
        className="space-y-3 rounded-xl border border-line bg-surface p-4 sm:p-5"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search sources, contributions, claims, tools, projects, or DOI/arXiv IDs</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search papers, claims, tools, topics, or paste DOI / arXiv:2501.12948..."
              className="h-11 w-full rounded-md border border-line bg-canvas pl-9 pr-3 font-sans text-sm text-ink placeholder:text-ink-secondary"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2 font-sans text-sm font-medium text-canvas hover:opacity-90 disabled:opacity-40"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
            <button
              type="button"
              onClick={() => void handleSuggestExpansions()}
              disabled={!query.trim()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-canvas px-4 py-2 font-sans text-xs font-medium text-ink hover:border-brand hover:text-brand disabled:opacity-40"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Suggest terms</span>
            </button>
            <button
              type="button"
              onClick={() => void handleSaveAlert()}
              disabled={!query.trim()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-canvas px-4 py-2 font-sans text-xs font-medium text-ink hover:border-brand hover:text-brand disabled:opacity-40"
            >
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Save alert</span>
            </button>
          </div>
        </div>

        {/* Entity type facet filter pills */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter results by canonical object type">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={activeType === opt.value}
              onClick={() => {
                setActiveType(opt.value);
                void runSearch(query, opt.value);
              }}
              className={`min-h-10 rounded-full px-3 py-1 font-sans text-xs font-medium ${
                activeType === opt.value
                  ? 'bg-brand text-on-primary'
                  : 'border border-line bg-canvas text-ink-secondary hover:text-ink'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Transparent, removable query expansion suggestions (Part V §10.2) */}
        {expansions.length > 0 ? (
          <div className="space-y-2 border-t border-line pt-3">
            <p className="font-mono text-xs text-ink-secondary">
              Optional related terms (visible, editable, and removable — never applied silently):
            </p>
            <div className="flex flex-wrap gap-2">
              {expansions.map((exp) => (
                <span
                  key={exp.term}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas pl-3 pr-1.5 py-1 font-sans text-xs text-ink"
                >
                  <button
                    type="button"
                    onClick={() => void handleAddExpansionTerm(exp.term)}
                    title={exp.reason}
                    className="inline-flex items-center gap-1 hover:text-brand"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    <span>{exp.term}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissExpansionTerm(exp.term)}
                    aria-label={`Dismiss suggested term ${exp.term}`}
                    className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-ink-secondary hover:text-ink"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </form>

      {saveNotice ? (
        <p role="status" className="rounded-md border border-line bg-surface px-4 py-2 font-sans text-xs text-ink">
          {saveNotice}
        </p>
      ) : null}

      {errorMsg ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-surface px-4 py-2 font-sans text-xs text-destructive">
          {errorMsg}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-ink-secondary">
        <span>
          {total} {total === 1 ? 'result' : 'results'} · mode: {mode} · {latencyMs}ms
        </span>
        <Link href="/library" className="hover:text-brand hover:underline">
          Manage saved searches in Library
        </Link>
      </div>

      {hits.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface p-8 text-center space-y-2">
          <p className="font-serif text-lg font-semibold text-ink">No matching scholarly records</p>
          <p className="font-sans text-sm text-ink-secondary">
            Try a broader keyword, switch entity filters to “All objects”, or paste a canonical DOI or arXiv identifier.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {hits.map((hit) => (
            <li
              key={`${hit.type}:${hit.id}`}
              className="rounded-lg border border-line bg-surface p-4 space-y-1.5"
            >
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="rounded-sm bg-brand/10 px-2 py-0.5 font-semibold uppercase text-brand">
                  {hit.type}
                </span>
                <span className="rounded-sm border border-line bg-canvas px-2 py-0.5 text-ink-secondary">
                  {hit.matchReason}
                </span>
                {hit.integrityStatus && hit.integrityStatus !== 'active' ? (
                  <span className="rounded-sm border border-destructive/40 px-2 py-0.5 font-semibold uppercase text-destructive">
                    {hit.integrityStatus}
                  </span>
                ) : null}
              </div>
              <h2 className="font-serif text-lg font-semibold text-ink">
                <Link href={hit.url} className="hover:text-brand hover:underline">
                  {hit.title}
                </Link>
              </h2>
              {hit.snippet ? (
                <p className="font-sans text-sm text-ink-secondary">{hit.snippet}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
