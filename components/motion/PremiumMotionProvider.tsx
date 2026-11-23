'use client';

import { useEffect, type ReactNode } from 'react';
import type Lenis from 'lenis';
import MotionModeProvider, { useMotionMode } from './MotionModeProvider';
import MotionScope from './MotionScope';

interface PremiumMotionOptions {
  enableLenis?: boolean;
  lenisOptions?: ConstructorParameters<typeof Lenis>[0];
}

interface PremiumMotionProviderProps extends PremiumMotionOptions {
  children: ReactNode;
}

const DEFAULT_LENIS_OPTIONS = {};

/** Keep optional scroll engines out of the initial reading shell. */
function PremiumMotionRuntime({ enableLenis = true, lenisOptions = DEFAULT_LENIS_OPTIONS }: PremiumMotionOptions) {
  const { suppressed } = useMotionMode();

  useEffect(() => {
    if (suppressed) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    import('./premium-runtime').then(({ startPremiumMotion }) => {
      if (!disposed) cleanup = startPremiumMotion({ enableLenis, lenisOptions });
    }).catch(() => {
      // Native scrolling remains available if the optional runtime cannot load.
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [enableLenis, lenisOptions, suppressed]);

  return null;
}

export default function PremiumMotionProvider({ children, ...options }: PremiumMotionProviderProps) {
  return (
    <MotionModeProvider>
      <MotionScope>
        <PremiumMotionRuntime {...options} />
        {children}
      </MotionScope>
    </MotionModeProvider>
  );
}
