import { Link, useLoaderData } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import AuthorArchiveLayout from '@/components/AuthorArchiveLayout';
import AuthorProfileCard from '@/components/AuthorProfileCard';
import BlogFooter from '@/components/BlogFooter';
import BlogHeader from '@/components/BlogHeader';
import type { AuthorLoaderData } from './data';

/**
 * /author/:id — the public contributor archive. Ported from
 * app/author/[id]/page.tsx; the loader resolves the archive once (a missing
 * profile is a 404, a Supabase outage is a 5xx) and hands it down here.
 */
export default function AuthorRoute() {
  const { author, articles, metrics } = useLoaderData() as AuthorLoaderData;

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <BlogHeader />

      <main tabIndex={-1} id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-stone-600">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link to="/" className="hover:text-stone-900 hover:underline">
                Platform
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-stone-500" />
            </li>
            <li>
              <Link to="/authors" className="hover:text-stone-900 hover:underline">
                Authors
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-stone-500" />
            </li>
            <li aria-current="page" className="font-medium text-stone-900">
              {author.name}
            </li>
          </ol>
        </nav>

        <AuthorProfileCard author={author} metrics={metrics} headingLevel="h1" />

        <AuthorArchiveLayout articles={articles} />
      </main>

      <BlogFooter />
    </div>
  );
}
