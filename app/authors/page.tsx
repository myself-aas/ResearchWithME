import type { Metadata } from 'next';
import AuthorsDirectoryPage from '@/components/AuthorsDirectoryPage';
import { listPublishedAuthors } from '@/lib/author-directory';

export const metadata: Metadata = {
  title: 'Contributors — ResearchWithMe',
  description:
    'The reviewers behind the archive: their research domains, institutions, and complete publication records.',
  alternates: { canonical: '/authors' },
};

/**
 * Reads public.profiles on the server and hands the rows to the shared
 * presentational shell. Previously this was a client component reading the
 * bundled AUTHORS constant, which meant a published profile never appeared here.
 */
export default async function AuthorsDirectoryRoute() {
  const authors = await listPublishedAuthors();
  return <AuthorsDirectoryPage authors={authors} />;
}
