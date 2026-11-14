/**
 * Shared contributors directory surface — used by the Next app (app/authors/page.tsx) and the
 * Pages target (cloudflare-pages/src/routes/authors.tsx). One source of truth
 * for the markup and behavior in both runtimes until Task 16 retires Next.
 */
import AuthorDirectory from '@/components/AuthorDirectory';
import BlogFooter from '@/components/BlogFooter';
import BlogHeader from '@/components/BlogHeader';
import type { Author } from '@/lib/blog-data';

interface AuthorsDirectoryPageProps {
  /** Published contributor profiles; resolved by each runtime's data layer. */
  authors: Author[];
}

/**
 * Server-safe presentational shell (no hooks). The Next page resolves the
 * rows in an async server component; the Pages route resolves them in its
 * loader. Shares its query with /author/[id] and /api/authors through
 * lib/author-directory-core.ts, so the two cannot drift.
 */
export default function AuthorsDirectoryPage({ authors }: AuthorsDirectoryPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />

      <main tabIndex={-1}
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8"
      >
        <header className="border-b border-line pb-8">
          <h1 className="max-w-4xl font-serif text-3xl font-bold tracking-tight text-ink sm:text-5xl">
            The reviewers behind the archive
          </h1>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-ink">
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
