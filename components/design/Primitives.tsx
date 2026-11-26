import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Clock3, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { coverMedia } from '@/src/generated/media';
import { slots, type Slot } from '@/src/generated/slots';
import type { PostMeta } from '@/lib/content/types';
import { formatDateShort, readingTimeLabel } from '@/lib/content/format';

export function DesignSlot({ name, children, className = '' }: { name: Slot; children: ReactNode; className?: string }) {
  return <div {...slots[name]} className={`${slots[name].className} ${className}`}>{children}</div>;
}

export function Control({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) {
  return <Link href={href} data-primitive="control" className={secondary ? 'r-control-secondary' : 'r-control-primary'}>{children}<ArrowRight className="r-icon" aria-hidden="true" /></Link>;
}

export function Status({ state, children }: { state: 'verified' | 'pending' | 'unavailable'; children: ReactNode }) {
  const Icon = { verified: Check, pending: Clock3, unavailable: Minus }[state];
  return <span className={`r-status r-status-${state}`}><Icon className="r-icon" aria-hidden="true" /><span>{children}</span></span>;
}

/** Cover artwork is content, not a CSS motif; no words are baked into it. */
export function Cover({ post, priority = false }: { post?: PostMeta; priority?: boolean }) {
  return <div className="r-frame" data-primitive="frame">
    {post?.cover ? <Image src={post.cover} alt={post.coverAlt || ''} width={coverMedia.width} height={coverMedia.height} priority={priority} sizes={coverMedia.sizes} /> : <picture>
      <source srcSet={coverMedia.fallback.avif} type="image/avif" />
      {/* Preoptimized same-origin artwork: a native picture supplies AVIF/WebP without a runtime optimizer. */}
      <img src={coverMedia.fallback.webp} alt={coverMedia.fallback.alt} width={coverMedia.width} height={coverMedia.height} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} />
    </picture>}
  </div>;
}

export function WritingRow({ post }: { post: PostMeta }) {
  return <article className="r-row" data-primitive="row">
    <p className="r-meta r-muted"><time dateTime={post.date}>{formatDateShort(post.date)}</time> · {readingTimeLabel(post.readingTimeMinutes)}</p>
    <h3 className="r-h3"><Link href={post.href} className="r-row-link">{post.title}</Link></h3>
    <p className="r-body r-muted">{post.description}</p>
  </article>;
}
