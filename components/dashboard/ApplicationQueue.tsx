'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Inbox, XCircle } from 'lucide-react';
import type { AuthorApplication } from '@/lib/applications';
import { panelClass } from '@/components/cms/styles';
import { cn } from '@/lib/utils';

const STATUS_TONE: Record<AuthorApplication['status'], string> = {
  pending: 'bg-amber-50 text-amber-900 border-amber-300',
  approved: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  rejected: 'bg-stone-100 text-stone-800 border-stone-300',
};

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString('en-US', { dateStyle: 'medium' });
  } catch {
    return value;
  }
}

export default function ApplicationQueue({ applications }: { applications: AuthorApplication[] }) {
  const [rows, setRows] = useState(applications);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingCount = rows.filter((row) => row.status === 'pending').length;

  async function review(id: number, approve: boolean) {
    if (busyId !== null) return;
    setBusyId(id);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/applications/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Matches review_author_application(p_id, p_approve, p_note).
        body: JSON.stringify({ approve, note: '' }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { application?: AuthorApplication; error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? 'The decision could not be saved. Try again.');
        return;
      }

      if (payload?.application) {
        const next = payload.application;
        setRows((current) => current.map((row) => (row.id === next.id ? next : row)));
      }
    } catch {
      setError('The review service could not be reached. Check your connection.');
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div
        className={cn(
          panelClass,
          'flex flex-col items-center gap-3 px-6 py-14 text-center',
        )}
      >
        <Inbox className="h-8 w-8 text-stone-400" aria-hidden="true" />
        <p className="font-serif text-lg font-semibold text-stone-900">No applications yet</p>
        <p className="max-w-sm text-sm leading-relaxed text-stone-600">
          Writers connect a GitHub or ORCID account and apply from their dashboard. Applications
          appear here for review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        {pendingCount} pending · {rows.length} total
      </p>

      {error && (
        <div role="alert" className="border-l-2 border-red-700 bg-red-50 px-4 py-3">
          <p className="flex items-start gap-2 text-sm font-medium text-red-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        </div>
      )}

      <ul className="space-y-4">
        {rows.map((row) => (
          <li key={row.id} className={cn(panelClass, 'p-5')}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-serif text-lg font-bold text-stone-900">
                  {row.display_name || row.handle}
                </p>
                <p className="mt-0.5 text-sm text-stone-600">
                  {row.provider} · <span className="break-all">{row.handle}</span>
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize',
                  STATUS_TONE[row.status] ?? STATUS_TONE.pending,
                )}
              >
                {row.status}
              </span>
            </div>

            {row.statement && (
              <blockquote className="mt-3 border-l-2 border-stone-200 pl-3 text-sm leading-relaxed text-stone-700">
                {row.statement}
              </blockquote>
            )}

            <p className="mt-3 text-xs text-stone-500">
              Applied {formatDate(row.created_at)}
              {row.reviewed_at ? ` · reviewed ${formatDate(row.reviewed_at)}` : ''}
            </p>

            {row.status === 'pending' ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => review(row.id, true)}
                  disabled={busyId !== null}
                  className="inline-flex items-center gap-1.5 rounded-md border border-emerald-800 bg-emerald-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>{busyId === row.id ? 'Saving…' : 'Approve'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => review(row.id, false)}
                  disabled={busyId !== null}
                  className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-50 disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  <span>Reject</span>
                </button>
              </div>
            ) : (
              row.review_note && (
                <p className="mt-3 text-sm leading-relaxed text-stone-600">
                  Note: {row.review_note}
                </p>
              )
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
