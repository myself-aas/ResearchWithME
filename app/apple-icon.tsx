import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * iOS ignores SVG icons and fills transparency with black, so the π mark
 * from app/icon.svg is redrawn here as an opaque PNG touch icon. The glyph
 * uses the non-italic pi symbol (U+1D70B MATHEMATICAL SANS-SERIF BOLD SMALL PI).
 */
const piSymbol = '𝜋';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F8F7F3',
        }}
      >
        <span style={{ fontSize: 120, fontWeight: 700, color: '#1D4ED8', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
          {piSymbol}
        </span>
      </div>
    ),
    size,
  );
}
