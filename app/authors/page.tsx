import type { Metadata } from 'next';
import AuthorDirectory from '@/components/AuthorDirectory';
import BlogFooter from '@/components/BlogFooter';
import BlogHeader from '@/components/BlogHeader';
import { listPublishedAuthors } from '@/lib/author-directory';

export const metadata: Metadata = {
  title: 'Contributors — ResearchWithMe',
  description:
    'The reviewers behind the archive: their research domains, institutions, and complete publication records.',
  alternates: { canonical: '/authors' },
};

/**
 * Reads public.profiles on the server and hands the rows to a client child that
 * owns search and filtering. Previously this was a client component reading the
 * bundled AUTHORS constant, which meant a published profile never appeared here.
 *
 * Shares its query with app/author/[id] and /api/authors through
 * lib/author-directory.ts, so the three cannot drift.
 */
export default async function AuthorsDirectoryPage() {
  const authors = await listPublishedAuthors();

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <BlogHeader />

      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8"
      >
        <header className="border-b border-stone-200 pb-8">
          <h1 className="max-w-4xl font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            The reviewers behind the archive
          </h1>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-stone-700">
            Each profile records what a contributor studies, where they work, and everything they
            have reviewed here, so you can judge the expertise behind a piece. Linked ORCID and
            GitHub identifiers are shown as the contributor supplied them.
          </p>
        </header>

        <AuthorDirectory authors={authors} />
      </main>

      <BlogFooter />
    </div>
  );
}
