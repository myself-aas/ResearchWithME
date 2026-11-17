'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Code2, ExternalLink, GitFork, Link2, Plus, Star, Tag } from 'lucide-react';
import { formatCompactNumber, formatShortDate } from '@/lib/formatting/locale';
import type { SourceRecord } from '@/lib/v34/store';
import type { ToolProvider } from '@/lib/v34/wave3-contracts';
import type { ToolRepositoryRecord, ToolSourceLinkRecord } from '@/lib/v34/wave3-store';

interface ToolsDirectoryClientProps {
  initialTools: ToolRepositoryRecord[];
  availableSources: SourceRecord[];
}

export function ToolsDirectoryClient({
  initialTools,
  availableSources,
}: ToolsDirectoryClientProps) {
  const [tools, setTools] = useState<ToolRepositoryRecord[]>(initialTools);
  const [query, setQuery] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  // Register form state
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<ToolProvider>('github');
  const [ownerName, setOwnerName] = useState('');
  const [repoName, setRepoName] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [license, setLicense] = useState('Apache-2.0');
  const [primaryLanguage, setPrimaryLanguage] = useState('Python');
  const [latestReleaseTag, setLatestReleaseTag] = useState('');

  // Quick URL import state (Part V §6.6 POST /api/tools/import)
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  // Link source state
  const [linkingToolId, setLinkingToolId] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState(availableSources[0]?.id ?? '');
  const [releaseTag, setReleaseTag] = useState('');

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const sourceById = useMemo(
    () => new Map(availableSources.map((s) => [s.id, s])),
    [availableSources],
  );

  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter((t) =>
      `${t.name} ${t.ownerName}/${t.repoName} ${t.summary} ${t.topics.join(' ')} ${t.primaryLanguage ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [tools, query]);

  async function handleQuickImport(event: React.FormEvent) {
    event.preventDefault();
    if (!importUrl.trim()) return;
    setImporting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/tools/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: importUrl.trim() }),
      });
      const data = (await res.json()) as {
        tool?: ToolRepositoryRecord;
        deduplicated?: boolean;
        error?: string;
      };
      if (!res.ok || !data.tool) {
        setFeedback(data.error || 'Could not import repository URL.');
        return;
      }
      setTools((prev) => {
        const exists = prev.some((t) => t.id === data.tool!.id);
        return exists
          ? prev.map((t) => (t.id === data.tool!.id ? data.tool! : t))
          : [data.tool!, ...prev];
      });
      setImportUrl('');
      setFeedback(
        data.deduplicated
          ? `Refreshed existing deduplicated repository "${data.tool.ownerName}/${data.tool.repoName}".`
          : `Imported "${data.tool.ownerName}/${data.tool.repoName}" into the global tool registry.`,
      );
    } catch {
      setFeedback('Network error importing repository URL.');
    } finally {
      setImporting(false);
    }
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          provider,
          ownerName,
          repoName,
          repositoryUrl,
          summary,
          license: license || undefined,
          primaryLanguage: primaryLanguage || undefined,
          latestReleaseTag: latestReleaseTag || undefined,
          topics: ['Open-Source Tools'],
        }),
      });
      const data = (await res.json()) as {
        tool?: ToolRepositoryRecord;
        created?: boolean;
        error?: string;
      };
      if (!res.ok || !data.tool) {
        setFeedback(data.error || 'Could not register tool repository.');
        return;
      }
      setTools((prev) => {
        const exists = prev.some((t) => t.id === data.tool!.id);
        return exists
          ? prev.map((t) => (t.id === data.tool!.id ? data.tool! : t))
          : [data.tool!, ...prev];
      });
      setName('');
      setOwnerName('');
      setRepoName('');
      setRepositoryUrl('');
      setSummary('');
      setLatestReleaseTag('');
      setShowRegister(false);
      setFeedback(
        data.created
          ? `Registered global repository "${data.tool.name}".`
          : `Deduplicated: refreshed observation metadata on existing "${data.tool.name}" record.`,
      );
    } catch {
      setFeedback('Network error registering tool repository.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLinkSource(toolId: string, event: React.FormEvent) {
    event.preventDefault();
    if (!selectedSourceId) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/tools/${encodeURIComponent(toolId)}/link-source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: selectedSourceId,
          releaseTag: releaseTag || undefined,
        }),
      });
      const data = (await res.json()) as { link?: ToolSourceLinkRecord; error?: string };
      if (!res.ok || !data.link) {
        setFeedback(data.error || 'Could not link software source snapshot.');
        return;
      }
      setTools((prev) =>
        prev.map((t) => {
          if (t.id !== toolId) return t;
          const exists = t.linkedSources.some((l) => l.sourceId === data.link!.sourceId);
          return {
            ...t,
            linkedSources: exists
              ? t.linkedSources.map((l) => (l.sourceId === data.link!.sourceId ? data.link! : l))
              : [...t.linkedSources, data.link!],
          };
        }),
      );
      setLinkingToolId(null);
      setReleaseTag('');
      setFeedback('Linked canonical citable software source snapshot.');
    } catch {
      setFeedback('Network error linking source.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="flex-1 max-w-md">
          <span className="sr-only">Filter tool repositories</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repositories, languages, or topics..."
            className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink"
          />
        </label>

        <button
          type="button"
          onClick={() => setShowRegister((prev) => !prev)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-medium text-on-primary hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Register tool repository
        </button>
      </div>

      {/* Part V §6.6: One-step deduplicated GitHub/GitLab URL import */}
      <form
        onSubmit={handleQuickImport}
        aria-label="Import tool repository by URL"
        className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-4"
      >
        <label className="min-w-[220px] flex-1 space-y-1 text-xs">
          <span className="font-semibold text-ink">Quick import repository URL</span>
          <input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://github.com/org/repo"
            className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
          />
        </label>
        <button
          type="submit"
          disabled={importing || !importUrl.trim()}
          className="inline-flex min-h-10 items-center rounded-lg border border-brand bg-brand/10 px-4 py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-on-primary disabled:opacity-50"
        >
          {importing ? 'Importing…' : 'Import repository'}
        </button>
      </form>

      {showRegister && (
        <form
          onSubmit={handleRegister}
          className="rounded-xl border border-brand/30 bg-surface p-5 space-y-4"
        >
          <div>
            <h2 className="text-base font-semibold text-ink">Register Global Tool Repository</h2>
            <p className="text-xs text-ink-secondary">
              Repositories are globally deduplicated. Live star/fork/release counts are stored as
              timestamped observations — never copied onto canonical Sources as timeless facts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-ink">Display name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SGLang"
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-ink">Provider</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as ToolProvider)}
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
              >
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
                <option value="huggingface">Hugging Face</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-ink">Primary language</span>
              <input
                type="text"
                value={primaryLanguage}
                onChange={(e) => setPrimaryLanguage(e.target.value)}
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-ink">Owner / org</span>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="sgl-project"
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-ink">Repo name</span>
              <input
                type="text"
                required
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="sglang"
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-ink">License</span>
              <input
                type="text"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-ink">Canonical repository URL</span>
              <input
                type="url"
                required
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                placeholder="https://github.com/sgl-project/sglang"
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-ink">Latest release tag (optional)</span>
              <input
                type="text"
                value={latestReleaseTag}
                onChange={(e) => setLatestReleaseTag(e.target.value)}
                placeholder="v0.4.1"
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
              />
            </label>
          </div>

          <label className="block space-y-1 text-xs">
            <span className="font-medium text-ink">Summary</span>
            <textarea
              rows={2}
              required
              minLength={5}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What scholarly or technical workflow does this repository enable?"
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand px-4 py-2 text-xs font-medium text-on-primary disabled:opacity-50"
            >
              {busy ? 'Registering…' : 'Register / refresh repository'}
            </button>
            <button
              type="button"
              onClick={() => setShowRegister(false)}
              className="rounded-lg border border-line px-3 py-2 text-xs text-ink-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {feedback && (
        <p role="status" className="text-xs font-medium text-brand">
          {feedback}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredTools.map((tool) => (
          <article
            key={tool.id}
            className="rounded-xl border border-line bg-surface p-5 flex flex-col justify-between gap-4"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1 font-mono text-ink-secondary">
                  <Code2 className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                  {tool.provider} · {tool.ownerName}/{tool.repoName}
                </span>
                {tool.license && (
                  <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-xs text-ink-secondary">
                    {tool.license}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-bold text-ink">
                  <a
                    href={tool.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-brand"
                  >
                    {tool.name}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </h2>
                <p className="text-sm text-ink-secondary leading-relaxed">{tool.summary}</p>
              </div>

              {/* Timestamped observation metrics (§8 invariant) */}
              <div className="rounded-lg border border-line bg-canvas/60 p-3 space-y-1.5 text-xs">
                <div className="flex flex-wrap items-center gap-4 text-ink">
                  {tool.starsCount !== null && (
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Star className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                      {formatCompactNumber(tool.starsCount)} stars
                    </span>
                  )}
                  {tool.forksCount !== null && (
                    <span className="inline-flex items-center gap-1 font-medium">
                      <GitFork className="h-3.5 w-3.5 text-ink-secondary" aria-hidden="true" />
                      {formatCompactNumber(tool.forksCount)} forks
                    </span>
                  )}
                  {tool.latestReleaseTag && (
                    <span className="inline-flex items-center gap-1 font-mono text-brand">
                      <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                      {tool.latestReleaseTag}
                    </span>
                  )}
                  {tool.primaryLanguage && (
                    <span className="text-ink-secondary">{tool.primaryLanguage}</span>
                  )}
                </div>
                <p className="text-ink-secondary">
                  Repository metrics observed on{' '}
                  <time dateTime={tool.observedAt}>{formatShortDate(tool.observedAt)}</time> —
                  kept separate from immutable Source records.
                </p>
              </div>

              {/* Linked citable Software Source snapshots (ToolSourceLink) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-ink inline-flex items-center gap-1">
                    <Link2 className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                    Linked Citable Sources ({tool.linkedSources.length})
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setLinkingToolId((prev) => (prev === tool.id ? null : tool.id))
                    }
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    + Link source snapshot
                  </button>
                </div>

                {tool.linkedSources.length > 0 ? (
                  <ul className="space-y-1.5 text-xs">
                    {tool.linkedSources.map((link) => {
                      const src = sourceById.get(link.sourceId);
                      return (
                        <li
                          key={`${link.toolRepositoryId}-${link.sourceId}`}
                          className="rounded-lg border border-line bg-canvas px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                        >
                          <Link
                            href={`/source/${link.sourceId}`}
                            className="font-medium text-ink hover:text-brand hover:underline"
                          >
                            {src?.title ?? link.sourceId}
                          </Link>
                          <span className="font-mono text-ink-secondary">
                            {link.releaseTag ? `release ${link.releaseTag}` : 'pinned snapshot'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-ink-secondary">
                    No citable software source snapshots linked yet.
                  </p>
                )}

                {linkingToolId === tool.id && availableSources.length > 0 && (
                  <form
                    onSubmit={(e) => handleLinkSource(tool.id, e)}
                    className="rounded-lg border border-brand/30 bg-canvas p-3 space-y-2 text-xs"
                  >
                    <label className="block space-y-1">
                      <span className="font-medium text-ink">Canonical source record</span>
                      <select
                        value={selectedSourceId}
                        onChange={(e) => setSelectedSourceId(e.target.value)}
                        className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink"
                      >
                        {availableSources.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1">
                      <span className="font-medium text-ink">Release tag (optional)</span>
                      <input
                        type="text"
                        value={releaseTag}
                        onChange={(e) => setReleaseTag(e.target.value)}
                        placeholder={tool.latestReleaseTag ?? 'v1.0.0'}
                        className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-on-primary disabled:opacity-50"
                    >
                      Save source link
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-line">
              {tool.topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full bg-surface-subtle px-2.5 py-0.5 text-xs text-ink-secondary"
                >
                  {topic}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
