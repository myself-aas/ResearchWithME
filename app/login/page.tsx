import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, FileText, MessageSquare } from 'lucide-react';
import LoginForm from '@/components/auth/LoginForm';
import BrandLogo from '@/components/BrandLogo';
import { getDashboardUser } from '@/lib/cms/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { safeNextPath } from '@/lib/safe-redirect';

export const metadata: Metadata = {
  title: 'Sign in to the article studio',
  description: 'Sign in to draft, review, and publish ResearchWithMe reviews.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const configured = isSupabaseConfigured;
  const user = await getDashboardUser();

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="page-container flex max-w-focus items-center justify-between gap-4 py-3">
          <Link href="/" aria-label="πeme home" className="flex items-center gap-2.5">
            <BrandLogo size="md" />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            Back to the journal
          </Link>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="page-container flex max-w-focus flex-1 items-center py-10 outline-none lg:py-16">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-16">
          <section aria-labelledby="login-title">
            <h1 id="login-title" className="font-serif text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
              Write, review, and publish
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-stone-700">
              Drafts stay private until you publish, and reader comments land in one queue for review.
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
                  <p className="font-medium text-stone-900">A byline readers can check</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-stone-600">
                    Every review points to an author profile with the credentials behind it.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-stone-700" aria-hidden="true" />
                <div>
                  <p className="font-medium text-stone-900">One moderation queue</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-stone-600">
                    Reader comments arrive live when Supabase Realtime is on, and each one deletes in a single step.
                  </p>
                </div>
              </li>
            </ul>
          </section>

          <LoginForm configured={configured} user={user} next={next} />
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="page-container flex max-w-focus flex-wrap items-center justify-between gap-2 py-4 text-sm text-stone-600">
          <p>πeme article studio</p>
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
