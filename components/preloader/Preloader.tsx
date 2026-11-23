'use client';

/**
 * Preloader — Full-screen entry sequence with brand mark animation and asset loading.
 *
 * Principles: anticipation (staged reveal), staging (sequential entrance),
 * appeal (brand mark draw), slow in/out (custom easings).
 *
 * Flow:
 * 1. Brand mark SVG path draws (0-600ms)
 * 2. Wordmark fades in (400-800ms)
 * 3. Progress bar animates (600-1400ms) — tracks font + hero image loads
 * 4. Split-door exit reveal (1400-2000ms)
 *
 * Reduced motion: instant hide, no animation
 * Accessibility: aria-busy, role="status", screen-reader announcements
 */

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { prefersReducedMotion, GSAP_EASING } from '@/lib/motion/tokens';

interface PreloaderProps {
  /** Minimum display time in ms (prevents flash on fast loads) */
  minDisplayTime?: number;
  /** Callback when preloader completes */
  onComplete?: () => void;
}

export default function Preloader({
  minDisplayTime = 800,
  onComplete,
}: PreloaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const animationRef = useRef<gsap.core.Timeline | null>(null);
  const brandMarkRef = useRef<SVGPathElement>(null);
  const wordmarkRef = useRef<HTMLSpanElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const leftDoorRef = useRef<HTMLDivElement>(null);
  const rightDoorRef = useRef<HTMLDivElement>(null);
  const reducedMotion = prefersReducedMotion();

  // Track critical asset loading
  useEffect(() => {
    let mounted = true;
    let loadedCount = 0;
    const totalAssets = 2; // font + hero image

    const checkComplete = () => {
      loadedCount++;
      if (mounted) {
        setProgress((loadedCount / totalAssets) * 100);
        if (loadedCount >= totalAssets) {
          setAssetsLoaded(true);
        }
      }
    };

    // Font load (Plus Jakarta Sans)
    if (document.fonts) {
      document.fonts.ready.then(() => {
        if (mounted) checkComplete();
      });
    } else {
      // Fallback for older browsers
      setTimeout(() => { if (mounted) checkComplete(); }, 100);
    }

    // Hero image load
    const heroImg = new Image();
    heroImg.src = '/images/discovery-research.webp';
    if (heroImg.complete) {
      checkComplete();
    } else {
      heroImg.onload = () => { if (mounted) checkComplete(); };
      heroImg.onerror = () => { if (mounted) checkComplete(); };
    }

    return () => { mounted = false; };
  }, []);

  // Animation timeline
  useEffect(() => {
    if (reducedMotion) {
      // Instant hide for reduced motion
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, minDisplayTime);
      return () => clearTimeout(timer);
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          const elapsed = Date.now() - startTimeRef.current;
          const remaining = Math.max(0, minDisplayTime - elapsed);
          setTimeout(() => {
            // Split-door exit
            gsap.to([leftDoorRef.current, rightDoorRef.current], {
              x: (i) => i === 0 ? '-100%' : '100%',
              duration: 0.6,
              ease: GSAP_EASING.standard,
              stagger: 0.05,
              onComplete: () => {
                setIsVisible(false);
                onComplete?.();
              },
            });
          }, remaining);
        },
      });

      // 1. Brand mark path draw (0-600ms)
      if (brandMarkRef.current) {
        const path = brandMarkRef.current;
        const length = path.getTotalLength();
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
        });
        tl.to(path, {
          strokeDashoffset: 0,
          duration: 0.6,
          ease: GSAP_EASING.enter,
        });
      }

      // 2. Wordmark fade in (400-800ms)
      tl.to(wordmarkRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: GSAP_EASING.enter,
      }, 0.4);

      // 3. Progress bar (600-1400ms) - driven by asset loading
      // We'll animate to 100% when assetsLoaded becomes true
      const progressTween = tl.to(progressBarRef.current, {
        scaleX: 1,
        duration: 0.8,
        ease: GSAP_EASING.standard,
      }, 0.6);

      // Watch for assets loaded
      const checkAssets = () => {
        if (assetsLoaded && progressTween.progress() < 1) {
          progressTween.progress(1);
        } else if (!assetsLoaded) {
          requestAnimationFrame(checkAssets);
        }
      };
      requestAnimationFrame(checkAssets);

      animationRef.current = tl;
    });

    return () => {
      ctx.revert();
    };
  }, [assetsLoaded, minDisplayTime, onComplete, reducedMotion]);

  if (!isVisible || reducedMotion) return null;

  return (
    <div
      id="preloader"
      role="status"
      aria-busy="true"
      aria-label="Loading ResearchWithMe"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-canvas"
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Split doors for exit animation */}
      <div
        ref={leftDoorRef}
        className="fixed inset-0 bg-canvas z-10"
        style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}
        aria-hidden="true"
      />
      <div
        ref={rightDoorRef}
        className="fixed inset-0 bg-canvas z-10"
        style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center gap-6 text-center">
        {/* Brand mark — SVG path draw animation */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="text-brand"
        >
          <path
            ref={brandMarkRef}
            d="M40 10 C23.43 10 10 23.43 10 40 C10 56.57 23.43 70 40 70 C56.57 70 70 56.57 70 40 C70 23.43 56.57 10 40 10 Z"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="50%"
            y="55%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontSize="28"
            fontWeight="600"
            fill="currentColor"
            className="reme-wordmark"
          >
            reme.
          </text>
        </svg>

        {/* Wordmark — fades in after brand mark */}
        <span
          ref={wordmarkRef}
          className="font-serif text-2xl font-semibold text-ink opacity-0 translate-y-4"
          style={{ fontFamily: 'var(--font-serif)' }}
          aria-hidden="true"
        >
          ResearchWithMe
        </span>

        {/* Progress bar — tracks asset loading */}
        <div className="w-64 h-1 bg-surface-subtle rounded-full overflow-hidden" role="progressbar" aria-label="Loading assets" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div
            ref={progressBarRef}
            className="h-full bg-brand rounded-full transform origin-left"
            style={{ transformOrigin: 'left center', transform: 'scaleX(0)' }}
          />
        </div>

        {/* Screen reader announcement */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {assetsLoaded ? 'Loading complete. Entering site.' : `Loading assets: ${Math.round(progress)}%`}
        </div>
      </div>
    </div>
  );
}