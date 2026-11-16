import { BRAND_WORDMARK_DATA } from '@/lib/og/logo-data';
import { ImageResponse } from 'next/og';
import { semanticLight } from '@/tokens/generated/tokens';

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
          background: semanticLight.canvas,
          color: semanticLight['text-primary'],
          padding: '72px 84px',
          borderTop: `18px solid ${semanticLight.action.primary}`,
          fontFamily: 'ui-serif, Georgia, serif',
        }}
      >
        <img src={BRAND_WORDMARK_DATA} width={200} height={119} alt="ResearchWithMe" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 72, lineHeight: 1.05, letterSpacing: '-0.03em', maxWidth: 940 }}>
            Open science, reviewed in public.
          </div>
          <div style={{ fontSize: 30, color: semanticLight['text-secondary'], fontFamily: 'Inter, system-ui, sans-serif' }}>
            Article reviews · reproducible research · repository teardowns
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 24, color: semanticLight['text-secondary'] }}>
          <span>researchwith.me</span>
          <span>CC BY 4.0 · Open access</span>
        </div>
      </div>
    ),
    size,
  );
}
