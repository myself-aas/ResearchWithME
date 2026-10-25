import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, FileText, MessageSquare } from 'lucide-react';
import LoginForm from '@/components/auth/LoginForm';
import { getDashboardUser } from '@/lib/cms/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const metadata: Metadata = {
  title: 'Sign in to the editorial studio',
  description: 'Sign in to write, review, and publish ResearchWithMe articles.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

function safeNext(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return '/dashboard';
  if (candidate.startsWith('/login')) return '/dashboard';
  return candidate;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const configured = isSupabaseConfigured;
  const user = await getDashboardUser();

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 font-serif text-lg font-bold text-stone-50"
            >
              R
            </span>
            <span className="font-serif text-lg font-bold tracking-tight text-stone-900">
              ResearchWith<span className="text-amber-800">.me</span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            Back to the journal
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-10 sm:px-6 lg:py-16">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-16">
          <section aria-labelledby="login-title">
            <h1 id="login-title" className="font-serif text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
              Write, review, and publish
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-stone-700">
              The studio holds drafts privately, publishes to the journal, and keeps reader discussion in one
              moderation queue.
            </p>

            <ul className="mt-8 space-y-5 border-t border-stone-200 pt-6">
              <li className="flex gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" aria-hidden="true" />
                <div>
                  <p className="font-medium text-stone-900">A calm long-form editor</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-stone-600">
                    Markdown with a live preview, cover images, takeaways, and an explicit draft state.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                <div>
                  <p className="font-medium text-stone-900">Verified bylines</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-stone-600">
                    Every article maps to a credentialed author profile, so readers can inspect the record.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-stone-700" aria-hidden="true" />
                <div>
                  <p className="font-medium text-stone-900">One moderation queue</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-stone-600">
                    Reader notes arrive in realtime when Supabase Realtime is enabled, and delete in one step.
                  </p>
                </div>
              </li>
            </ul>
          </section>

          <LoginForm configured={configured} user={user} next={next} />
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-sm text-stone-600 sm:px-6">
          <p>ResearchWithMe editorial studio</p>
          <p>
            <Link href="/editorial-board" className="underline underline-offset-4 hover:text-stone-900">
              Editorial board
            </Link>
            <span aria-hidden="true"> · </span>
            <Link href="/submit" className="underline underline-offset-4 hover:text-stone-900">
              Submit a manuscript
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
