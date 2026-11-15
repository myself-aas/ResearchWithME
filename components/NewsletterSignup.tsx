'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Mail, Send } from 'lucide-react';
import { isValidEmail } from '@/lib/validation';
import {
  DEFAULT_DIGEST_TOPICS,
  useHydratePreferences,
  usePreferencesStore,
  type DigestTopicKey,
} from '@/lib/stores/preferences-store';
import { Card, Text } from '@/components/primitives';

const TOPICS: ReadonlyArray<{ key: DigestTopicKey; label: string }> = [
  { key: 'teardowns', label: 'Repository teardowns' },
  { key: 'papers', label: 'Paper reviews' },
  { key: 'clinical', label: 'Clinical and health' },
  { key: 'policy', label: 'Data and policy' },
];

export default function NewsletterSignup() {
  const hydrated = useHydratePreferences();
  const digest = usePreferencesStore((state) => state.digest);
  const subscribeDigest = usePreferencesStore((state) => state.subscribeDigest);
  const setDigestTopic = usePreferencesStore((state) => state.setDigestTopic);
  const unsubscribeDigest = usePreferencesStore((state) => state.unsubscribeDigest);

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topics, setTopics] = useState<Record<DigestTopicKey, boolean>>({
    ...DEFAULT_DIGEST_TOPICS,
  });
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (digest.email) setEmail(digest.email);
    setTopics({ ...digest.topics });
  }, [hydrated, digest.email, digest.topics]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const isSubscribed = hydrated && digest.subscribed;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!email.trim()) {
      setError('Enter an email address to subscribe.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a complete email address, including an @ and a domain.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    timerRef.current = window.setTimeout(() => {
      const stored = subscribeDigest(email.trim(), topics);
      setIsSubmitting(false);
      if (!stored) {
        setError(
          'Your browser blocked local storage, so this subscription was held in memory for this tab only.',
        );
      }
    }, 300);
  }

  function handleToggleTopic(key: DigestTopicKey) {
    const next = !topics[key];
    setTopics((prev) => ({ ...prev, [key]: next }));
    if (hydrated && digest.subscribed) {
      setDigestTopic(key, next);
    }
  }

  function handleReset() {
    unsubscribeDigest();
    setEmail('');
    setError(null);
  }

  return (
    <section aria-labelledby="newsletter-title" className="border-b border-line pb-12">
      <div className="rounded-2xl border border-line bg-surface-subtle p-6 sm:p-8">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div>
            <Text as="p" variant="eyebrow" color="secondary">
              Weekly Dispatch · No Tracking Pixels
            </Text>
            <Text id="newsletter-title" as="h2" variant="page-title" className="mt-2">
              The weekly research digest
            </Text>
            <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-ink-secondary">
              One Tuesday dispatch with the newest repository teardowns, reproducible notebooks, and errata notices.
            </p>
            <p className="mt-3 font-sans text-xs text-ink-secondary">
              Stored locally in your browser preferences — no external marketing tracker receives your address.
            </p>
          </div>

          {isSubscribed ? (
            <Card role="status" padding="lg" radius="lg">
              <p className="flex items-center gap-2 font-sans text-sm font-semibold text-ink">
                <CheckCircle2 className="h-4 w-4 text-brand" aria-hidden="true" />
                Saved in this browser
              </p>
              <p className="mt-2 font-sans text-xs leading-relaxed text-ink-secondary">
                Digest preferences{digest.email ? ` for ${digest.email}` : ''} are active on this device.
              </p>
              {error && (
                <p role="alert" className="mt-2 font-sans text-xs text-destructive">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="mt-4 min-h-11 font-sans text-xs font-medium text-ink underline underline-offset-4 hover:text-brand"
              >
                Remove this preference
              </button>
            </Card>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="newsletter-email" className="mb-1.5 block font-sans text-xs font-medium text-ink">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary" aria-hidden="true" />
                  <input
                    id="newsletter-email"
                    type="email"
                    inputMode="email"
                    enterKeyHint="send"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'newsletter-error' : undefined}
                    placeholder="researcher@university.edu"
                    className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 font-sans text-sm text-ink placeholder:text-ink-secondary"
                  />
                </div>
                {error && (
                  <p id="newsletter-error" role="alert" className="mt-2 font-sans text-xs text-destructive">
                    {error}
                  </p>
                )}
              </div>

              <fieldset>
                <Text as="legend" variant="eyebrow" color="secondary" className="mb-2">
                  Columns
                </Text>
                <div className="grid gap-1.5">
                  {TOPICS.map((topic) => (
                    <label key={topic.key} className="flex min-h-11 items-center gap-3 font-sans text-xs text-ink">
                      <input
                        type="checkbox"
                        checked={topics[topic.key]}
                        onChange={() => handleToggleTopic(topic.key)}
                        className="h-4 w-4 rounded-xs border-line accent-brand"
                      />
                      <span>{topic.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-on-primary transition-colors hover:bg-brand-pressed disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isSubmitting ? 'Saving preference…' : 'Subscribe to the digest'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
