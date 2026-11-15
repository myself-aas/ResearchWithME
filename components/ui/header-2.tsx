'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useScroll } from '@/components/ui/use-scroll';

/** The compact, scroll-aware header shell. Navigation and account state stay with the caller. */
export function Header({ children, open = false }: { children: ReactNode; open?: boolean }) {
  const scrolled = useScroll(10);
  return (
    <header className={cn(
      'sticky top-0 z-40 mx-auto w-full border-b border-line bg-canvas/95 backdrop-blur-xs transition-[box-shadow,border-radius,max-width,top] duration-200 motion-reduce:transition-none',
      scrolled && !open && 'shadow-floating lg:top-3 lg:max-w-7xl lg:rounded-md lg:border',
    )}>
      {children}
    </header>
  );
}
