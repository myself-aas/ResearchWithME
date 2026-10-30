'use client';

import Link from 'next/link';
import {
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

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
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
              Sign-in and permissions
            </li>
          </ol>
        </nav>

        {user && (
          <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50/80 p-5 shadow-2xs">
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
                          <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                          <span>Writer</span>
                        </>
                      ) : (
                        <span>Reader</span>
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
                    <span>Open the writer studio</span>
                  </Link>
                ) : (
                  <Link
                    href="/auth/academic"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-amber-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 transition-colors"
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>Add an academic email</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex min-h-9 items-center rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="border-b border-stone-200 pb-6">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            Sign-in options and what each one gives you
          </h1>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-stone-600">
            Every provider has its own page. What you can do afterwards depends on the identity you record there, not on the provider you pick.
          </p>
        </div>

        <section aria-labelledby="writer-providers-heading" className="mt-10">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div>
              <h2 id="writer-providers-heading" className="font-serif text-xl font-bold text-stone-900">
                Writer permissions
              </h2>
              <p className="text-xs text-stone-600">
                Publishing rights and the cover tools in the studio. Each option records a different kind of scholarly identity.
              </p>
            </div>
            <span className="rounded bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900 shrink-0">
              Writer access
            </span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-6 shadow-2xs hover:border-amber-800 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-stone-900 text-white shadow-sm">
                    <GitBranch className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="mt-4 font-serif text-lg font-bold text-stone-900">
                  GitHub
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  For maintainers of public repositories. Record a handle so readers can see the code your teardowns come from.
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-stone-700">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>GitHub handle recorded</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Writer studio access (/write)</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 border-t border-stone-100 pt-4">
                <Link
                  href="/auth/github"
                  className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-md bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
                >
                  <span>Continue with GitHub</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-6 shadow-2xs hover:border-amber-800 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-sm">
                    <BookOpen className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="mt-4 font-serif text-lg font-bold text-stone-900">
                  ORCID
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  For researchers who already have an ORCID iD. The 16-digit identifier is checked against the ISO 7064 checksum, in this browser.
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-stone-700">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>16-digit iD validated locally</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>DOI citations for your reviews</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 border-t border-stone-100 pt-4">
                <Link
                  href="/auth/orcid"
                  className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 transition-colors"
                >
                  <span>Continue with ORCID</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-amber-300 bg-white p-6 shadow-2xs hover:border-amber-800 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-900 text-white shadow-sm">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="mt-4 font-serif text-lg font-bold text-stone-900">
                  Institutional address
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  For faculty and students. Accepts <strong>.edu</strong>, <strong>.edu.bd</strong> (Bangladesh), <strong>.ac.uk</strong>, <strong>.edu.au</strong>, and regional academic domains.
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-stone-700">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Domain checked against academic suffixes</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Institution recorded, not confirmed</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 border-t border-stone-100 pt-4">
                <Link
                  href="/auth/academic"
                  className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-md bg-amber-900 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800 transition-colors"
                >
                  <span>Continue with an academic email</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="reader-providers-heading" className="mt-12">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div>
              <h2 id="reader-providers-heading" className="font-serif text-xl font-bold text-stone-900">
                Reader accounts
              </h2>
              <p className="text-xs text-stone-600">
                Covers the reading list, citations, and discussion. Neither option allows publishing.
              </p>
            </div>
            <span className="rounded bg-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-800 shrink-0">
              Reader access
            </span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-6 shadow-2xs hover:border-stone-400 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-800 text-white shadow-sm">
                    <Mail className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="mt-4 font-serif text-lg font-bold text-stone-900">
                  Google
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  For readers who want a named account for saving and discussion. Adding a scholarly identity later upgrades it.
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-stone-700">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Google sign-in</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Reading list on this device</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 border-t border-stone-100 pt-4">
                <Link
                  href="/auth/google"
                  className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 transition-colors"
                >
                  <span>Continue with Google</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-6 shadow-2xs hover:border-stone-400 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-stone-800 text-white shadow-sm">
                    <Building2 className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="mt-4 font-serif text-lg font-bold text-stone-900">
                  Editorial sign-in
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  For editors with an account in Supabase. Sign in with an emailed link or a password.
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-stone-700">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Email sign-in link</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Article studio access</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 border-t border-stone-100 pt-4">
                <Link
                  href="/login"
                  className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 transition-colors"
                >
                  <span>Open the article studio</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <BlogFooter />
    </div>
  );
}
