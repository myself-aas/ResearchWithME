import type { PostMeta } from '@/lib/content/types';
import { formatMonthYear, readingTimeLabel, toDateTime } from '@/lib/content/format';
import { Control, Cover, DesignSlot } from '@/components/design/Primitives';

/** Slot-aware typography and the 5/7 desktop split are generated, not authored. */
export default function HomeHero({ post }: { post?: PostMeta }) {
  return (
    <section aria-labelledby="home-hero-title" data-section="hero" className="r-grid r-hero">
      <DesignSlot name="hero.text">
        <div className="r-flow r-flow-wide">
          <h1 id="home-hero-title" className="r-h1">{post?.title ?? 'Research papers and open code, reviewed in public.'}</h1>
          {post ? <p className="r-meta r-muted">
            <time dateTime={toDateTime(post.date)}>{formatMonthYear(post.date)}</time>
            {post.readingTimeMinutes > 0 && <> · {readingTimeLabel(post.readingTimeMinutes)}</>}
          </p> : <p className="r-body r-muted">Close readings of papers, repositories, and the evidence behind them. No articles published yet.</p>}
          <Control href={post?.href ?? '/blog'}>{post ? 'Read study' : 'Explore the archive'}</Control>
        </div>
      </DesignSlot>
      <DesignSlot name="hero.visual"><Cover post={post} priority /></DesignSlot>
    </section>
  );
}
