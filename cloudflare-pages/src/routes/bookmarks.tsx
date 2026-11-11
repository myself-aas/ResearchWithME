import { useLoaderData } from 'react-router-dom';
import BookmarksPanel from '@/components/BookmarksPanel';

/** The ported reading list; saved ids live in localStorage, the loader carries metadata. */
export default function BookmarksRoute() {
  // The loader re-runs on client navigation; its only payload is metadata.
  useLoaderData();
  return <BookmarksPanel />;
}
