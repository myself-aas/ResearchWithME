'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  Award,
  Bell,
  Check,
  Clock,
  FolderKanban,
  Pause,
  Play,
  Plus,
  Sliders,
  Sparkles,
  Target,
} from 'lucide-react';
import { formatShortDate } from '@/lib/formatting/locale';
import { editorDb, type LocalDraftRecord } from '@/lib/persistence/editor-db';
import type { ResearchGoalRecord } from '@/lib/v34/store';
import type { ProjectSummary } from '@/lib/v34/wave2-store';
import {
  DEFAULT_LANDING_OPTIONS,
  type AttentionStatus,
  type DefaultLanding,
} from '@/lib/v34/wave3-contracts';
import type {
  AssistantTaskRecord,
  AttentionItemRecord,
  DashboardPreferencesRecord,
  NotificationRecord,
  RecognitionSummary,
} from '@/lib/v34/wave3-store';

interface ResearchOsClientProps {
  initialAttention: AttentionItemRecord[];
  initialNotifications: NotificationRecord[];
  initialAssistantTasks: AssistantTaskRecord[];
  initialGoals: ResearchGoalRecord[];
  initialProjects: ProjectSummary[];
  initialRecognition: RecognitionSummary;
  initialPreferences: DashboardPreferencesRecord;
}

const AVAILABLE_TOPICS = [
  { slug: 'machine-learning', label: 'Machine Learning' },
  { slug: 'llm-inference', label: 'LLM Inference' },
  { slug: 'reproducibility', label: 'Reproducibility' },
  { slug: 'systems', label: 'Systems' },
  { slug: 'open-source-tools', label: 'Open-Source Tools' },
  { slug: 'reasoning-models', label: 'Reasoning Models' },
];

