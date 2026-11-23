import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

interface PremiumMotionOptions {
  enableLenis: boolean;
  lenisOptions: ConstructorParameters<typeof Lenis>[0];
}

/** Loaded after hydration, only when the reader permits motion. */
export function startPremiumMotion({ enableLenis, lenisOptions }: PremiumMotionOptions): () => void {
  gsap.registerPlugin(ScrollTrigger);
  let lenis: Lenis | undefined;
  const tick = (seconds: number) => lenis?.raf(seconds * 1000);

  const context = gsap.context(() => {
    ScrollTrigger.config({ limitCallbacks: true, ignoreMobileResize: true });
    if (enableLenis) {
      lenis = new Lenis({
        duration: 1.2,
        easing: (time) => Math.min(1, 1.001 - Math.pow(2, -10 * time)),
        touchMultiplier: 2,
        infinite: false,
        ...lenisOptions,
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(tick);
    }
    ScrollTrigger.refresh();
  });

  return () => {
    gsap.ticker.remove(tick);
    context.revert();
    lenis?.destroy();
  };
}
