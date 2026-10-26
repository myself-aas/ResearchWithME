import { ImageResponse } from 'next/og';

export const alt = 'reme — open-access scholarly publishing & research reviews';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#fafaf9',
          color: '#1c1917',
          padding: '72px 84px',
          borderTop: '18px solid #78350f',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontFamily: 'Georgia, serif', fontSize: 42 }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 16,
              background: '#0f172a',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 44,
              fontFamily: 'Georgia, serif',
            }}
          >
            π
          </div>
          <span style={{ fontWeight: 400, color: '#0f172a' }}>reme</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 72, lineHeight: 1.05, letterSpacing: '-0.03em', maxWidth: 940 }}>
            Open science, reviewed in public.
          </div>
          <div style={{ fontSize: 30, color: '#57534e', fontFamily: 'Arial, sans-serif' }}>
            Scholarly reviews · reproducible papers · repository teardowns
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Arial, sans-serif', fontSize: 24, color: '#57534e' }}>
          <span>researchwith.me</span>
          <span>CC BY 4.0 · Diamond Open Access</span>
        </div>
      </div>
    ),
    size,
  );
}
