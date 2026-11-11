/**
 * Motion feature bundle — loaded on demand.
 *
 * `MotionScope` imports this module through a dynamic `import()`, so the
 * `domMax` feature code (layout + drag + animations, ~12 KB gzip) lands in its
 * own chunk instead of the app shell. That keeps §18's 200 KB shell budget
 * intact while every surface still gets the full feature set after hydration.
 *
 * Trade-off, documented in docs/motion-system.md: an element that mounts in
 * the first frame — before the chunk resolves — does not adopt its hidden
 * pose, so it appears at rest instead of animating in. Content is never
 * hidden waiting for JavaScript, which is the contract that matters.
 */
export { domMax as default } from 'motion/react';
