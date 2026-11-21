'use client';

/**
 * PremiumMotionProvider — Initializes GSAP + ScrollTrigger + Lenis for premium scroll narratives.
 *
 * This provider:
 * - Registers GSAP ScrollTrigger plugin
 * - Initializes Lenis smooth scroll (optional, can be disabled)
 * - Provides reduced-motion guards at the app level
 * - Exposes GSAP context for cleanup on unmount
 *
 * Usage: Wrap app layout children (already done in app/layout.tsx)
 */

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { prefersReducedMotion } from '@/lib/motion/tokens';
import MotionModeProvider from './MotionModeProvider';
import MotionScope from './MotionScope';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

interface PremiumMotionProviderProps {
  children: React.ReactNode;
  /** Enable Lenis smooth scroll. Default: true */
  enableLenis?: boolean;
  /** Lenis options. See Lenis docs for full options. */
  lenisOptions?: ConstructorParameters<typeof Lenis>[0];
}

export default function PremiumMotionProvider({
  children,
  enableLenis = true,
  lenisOptions = {},
}: PremiumMotionProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const gsapContextRef = useRef<ReturnType<typeof gsap.context> | null>(null);
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    // Skip all premium motion initialization if reduced motion is preferred
    if (reducedMotion) {
      return;
    }

    // Create GSAP context for automatic cleanup
    gsapContextRef.current = gsap.context(() => {
      // ScrollTrigger configuration
      ScrollTrigger.config({
        limitCallbacks: true, // Prevent callback storms
        ignoreMobileResize: true, // Don't refresh on mobile resize
      });

      // Initialize Lenis smooth scroll
      if (enableLenis) {
        const lenis = new Lenis({
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Custom ease matching reme tokens
          touchMultiplier: 2,
          infinite: false,
          ...lenisOptions,
        });

        lenisRef.current = lenis;

        // Connect Lenis to ScrollTrigger
        lenis.on('scroll', ScrollTrigger.update);

        // GSAP tick drives Lenis
        gsap.ticker.add((time) => {
          lenis.raf(time * 1000);
        });

        // Disable GSAP's lag smoothing for smooth scroll
        gsap.ticker.lagSmoothing(0);
      }

      // Refresh ScrollTrigger on layout changes
      ScrollTrigger.refresh();
    });

    // Cleanup function
    return () => {
      // Kill all ScrollTriggers
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

      // Revert GSAP context (kills animations, clears inline styles)
      gsapContextRef.current?.revert();

      // Destroy Lenis
      lenisRef.current?.destroy();
      lenisRef.current = null;

      // Clear GSAP ticker
      gsap.ticker.remove(() => {});
    };
  }, [enableLenis, lenisOptions, reducedMotion]);

  // Provide reduced-motion class to html for CSS fallbacks
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (reducedMotion) {
        document.documentElement.classList.add('reduced-motion');
      } else {
        document.documentElement.classList.remove('reduced-motion');
      }
    }
  }, [reducedMotion]);

  return (
    <MotionModeProvider>
      <MotionScope>
        {children}
      </MotionScope>
    </MotionModeProvider>
  );
}

// Export Lenis instance for advanced usage (e.g., scrollTo)
export function getLenisInstance(): Lenis | null {
  // This will be set after the first render
  // Use in client components via useEffect
  return null;
}