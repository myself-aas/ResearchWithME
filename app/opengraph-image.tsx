import { ImageResponse } from 'next/og';

export const alt = 'πeme — open-access research reviews';
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
        <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'Georgia, serif', fontSize: 54, letterSpacing: '-0.04em' }}>
          <span style={{ fontWeight: 700, color: '#78350f' }}>π</span>
          <span style={{ fontWeight: 400, color: '#1c1917' }}>eme</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 72, lineHeight: 1.05, letterSpacing: '-0.03em', maxWidth: 940 }}>
            Open science, reviewed in public.
          </div>
          <div style={{ fontSize: 30, color: '#57534e', fontFamily: 'Arial, sans-serif' }}>
            Long-form reviews of papers and open repositories
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Arial, sans-serif', fontSize: 24, color: '#57534e' }}>
          <span>researchwith.me</span>
          <span>CC BY 4.0 · diamond open access</span>
        </div>
      </div>
    ),
    size,
  );
}
