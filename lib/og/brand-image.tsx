/**
 * Shared branded OG image renderer for file-convention opengraph-image routes.
 * reme palette: canvas #F8F7F3, text #161C1A, action #1D4ED8.
 */
import { ImageResponse } from 'next/og';
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
          background: '#F8F7F3',
          color: '#161C1A',
          padding: '72px 84px',
          borderTop: '18px solid #1D4ED8',
          fontFamily: 'ui-serif, Georgia, serif',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_WORDMARK_DATA} width={200} height={119} alt="ResearchWithMe" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: title.length > 60 ? 52 : 64, lineHeight: 1.08, letterSpacing: '-0.03em', maxWidth: 1000 }}>
            {title}
          </div>
          <div style={{ fontSize: 30, color: '#5C5C63', fontFamily: 'Inter, system-ui, sans-serif' }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 24, color: '#5C5C63' }}>
          <span>researchwith.me</span>
          <span>CC BY 4.0 · Open access</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
