import { redirect } from 'next/navigation';
import HomeFeed from '@/components/HomeFeed';
import { listPublishedAuthors } from '@/lib/author-directory';
import { categoryToSlug, slugToCategory } from '@/lib/blog-data';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string }>;
}) {
  const params = await searchParams;
  const rawCategory = typeof params.category === 'string' ? params.category : undefined;
  const search = typeof params.search === 'string' ? params.search : '';

  // Canonicalize legacy category query params (e.g. ?category=Data%20%26%20Policy) to clean URLs (/category/data-policy)
  if (rawCategory && rawCategory !== 'All') {
    const matchedCategory = slugToCategory(rawCategory);
    if (matchedCategory) {
      const searchSuffix = search ? `?search=${encodeURIComponent(search)}` : '';
      redirect(`/category/${categoryToSlug(matchedCategory)}${searchSuffix}`);
    }
  }

  // Read on the server so the spotlight ships with real rows instead of the
  // client reading a constant that is now empty.
  const authors = await listPublishedAuthors();

  return <HomeFeed initialCategory="All" initialSearch={search} authors={authors} />;
}
