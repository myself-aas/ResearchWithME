import AuthorsDirectoryPage from '@/components/AuthorsDirectoryPage';
import { listPublishedAuthors } from '@/lib/author-directory';
import { EDITOR_IN_CHIEF } from '@/lib/research-data';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Writers',
  description:
    'Meet the writers behind ResearchWithMe: inspect their research fields, institutional affiliations, ORCID records, and published reviews.',
  path: '/authors',
  type: 'website',
});

export default async function AuthorsDirectoryRoute() {
  const authors = await listPublishedAuthors();
  return (
    <AuthorsDirectoryPage
      authors={authors}
      editor={{
        name: EDITOR_IN_CHIEF.name,
        role: EDITOR_IN_CHIEF.role,
        slug: EDITOR_IN_CHIEF.profileSlug,
      }}
    />
  );
}
