import Image from 'next/image';
import type { PostMeta } from '@/lib/content/types';

const ARTWORKS = [
  {
    background: 'from-slate-950 via-teal-950 to-stone-800',
    accent: 'text-emerald-100',
    line: 'text-emerald-200/70',
  },
  {
    background: 'from-amber-950 via-rose-950 to-slate-950',
    accent: 'text-amber-100',
    line: 'text-orange-200/70',
  },
  {
    background: 'from-orange-950 via-red-950 to-stone-900',
    accent: 'text-orange-100',
    line: 'text-amber-200/70',
  },
  {
    background: 'from-emerald-950 via-lime-950 to-slate-950',
    accent: 'text-lime-100',
    line: 'text-emerald-200/70',
  },
] as const;

function artworkIndex(slug: string) {
  return [...slug].reduce((sum, character) => sum + character.charCodeAt(0), 0) % ARTWORKS.length;
}

function AbstractCover({ post }: { post: PostMeta }) {
  const artwork = ARTWORKS[artworkIndex(post.slug)];

  return (
    <div className={`relative h-full w-full overflow-hidden bg-gradient-to-br ${artwork.background}`} aria-hidden="true">
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
        }}
      />
      <svg
        viewBox="0 0 720 400"
        fill="none"
        className={`absolute -right-[4%] -top-[18%] h-[132%] w-[78%] ${artwork.line}`}
      >
        <circle cx="436" cy="194" r="112" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="436" cy="194" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" />
        <ellipse cx="436" cy="194" rx="176" ry="58" transform="rotate(-28 436 194)" stroke="currentColor" />
        <path d="M82 304C172 234 228 251 305 181s118-43 180-97 90-39 155-64" stroke="currentColor" strokeWidth="1.4" />
        <path d="M112 348c65-64 125-45 195-99 46-36 67-51 119-57 65-7 104 8 190-58" stroke="currentColor" strokeWidth="1" strokeDasharray="3 7" />
        <path d="M436 82v224M324 194h224" stroke="currentColor" strokeWidth=".8" strokeDasharray="2 8" />
        <circle cx="305" cy="181" r="5" fill="currentColor" />
        <circle cx="484" cy="84" r="5" fill="currentColor" />
        <circle cx="626" cy="134" r="5" fill="currentColor" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/10" />
      <div className="absolute left-5 top-5 flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-white/75 sm:left-7 sm:top-7">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
        Field notes · {post.date.slice(0, 4)}
      </div>
      <div className="absolute bottom-6 right-7 hidden h-12 w-12 rounded-full border border-white/30 sm:block" />
    </div>
  );
}

/**
 * A consistent editorial frame for covers, with deterministic abstract artwork
 * when a post has no supplied image. Local images use next/image; remote covers
 * are allowed from any HTTPS host. `aspect` widens the frame for the `hero`
 * cover style; the title lives in the page's own `<h1>` above the frame, so
 * the artwork never repeats it.
 */
export default function PostCover({
  post,
  priority = false,
  sizes = '(max-width: 768px) 100vw, 40vw',
  aspect = 'aspect-[16/9]',
  className = '',
}: {
  post: PostMeta;
  priority?: boolean;
  sizes?: string;
  aspect?: string;
  className?: string;
}) {
  const frameClassName = `relative ${aspect} w-full overflow-hidden rounded-xl border border-line bg-surface-subtle ${className}`;

  if (!post.cover) {
    return (
      <div className={frameClassName}>
        <AbstractCover post={post} />
      </div>
    );
  }

  const isLocal = post.cover.startsWith('/');

  return (
    <div className={frameClassName}>
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
          width={1600}
          height={900}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