export function ResearchOsClient({
  initialAttention,
  initialNotifications,
  initialAssistantTasks,
  initialGoals,
  initialProjects,
  initialRecognition,
  initialPreferences,
}: ResearchOsClientProps) {
  const [attention, setAttention] = useState<AttentionItemRecord[]>(initialAttention);
  const [notifications, setNotifications] = useState<NotificationRecord[]>(initialNotifications);
  const [assistantTasks, setAssistantTasks] = useState<AssistantTaskRecord[]>(initialAssistantTasks);
  const [goals, setGoals] = useState<ResearchGoalRecord[]>(initialGoals);
  const [localDrafts, setLocalDrafts] = useState<LocalDraftRecord[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState(5);
  const [preferences, setPreferences] = useState<DashboardPreferencesRecord>(initialPreferences);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const drafts = await editorDb.listDrafts();
        if (active) setLocalDrafts(drafts.slice(0, 4));
      } catch {
        // Ignore if IndexedDB is unavailable in restricted browser context
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleGoalProgress(goalId: string) {
    setBusyId(`goal-prog-${goalId}`);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/goals/${encodeURIComponent(goalId)}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: 1, note: 'Logged validated research step' }),
      });
      const data = (await res.json()) as { goal?: ResearchGoalRecord; error?: string };
      if (!res.ok || !data.goal) {
        setStatusMessage(data.error || 'Sign in to record research goal progress.');
        return;
      }
      setGoals((prev) => prev.map((g) => (g.id === goalId ? data.goal! : g)));
      setStatusMessage(`Goal progress updated: ${data.goal.currentValue}/${data.goal.targetValue}.`);
    } catch {
      setStatusMessage('Network error updating goal progress.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleGoalLifecycle(goalId: string, action: 'pause' | 'resume' | 'archive') {
    setBusyId(`goal-${action}-${goalId}`);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/goals/${encodeURIComponent(goalId)}/${action}`, {
        method: 'POST',
      });
      const data = (await res.json()) as { goal?: ResearchGoalRecord; error?: string };
      if (!res.ok || !data.goal) {
        setStatusMessage(data.error || `Sign in to ${action} this research goal.`);
        return;
      }
      setGoals((prev) => prev.map((g) => (g.id === goalId ? data.goal! : g)));
      setStatusMessage(`Goal "${data.goal.title}" is now ${data.goal.status.toLowerCase()}.`);
    } catch {
      setStatusMessage(`Network error trying to ${action} goal.`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newGoalTitle.trim();
    if (!trimmed) return;
    setBusyId('goal-create');
    setStatusMessage(null);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmed,
          metric: 'EVIDENCE_ATTACHED',
          targetValue: Math.max(1, Math.min(100, Number(newGoalTarget) || 5)),
          period: 'MONTHLY',
        }),
      });
      const data = (await res.json()) as { goal?: ResearchGoalRecord; error?: string };
      if (!res.ok || !data.goal) {
        setStatusMessage(data.error || 'Sign in to create a personal research goal.');
        return;
      }
      setGoals((prev) => [data.goal!, ...prev]);
      setNewGoalTitle('');
      setStatusMessage(`Created research goal "${data.goal.title}".`);
    } catch {
      setStatusMessage('Network error creating research goal.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleAttentionStatus(id: string, status: AttentionStatus) {
    setBusyId(id);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/attention', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = (await res.json()) as { item?: AttentionItemRecord; error?: string };
      if (!res.ok || !data.item) {
        setStatusMessage(data.error || 'Could not update attention item.');
        return;
      }
      setAttention((prev) => prev.map((a) => (a.id === id ? data.item! : a)));
      setStatusMessage(`Attention item marked ${status.toLowerCase()}.`);
    } catch {
      setStatusMessage('Network error updating attention item.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleNotificationRead(notif: NotificationRecord) {
    setBusyId(notif.id);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id, read: notif.readAt === null }),
      });
      const data = (await res.json()) as { notification?: NotificationRecord; error?: string };
      if (!res.ok || !data.notification) {
        setStatusMessage(data.error || 'Could not update notification.');
        return;
      }
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? data.notification! : n)));
    } catch {
      setStatusMessage('Network error updating notification.');
    } finally {
      setBusyId(null);
    }
  }

  async function handlePromoteTask(task: AssistantTaskRecord) {
    setBusyId(task.id);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/assistant-tasks/${encodeURIComponent(task.id)}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ severity: 'INFO' }),
      });
      const data = (await res.json()) as {
        task?: AssistantTaskRecord;
        attentionItem?: AttentionItemRecord;
        error?: string;
      };
      if (!res.ok || !data.task || !data.attentionItem) {
        setStatusMessage(data.error || 'Could not promote assistant task.');
        return;
      }
      setAssistantTasks((prev) => prev.map((t) => (t.id === task.id ? data.task! : t)));
      setAttention((prev) => {
        const exists = prev.some((a) => a.id === data.attentionItem!.id);
        return exists ? prev : [data.attentionItem!, ...prev];
      });
      setStatusMessage('Assistant suggestion explicitly promoted to your Attention Queue.');
    } catch {
      setStatusMessage('Network error promoting task.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpdateLanding(defaultLanding: DefaultLanding) {
    setBusyId('prefs');
    setStatusMessage(null);
    try {
      const res = await fetch('/api/dashboard/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultLanding }),
      });
      const data = (await res.json()) as {
        preferences?: DashboardPreferencesRecord;
        error?: string;
      };
      if (!res.ok || !data.preferences) {
        setStatusMessage(data.error || 'Could not save landing preference.');
        return;
      }
      setPreferences(data.preferences);
      setStatusMessage(`Default landing preference saved: ${defaultLanding}.`);
    } catch {
      setStatusMessage('Network error saving preferences.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleTopic(slug: string, label: string) {
    const isFollowed = preferences.followedTopics.some((t) => t.topicSlug === slug);
    setBusyId(`topic-${slug}`);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/dashboard/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isFollowed
            ? { unfollowTopicSlug: slug }
            : { followTopic: { topicSlug: slug, topicLabel: label } },
        ),
      });
      const data = (await res.json()) as {
        preferences?: DashboardPreferencesRecord;
        error?: string;
      };
      if (!res.ok || !data.preferences) {
        setStatusMessage(data.error || 'Could not update followed topic.');
        return;
      }
      setPreferences(data.preferences);
    } catch {
      setStatusMessage('Network error updating followed topics.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAllRead() {
    setBusyId('read-all');
    setStatusMessage(null);
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      const data = (await res.json()) as {
        markedCount?: number;
        readAt?: string;
        openAttentionCount?: number;
        error?: string;
      };
      if (!res.ok) {
        setStatusMessage(data.error || 'Could not mark all notifications read.');
        return;
      }
      const readAt = data.readAt ?? new Date().toISOString();
      setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt })));
      setStatusMessage(
        `Marked ${data.markedCount ?? 0} notification(s) read. ${data.openAttentionCount ?? openAttention.length} open Attention Queue item(s) remain untouched.`,
      );
    } catch {
      setStatusMessage('Network error marking notifications read.');
    } finally {
      setBusyId(null);
    }
  }

  const openAttention = attention.filter((a) => a.status === 'OPEN' || a.status === 'ACKNOWLEDGED');
  const unreadNotifs = notifications.filter((n) => n.readAt === null);

  return (
    <div className="space-y-8">
      {statusMessage && (
        <p
          role="status"
          className="rounded-lg border border-brand/30 bg-brand/5 px-3.5 py-2 text-xs font-medium text-brand"
        >
          {statusMessage}
        </p>
      )}

      {/* Priority #1 Module: Continue Working (Part I §26.4 / Part III §10) */}
      <section
        aria-label="Continue Working"
        className="rounded-xl border border-line bg-surface p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase text-brand">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Continue Working
            </p>
            <h2 className="text-lg font-bold text-ink">Resume Your Active Research Context</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/contribute"
              className="inline-flex min-h-10 items-center rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink hover:border-brand"
            >
              + New Contribution
            </Link>
            <Link
              href="/editor"
              className="inline-flex min-h-10 items-center rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-on-primary hover:opacity-90"
            >
              Open MDX Workspace →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {localDrafts.map((draft) => (
            <Link
              key={draft.id}
              href={`/editor/${encodeURIComponent(draft.id)}`}
              className="flex flex-col justify-between rounded-lg border border-line bg-canvas p-3.5 transition-colors hover:border-brand"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-semibold text-brand uppercase">Draft</span>
                  <span className="rounded-full border border-line px-2 py-0.5 font-mono text-ink-secondary">
                    {draft.saveState}
                  </span>
                </div>
                <p className="font-serif text-sm font-semibold text-ink">
                  {draft.title || 'Untitled scholarly draft'}
                </p>
              </div>
              <p className="mt-2 text-xs text-ink-secondary">
                Resume in MDX Workspace →
              </p>
            </Link>
          ))}

          {initialProjects.slice(0, Math.max(1, 3 - localDrafts.length)).map((proj) => (
            <Link
              key={proj.id}
              href={`/project/${proj.slug}`}
              className="flex flex-col justify-between rounded-lg border border-line bg-canvas p-3.5 transition-colors hover:border-brand"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-semibold text-brand uppercase">Project</span>
                  <span className="rounded-full border border-line px-2 py-0.5 font-mono text-ink-secondary">
                    {proj.stage}
                  </span>
                </div>
                <p className="font-serif text-sm font-semibold text-ink">{proj.title}</p>
              </div>
              <p className="mt-2 text-xs text-ink-secondary">
                {proj.workspaceName} · Open workbench →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Top Row: Attention Queue vs Notifications (strict §10 distinction) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section
          aria-label="Attention Queue"
          className="lg:col-span-7 rounded-xl border border-line bg-surface p-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase text-brand">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Attention Queue ({openAttention.length} active)
              </p>
              <h2 className="text-lg font-bold text-ink">Actions Required From You</h2>
              <p className="text-xs text-ink-secondary">
                Items requiring explicit resolution (review deadlines, unresolved citations, or
                promoted tasks).
              </p>
            </div>
          </div>

          <ul className="space-y-3">
            {attention.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-line bg-canvas/60 p-3.5 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 font-mono font-semibold text-brand">
                    {item.kind.replace(/_/g, ' ')} · {item.severity}
                  </span>
                  <span className="font-mono text-ink-secondary">Status: {item.status}</span>
                </div>
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                {item.explanation && (
                  <p className="text-xs text-ink-secondary leading-relaxed">{item.explanation}</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <Link
                    href={item.actionHref}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                  >
                    {item.actionLabel}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.status !== 'RESOLVED' && (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => handleAttentionStatus(item.id, 'RESOLVED')}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-xs font-medium text-on-primary disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" aria-hidden="true" />
                        Resolve
                      </button>
                    )}
                    {item.status === 'OPEN' && (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => handleAttentionStatus(item.id, 'ACKNOWLEDGED')}
                        className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-ink hover:border-brand disabled:opacity-50"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-label="Notifications Event History"
          className="lg:col-span-5 rounded-xl border border-line bg-surface p-5 space-y-4"
        >
          <div className="space-y-1">
            <p className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase text-ink-secondary">
              <Bell className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              Notifications ({unreadNotifs.length} unread)
            </p>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-ink">Event History</h2>
                <p className="text-xs text-ink-secondary">
                  Reading a notification records acknowledgement of an event without silently resolving
                  Attention items.
                </p>
              </div>
              {unreadNotifs.length > 0 && (
                <button
                  type="button"
                  disabled={busyId === 'read-all'}
                  onClick={handleMarkAllRead}
                  className="inline-flex min-h-9 items-center rounded-lg border border-line bg-canvas px-2.5 py-1 text-xs font-medium text-ink hover:border-brand hover:text-brand disabled:opacity-50"
                >
                  {busyId === 'read-all' ? 'Marking…' : 'Mark all read'}
                </button>
              )}
            </div>
          </div>

          <ul className="space-y-2.5">
            {notifications.map((notif) => (
              <li
                key={notif.id}
                className="rounded-lg border border-line bg-canvas/50 p-3 space-y-1.5 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink">{notif.title}</p>
                  <button
                    type="button"
                    disabled={busyId === notif.id}
                    onClick={() => handleToggleNotificationRead(notif)}
                    className="shrink-0 rounded border border-line bg-surface px-2 py-0.5 text-xs text-ink-secondary hover:text-ink"
                  >
                    {notif.readAt ? 'Mark unread' : 'Mark read'}
                  </button>
                </div>
                <p className="text-ink-secondary">{notif.body}</p>
                {notif.safePreview ? (
                  <p className="font-mono text-xs text-ink-secondary">
                    Lock-screen preview ({notif.classification ?? 'PUBLIC'}): {notif.safePreview}
                  </p>
                ) : null}
                <div className="flex items-center justify-between text-ink-secondary">
                  <span>{formatShortDate(notif.createdAt)}</span>
                  {notif.actionHref && (
                    <Link href={notif.actionHref} className="font-medium text-brand hover:underline">
                      Inspect
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Second Row: Optional Assistant Tasks (§10 promotion boundary) & Research Goals (§12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section
          aria-label="Optional Assistant Tasks"
          className="lg:col-span-6 rounded-xl border border-line bg-surface p-5 space-y-4"
        >
          <div>
            <p className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase text-brand">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Optional Assistant Suggestions
            </p>
            <h2 className="text-lg font-bold text-ink">Assistant Tasks</h2>
            <p className="text-xs text-ink-secondary">
              Assistant suggestions NEVER create mandatory attention automatically. Promote only the
              tasks you want tracked in your Attention Queue.
            </p>
          </div>

          <ul className="space-y-3">
            {assistantTasks.map((task) => (
              <li
                key={task.id}
                className="rounded-lg border border-line bg-canvas/50 p-3.5 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-surface-subtle px-2 py-0.5 font-mono text-ink">
                    {task.taskType}
                  </span>
                  <span className="font-mono text-ink-secondary">{task.status}</span>
                </div>
                <p className="text-sm font-semibold text-ink">{task.title}</p>
                <p className="text-ink-secondary">{task.explanation}</p>
                <div className="pt-1">
                  {task.promotedAttentionId ? (
                    <span className="inline-flex items-center gap-1 font-medium text-brand">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Promoted to Attention Queue
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === task.id}
                      onClick={() => handlePromoteTask(task)}
                      className="rounded-lg border border-brand bg-brand/10 px-3 py-1.5 font-medium text-brand hover:bg-brand hover:text-on-primary transition-colors disabled:opacity-50"
                    >
                      Promote to Attention Queue
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="goals"
          aria-label="Personal Research Goals"
          className="lg:col-span-6 rounded-xl border border-line bg-surface p-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase text-brand">
                <Target className="h-3.5 w-3.5" aria-hidden="true" />
                Research Goals
              </p>
              <h2 className="text-lg font-bold text-ink">Substantive Progress</h2>
              <p className="text-xs text-ink-secondary">
                Goals track validated scholarly work (never login streaks or vanity scores).
              </p>
            </div>
            <Link href="/library" className="text-xs font-medium text-brand hover:underline">
              Manage in Library
            </Link>
          </div>

          <form onSubmit={handleCreateGoal} className="flex flex-wrap gap-2">
            <label htmlFor="new-goal-title" className="sr-only">
              New research goal title
            </label>
            <input
              id="new-goal-title"
              type="text"
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              placeholder="Add substantive goal (e.g., Audit 5 primary citations)…"
              className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink"
            />
            <label htmlFor="new-goal-target" className="sr-only">
              Goal target count
            </label>
            <input
              id="new-goal-target"
              type="number"
              min={1}
              max={100}
              value={newGoalTarget}
              onChange={(e) => setNewGoalTarget(Number(e.target.value) || 1)}
              className="w-16 rounded-lg border border-line bg-canvas px-2 py-2 font-mono text-xs text-ink"
            />
            <button
              type="submit"
              disabled={busyId === 'goal-create' || !newGoalTitle.trim()}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-on-primary disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Goal
            </button>
          </form>

          <ul className="space-y-3">
            {goals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.currentValue / Math.max(1, goal.targetValue)) * 100));
              return (
                <li
                  key={goal.id}
                  className="rounded-lg border border-line bg-canvas/50 p-3.5 space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-ink">{goal.title}</span>
                    <span className="font-mono text-ink-secondary">
                      {goal.currentValue} / {goal.targetValue} ({pct}%) · {goal.status}
                    </span>
                  </div>
                  <div
                    className="h-2 w-full rounded-full bg-surface border border-line overflow-hidden"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={goal.title}
                  >
                    <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                  {goal.status !== 'ARCHIVED' && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {goal.status === 'ACTIVE' && (
                        <>
                          <button
                            type="button"
                            disabled={busyId === `goal-prog-${goal.id}`}
                            onClick={() => void handleGoalProgress(goal.id)}
                            className="inline-flex min-h-9 items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:border-brand"
                          >
                            <Plus className="h-3 w-3" aria-hidden="true" />
                            Log +1
                          </button>
                          <button
                            type="button"
                            disabled={busyId === `goal-pause-${goal.id}`}
                            onClick={() => void handleGoalLifecycle(goal.id, 'pause')}
                            className="inline-flex min-h-9 items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:border-brand"
                          >
                            <Pause className="h-3 w-3" aria-hidden="true" />
                            Pause
                          </button>
                        </>
                      )}
                      {goal.status === 'PAUSED' && (
                        <button
                          type="button"
                          disabled={busyId === `goal-resume-${goal.id}`}
                          onClick={() => void handleGoalLifecycle(goal.id, 'resume')}
                          className="inline-flex min-h-9 items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:border-brand"
                        >
                          <Play className="h-3 w-3" aria-hidden="true" />
                          Resume
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyId === `goal-archive-${goal.id}`}
                        onClick={() => void handleGoalLifecycle(goal.id, 'archive')}
                        className="inline-flex min-h-9 items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:border-brand"
                      >
                        <Archive className="h-3 w-3" aria-hidden="true" />
                        Archive
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Third Row: Event-Derived Recognition (§11) & Landing/Topics Preferences (§13) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section
          id="recognition"
          aria-label="Scholarly Recognition Summary"
          className="lg:col-span-7 rounded-xl border border-line bg-surface p-5 space-y-4"
        >
          <div>
            <p className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase text-brand">
              <Award className="h-3.5 w-3.5" aria-hidden="true" />
              Event-Derived Scholarly Recognition
            </p>
            <h2 className="text-lg font-bold text-ink">
              Verified Contributions for @{initialRecognition.recipientHandle}
            </h2>
            <p className="text-xs text-ink-secondary">
              Derived strictly from non-self verified events ({initialRecognition.windowLabel}). No
              opaque composite reputation score is stored or ranked.
            </p>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {(
              [
                ['Referenced contributions', initialRecognition.referencedContributions],
                ['Helpful reviews', initialRecognition.helpfulReviews],
                ['Evidence reused', initialRecognition.evidenceReuse],
                ['Accepted corrections', initialRecognition.acceptedCorrections],
                ['Replication reports', initialRecognition.replicationReports],
                ['Completed reviews', initialRecognition.completedReviews],
              ] as Array<[string, number]>
            ).map(([label, count]) => (
              <div key={label} className="rounded-lg border border-line bg-canvas p-3">
                <dt className="text-ink-secondary">{label}</dt>
                <dd className="mt-1 font-mono text-xl font-semibold text-ink">{count}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-label="Personal Research OS Preferences"
          className="lg:col-span-5 rounded-xl border border-line bg-surface p-5 space-y-4"
        >
          <div>
            <p className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase text-ink-secondary">
              <Sliders className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              Landing &amp; Topic Follows
            </p>
            <h2 className="text-lg font-bold text-ink">Workspace Preferences</h2>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-ink">Default landing surface</legend>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_LANDING_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={busyId === 'prefs'}
                  onClick={() => handleUpdateLanding(opt)}
                  aria-pressed={preferences.defaultLanding === opt}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                    preferences.defaultLanding === opt
                      ? 'border-brand bg-brand text-on-primary'
                      : 'border-line bg-canvas text-ink hover:border-brand'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2 pt-2 border-t border-line">
            <p className="text-xs font-semibold text-ink">
              Followed Topics ({preferences.followedTopics.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TOPICS.map((topic) => {
                const followed = preferences.followedTopics.some((t) => t.topicSlug === topic.slug);
                return (
                  <button
                    key={topic.slug}
                    type="button"
                    disabled={busyId === `topic-${topic.slug}`}
                    onClick={() => handleToggleTopic(topic.slug, topic.label)}
                    aria-pressed={followed}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      followed
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-line bg-canvas text-ink-secondary hover:text-ink'
                    }`}
                  >
                    {followed ? '✓ ' : '+ '}
                    {topic.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-line space-y-2">
            <p className="text-xs font-semibold text-ink inline-flex items-center gap-1">
              <FolderKanban className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              Active Research Projects ({initialProjects.length})
            </p>
            <ul className="space-y-1.5 text-xs">
              {initialProjects.slice(0, 3).map((proj) => (
                <li key={proj.id}>
                  <Link
                    href={`/workspaces/${proj.slug}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {proj.title}
                  </Link>
                  <span className="ml-1.5 text-ink-secondary">
                    ({proj.stage.replace(/_/g, ' ')})
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-2 border-t border-line flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-ink-secondary">
              Portable research archive (SHA-256 checksummed)
            </span>
            <a
              href="/api/me/export?download=1"
              className="inline-flex min-h-9 items-center rounded-lg border border-line bg-canvas px-3 py-1 text-xs font-medium text-ink hover:border-brand hover:text-brand"
            >
              Export my data (JSON)
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
