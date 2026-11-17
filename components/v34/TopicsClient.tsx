'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FolderTree, Plus, Search, Tag } from 'lucide-react';
import type { TopicWithCounts } from '@/lib/v34/wave5-store';

interface TopicsClientProps {
  initialTopics: TopicWithCounts[];
}

export default function TopicsClient({ initialTopics }: TopicsClientProps) {
  const [topics, setTopics] = useState<TopicWithCounts[]>(initialTopics);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentTopicId, setParentTopicId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [topics, query]);

  const byId = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);

  async function handleCreateTopic(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: name.trim(),
          description: description.trim(),
          parentTopicId: parentTopicId || null,
        }),
      });
      const data = (await res.json()) as {
        topic?: TopicWithCounts;
        created?: boolean;
        error?: string;
      };
      if (!res.ok || !data.topic) {
        setStatusMessage(data.error || 'Could not create topic.');
        return;
      }
      if (data.created) {
        setTopics((prev) => [
          { ...data.topic!, assignmentCount: 0, assignments: [] },
          ...prev,
        ]);
        setStatusMessage(`Created canonical topic “${data.topic.name}”.`);
      } else {
        setStatusMessage(`Topic “${data.topic.name}” already exists in the canonical taxonomy.`);
      }
      setName('');
      setDescription('');
      setParentTopicId('');
    } catch {
      setStatusMessage('Network error while creating topic.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-labelledby="topics-list-heading" className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="topics-list-heading" className="font-serif text-2xl font-semibold text-ink">
            Canonical Topics ({filtered.length})
          </h2>
          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Filter canonical topics</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter topics by name or slug..."
              className="h-11 w-full rounded-md border border-line bg-surface pl-9 pr-3 font-sans text-sm text-ink placeholder:text-ink-secondary"
            />
          </label>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map((topic) => {
            const parent = topic.parentTopicId ? byId.get(topic.parentTopicId) : null;
            return (
              <li
                key={topic.id}
                className="flex flex-col justify-between rounded-lg border border-line bg-surface p-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-brand">
                      <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                      {topic.slug}
                    </span>
                    <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-xs text-ink-secondary">
                      {topic.assignmentCount}{' '}
                      {topic.assignmentCount === 1 ? 'linked item' : 'linked items'}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-ink">{topic.name}</h3>
                  {parent ? (
                    <p className="inline-flex items-center gap-1 font-mono text-xs text-ink-secondary">
                      <FolderTree className="h-3.5 w-3.5" aria-hidden="true" />
                      Parent: {parent.name}
                    </p>
                  ) : null}
                  {topic.description ? (
                    <p className="font-sans text-sm text-ink-secondary">{topic.description}</p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <Link
                    href={`/feed?topic=${encodeURIComponent(topic.name)}`}
                    className="inline-flex min-h-10 items-center rounded-full border border-line bg-canvas px-3 py-1 font-sans text-xs font-medium text-ink hover:border-brand hover:text-brand"
                  >
                    View in feed
                  </Link>
                  <Link
                    href="/graph"
                    className="inline-flex min-h-10 items-center rounded-full border border-line bg-canvas px-3 py-1 font-sans text-xs font-medium text-ink-secondary hover:text-ink"
                  >
                    Inspect in graph
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <aside aria-labelledby="new-topic-heading" className="min-w-0">
        <div className="rounded-lg border border-line bg-surface p-5 space-y-4">
          <div>
            <h2 id="new-topic-heading" className="font-serif text-xl font-semibold text-ink">
              Add Canonical Topic
            </h2>
            <p className="mt-1 font-sans text-xs text-ink-secondary">
              Topics are first-class FK-backed entities shared across contributions, sources, projects, and tools — replacing ad-hoc string tags.
            </p>
          </div>

          {statusMessage ? (
            <p
              role="status"
              className="rounded-md border border-line bg-canvas px-3 py-2 font-sans text-xs text-ink"
            >
              {statusMessage}
            </p>
          ) : null}

          <form onSubmit={handleCreateTopic} className="space-y-3">
            <div>
              <label htmlFor="topic-name" className="block font-mono text-xs font-semibold uppercase text-ink-secondary">
                Topic name
              </label>
              <input
                id="topic-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Formal Verification"
                className="mt-1 h-11 w-full rounded-md border border-line bg-canvas px-3 font-sans text-sm text-ink"
              />
            </div>

            <div>
              <label htmlFor="topic-parent" className="block font-mono text-xs font-semibold uppercase text-ink-secondary">
                Parent topic (optional)
              </label>
              <select
                id="topic-parent"
                value={parentTopicId}
                onChange={(e) => setParentTopicId(e.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-line bg-canvas px-3 font-sans text-sm text-ink"
              >
                <option value="">None (top-level topic)</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="topic-desc" className="block font-mono text-xs font-semibold uppercase text-ink-secondary">
                Scope description
              </label>
              <textarea
                id="topic-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what empirical or methodological work belongs under this topic..."
                className="mt-1 w-full rounded-md border border-line bg-canvas p-3 font-sans text-sm text-ink"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-2 font-sans text-sm font-medium text-canvas hover:opacity-90 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{submitting ? 'Creating...' : 'Create canonical topic'}</span>
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
