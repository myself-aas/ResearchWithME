import type { MetadataRoute } from 'next';
import { semanticLight } from '@/tokens/generated/tokens';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ResearchWithMe — Open Scholarly Publishing',
    short_name: 'ResearchWithMe',
    description: 'Open-access research reviews, reproducible papers, and repository teardowns.',
    start_url: '/',
    display: 'standalone',
    // Install splash and OS chrome. A manifest is static at runtime, so it
    // cannot read a CSS variable; importing the generated tokens keeps it on
    // the same values as the app instead of a second copy of the palette.
    background_color: semanticLight.canvas,
    theme_color: semanticLight.action.primary,
    lang: 'en',
    categories: ['education', 'books', 'productivity'],
    // Two deliberate artworks: the monogram where the icon renders small
    // (browser chrome, home screen), the wordmark where it renders large
    // (install prompt, launcher). Both are the same brand mark, so the set is
    // consistent even though the lockup differs.
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
