import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'πeme — open-access research reviews',
    short_name: 'πeme',
    description: 'Reviews of published papers and open repositories, with the method and the code checked.',
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
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
