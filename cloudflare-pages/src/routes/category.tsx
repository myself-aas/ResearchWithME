import { useLoaderData } from 'react-router-dom';
import HomeFeed from '@/components/HomeFeed';
import type { CategoryLoaderData } from './data';

/**
 * /category/:slug — the same canonical field pages the Next app serves
 * (unknown slugs 404 in the loader before anything renders).
 */
export default function CategoryRoute() {
  const data = useLoaderData() as CategoryLoaderData;
  return (
    <HomeFeed
      initialCategory={data.category}
      initialSearch={data.search}
      authors={data.authors}
      initialPosts={data.posts}
    />
  );
}
