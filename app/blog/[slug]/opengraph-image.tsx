import { ImageResponse } from 'next/og';
import { getPostBySlug, getPostSlugs } from '@/lib/content/posts';
import { semanticLight } from '@/tokens/generated/tokens';
import { AUTHOR, SITE } from '@/lib/site';

export const alt = 'ResearchWithMe essay';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Pre-render a card for every post alongside its page. */
export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

/** Per-post social card, rendered at build time from the post's frontmatter. */
export default async function PostOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const title = post?.title ?? SITE.name;
  const shortTitle = title.length > 96 ? `${title.slice(0, 95).trimEnd()}…` : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: semanticLight.canvas,
          color: semanticLight['text-primary'],
          padding: '64px 72px',
          borderTop: `16px solid ${semanticLight.action.primary}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>reme.</span>
          <span style={{ fontSize: 22, color: semanticLight['text-secondary'] }}>
            {post?.date ?? ''}
          </span>
        </div>

        <div
          style={{
            fontSize: shortTitle.length > 60 ? 58 : 72,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            fontWeight: 700,
            maxWidth: 1020,
          }}
        >
          {shortTitle}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 24,
            color: semanticLight['text-secondary'],
          }}
        >
          <span>{AUTHOR.name}</span>
          <span>{post?.tags.slice(0, 3).map((tag) => `#${tag}`).join('   ') ?? SITE.name}</span>
        </div>
      </div>
    ),
    size,
  );
}
