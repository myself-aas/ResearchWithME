/**
 * Shared contributors directory surface — used by the Next app (app/authors/page.tsx) and the
 * Pages target (cloudflare-pages/src/routes/authors.tsx). One source of truth
 * for the markup and behavior in both runtimes until Task 16 retires Next.
 */
import Link from 'next/link';
import AuthorDirectory from '@/components/AuthorDirectory';
import BlogFooter from '@/components/BlogFooter';
import BlogHeader from '@/components/BlogHeader';
import type { Author } from '@/lib/blog-data';

interface AuthorsDirectoryPageProps {
  /** Published contributor profiles; resolved by each runtime's data layer. */
  authors: Author[];
  /**
   * The editor who runs the desk. Always known (it is a single, real role in
   * this product), so the directory never reads as an empty shell even before
   * any contributor profile is published.
   */
  editor?: { name: string; role: string; slug: string };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'R';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Server-safe presentational shell (no hooks). The Next page resolves the
 * rows in an async server component; the Pages route resolves them in its
 * loader. Shares its query with /author/[id] and /api/authors through
 * lib/author-directory-core.ts, so the two cannot drift.
 */
export default function AuthorsDirectoryPage({ authors, editor }: AuthorsDirectoryPageProps) {
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

        {editor ? (
          <section aria-labelledby="editorial-lead-heading" className="mt-8">
            <h2
              id="editorial-lead-heading"
              className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-secondary"
            >
              Editorial lead
            </h2>
            <Link
              href={`/author/${editor.slug}`}
              className="mt-3 flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand/40 hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:p-5"
            >
              <span
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line bg-brand/10 font-serif text-lg font-semibold text-brand"
              >
                {initials(editor.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-xl font-semibold text-ink">{editor.name}</span>
                <span className="mt-0.5 block font-sans text-sm text-ink-secondary">{editor.role}</span>
              </span>
              <span aria-hidden="true" className="font-sans text-sm font-medium text-brand">
                View profile →
              </span>
            </Link>
          </section>
        ) : null}

        <AuthorDirectory authors={authors} />
      </main>

      <BlogFooter />
    </div>
  );
}
