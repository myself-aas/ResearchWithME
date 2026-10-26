'use client';

import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  GitBranch,
  GraduationCap,
  Sparkles,
  ArrowRight,
  BookOpen,
  Mail,
  Building2,
} from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { useAuth } from '@/lib/auth-context';

export default function AuthProvidersPage() {
  const { user, hasAuthorPermissions, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <BlogHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
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
            <li aria-current="page" className="font-medium text-stone-900">
              Authentication & Permissions
            </li>
          </ol>
        </nav>

        {/* Current Active Session Status */}
        {user && (
          <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50/80 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 font-serif text-sm font-bold text-white">
                  {user.avatar}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900">{user.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
                        hasAuthorPermissions
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-stone-200 text-stone-800'
                      }`}
                    >
                      {hasAuthorPermissions ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Verified Writer & Author</span>
                        </>
                      ) : (
                        <span>Reader Account</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600">
                    {user.email || user.verifiedIdentifier} · {user.verifiedTitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasAuthorPermissions ? (
                  <Link
                    href="/write"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-amber-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Open Writer Studio</span>
                  </Link>
                ) : (
                  <Link
                    href="/auth/academic"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-amber-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 transition-colors"
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>Upgrade to Writer (.edu)</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex min-h-9 items-center rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="border-b border-stone-200 pb-6">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-800">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-900" />
            <span>Identity & Permission Architecture</span>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            Choose Your Authentication Pathway
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-600">
            ResearchWithMe enforces peer-reviewed writer access. Authoring permissions are granted exclusively via attested academic, researcher, or developer credentials.
          </p>
        </div>

        {/* Writer Permission Providers Section */}
        <section aria-labelledby="writer-providers-heading" className="mt-10">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div>
              <h2 id="writer-providers-heading" className="font-serif text-xl font-bold text-stone-900">
                1. Writer & Researcher Access (Unlocks Writer Studio & CMS)
              </h2>
              <p className="text-xs text-stone-600">
                Requires attested open-science credentials. Grants publishing rights, AI avatar generation, and Qwen 2.1 AVIF cover generation.
              </p>
            </div>
            <span className="rounded bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">
              Writer Role Granted
            </span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {/* GitHub OAuth Card */}
            <div className="flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-6 shadow-2xs hover:border-amber-800 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-stone-900 text-white">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-xs font-medium text-stone-700">
                    OAuth 2.0
                  </span>
                </div>
                <h3 className="mt-4 font-serif text-lg font-bold text-stone-900">
                  GitHub OAuth
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  Attest open-source code repositories, commit histories, and systems engineering contributions for repo teardown articles.
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-stone-700">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Public key & commit attestation</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Instant Writer Studio access</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 border-t border-stone-100 pt-4">
                <Link
                  href="/auth/github"
                  className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-md bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
                >
                  <span>Authenticate with GitHub</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <p className="mt-1.5 text-center font-mono text-xs text-stone-500">
                  /auth/github
                </p>
              </div>
            </div>

            {/* ORCID OAuth Card */}
            <div className="flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-6 shadow-2xs hover:border-amber-800 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-800 text-white">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-xs font-medium text-emerald-800">
                    ISO 7064
                  </span>
                </div>
                <h3 className="mt-4 font-serif text-lg font-bold text-stone-900">
                  ORCID Researcher iD
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  Connect your verified 16-digit ORCID persistent identifier for peer review publications and preprint syntheses.
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-stone-700">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>ORCID registry cross-reference</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Automated DOI citation links</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 border-t border-stone-100 pt-4">
                <Link
                  href="/auth/orcid"
                  className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-900 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors"
                >
                  <span>Authenticate with ORCID</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <p className="mt-1.5 text-center font-mono text-xs text-stone-500">
                  /auth/orcid
                </p>
              </div>
            </div>

            {/* Institutional (.edu / .edu.bd) Card */}
            <div className="flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-6 shadow-2xs hover:border-amber-800 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-900 text-white">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <span className="rounded bg-amber-50 px-2 py-0.5 font-mono text-xs font-medium text-amber-900">
                    .edu / .edu.bd
                  </span>
                </div>
                <h3 className="mt-4 font-serif text-lg font-bold text-stone-900">
                  Academic & Regional SSO
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  Verify academic faculty/student email across .edu, .edu.bd (Bangladesh), .ac.uk, .edu.au, .ac.in, and worldwide regional domains.
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-stone-700">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Country & region code detection</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Cryptographic university attestation</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 border-t border-stone-100 pt-4">
                <Link
                  href="/auth/academic"
                  className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-md bg-amber-900 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800 transition-colors"
                >
                  <span>Verify Academic Email</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <p className="mt-1.5 text-center font-mono text-xs text-stone-500">
                  /auth/academic
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Reader & General Accounts Section */}
        <section aria-labelledby="reader-providers-heading" className="mt-12">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div>
              <h2 id="reader-providers-heading" className="font-serif text-xl font-bold text-stone-900">
                2. Reader & Community Accounts
              </h2>
              <p className="text-xs text-stone-600">
                Create a reader profile for bookmarks, reading lists, citation exports, and peer discussion.
              </p>
            </div>
            <span className="rounded bg-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-800">
              Reader Role Granted
            </span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Google / Gmail OAuth Card */}
            <div className="flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-6 shadow-2xs">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-800 text-white">
                    <Mail className="h-5 w-5" />
                  </div>
                  <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-xs font-medium text-stone-700">
                    Google OAuth
                  </span>
                </div>
                <h3 className="mt-4 font-serif text-lg font-bold text-stone-900">
                  Google / Gmail Account
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  Sign in instantly with your Google account. Save your reading list, post comments in discussions, and upgrade to writer permissions anytime.
                </p>
              </div>

              <div className="mt-6 border-t border-stone-100 pt-4">
                <Link
                  href="/auth/google"
                  className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 transition-colors"
                >
                  <span>Continue with Google / Gmail</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <p className="mt-1.5 text-center font-mono text-xs text-stone-500">
                  /auth/google
                </p>
              </div>
            </div>

            {/* Email Magic Link (Supabase) Card */}
            <div className="flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-6 shadow-2xs">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-stone-800 text-white">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-xs font-medium text-stone-700">
                    Passwordless
                  </span>
                </div>
                <h3 className="mt-4 font-serif text-lg font-bold text-stone-900">
                  Editorial Passwordless Login
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  Sign in via email magic link or editorial staff credentials configured via Supabase CMS studio authentication.
                </p>
              </div>

              <div className="mt-6 border-t border-stone-100 pt-4">
                <Link
                  href="/login"
                  className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 transition-colors"
                >
                  <span>Open Editorial Login</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <p className="mt-1.5 text-center font-mono text-xs text-stone-500">
                  /login
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <BlogFooter />
    </div>
  );
}
