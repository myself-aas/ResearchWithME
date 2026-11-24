'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Reading progress bar.
 *
 * Deliberately dependency-free: one passive scroll listener, one
 * requestAnimationFrame per frame, and a composited transform. It updates
 * `aria-valuenow` only when the rounded percentage changes, so assistive tech
 * is not spammed every frame.
 */
export default function ReadingProgress() {
  const [percent, setPercent] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    function update() {
      frame.current = null;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const next = scrollable > 0 ? Math.round((window.scrollY / scrollable) * 100) : 0;
      setPercent(Math.min(100, Math.max(0, next)));
    }

    function schedule() {
      if (frame.current === null) frame.current = window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 print:hidden"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div
        aria-hidden="true"
        className="h-full origin-left bg-brand"
        style={{ transform: `scaleX(${percent / 100})` }}
      />
    </div>
  );
}
