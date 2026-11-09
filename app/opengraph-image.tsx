import { ImageResponse } from 'next/og';

export const alt = 'ResearchWithMe — Open-Access Scholarly Publishing & Research Reviews';
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
          background: '#F8F7F3',
          color: '#161C1A',
          padding: '72px 84px',
          borderTop: '18px solid #4F46E5',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'Georgia, serif', fontSize: 54, letterSpacing: '-0.04em' }}>
          <span style={{ fontWeight: 700, color: '#4F46E5' }}>π</span>
          <span style={{ fontWeight: 400, color: '#161C1A' }}>eme</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 72, lineHeight: 1.05, letterSpacing: '-0.03em', maxWidth: 940 }}>
            Open science, reviewed in public.
          </div>
          <div style={{ fontSize: 30, color: '#555955', fontFamily: 'Inter, system-ui, sans-serif' }}>
            Scholarly reviews · reproducible papers · repository teardowns
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 24, color: '#555955' }}>
          <span>researchwith.me</span>
          <span>CC BY 4.0 · Diamond Open Access</span>
        </div>
      </div>
    ),
    size,
  );
}
