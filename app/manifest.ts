import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ResearchWithMe — Open Scholarly Publishing',
    short_name: 'ResearchWithMe',
    description: 'Open-access research reviews, reproducible papers, and repository teardowns.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafaf9',
    theme_color: '#78350f',
    lang: 'en',
    categories: ['education', 'books', 'productivity'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
