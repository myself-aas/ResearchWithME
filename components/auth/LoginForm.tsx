'use client';

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Linkedin } from 'lucide-react';
import type { DashboardUser } from '@/lib/cms/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { startOAuthSignIn } from '@/lib/supabase/oauth';
import {
  fieldClass,
  inlineErrorClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/cms/styles';
import { Field } from '@/components/primitives';
import { cn } from '@/lib/utils';

interface LoginFormProps {
  configured: boolean;
  user: DashboardUser | null;
  next: string;
  /** A failure reported by the auth callback, shown on first paint. */
  initialError?: string;
}

function mapAuthError(message: string) {
  const normalised = message.toLowerCase();
  if (normalised.includes('invalid login credentials')) {
    return 'That email and password do not match. Check the address, or use Google, LinkedIn, or Discord above.';
  }
  if (normalised.includes('email not confirmed')) {
    return 'Confirm the email address from your invitation, then sign in again.';
  }
  if (normalised.includes('rate limit') || normalised.includes('too many')) {
    return 'Too many attempts. Wait a minute before trying again.';
  }
  if (normalised.includes('access_denied') || normalised.includes('denied')) {
    return 'Sign-in was cancelled on the provider\'s page. Try again and approve the request.';
  }
  if (normalised.includes('redirect')) {
    return 'This address is not registered for sign-in. The site administrator needs to add it to the allowed redirect URLs.';
  }
  if (normalised.includes('getting user email') || normalised.includes('email from external provider')) {
    return 'The provider did not share an email address, so the account could not be created. Use an account with a visible email, or sign in with email and password.';
  }
  if (normalised.includes('signups not allowed') || normalised.includes('signup is disabled')) {
    return 'New accounts are not being accepted at the moment. Contact the editor.';
  }
  if (normalised.includes('provider is not enabled') || normalised.includes('unsupported provider')) {
    return 'That sign-in provider is not switched on yet. Use the other provider, or email and password.';
  }
  return message;
}

/**
 * Google's four-colour "G", drawn inline so the sign-in button carries the mark
 * people recognise without loading a third-party script or an extra asset.
 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.68-.06-1.33-.17-1.96H12v3.71h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.28Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.9a6 6 0 0 1 0-3.8V7.51H3.06a10 10 0 0 0 0 8.98l3.35-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.51l3.35 2.59C7.2 7.74 9.4 5.98 12 5.98Z"
      />
    </svg>
  );
}

/** Discord's mark, inline for the same reason as Google's. */
function DiscordMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path
        fill="#5865F2"
        d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.37-.44.86-.6 1.24a18.3 18.3 0 0 0-5.49 0c-.16-.39-.4-.87-.62-1.24a.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.88 1.52.07.07 0 0 0-.04.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.88-1.29 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1 0-.13l.37-.29a.07.07 0 0 1 .08-.01 14.2 14.2 0 0 0 12.06 0 .07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1 0 .13 12.3 12.3 0 0 1-1.88.89.08.08 0 0 0-.04.11c.36.7.77 1.36 1.23 1.99a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.68-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.17 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42Z"
      />
    </svg>
  );
}

