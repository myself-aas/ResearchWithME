import { ImageResponse } from 'next/og';

// Non-italic pi symbol (U+1D70B MATHEMATICAL SANS-SERIF BOLD SMALL PI)
const piSymbol = '𝜋';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAF9F6',
        }}
      >
        <span style={{ fontSize: 120, fontWeight: 700, color: '#1D4ED8', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
          {piSymbol}
        </span>
      </div>
    ),
    { width: 192, height: 192 },
  );
}
