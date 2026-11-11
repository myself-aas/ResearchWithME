import AuthorsDirectoryPage from '@/components/AuthorsDirectoryPage';
import { listPublishedAuthors } from '@/lib/author-directory';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Contributors & Domain Reviewers',
  description:
    'Meet the verified domain specialists behind ResearchWithMe: inspect their research fields, institutional affiliations, ORCID records, and peer reviews.',
  path: '/authors',
  type: 'website',
});

/**
 * Reads public.profiles on the server and hands the rows to the shared
 * presentational shell. Previously this was a client component reading the
 * bundled AUTHORS constant, which meant a published profile never appeared here.
 */
export default async function AuthorsDirectoryRoute() {
  const authors = await listPublishedAuthors();
  return <AuthorsDirectoryPage authors={authors} />;
}
