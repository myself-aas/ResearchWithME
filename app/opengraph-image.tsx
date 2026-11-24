import { ImageResponse } from 'next/og';
import { semanticLight } from '@/tokens/generated/tokens';
import { SITE } from '@/lib/site';

export const alt = 'ResearchWithMe — essays on research and open code';
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
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' }}>reme.</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, letterSpacing: '-0.03em', maxWidth: 960, fontWeight: 700 }}>
            Open science, reviewed in public.
          </div>
          <div style={{ fontSize: 28, color: semanticLight['text-secondary'], maxWidth: 900 }}>
            Essays on research papers, open-source repositories, and reproducible work.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 24,
            color: semanticLight['text-secondary'],
          }}
        >
          <span>{SITE.url.replace(/^https?:\/\//, '')}</span>
          <span>{SITE.license} · No paywall</span>
        </div>
      </div>
    ),
    size,
  );
}
