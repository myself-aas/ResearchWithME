'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Mail, Send } from 'lucide-react';
import { isValidEmail } from '@/lib/validation';
import { readLocalString, removeLocal, writeLocalString } from '@/lib/storage';

const TOPICS = [
  { key: 'teardowns', label: 'Repository teardowns' },
  { key: 'papers', label: 'Paper reviews' },
  { key: 'clinical', label: 'Clinical and health' },
  { key: 'policy', label: 'Data and policy' },
] as const;

type TopicKey = (typeof TOPICS)[number]['key'];

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topics, setTopics] = useState<Record<TopicKey, boolean>>({
    teardowns: true,
    papers: true,
    clinical: false,
    policy: false,
  });
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setIsSubscribed(readLocalString('rwm_newsletter_subscribed') === 'true');
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!email.trim()) {
      setError('Enter the email address for the digest.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('That address is incomplete. Include the @ and the domain.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    timerRef.current = window.setTimeout(() => {
      // This prototype stores the preference locally; it does not send the address anywhere.
      const stored = writeLocalString('rwm_newsletter_subscribed', 'true');
      writeLocalString('rwm_newsletter_email', email.trim());
      setIsSubmitting(false);
      if (!stored) {
        setError('The browser blocked local storage, so the preference was not saved. Allow site data for this site and try again.');
        return;
      }
      setIsSubscribed(true);
    }, 450);
  }

  function handleReset() {
    setIsSubscribed(false);
    setEmail('');
    removeLocal('rwm_newsletter_subscribed');
    removeLocal('rwm_newsletter_email');
  }

  return (
    <section aria-labelledby="newsletter-title" className="dark-surface border-b border-stone-800 pb-12">
      <div className="rounded-lg border border-stone-700 bg-stone-950 p-6 sm:p-8">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div>
            <h2 id="newsletter-title" className="font-serif text-2xl font-bold text-white sm:text-3xl">
              The weekly research digest
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-300">
              A Tuesday email with the week&apos;s reviews, notebooks, and corrections. No advertising, no tracking pixels.
            </p>
            <p className="mt-3 text-sm text-stone-300">
              Nothing is sent from this deployment: the address is saved in this browser only.
            </p>
          </div>

          {isSubscribed ? (
            <div role="status" className="rounded-md border border-emerald-700 bg-emerald-950 p-5">
              <p className="flex items-center gap-2 font-semibold text-emerald-100">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                Saved in this browser
              </p>
              <p className="mt-2 text-sm leading-relaxed text-emerald-100">
                The preference is stored on this device. Remove it whenever you like.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-4 min-h-11 text-sm font-medium text-emerald-100 underline underline-offset-4 hover:text-white"
              >
                Remove this preference
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="newsletter-email" className="mb-1.5 block text-sm font-medium text-stone-100">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-300" aria-hidden="true" />
                  <input
                    id="newsletter-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'newsletter-error' : undefined}
                    placeholder="researcher@university.edu"
                    className="h-11 w-full rounded-md border border-stone-600 bg-stone-900 pl-10 pr-3 text-sm text-stone-100 placeholder:text-stone-300"
                  />
                </div>
                {error && (
                  <p id="newsletter-error" role="alert" className="mt-2 text-sm text-red-200">
                    {error}
                  </p>
                )}
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-stone-100">Topics</legend>
                <div className="grid gap-2">
                  {TOPICS.map((topic) => (
                    <label key={topic.key} className="flex min-h-9 items-center gap-2 text-sm text-stone-200">
                      <input
                        type="checkbox"
                        checked={topics[topic.key]}
                        onChange={() => setTopics((prev) => ({ ...prev, [topic.key]: !prev[topic.key] }))}
                        className="h-4 w-4 rounded border-stone-500 bg-stone-900 text-amber-600"
                      />
                      <span>{topic.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                <span>{isSubmitting ? 'Saving…' : 'Save digest preference'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
