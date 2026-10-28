import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * iOS ignores SVG icons and fills transparency with black, so the π mark
 * from app/icon.svg is redrawn here as an opaque PNG touch icon. The glyph
 * is a vector path because the OG renderer only ships a sans font.
 */
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
          background: '#fafaf9',
        }}
      >
        <svg width="132" height="132" viewBox="0 0 100 100">
          <path
            fill="#78350f"
            d="M10 41 C12 30 19 23 31 23 L91 23 L91 35 L31 35 C24 35 19 37 16 43 Z M33 35 L46 35 C45 55 41 70 33 83 C30 88 22 88 21 83 C27 70 32 55 33 35 Z M62 35 L75 35 L75 71 C75 77 77 79 81 79 C84 79 86 77 88 72 L92 74 C89 83 83 88 75 88 C66 88 62 82 62 73 Z"
          />
        </svg>
      </div>
    ),
    size,
  );
}
