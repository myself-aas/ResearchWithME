'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bookmark, CheckCircle2, Plus, Target, Trash2 } from 'lucide-react';
import type { LibraryItemRecord, ResearchGoalRecord } from '@/lib/v34/store';
import { formatDate } from '@/lib/formatting/locale';

interface LibraryClientProps {
  initialItems: LibraryItemRecord[];
  initialGoals: ResearchGoalRecord[];
}

export default function LibraryClient({ initialItems, initialGoals }: LibraryClientProps) {
  const [items, setItems] = useState<LibraryItemRecord[]>(initialItems);
  const [goals, setGoals] = useState<ResearchGoalRecord[]>(initialGoals);
  const [activeCollection, setActiveCollection] = useState<string>('all');

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState(3);
  const [newGoalMetric, setNewGoalMetric] = useState<ResearchGoalRecord['metric']>('SOURCES_REVIEWED');
  const [newGoalPeriod, setNewGoalPeriod] = useState<ResearchGoalRecord['period']>('WEEKLY');
  const [savingGoal, setSavingGoal] = useState(false);

  const collections = Array.from(new Set(items.map((item) => item.collection)));
  const visibleItems =
    activeCollection === 'all'
      ? items
      : items.filter((item) => item.collection === activeCollection);

  async function handleRemoveItem(item: LibraryItemRecord) {
    const res = await fetch(
      `/api/library?itemType=${encodeURIComponent(item.itemType)}&itemId=${encodeURIComponent(item.itemId)}`,
      { method: 'DELETE' },
    );
    if (res.ok) {
      setItems((prev) =>
        prev.filter((i) => !(i.itemType === item.itemType && i.itemId === item.itemId)),
      );
    }
  }

  async function handleCreateGoal(event: React.FormEvent) {
    event.preventDefault();
    if (!newGoalTitle.trim() || savingGoal) return;
    setSavingGoal(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newGoalTitle.trim(),
          metric: newGoalMetric,
          targetValue: newGoalTarget,
          currentValue: 0,
          period: newGoalPeriod,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { goal: ResearchGoalRecord };
        setGoals((prev) => [data.goal, ...prev]);
        setNewGoalTitle('');
      }
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleIncrementGoal(goal: ResearchGoalRecord) {
    const nextValue = Math.min(goal.targetValue, goal.currentValue + 1);
    const res = await fetch('/api/goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: goal.id, currentValue: nextValue }),
    });
    if (res.ok) {
      const data = (await res.json()) as { goal: ResearchGoalRecord };
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? data.goal : g)));
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Saved Library Collections */}
      <section aria-labelledby="saved-library-heading" className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="saved-library-heading" className="font-serif text-2xl font-semibold text-ink">
            Saved Research Items ({visibleItems.length})
          </h2>
          {collections.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setActiveCollection('all')}
                aria-pressed={activeCollection === 'all'}
                className={`min-h-10 rounded-full px-3 py-1 font-sans text-xs font-medium ${
                  activeCollection === 'all'
                    ? 'bg-brand text-on-primary'
                    : 'border border-line bg-surface text-ink-secondary hover:text-ink'
                }`}
              >
                All
              </button>
              {collections.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setActiveCollection(col)}
                  aria-pressed={activeCollection === col}
                  className={`min-h-10 rounded-full px-3 py-1 font-sans text-xs font-medium ${
                    activeCollection === col
                      ? 'bg-brand text-on-primary'
                      : 'border border-line bg-surface text-ink-secondary hover:text-ink'
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {visibleItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-surface p-8 text-center">
            <Bookmark className="mx-auto h-6 w-6 text-brand" aria-hidden="true" />
            <p className="mt-2 font-sans text-base font-semibold text-ink">Your research library is empty</p>
            <p className="mt-1 font-sans text-sm text-ink-secondary">
              Save papers, canonical sources, and contributions from the feed to organize your literature review.
            </p>
            <Link
              href="/feed"
              className="mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-5 py-2 font-sans text-sm font-medium text-canvas hover:opacity-90"
            >
              Browse research feed
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleItems.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line bg-surface p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-ink-secondary">
                    <span className="rounded-sm bg-brand/10 px-2 py-0.5 font-semibold uppercase text-brand">
                      {item.itemType}
                    </span>
                    <span>{item.collection}</span>
                    <span>·</span>
                    <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                  </div>
                  <h3 className="mt-1.5 font-serif text-lg font-semibold text-ink">
                    <Link href={item.url} className="hover:text-brand hover:underline">
                      {item.title}
                    </Link>
                  </h3>
                  {item.note ? (
                    <p className="mt-1 font-sans text-xs text-ink-secondary">{item.note}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemoveItem(item)}
                  aria-label={`Remove ${item.title} from library`}
                  className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-ink-secondary hover:bg-surface-subtle hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Personal Research OS — Structured Research Goals */}
      <aside aria-labelledby="goals-heading" className="min-w-0 space-y-4">
        <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-brand" aria-hidden="true" />
            <h2 id="goals-heading" className="font-serif text-xl font-semibold text-ink">
              Personal Research Goals
            </h2>
          </div>
          <p className="mt-1 font-sans text-xs text-ink-secondary">
            Track verifiable research habits without manipulative streaks or vanity scores.
          </p>

          <ul className="mt-4 space-y-3">
            {goals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.currentValue / Math.max(1, goal.targetValue)) * 100));
              const done = goal.status === 'COMPLETED' || goal.currentValue >= goal.targetValue;
              return (
                <li key={goal.id} className="rounded-md border border-line bg-canvas p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-medium text-ink">{goal.title}</p>
                      <p className="mt-0.5 font-mono text-xs uppercase text-ink-secondary">
                        {goal.period} · {goal.currentValue}/{goal.targetValue}
                      </p>
                    </div>
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-trust-verified" aria-label="Completed" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleIncrementGoal(goal)}
                        aria-label={`Record progress for ${goal.title}`}
                        className="inline-flex min-h-10 items-center gap-1 rounded-full border border-brand bg-brand/10 px-2.5 py-1 font-mono text-xs font-semibold text-brand hover:bg-brand/15"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>+1</span>
                      </button>
                    )}
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <form onSubmit={handleCreateGoal} className="mt-5 space-y-3 border-t border-line pt-4">
            <p className="font-mono text-xs font-semibold uppercase text-ink-secondary">
              Add research goal
            </p>
            <input
              type="text"
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              placeholder="e.g. Extract evidence from 4 methods papers"
              aria-label="New research goal title"
              className="h-11 w-full rounded-md border border-line bg-canvas px-3 font-sans text-sm text-ink"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newGoalMetric}
                onChange={(e) => setNewGoalMetric(e.target.value as ResearchGoalRecord['metric'])}
                aria-label="Goal metric"
                className="h-11 rounded-md border border-line bg-canvas px-2.5 font-sans text-xs text-ink"
              >
                <option value="SOURCES_REVIEWED">Sources reviewed</option>
                <option value="CONTRIBUTIONS_PUBLISHED">Contributions</option>
                <option value="EVIDENCE_ATTACHED">Evidence units</option>
                <option value="REPLICATIONS_DOCUMENTED">Replications</option>
              </select>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(Number(e.target.value) || 1)}
                  aria-label="Target count"
                  className="h-11 w-16 rounded-md border border-line bg-canvas px-2 font-mono text-xs text-ink"
                />
                <select
                  value={newGoalPeriod}
                  onChange={(e) => setNewGoalPeriod(e.target.value as ResearchGoalRecord['period'])}
                  aria-label="Goal period"
                  className="h-11 flex-1 rounded-md border border-line bg-canvas px-2 font-sans text-xs text-ink"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={savingGoal || !newGoalTitle.trim()}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-2 font-sans text-sm font-medium text-canvas hover:opacity-90 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Add goal</span>
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
