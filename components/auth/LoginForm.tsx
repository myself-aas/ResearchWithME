'use client';

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight } from 'lucide-react';
import type { DashboardUser } from '@/lib/cms/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { startOAuthSignIn } from '@/lib/supabase/oauth';
import {
  fieldClass,
  inlineErrorClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/cms/styles';
import { cn } from '@/lib/utils';

interface LoginFormProps {
  configured: boolean;
  user: DashboardUser | null;
  next: string;
}

function mapAuthError(message: string) {
  const normalised = message.toLowerCase();
  if (normalised.includes('invalid login credentials')) {
    return 'That email and password do not match. Check the address, or use Continue with Google.';
  }
  if (normalised.includes('email not confirmed')) {
    return 'Confirm the email address from your invitation, then sign in again.';
  }
  if (normalised.includes('rate limit') || normalised.includes('too many')) {
    return 'Too many attempts. Wait a minute before trying again.';
  }
  return message;
}

export default function LoginForm({ configured, user, next }: LoginFormProps) {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const errorRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<'password' | 'google' | 'signout' | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function signInWithGoogle() {
    if (pending) return;
    setPending('google');
    setError(null);

    try {
      const result = await startOAuthSignIn('google', next);
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
      <section aria-labelledby="connect-heading" className="rounded-lg border border-line bg-surface-raised p-5 sm:p-6">
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
      <section aria-labelledby="no-access-heading" className="rounded-lg border border-line bg-surface-raised p-5 sm:p-6">
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
          <Link href="/dashboard/access" className={primaryButtonClass}>
            Apply to write
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
      <section aria-labelledby="signed-in-heading" className="rounded-lg border border-line bg-surface-raised p-5 sm:p-6">
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
    <section aria-labelledby="signin-heading" className="rounded-lg border border-line bg-surface-raised p-5 sm:p-6">
      <h2 id="signin-heading" className="font-serif text-2xl font-bold text-ink">
        Sign in
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        Two ways in: your email and password, or your Google account. Publishing access is granted
        separately, from your dashboard.
      </p>

      {error && (
        <div ref={errorRef} tabIndex={-1} role="alert" className="mt-4 border-l-2 border-destructive bg-destructive/5 px-3 py-2">
          <p className="flex items-start gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        </div>
      )}

      <div role="group" aria-label="Sign in with a provider" className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={pending !== null}
          className={cn(secondaryButtonClass, 'w-full')}
        >
          {pending === 'google' ? 'Opening Google…' : 'Continue with Google'}
        </button>
      </div>

      <form onSubmit={signIn} className="mt-3 space-y-4" noValidate>
        <div>
          <label htmlFor={emailId} className={labelClass}>
            Email address
          </label>
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
        </div>

        <div>
          <label htmlFor={passwordId} className={labelClass}>
            Password
          </label>
          <input
            id={passwordId}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className={fieldClass}
          />
        </div>

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
