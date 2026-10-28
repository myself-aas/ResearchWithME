'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  User,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { useAuth } from '@/lib/auth-context';
import { hasSupabaseBrowserConfig } from '@/lib/supabase/client';
import { startOAuthSignIn } from '@/lib/supabase/oauth';
import { isValidEmail } from '@/lib/validation';

export default function GoogleOAuthPage() {
  const router = useRouter();
  const { loginWithGmail, user, hasAuthorPermissions } = useAuth();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Full-page redirect through Supabase Auth; /auth/callback sets the session.
  async function startGoogleOAuth() {
    setLoading(true);
    setError(null);
    if (!hasSupabaseBrowserConfig()) {
      setError('Google sign-in needs Supabase credentials on this deployment. Use the form below in the meantime.');
      setLoading(false);
      return;
    }
    try {
      const result = await startOAuthSignIn('google', '/');
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch {
      setError('Could not reach the sign-in service. Check your connection and try again.');
      setLoading(false);
    }
  }

  // Completes direct Gmail sign in
  function handleDirectSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      setError('Please provide your name and Gmail address.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    const res = loginWithGmail(email.trim(), name.trim());
    if (!res.ok) {
      setError(res.error);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push('/');
    }, 1200);
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <BlogHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-stone-600">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-stone-900 hover:underline">
                Journal
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-stone-500" />
            </li>
            <li>
              <Link href="/auth/providers" className="hover:text-stone-900 hover:underline">
                Authentication
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-stone-500" />
            </li>
            <li aria-current="page" className="font-medium text-stone-900">
              Google / Gmail OAuth
            </li>
          </ol>
        </nav>

        <div className="rounded-lg border border-stone-200 bg-white p-6 sm:p-10 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-800 text-white shadow-sm">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-xs font-semibold text-stone-800">
                  Unique Route: /auth/google
                </span>
                <span className="rounded bg-stone-200 px-2 py-0.5 text-xs font-semibold text-stone-800">
                  Reader Profile
                </span>
              </div>
              <h1 className="mt-1 font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
                Google / Gmail Account Sign-In
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-stone-600">
            Create or sign in to your reader profile using Google. Reader accounts let you save articles to bookmarks, participate in peer discussions, and export custom BibTeX/RIS citations. You can upgrade to a verified writer anytime by linking your GitHub, ORCID, or academic email.
          </p>

          {/* Active Session Status */}
          {user && (
            <div className="mt-6 rounded-md border border-stone-200 bg-stone-50 p-4 text-xs text-stone-800">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium">
                  <User className="h-4 w-4 text-stone-600" />
                  <span>Currently signed in as <strong>{user.name}</strong> ({user.email})</span>
                </span>
                {!hasAuthorPermissions && (
                  <Link
                    href="/auth/academic"
                    className="inline-flex items-center gap-1 rounded bg-amber-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-800 transition-colors"
                  >
                    <GraduationCap className="h-3 w-3" />
                    <span>Upgrade to Writer</span>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Primary Google OAuth Button */}
          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={startGoogleOAuth}
              disabled={loading}
              className="inline-flex w-full min-h-12 items-center justify-center gap-2.5 rounded-md border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 hover:bg-stone-50 transition-colors shadow-2xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Opening Google…</span>
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 text-red-700" />
                  <span>Continue with Google Account</span>
                  <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
                </>
              )}
            </button>
            <p className="text-center font-mono text-xs text-stone-500">
              Scope: openid, email, profile · Signed in through Supabase Auth
            </p>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-stone-500">Or sign in with your Gmail address</span>
            </div>
          </div>

          {/* Gmail Form */}
          <form onSubmit={handleDirectSignIn} className="space-y-4">
            <div>
              <label htmlFor="google-email" className="block text-xs font-semibold text-stone-800 mb-1">
                Gmail or Google Account Email <span className="text-red-700">*</span>
              </label>
              <input
                id="google-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. yourname@gmail.com"
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-800"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="google-name" className="block text-xs font-semibold text-stone-800 mb-1">
                Your Full Name <span className="text-red-700">*</span>
              </label>
              <input
                id="google-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Asif Ahmed"
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-800"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>Welcome! Reader account initialized. Navigating to the journal...</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !name.trim()}
              className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-md bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Complete Sign-In</span>
            </button>
          </form>

          {/* Upgrade prompt */}
          <div className="mt-8 rounded-md bg-amber-50/80 p-4 border border-amber-200">
            <div className="flex items-start gap-3">
              <GraduationCap className="h-5 w-5 text-amber-900 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-amber-950 block">
                  Looking to publish paper reviews or code teardowns?
                </span>
                <p className="mt-0.5 text-xs text-amber-900 leading-relaxed">
                  Reader accounts cannot publish articles. To unlock writer privileges, verify with your institutional email (.edu / .edu.bd) or GitHub account.
                </p>
                <Link
                  href="/auth/academic"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-950 hover:underline"
                >
                  <span>Verify Academic Credentials</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
