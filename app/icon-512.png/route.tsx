import { ImageResponse } from 'next/og';

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
        <svg width="340" height="340" viewBox="0 0 100 100">
          <path
            fill="#0F766E"
            d="M10 41 C12 30 19 23 31 23 L91 23 L91 35 L31 35 C24 35 19 37 16 43 Z M33 35 L46 35 C45 55 41 70 33 83 C30 88 22 88 21 83 C27 70 32 55 33 35 Z M62 35 L75 35 L75 71 C75 77 77 79 81 79 C84 79 86 77 88 72 L92 74 C89 83 83 88 75 88 C66 88 62 82 62 73 Z"
          />
        </svg>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
