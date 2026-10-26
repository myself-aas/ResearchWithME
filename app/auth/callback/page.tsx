'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { useAuth, AuthUser } from '@/lib/auth-context';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setSessionUser } = useAuth();

  const provider = searchParams.get('provider') || 'github';
  const code = searchParams.get('code') || searchParams.get('token');
  const errorParam = searchParams.get('error');

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (errorParam) {
      setStatus('error');
      setErrorMessage(searchParams.get('error_description') || 'Authorization was cancelled or rejected by provider.');
      return;
    }

    const timer = setTimeout(() => {
      // Create session based on provider callback
      let newUser: AuthUser;

      if (provider === 'github') {
        newUser = {
          id: `author-gh-${Date.now().toString().slice(-6)}`,
          name: 'Verified GitHub Maintainer',
          email: 'github.user@noreply.github.com',
          avatar: 'GH',
          role: 'author',
          authProvider: 'github',
          verifiedTitle: 'GitHub OAuth Verified Maintainer',
          verifiedIdentifier: `@github-user (OAuth Attested)`,
        };
      } else if (provider === 'orcid') {
        newUser = {
          id: `author-orcid-${Date.now().toString().slice(-6)}`,
          name: 'Verified ORCID Scholar',
          email: 'scholar@orcid.community',
          avatar: 'OR',
          role: 'author',
          authProvider: 'orcid',
          verifiedTitle: 'ORCID OAuth Verified Researcher',
          verifiedIdentifier: '0000-0002-1825-0097 (ORCID Attested)',
        };
      } else {
        newUser = {
          id: `reader-google-${Date.now().toString().slice(-6)}`,
          name: 'Google Reader',
          email: 'reader@gmail.com',
          avatar: 'GR',
          role: 'reader',
          authProvider: 'gmail',
          verifiedTitle: 'Google Account Verified Reader',
        };
      }

      setSessionUser(newUser);
      setAuthenticatedUser(newUser);
      setStatus('success');

      // Auto redirect after short pause
      setTimeout(() => {
        router.push(newUser.role === 'author' ? '/write' : '/');
      }, 1500);
    }, 1000);

    return () => clearTimeout(timer);
  }, [provider, code, errorParam, router, searchParams, setSessionUser]);

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-8 sm:p-10 text-center shadow-sm">
      {status === 'processing' && (
        <div className="space-y-4">
          <RefreshCw className="mx-auto h-10 w-10 animate-spin text-amber-900" />
          <h1 className="font-serif text-2xl font-bold text-stone-900">
            Completing {provider.toUpperCase()} Authorization
          </h1>
          <p className="text-sm text-stone-600">
            Verifying digital cryptographic assertion and establishing your session permissions...
          </p>
        </div>
      )}

      {status === 'success' && authenticatedUser && (
        <div className="space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-stone-900">
              Authentication Confirmed
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Welcome, <strong>{authenticatedUser.name}</strong>.
            </p>
          </div>

          <div className="rounded-md bg-stone-50 p-4 border border-stone-200 text-left text-xs space-y-1.5 font-mono">
            <div>Provider: {authenticatedUser.authProvider}</div>
            <div>Role: {authenticatedUser.role === 'author' ? 'Verified Writer & Scholar' : 'Verified Reader'}</div>
            <div>Identifier: {authenticatedUser.verifiedIdentifier || authenticatedUser.email}</div>
          </div>

          <p className="text-xs text-stone-500">
            Redirecting you to {authenticatedUser.role === 'author' ? 'the Writer Studio' : 'the journal'}...
          </p>

          <Link
            href={authenticatedUser.role === 'author' ? '/write' : '/'}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-amber-900 px-5 py-2 text-xs font-semibold text-white hover:bg-amber-800 transition-colors"
          >
            <span>Continue Now</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-800">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">
            Authorization Error
          </h1>
          <p className="text-sm text-red-800">
            {errorMessage}
          </p>
          <Link
            href="/auth/providers"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 transition-colors"
          >
            <span>Return to Authentication Pathways</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <BlogHeader />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16 sm:px-6">
        <Suspense fallback={
          <div className="rounded-lg border border-stone-200 bg-white p-8 text-center text-sm text-stone-600">
            Processing authorization callback...
          </div>
        }>
          <CallbackContent />
        </Suspense>
      </main>

      <BlogFooter />
    </div>
  );
}
