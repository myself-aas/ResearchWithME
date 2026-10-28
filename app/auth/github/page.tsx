'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GitBranch,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { useAuth } from '@/lib/auth-context';
import { hasSupabaseBrowserConfig } from '@/lib/supabase/client';
import { startOAuthSignIn } from '@/lib/supabase/oauth';
import { normalizeGithubHandle } from '@/lib/validation';

export default function GitHubOAuthPage() {
  const router = useRouter();
  const { verifyWithGithub, user, hasAuthorPermissions } = useAuth();

  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Full-page redirect through Supabase Auth; /auth/callback sets the session.
  async function startGitHubOAuth() {
    setLoading(true);
    setError(null);
    if (!hasSupabaseBrowserConfig()) {
      setError('GitHub sign-in needs Supabase credentials on this deployment. Use the form below in the meantime.');
      setLoading(false);
      return;
    }
    try {
      const result = await startOAuthSignIn('github', '/write');
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch {
      setError('Could not reach the sign-in service. Check your connection and try again.');
      setLoading(false);
    }
  }

  // Completes handle attestation
  function handleDirectVerification(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) {
      setError('Please provide your GitHub username or profile URL.');
      return;
    }

    const cleanHandle = normalizeGithubHandle(handle);
    if (!cleanHandle) {
      setError('Invalid GitHub handle. Letters, numbers, and hyphens only.');
      return;
    }

    const displayName = name.trim() || cleanHandle;
    const res = verifyWithGithub(cleanHandle, displayName);
    if (!res.ok) {
      setError(res.error);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push('/write');
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
              GitHub OAuth
            </li>
          </ol>
        </nav>

        <div className="rounded-lg border border-stone-200 bg-white p-6 sm:p-10 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-900 text-white shadow-sm">
              <GitBranch className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-xs font-semibold text-stone-800">
                  Unique Route: /auth/github
                </span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                  Writer Role
                </span>
              </div>
              <h1 className="mt-1 font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
                GitHub OAuth Writer Verification
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-stone-600">
            Attest your open-source repositories and engineering contributions. Verifying your GitHub identity grants full authoring permissions on ResearchWithMe, unlocking the Writer Studio, technical repo teardowns, and Qwen 2.1 AVIF cover generation.
          </p>

          {/* Active Session Status */}
          {user && hasAuthorPermissions && (
            <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span>Currently Verified as {user.name} ({user.verifiedIdentifier})</span>
                </span>
                <Link
                  href="/write"
                  className="rounded bg-emerald-800 px-3 py-1 font-semibold text-white hover:bg-emerald-900 transition-colors"
                >
                  Go to Writer Studio
                </Link>
              </div>
            </div>
          )}

          {/* Primary OAuth Button */}
          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={startGitHubOAuth}
              disabled={loading}
              className="inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-md bg-stone-900 px-6 py-3 text-sm font-semibold text-white hover:bg-stone-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Opening GitHub…</span>
                </>
              ) : (
                <>
                  <GitBranch className="h-4 w-4" />
                  <span>Continue with GitHub</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </>
              )}
            </button>
            <p className="text-center font-mono text-xs text-stone-500">
              Scope: read:user, user:email · Signed in through Supabase Auth
            </p>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-stone-500">Or attest your GitHub username directly</span>
            </div>
          </div>

          {/* Handle Form */}
          <form onSubmit={handleDirectVerification} className="space-y-4">
            <div>
              <label htmlFor="gh-handle" className="block text-xs font-semibold text-stone-800 mb-1">
                GitHub Username or Profile URL <span className="text-red-700">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-xs font-mono">
                  @
                </span>
                <input
                  id="gh-handle"
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="e.g. torvalds or https://github.com/vllm-project"
                  className="w-full rounded-md border border-stone-300 bg-white pl-8 pr-3 py-2.5 text-xs text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-800 font-mono"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="gh-display-name" className="block text-xs font-semibold text-stone-800 mb-1">
                Display Author Name <span className="font-normal text-stone-500">(as shown on articles)</span>
              </label>
              <input
                id="gh-display-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Linus Torvalds"
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
                <span>Verification successful! Writer permissions granted. Opening Writer Studio...</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !handle.trim()}
              className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-md bg-amber-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-amber-800 transition-colors disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Verify & Grant Writer Permissions</span>
            </button>
          </form>

          {/* Permissions Matrix Checklist */}
          <div className="mt-8 border-t border-stone-200 pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-800">
              Granted Writer Privileges
            </h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-stone-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                <span>Full access to Writer Studio (/write)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                <span>Access to CMS Post Editor (/dashboard)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                <span>Qwen 2.1 AVIF Cover Generation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                <span>Verified Maintainer badge on author card</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
