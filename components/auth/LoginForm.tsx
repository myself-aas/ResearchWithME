'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, CheckCircle2, Mail, Send } from 'lucide-react';
import type { DashboardUser } from '@/lib/cms/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { authCallbackUrl, startOAuthSignIn, type OAuthProviderId } from '@/lib/supabase/oauth';
import {
  fieldClass,
  hintClass,
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
    return 'That email and password do not match. Use the sign-in link if you have not set a password.';
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
  const [pending, setPending] = useState<'password' | 'magic' | 'signout' | OAuthProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);

  // Complete a PKCE magic-link redirect before showing the form again. Links
  // always return to /login so the code is exchanged here, never on a protected
  // route that the middleware would bounce before the session exists.
  useEffect(() => {
    if (!configured || user) return;

    const params = new URLSearchParams(window.location.search);
    const authError = params.get('error_description') ?? params.get('error');
    const hasCode = params.has('code');
    if (!hasCode && !authError) return;

    let active = true;
    setExchanging(true);

    (async () => {
      if (authError) {
        if (!active) return;
        setError(authError.replace(/\+/g, ' '));
        setExchanging(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!active) return;
        if (sessionError) {
          setError(mapAuthError(sessionError.message));
          setExchanging(false);
          return;
        }
        if (data.session) {
          window.location.assign(next);
          return;
        }
        setError('That sign-in link has expired or was already used. Request a new one below.');
        setExchanging(false);
      } catch {
        if (!active) return;
        setError('The sign-in link could not be completed. Request a new one below.');
        setExchanging(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [configured, user, next]);

  function fail(message: string) {
    setError(message);
    setNotice(null);
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
    setNotice(null);

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

  async function signInWithProvider(provider: OAuthProviderId) {
    if (pending) return;
    setPending(provider);
    setError(null);
    setNotice(null);

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

  async function sendMagicLink() {
    if (pending) return;
    if (!email.trim()) {
      fail('Add the email address first, then request a sign-in link.');
      document.getElementById(emailId)?.focus();
      return;
    }

    setPending('magic');
    setError(null);
    setNotice(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // The code is exchanged by /auth/callback, then the user is sent onward.
          emailRedirectTo: authCallbackUrl(next),
        },
      });

      if (authError) {
        fail(mapAuthError(authError.message));
        return;
      }

      setNotice(`Check ${email.trim()} for a sign-in link. It expires shortly, so use it soon.`);
    } catch {
      fail('The sign-in email could not be sent. Try again in a moment.');
    } finally {
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
      <section aria-labelledby="connect-heading" className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
        <h2 id="connect-heading" className="font-serif text-2xl font-bold text-stone-900">
          Supabase is not connected
        </h2>
        <p className="mt-2 max-w-prose text-base leading-relaxed text-stone-700">
          The editorial studio still works: it saves articles and comments to the JSON archive on this server. Cloud
          accounts, media uploads, and realtime updates turn on when credentials are configured.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/dashboard" className={primaryButtonClass}>
            <span>Open the local studio</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/write" className={secondaryButtonClass}>
            Prototype authoring form
          </Link>
        </div>

        <details className="mt-6 border-t border-stone-200 pt-4">
          <summary className="min-h-11 cursor-pointer text-sm font-semibold text-stone-900">
            How to connect Supabase
          </summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-stone-700">
            <li>
              Add <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{' '}
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
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            The repository guide <code className="font-mono">docs/supabase-cms.md</code> covers the webhook, storage
            bucket, and redirect URLs.
          </p>
        </details>
      </section>
    );
  }

  if (user && !user.isEditor) {
    return (
      <section aria-labelledby="no-access-heading" className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
        <h2 id="no-access-heading" className="font-serif text-2xl font-bold text-stone-900">
          Signed in, without editor access
        </h2>
        <p className="mt-2 text-base leading-relaxed text-stone-700">
          {user.name}
          {user.email ? (
            <>
              {' '}
              <span className="break-all font-mono text-sm text-stone-600">{user.email}</span>
            </>
          ) : null}
        </p>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-stone-600">
          Your account can read, save, and cite. Writing and publishing in the studio needs an administrator to add
          this account to the editor list.
        </p>

        {error && (
          <div ref={errorRef} tabIndex={-1} role="alert" className={cn(inlineErrorClass, 'mt-4')}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/" className={primaryButtonClass}>
            Back to the journal
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
      <section aria-labelledby="signed-in-heading" className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
        <h2 id="signed-in-heading" className="font-serif text-2xl font-bold text-stone-900">
          You are signed in
        </h2>
        <p className="mt-2 text-base leading-relaxed text-stone-700">
          {user.name}
          {user.email ? (
            <>
              {' '}
              <span className="break-all font-mono text-sm text-stone-600">{user.email}</span>
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

  if (exchanging) {
    return (
      <section aria-labelledby="exchanging-heading" className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
        <h2 id="exchanging-heading" className="font-serif text-2xl font-bold text-stone-900">
          Checking your sign-in link
        </h2>
        <p role="status" aria-live="polite" className="mt-2 text-base leading-relaxed text-stone-700">
          One moment while the studio verifies the link.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="signin-heading" className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
      <h2 id="signin-heading" className="font-serif text-2xl font-bold text-stone-900">
        Sign in
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        Sign in with Google, GitHub, or email. Studio access is granted to editor accounts by an administrator.
      </p>

      {error && (
        <div ref={errorRef} tabIndex={-1} role="alert" className="mt-4 border-l-2 border-red-700 bg-red-50 px-3 py-2">
          <p className="flex items-start gap-2 text-sm font-medium text-red-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        </div>
      )}

      {notice && (
        <p role="status" className="mt-4 flex items-start gap-2 border-l-2 border-emerald-700 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </p>
      )}

      <div role="group" aria-label="Sign in with a provider" className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => signInWithProvider('google')}
          disabled={pending !== null}
          className={cn(secondaryButtonClass, 'w-full')}
        >
          {pending === 'google' ? 'Opening Google…' : 'Continue with Google'}
        </button>
        <button
          type="button"
          onClick={() => signInWithProvider('github')}
          disabled={pending !== null}
          className={cn(secondaryButtonClass, 'w-full')}
        >
          {pending === 'github' ? 'Opening GitHub…' : 'Continue with GitHub'}
        </button>
      </div>

      <p className="mt-5 border-t border-stone-200 pt-4 text-sm font-medium text-stone-800">Or use your email</p>

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

      <div className="mt-5 border-t border-stone-200 pt-4">
        <p className={hintClass}>No password, or prefer a one-time link?</p>
        <button
          type="button"
          onClick={sendMagicLink}
          disabled={pending !== null}
          className={cn(secondaryButtonClass, 'mt-2 w-full')}
        >
          {pending === 'magic' ? (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>Sending…</span>
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" aria-hidden="true" />
              <span>Email me a sign-in link</span>
            </>
          )}
        </button>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Links and provider sign-ins return through <code className="font-mono">/auth/callback</code>, which must be
          listed under Supabase Auth → URL Configuration → Redirect URLs.
        </p>
      </div>
    </section>
  );
}
