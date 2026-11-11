'use client';

import { useEffect } from 'react';
import type Lenis from 'lenis';

export function shouldEnableSmoothScroll(mql: Pick<MediaQueryList, 'matches'> | null): boolean {
  return Boolean(mql && !mql.matches);
}

export function focusHashTarget(root: Document, hash: string): HTMLElement | null {
  if (!hash || !hash.startsWith('#') || hash.length < 2) return null;
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    /* keep raw fragment */
  }
  const element = root.getElementById(id);
  if (!element) return null;
  if (!element.hasAttribute('tabindex') && element.tabIndex < 0) {
    element.setAttribute('tabindex', '-1');
  }
  element.focus({ preventScroll: true });
  return element;
}

export default function ArticleSmoothScroll(): null {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    let lenis: Lenis | null = null;
    let rafId = 0;
    let starting = false;
    let disposed = false;

    function stopLenis() {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (lenis) {
        lenis.destroy();
        lenis = null;
      }
    }

    function startLenis() {
      if (disposed || lenis || starting || !shouldEnableSmoothScroll(mql)) return;
      starting = true;
      void import('lenis')
        .then(({ default: LenisCtor }) => {
          starting = false;
          if (disposed || lenis || !shouldEnableSmoothScroll(mql)) return;
          const instance = new LenisCtor({
            duration: 0.85,
            smoothWheel: true,
            syncTouch: false,
          });
          lenis = instance;

          function raf(time: number) {
            if (disposed || !lenis) return;
            lenis.raf(time);
            rafId = window.requestAnimationFrame(raf);
          }
          rafId = window.requestAnimationFrame(raf);
        })
        .catch(() => {
          starting = false;
        });
    }

    function handleMotionChange() {
      if (shouldEnableSmoothScroll(mql)) {
        startLenis();
      } else {
        stopLenis();
      }
    }

    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const targetNode = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
      if (!(targetNode instanceof HTMLAnchorElement)) return;
      const hash = targetNode.getAttribute('href') ?? '';
      if (!hash || hash === '#') return;

      const resolved = focusHashTarget(document, hash);
      if (!resolved) return;

      event.preventDefault();
      if (window.history?.pushState) {
        window.history.pushState(null, '', hash);
      }
      if (lenis) {
        lenis.scrollTo(resolved, { offset: -96 });
      } else {
        resolved.scrollIntoView({ behavior: mql.matches ? 'auto' : 'smooth', block: 'start' });
      }
    }

    startLenis();
    mql.addEventListener?.('change', handleMotionChange);
    document.addEventListener('click', handleDocumentClick);

    return () => {
      disposed = true;
      stopLenis();
      mql.removeEventListener?.('change', handleMotionChange);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  return null;
}