export default function LoginForm({ configured, user, next, initialError = '' }: LoginFormProps) {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const errorRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<
    'password' | 'google' | 'linkedin' | 'discord' | 'signout' | null
  >(null);
  const [error, setError] = useState<string | null>(initialError ? mapAuthError(initialError) : null);

  function fail(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    if (!email.trim() || !password) {
      fail('Enter both the email address and the password for the editor account.');
      return;
    }

    setPending('password');
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        fail(mapAuthError(authError.message));
        setPending(null);
        return;
      }

      window.location.assign(next);
    } catch {
      fail('The sign-in service could not be reached. Check your connection and try again.');
      setPending(null);
    }
  }

  async function signInWithProvider(provider: 'google' | 'linkedin' | 'discord') {
    if (pending) return;
    setPending(provider);
    setError(null);

    try {
      const result = await startOAuthSignIn(provider, next);
      // On success the browser is already navigating to the provider.
      if (result?.error) {
        fail(mapAuthError(result.error));
        setPending(null);
      }
    } catch {
      fail('The sign-in service could not be reached. Check your connection and try again.');
      setPending(null);
    }
  }

  async function signOutDifferentAccount() {
    if (pending) return;
    setPending('signout');
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.refresh();
      window.location.assign('/login?next=/dashboard');
    } catch {
      setError('Could not sign out. Refresh the page and try again.');
      setPending(null);
    }
  }

  if (!configured) {
    return (
      <section aria-labelledby="connect-heading" className="card border border-line bg-surface p-5 sm:p-6">
        <h2 id="connect-heading" className="font-serif text-2xl font-bold text-ink">
          Supabase is not connected
        </h2>
        <p className="mt-2 max-w-prose text-base leading-relaxed text-ink">
          The editorial studio still works: it saves articles and comments to the JSON archive on this server. Cloud
          accounts, media uploads, and realtime updates turn on when credentials are configured.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/dashboard" className={primaryButtonClass}>
            <span>Open the local studio</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/dashboard/access" className={secondaryButtonClass}>
            Apply to write
          </Link>
        </div>

        <details className="mt-6 border-t border-line pt-4">
          <summary className="min-h-11 cursor-pointer text-sm font-semibold text-ink">
            How to connect Supabase
          </summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink">
            <li>
              Add <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to{' '}
              <code className="font-mono">.env.local</code>.
            </li>
            <li>
              Apply the SQL in <code className="font-mono">supabase/migrations/</code> with{' '}
              <code className="font-mono">supabase db push</code> or the Supabase SQL editor.
            </li>
            <li>Create the editor account in Supabase → Authentication → Users.</li>
            <li>
              Restart the build because <code className="font-mono">NEXT_PUBLIC_*</code> values are inlined.
            </li>
          </ol>
          <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
            The repository guide <code className="font-mono">docs/supabase-cms.md</code> covers the webhook, storage
            bucket, and redirect URLs.
          </p>
        </details>
      </section>
    );
  }

  if (user && !user.isEditor) {
    return (
      <section aria-labelledby="no-access-heading" className="card border border-line bg-surface p-5 sm:p-6">
        <h2 id="no-access-heading" className="font-serif text-2xl font-bold text-ink">
          Signed in, without editor access
        </h2>
        <p className="mt-2 text-base leading-relaxed text-ink">
          {user.name}
          {user.email ? (
            <>
              {' '}
              <span className="break-all font-mono text-sm text-ink-secondary">{user.email}</span>
            </>
          ) : null}
        </p>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-secondary">
          Your account can read, save, and cite. Writing and publishing needs an approved writer
          application, which you can submit from your dashboard.
        </p>

        {error && (
          <div ref={errorRef} tabIndex={-1} role="alert" className={cn(inlineErrorClass, 'mt-4')}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/dashboard" className={primaryButtonClass}>
            Go to your dashboard
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/dashboard/access" className={secondaryButtonClass}>
            Apply to write
          </Link>
          <Link href="/" className={secondaryButtonClass}>
            Back to the platform
          </Link>
          <button type="button" onClick={signOutDifferentAccount} disabled={pending !== null} className={secondaryButtonClass}>
            {pending === 'signout' ? 'Signing out…' : 'Use a different account'}
          </button>
        </div>
      </section>
    );
  }

  if (user) {
    return (
      <section aria-labelledby="signed-in-heading" className="card border border-line bg-surface p-5 sm:p-6">
        <h2 id="signed-in-heading" className="font-serif text-2xl font-bold text-ink">
          You are signed in
        </h2>
        <p className="mt-2 text-base leading-relaxed text-ink">
          {user.name}
          {user.email ? (
            <>
              {' '}
              <span className="break-all font-mono text-sm text-ink-secondary">{user.email}</span>
            </>
          ) : null}
        </p>

        {error && (
          <div ref={errorRef} tabIndex={-1} role="alert" className={cn(inlineErrorClass, 'mt-4')}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={next} className={primaryButtonClass}>
            Continue to the studio
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button type="button" onClick={signOutDifferentAccount} disabled={pending !== null} className={secondaryButtonClass}>
            {pending === 'signout' ? 'Signing out…' : 'Use a different account'}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="signin-heading" className="card border border-line bg-surface p-5 sm:p-6">
      <h2 id="signin-heading" className="font-serif text-2xl font-bold text-ink">
        Sign in
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        Four ways in: Google, LinkedIn, Discord, or your email and password. Any of them signs you
        in as a reader; publishing access is granted separately, from your dashboard.
      </p>

      {error && (
        <div ref={errorRef} tabIndex={-1} role="alert" className="mt-4 border-l-2 border-destructive bg-destructive/5 px-3 py-2">
          <p className="flex items-start gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        </div>
      )}

      <div role="group" aria-label="Sign in with a provider" className="mt-5 grid gap-2">
        <button
          type="button"
          onClick={() => signInWithProvider('google')}
          disabled={pending !== null}
          className={cn(secondaryButtonClass, 'w-full')}
        >
          <GoogleMark />
          <span>{pending === 'google' ? 'Opening Google…' : 'Continue with Google'}</span>
        </button>
        <button
          type="button"
          onClick={() => signInWithProvider('linkedin')}
          disabled={pending !== null}
          className={cn(secondaryButtonClass, 'w-full')}
        >
          <Linkedin className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{pending === 'linkedin' ? 'Opening LinkedIn…' : 'Continue with LinkedIn'}</span>
        </button>
        <button
          type="button"
          onClick={() => signInWithProvider('discord')}
          disabled={pending !== null}
          className={cn(secondaryButtonClass, 'w-full')}
        >
          <DiscordMark />
          <span>{pending === 'discord' ? 'Opening Discord…' : 'Continue with Discord'}</span>
        </button>
      </div>

      <p className="mt-4 font-sans text-sm leading-relaxed text-ink-secondary">
        Read open, citation-first reviews — sign in to request writer access or save drafts.
      </p>

      <form onSubmit={signIn} className="mt-3 space-y-4" noValidate>
        <Field id={emailId} label="Email address" required>
          <input
            id={emailId}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            inputMode="email"
            required
            className={fieldClass}
            placeholder="editor@researchwith.me"
          />
        </Field>

        <Field id={passwordId} label="Password" required>
          <input
            id={passwordId}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className={fieldClass}
          />
        </Field>

        <button type="submit" disabled={pending !== null} className={cn(primaryButtonClass, 'w-full')}>
          <span>{pending === 'password' ? 'Signing in…' : 'Sign in'}</span>
        </button>
      </form>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-sm leading-relaxed text-ink-secondary">
          Signing in gives you a reader account: bookmarks, comments, and citations.{' '}
          <Link href="/dashboard/access" className="font-semibold text-ink underline underline-offset-4">
            Applying to write
          </Link>{' '}
          is a separate step inside your dashboard, where you connect a GitHub or ORCID identity and
          an editor reviews the application.
        </p>
      </div>
    </section>
  );
}
