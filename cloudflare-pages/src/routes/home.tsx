import { useLoaderData } from 'react-router-dom';
import HomeFeed from '@/components/HomeFeed';
import type { HomeLoaderData } from './data';

/**
 * The ported home surface: the same HomeFeed the Next app renders, fed by
 * the loader instead of a client fetch of the full article list (the client
 * still refreshes from /api/articles on mount).
 */
export default function HomeRoute() {
  const data = useLoaderData() as HomeLoaderData;
  return (
    <HomeFeed
      initialCategory={data.category}
      initialSearch={data.search}
      authors={data.authors}
      initialPosts={data.posts}
    />
  );
}
