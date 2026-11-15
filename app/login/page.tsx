import type { Metadata } from 'next';
import { BadgeCheck, FileText, MessageSquare } from 'lucide-react';
import LoginForm from '@/components/auth/LoginForm';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { getDashboardUser } from '@/lib/cms/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { safeNextPath } from '@/lib/safe-redirect';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Sign in to the editorial studio',
    description:
      'Sign in to write, review, and publish open-access ResearchWithMe articles, benchmark replications, and repository teardowns.',
    path: '/login',
    type: 'website',
  }),
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error_description?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  // The auth callback sends a failed sign-in here with the reason. It is passed
  // on as text; React escapes it, and the form rewrites the common ones.
  const rawError = params.error_description ?? params.error;
  const initialError = typeof rawError === 'string' ? rawError.trim().slice(0, 300) : '';
  const configured = isSupabaseConfigured;
  const user = await getDashboardUser();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />

      <main tabIndex={-1} id="main-content" className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-10 sm:px-6 lg:py-16">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-16">
          <section aria-labelledby="login-title">
            <h1 id="login-title" className="font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Write, review, and publish
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-secondary">
              The studio holds drafts privately, publishes to the platform, and keeps reader discussion in one
              moderation queue.
            </p>

            <ul className="mt-8 space-y-5 border-t border-line pt-6">
              <li className="flex gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand-hover" aria-hidden="true" />
                <div>
                  <p className="font-medium text-ink">A calm long-form editor</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-secondary">
                    Markdown with a live preview, cover images, takeaways, and an explicit draft state.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                <div>
                  <p className="font-medium text-ink">Verified bylines</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-secondary">
                    Every article maps to a credentialed author profile, so readers can inspect the record.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-ink" aria-hidden="true" />
                <div>
                  <p className="font-medium text-ink">One moderation queue</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-secondary">
                    Reader notes arrive in realtime when Supabase Realtime is enabled, and delete in one step.
                  </p>
                </div>
              </li>
            </ul>
          </section>

          <LoginForm configured={configured} user={user} next={next} initialError={initialError} />
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
