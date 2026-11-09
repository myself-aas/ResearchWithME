'use client';

import { useId, useState } from 'react';
import { AlertCircle, BadgeCheck, CheckCircle2, Clock, GitBranch, Send, XCircle } from 'lucide-react';
import type { AuthorApplication } from '@/lib/applications';
import { useSession } from '@/lib/supabase/use-session';
import { linkScholarlyIdentity, type LinkableProviderId } from '@/lib/supabase/oauth';
import {
  hintClass,
  inlineErrorClass,
  labelClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
  textareaClass,
} from '@/components/cms/styles';
import { cn } from '@/lib/utils';

const PROVIDERS: Array<{ id: LinkableProviderId; label: string; blurb: string }> = [
  { id: 'github', label: 'GitHub', blurb: 'Maintainers of public repositories' },
  { id: 'orcid', label: 'ORCID', blurb: 'Researchers with an ORCID iD' },
];

const STATUS_COPY = {
  pending: { label: 'Under review', tone: 'bg-indigo-50 text-brand border-indigo-300', Icon: Clock },
  approved: { label: 'Approved', tone: 'bg-emerald-50 text-emerald-900 border-emerald-300', Icon: CheckCircle2 },
  rejected: { label: 'Not approved', tone: 'bg-stone-100 text-stone-800 border-stone-300', Icon: XCircle },
} as const;

export default function AuthorApplication({
  applications,
  isEditor,
}: {
  applications: AuthorApplication[];
  isEditor: boolean;
}) {
  const statementId = useId();
  const { user } = useSession();
  const [statement, setStatement] = useState('');
  const [pending, setPending] = useState<LinkableProviderId | 'submit' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<AuthorApplication | null>(null);

  const linked = user?.identities ?? [];
  const open = saved ?? applications.find((item) => item.status !== 'rejected') ?? null;
  const rejected = !open ? applications.find((item) => item.status === 'rejected') ?? null : null;

  /** The identity that would be cited. Prefers whichever carries a handle. */
  const identity = linked.find((item) => item.handle) ?? linked[0] ?? null;

  async function connect(provider: LinkableProviderId) {
    if (pending) return;
    setPending(provider);
    setError(null);
    const result = await linkScholarlyIdentity(provider, '/dashboard/access');
    // On success the browser is already navigating away.
    if (!result.ok) {
      setError(result.error ?? 'That account could not be connected. Try again.');
      setPending(null);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !identity) return;

    setPending('submit');
    setError(null);
    setSaved(null);

    try {
      const response = await fetch('/api/dashboard/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: identity.provider,
          handle: identity.handle,
          displayName: user?.name ?? '',
          statement,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { application?: AuthorApplication; error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? 'The application could not be saved. Try again.');
        setPending(null);
        return;
      }

      setSaved(payload?.application ?? null);
      setStatement('');
    } catch {
      setError('The application service could not be reached. Check your connection.');
    } finally {
      setPending(null);
    }
  }

  const current = saved ?? open;

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="border-l-2 border-red-700 bg-red-50 px-4 py-3">
          <p className="flex items-start gap-2 text-sm font-medium text-red-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        </div>
      )}

      {isEditor && (
        <p className={cn(panelClass, 'flex items-start gap-2 px-4 py-3 text-sm text-stone-700')}>
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          <span>
            This account already has publishing access.{' '}
            <a href="/dashboard" className="font-semibold underline underline-offset-4">
              Open the studio
            </a>{' '}
            to write, or review other writers in the applications queue.
          </span>
        </p>
      )}

      <section aria-labelledby="identities-heading" className={cn(panelClass, 'p-5 sm:p-6')}>
        <h2 id="identities-heading" className="font-serif text-xl font-bold text-stone-900">
          1. Connect a scholarly identity
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-stone-600">
          Connecting attaches the account to the one you are signed in with. It does not sign you out
          or change how you log in.
        </p>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {PROVIDERS.map(({ id, label, blurb }) => {
            const match = linked.find((item) => item.provider === id);
            return (
              <li key={id} className="rounded-md border border-stone-200 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                  <GitBranch className="h-4 w-4 text-brand-hover" aria-hidden="true" />
                  {label}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">{blurb}</p>

                {match ? (
                  <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="break-all">{match.handle ? match.handle : 'Connected'}</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => connect(id)}
                    disabled={pending !== null}
                    className={cn(secondaryButtonClass, 'mt-3 w-full')}
                  >
                    {pending === id ? 'Opening…' : `Connect ${label}`}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {current ? (
        <section aria-labelledby="status-heading" className={cn(panelClass, 'p-5 sm:p-6')}>
          <h2 id="status-heading" className="font-serif text-xl font-bold text-stone-900">
            Your application
          </h2>
          <StatusBadge status={current.status} />
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-stone-900">Identity</dt>
              <dd className="mt-0.5 break-all text-stone-600">
                {current.provider} · {current.handle}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-stone-900">Publishing as</dt>
              <dd className="mt-0.5 text-stone-600">{current.display_name}</dd>
            </div>
            {current.statement && (
              <div className="sm:col-span-2">
                <dt className="font-medium text-stone-900">What you write about</dt>
                <dd className="mt-0.5 leading-relaxed text-stone-600">{current.statement}</dd>
              </div>
            )}
            {current.review_note && (
              <div className="sm:col-span-2">
                <dt className="font-medium text-stone-900">Reviewer note</dt>
                <dd className="mt-0.5 leading-relaxed text-stone-600">{current.review_note}</dd>
              </div>
            )}
          </dl>
          {current.status === 'pending' && (
            <p className="mt-4 text-sm leading-relaxed text-stone-600">
              An editor reviews applications personally. You can update the details below while it is
              open.
            </p>
          )}
          {current.status === 'approved' && (
            <a href="/dashboard" className={cn(primaryButtonClass, 'mt-4')}>
              Open the editorial studio
            </a>
          )}
        </section>
      ) : (
        <section aria-labelledby="apply-heading" className={cn(panelClass, 'p-5 sm:p-6')}>
          <h2 id="apply-heading" className="font-serif text-xl font-bold text-stone-900">
            2. Apply to write
          </h2>

          {rejected && (
            <p className="mt-3 border-l-2 border-stone-300 bg-stone-50 px-3 py-2 text-sm leading-relaxed text-stone-700">
              A previous application was not approved{rejected.review_note ? `: ${rejected.review_note}` : '.'}{' '}
              You can apply again with updated details.
            </p>
          )}

          <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
            <div>
              <label htmlFor={statementId} className={labelClass}>
                What would you write about?
              </label>
              <textarea
                id={statementId}
                value={statement}
                onChange={(event) => setStatement(event.target.value)}
                rows={4}
                maxLength={1000}
                className={textareaClass}
                placeholder="Papers, repositories, or datasets you review, and why your readers should trust the read."
              />
              <p className={hintClass}>
                Optional, but it is what the reviewing editor reads. Up to 1000 characters.
              </p>
            </div>

            <button
              type="submit"
              disabled={pending !== null || !identity}
              className={cn(primaryButtonClass, 'w-full')}
            >
              {pending === 'submit' ? (
                <span>Sending…</span>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>Submit application</span>
                </>
              )}
            </button>

            {!identity && (
              <p className={cn(inlineErrorClass, 'mt-0')}>
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Connect a GitHub or ORCID account above first.</span>
              </p>
            )}
          </form>
        </section>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AuthorApplication['status'] }) {
  const copy = STATUS_COPY[status] ?? STATUS_COPY.pending;
  const { Icon } = copy;
  return (
    <p
      className={cn(
        'mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        copy.tone,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {copy.label}
    </p>
  );
}
