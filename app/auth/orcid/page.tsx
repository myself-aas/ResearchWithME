'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
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
import { normalizeOrcid, orcidChecksumIsValid } from '@/lib/validation';

export default function OrcidOAuthPage() {
  const router = useRouter();
  const { verifyWithOrcid, user, hasAuthorPermissions } = useAuth();

  const [orcidId, setOrcidId] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Full-page redirect through Supabase Auth; /auth/callback sets the session.
  async function startOrcidOAuth() {
    setLoading(true);
    setError(null);
    if (!hasSupabaseBrowserConfig()) {
      setError('ORCID sign-in needs Supabase credentials on this deployment. Use the form below in the meantime.');
      setLoading(false);
      return;
    }
    try {
      const result = await startOAuthSignIn('orcid', '/');
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch {
      setError('Could not reach the sign-in service. Check your connection and try again.');
      setLoading(false);
    }
  }

  function handleDirectVerification(e: React.FormEvent) {
    e.preventDefault();
    if (!orcidId.trim()) {
      setError('Add your 16-digit ORCID iD.');
      return;
    }

    const cleanOrcid = normalizeOrcid(orcidId);
    if (!cleanOrcid) {
      setError('An ORCID iD must contain 16 digits, formatted as 0000-0000-0000-0000.');
      return;
    }

    if (!orcidChecksumIsValid(cleanOrcid)) {
      setError('That iD fails the ORCID checksum (ISO 7064). Check the digits against your ORCID record.');
      return;
    }

    const displayName = name.trim() || `Scholar (${cleanOrcid.slice(0, 4)}...)`;
    const res = verifyWithOrcid(cleanOrcid, displayName);
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
                Sign-in
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-stone-500" />
            </li>
            <li aria-current="page" className="font-medium text-stone-900">
              ORCID
            </li>
          </ol>
        </nav>

        <div className="rounded-lg border border-stone-200 bg-white p-6 sm:p-10 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-sm">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                  Writer role
                </span>
              </div>
              <h1 className="mt-1 font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
                Verify with ORCID
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-stone-600">
            An ORCID iD ties your reviews to your publication record. Signing in with ORCID, or recording the iD below, opens the writer studio.
          </p>

          {user && hasAuthorPermissions && (
            <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span>Signed in as {user.name} ({user.verifiedIdentifier})</span>
                </span>
                <Link
                  href="/write"
                  className="rounded bg-emerald-800 px-3 py-1 font-semibold text-white hover:bg-emerald-900 transition-colors"
                >
                  Open the writer studio
                </Link>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={startOrcidOAuth}
              disabled={loading}
              className="inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-800 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-900 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Opening ORCID…</span>
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4" />
                  <span>Continue with ORCID</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </>
              )}
            </button>
            <p className="text-center font-mono text-xs text-stone-500">
              Scope: openid · Signed in through Supabase Auth
            </p>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-stone-500">Or record a 16-digit ORCID iD directly</span>
            </div>
          </div>

          <form onSubmit={handleDirectVerification} className="space-y-4">
            <div>
              <label htmlFor="orcid-id" className="block text-xs font-semibold text-stone-800 mb-1">
                ORCID iD <span className="text-red-700">*</span>
              </label>
              <input
                id="orcid-id"
                type="text"
                value={orcidId}
                onChange={(e) => setOrcidId(e.target.value)}
                placeholder="0000-0001-9234-8812 or https://orcid.org/…"
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-mono"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-stone-500">
                16 digits in hyphenated groups. The ISO 7064 checksum is verified in this browser.
              </p>
            </div>

            <div>
              <label htmlFor="orcid-name" className="block text-xs font-semibold text-stone-800 mb-1">
                Name <span className="font-normal text-stone-500">(as it appears on your ORCID record)</span>
              </label>
              <input
                id="orcid-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prof. Marcus Vance"
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-700"
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
                <span>ORCID iD validated. Taking you to the writer studio…</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !orcidId.trim()}
              className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-900 transition-colors disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Record this ORCID iD</span>
            </button>
          </form>

          <div className="mt-6 rounded-md bg-stone-50 p-3 border border-stone-200">
            <span className="text-xs font-semibold text-stone-700 block mb-1">
              Try a sample record:
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setOrcidId('0000-0001-9234-8812');
                  setName('Prof. Marcus Vance');
                }}
                className="underline text-emerald-800 hover:text-emerald-950 font-mono text-xs"
              >
                0000-0001-9234-8812 (Prof. Vance)
              </button>
              <span className="text-stone-300">·</span>
              <button
                type="button"
                onClick={() => {
                  setOrcidId('0000-0002-1825-0097');
                  setName('Dr. Elena Rostova');
                }}
                className="underline text-emerald-800 hover:text-emerald-950 font-mono text-xs"
              >
                0000-0002-1825-0097 (Dr. Rostova)
              </button>
            </div>
          </div>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
