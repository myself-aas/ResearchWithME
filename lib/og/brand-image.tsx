/**
 * Shared branded OG image renderer for file-convention opengraph-image routes.
 * πeme palette: canvas #F8F7F3, text #161C1A, action #1D4ED8.
 */
import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

// Non-italic pi symbol (U+1D70B MATHEMATICAL SANS-SERIF BOLD SMALL PI)
const piSymbol = '𝜋';

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
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 54, letterSpacing: '-0.04em' }}>
                  <span style={{ fontWeight: 700, color: '#1D4ED8' }}>{piSymbol}</span>
          <span style={{ fontWeight: 400, color: '#161C1A' }}>eme</span>
        </div>
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
