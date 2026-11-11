import type { ReactElement } from 'react';
import AuthorArchive from '@/components/AuthorArchive';
import AuthorWorkSummary from '@/components/AuthorWorkSummary';
import type { BlogPost } from '@/lib/blog-data';

export default function AuthorArchiveLayout({
  articles,
}: {
  articles: readonly BlogPost[];
}): ReactElement {
  if (articles.length === 0) return <AuthorArchive articles={[]} />;

  return (
    <div data-layout-grid="author-archive" className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">
        <AuthorArchive articles={[...articles]} />
      </div>
      <div className="mt-10 self-start lg:sticky lg:top-24">
        <AuthorWorkSummary articles={articles} />
      </div>
    </div>
  );
}
