'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/primitives';
import type { ApiKeyRecord } from '@/lib/api/key-store';

/**
 * Key management for the Assistant API.
 *
 * The raw key lives in component state from the moment the server returns it
 * until the reader presses "Done". It is never written to storage, and the
 * list below only ever holds the prefix.
 */

interface ApiKeysProps {
  initialKeys: ApiKeyRecord[];
  monthlyIncluded: number;
  /** Null when the count could not be read. Rendered as a dash, never as zero. */
  used: number | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

async function errorMessage(response: { json: () => Promise<unknown> }, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: { message?: unknown } } | null;
  return typeof body?.error?.message === 'string' && body.error.message ? body.error.message : fallback;
}

const LABEL = 'font-sans text-xs font-semibold uppercase tracking-wider text-ink-secondary';
const FIELD =
  'h-11 w-full rounded-xl border border-line bg-surface px-3 font-sans text-sm text-ink ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export default function ApiKeys({ initialKeys, monthlyIncluded, used }: ApiKeysProps) {
  const nameId = useId();
  const keyId = useId();
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [fresh, setFresh] = useState<{ id: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the key a name so you can tell it apart later.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/account/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!response.ok) {
        setError(await errorMessage(response, 'The key could not be created. Try again in a moment.'));
        return;
      }
      const { key, ...record } = (await response.json()) as ApiKeyRecord & { key: string };
      setKeys((current) => [record, ...current]);
      setFresh({ id: record.id, key });
      setCopied(false);
      setName('');
    } catch {
      setError('The key could not be created. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh.key);
      setCopied(true);
    } catch {
      setError('Copying is blocked in this browser. Select the key and copy it by hand.');
    }
  }

  async function revoke(id: string) {
    setRevoking(true);
    setError('');
    try {
      const response = await fetch(`/api/account/api-keys/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) {
        setError(await errorMessage(response, 'The key could not be revoked. Try again in a moment.'));
        return;
      }
      setKeys((current) => current.map((key) => (key.id === id ? { ...key, revokedAt: new Date().toISOString() } : key)));
      if (fresh?.id === id) setFresh(null);
      setConfirming(null);
    } catch {
      setError('The key could not be revoked. Check your connection and try again.');
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div>
      <p className="mt-2 font-serif leading-relaxed text-ink-secondary">
        {used === null
          ? `Answers used this month: — of ${monthlyIncluded}. The count could not be read just now.`
          : `${used} of ${monthlyIncluded} answers used this month. The count resets on the first of each month (UTC).`}
      </p>

      {fresh ? (
        <div role="status" className="mt-6 border-l-2 border-brand pl-4">
          <label htmlFor={keyId} className={LABEL}>
            Your new key
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id={keyId}
              readOnly
              value={fresh.key}
              onFocus={(event) => event.currentTarget.select()}
              className={`${FIELD} font-mono sm:min-w-0 sm:flex-1 sm:w-auto`}
            />
            <Button type="button" variant="secondary" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button type="button" onClick={() => setFresh(null)}>
              Done
            </Button>
          </div>
          <p className="mt-3 font-serif text-ink">This key is shown once. Store it now.</p>
        </div>
      ) : null}

      {keys.length === 0 ? (
        <p className="mt-6 font-serif leading-relaxed text-ink-secondary">
          No keys yet. Create one to call the Assistant API.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {keys.map((key) => (
            <li key={key.id} className="py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words font-serif text-lg text-ink">{key.name}</p>
                  <dl className="mt-1 flex flex-col gap-x-6 gap-y-1 font-sans text-sm text-ink-secondary sm:flex-row sm:flex-wrap">
                    <div className="flex gap-2">
                      <dt>Starts with</dt>
                      <dd className="font-mono text-ink">{key.prefix}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt>Created</dt>
                      <dd className="text-ink">{formatDate(key.createdAt)}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt>Last used</dt>
                      <dd className="text-ink">{formatDate(key.lastUsedAt)}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt>Status</dt>
                      <dd className="text-ink">{key.revokedAt ? `Revoked ${formatDate(key.revokedAt)}` : 'Active'}</dd>
                    </div>
                  </dl>
                </div>
                {!key.revokedAt && confirming !== key.id ? (
                  <Button type="button" variant="secondary" onClick={() => setConfirming(key.id)}>
                    Revoke
                  </Button>
                ) : null}
              </div>
              {!key.revokedAt && confirming === key.id ? (
                <div className="mt-3">
                  <p className="break-words font-serif text-ink">
                    Revoke “{key.name}”? Requests that use this key will be refused. This cannot be undone.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button type="button" variant="destructive" loading={revoking} onClick={() => revoke(key.id)}>
                      Revoke key
                    </Button>
                    <Button type="button" variant="secondary" disabled={revoking} onClick={() => setConfirming(null)}>
                      Keep key
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={create} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:max-w-xs">
          <label htmlFor={nameId} className={LABEL}>
            Key name
          </label>
          <input
            id={nameId}
            name="name"
            value={name}
            maxLength={60}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
            className={`${FIELD} mt-2`}
          />
        </div>
        <Button type="submit" loading={pending} aria-busy={pending}>
          Create key
        </Button>
      </form>

      {error ? (
        <p role="alert" className="mt-3 break-words font-sans text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
