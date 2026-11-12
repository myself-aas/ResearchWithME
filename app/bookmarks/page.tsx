import BookmarksPanel from '@/components/BookmarksPanel';
import { getCachedFeedArticles } from '@/lib/cms/catalogue';

export default async function BookmarksPage() {
  return <BookmarksPanel initialArticles={await getCachedFeedArticles()} />;
}
