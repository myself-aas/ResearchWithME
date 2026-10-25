import HomeFeed from '@/components/HomeFeed';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string }>;
}) {
  const params = await searchParams;
  const category = typeof params.category === 'string' ? params.category : 'All';
  const search = typeof params.search === 'string' ? params.search : '';

  return <HomeFeed initialCategory={category} initialSearch={search} />;
}
