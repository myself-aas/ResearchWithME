'use client';

import dynamic from 'next/dynamic';

// Decorative entry animation must not block SSR or load GSAP in the shell.
export const Preloader = dynamic(() => import('./Preloader'), { ssr: false });
