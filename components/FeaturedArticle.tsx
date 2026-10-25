import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Bookmark, FileText, GitBranch } from 'lucide-react';
import { BlogPost } from '@/lib/blog-data';

interface FeaturedArticleProps {
  post: BlogPost;
  isSaved: boolean;
  onToggleSave: (postId: string) => void;
}

export default function FeaturedArticle({ post, isSaved, onToggleSave }: FeaturedArticleProps) {
  return (
    <section aria-labelledby="featured-heading" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-0 overflow-hidden rounded-lg border border-stone-200 bg-white lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="relative min-h-64 bg-stone-900 lg:min-h-full">
          <Image
            src={post.coverImage && post.coverImage.trim() !== '' ? post.coverImage : '/images/folio-hero.jpeg'}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 42vw"
            className="object-cover opacity-90"
          />
          <span className="absolute left-4 top-4 rounded bg-amber-900 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            Featured review
          </span>
        </div>

        <div className="flex flex-col justify-between gap-8 p-6 sm:p-10">
          <div>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600">
              <span className="font-medium text-amber-900">{post.category}</span>
              <span aria-hidden="true">·</span>
              <span>{post.format}</span>
              <span aria-hidden="true">·</span>
              <span>{post.publishedAt}</span>
              <span aria-hidden="true">·</span>
              <span>{post.readTime}</span>
            </p>

            <h2 id="featured-heading" className="mt-3 font-serif text-3xl font-bold leading-tight text-stone-900 sm:text-4xl">
              <Link href={`/post/${post.slug}`} className="hover:text-amber-900">
                {post.title}
              </Link>
            </h2>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-700">{post.subtitle}</p>

            <div className="mt-6 border-l-2 border-amber-800 pl-4">
              <h3 className="text-sm font-semibold text-stone-900">What the review establishes</h3>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-stone-700">
                {post.keyTakeaways.slice(0, 2).map((takeaway) => (
                  <li key={takeaway} className="flex gap-2">
                    <span aria-hidden="true" className="text-amber-800">—</span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>

            {post.reviewedArtifact && (
              <p className="mt-5 flex min-w-0 flex-wrap items-center gap-2 text-sm text-stone-600">
                <span className="inline-flex items-center gap-1.5 font-medium text-stone-800">
                  {post.reviewedArtifact.type === 'github' ? (
                    <GitBranch className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>Artifact under review</span>
                </span>
                <span className="break-all font-mono text-stone-800">{post.reviewedArtifact.identifier}</span>
                <span aria-hidden="true">·</span>
                <span>{post.reviewedArtifact.meta}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-5">
            <Link
              href={`/author/${post.author.id}`}
              className="flex min-w-0 items-center gap-3 text-sm text-stone-800 hover:text-amber-900"
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 font-serif text-sm font-bold text-stone-50"
              >
                {post.author.avatar}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{post.author.name}</span>
                <span className="block truncate text-stone-600">{post.author.role}</span>
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleSave(post.id)}
                aria-pressed={isSaved}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-md border transition-colors ${
                  isSaved
                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                    : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
                <span className="sr-only">
                  {isSaved ? 'Remove from reading list' : 'Save to reading list'}
                </span>
              </button>

              <Link
                href={`/post/${post.slug}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
              >
                <span>Read the review</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
