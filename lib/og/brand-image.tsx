/**
 * Shared branded OG image renderer for file-convention opengraph-image routes.
 *
 * Colours come from the semantic tokens, not from literals: OG images are
 * rendered in a browser context with no stylesheet, so nothing here can read a
 * CSS variable at runtime. Importing the generated token module gives this file
 * the same values the design system publishes, and a token change reaches the
 * shared images with no edit here. There is no theme to follow — a social card
 * is one image, so it pins the light semantic set.
 */
import { ImageResponse } from 'next/og';
import { semanticLight } from '@/tokens/generated/tokens';
import { BRAND_WORDMARK_DATA } from './logo-data';

export const OG_SIZE = { width: 1200, height: 630 };

export function brandOgImage(title: string, subtitle: string) {
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
          padding: '72px 84px',
          borderTop: `18px solid ${semanticLight.action.primary}`,
          fontFamily: 'ui-serif, Georgia, serif',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_WORDMARK_DATA} width={200} height={119} alt="ResearchWithMe" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: title.length > 60 ? 52 : 64, lineHeight: 1.08, letterSpacing: '-0.03em', maxWidth: 1000 }}>
            {title}
          </div>
          <div style={{ fontSize: 30, color: semanticLight['text-secondary'], fontFamily: 'Inter, system-ui, sans-serif' }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 24, color: semanticLight['text-secondary'] }}>
          <span>researchwith.me</span>
          <span>CC BY 4.0 · Open access</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
