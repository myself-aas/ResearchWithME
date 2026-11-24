import Image from 'next/image';
import type { PostMeta } from '@/lib/content/types';

/**
 * Post cover with the site's frame. Local covers go through `next/image`;
 * remote covers are rendered directly so any https host works without an
 * allow-list in next.config.
 */
export default function PostCover({
  post,
  priority = false,
  sizes = '(max-width: 768px) 100vw, 40vw',
  className = '',
}: {
  post: PostMeta;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  if (!post.cover) return null;
  const isLocal = post.cover.startsWith('/');

  return (
    <div
      className={`relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-line bg-surface-subtle ${className}`}
    >
      {isLocal ? (
        <Image
          src={post.cover}
          alt={post.coverAlt ?? ''}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- remote covers may live on any https host
        <img
          src={post.cover}
          alt={post.coverAlt ?? ''}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
