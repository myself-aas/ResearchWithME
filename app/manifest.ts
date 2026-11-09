import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ResearchWithMe — Open Scholarly Publishing',
    short_name: 'ResearchWithMe',
    description: 'Open-access research reviews, reproducible papers, and repository teardowns.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8F7F3',
    theme_color: '#4F46E5',
    lang: 'en',
    categories: ['education', 'books', 'productivity'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
