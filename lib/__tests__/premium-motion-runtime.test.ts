import { beforeEach, expect, it, vi } from 'vitest';
import { startPremiumMotion } from '@/components/motion/premium-runtime';

const mocks = vi.hoisted(() => ({
  registerPlugin: vi.fn(), add: vi.fn(), remove: vi.fn(), revert: vi.fn(),
  config: vi.fn(), update: vi.fn(), refresh: vi.fn(),
  on: vi.fn(), raf: vi.fn(), destroy: vi.fn(), createLenis: vi.fn(),
}));

vi.mock('gsap', () => ({ gsap: {
  registerPlugin: mocks.registerPlugin,
  ticker: { add: mocks.add, remove: mocks.remove },
  context: (initialize: () => void) => { initialize(); return { revert: mocks.revert }; },
} }));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {
  config: mocks.config, update: mocks.update, refresh: mocks.refresh,
} }));
vi.mock('lenis', () => ({ default: vi.fn(function (options: unknown) {
  mocks.createLenis(options);
  return { on: mocks.on, raf: mocks.raf, destroy: mocks.destroy };
}) }));

beforeEach(() => vi.clearAllMocks());

it('removes the exact ticker callback and destroys only its own scroll runtime', () => {
  const cleanup = startPremiumMotion({ enableLenis: true, lenisOptions: { duration: 0.8 } });
  expect(mocks.createLenis).toHaveBeenCalledWith(expect.objectContaining({ duration: 0.8 }));
  expect(mocks.on).toHaveBeenCalledWith('scroll', mocks.update);
  expect(mocks.refresh).toHaveBeenCalledOnce();
  const tick = mocks.add.mock.calls[0][0] as (seconds: number) => void;
  tick(2);
  expect(mocks.raf).toHaveBeenCalledWith(2000);
  cleanup();
  expect(mocks.remove).toHaveBeenCalledWith(tick);
  expect(mocks.revert).toHaveBeenCalledOnce();
  expect(mocks.destroy).toHaveBeenCalledOnce();
});

it('does not create a smooth-scroll instance when disabled', () => {
  const cleanup = startPremiumMotion({ enableLenis: false, lenisOptions: {} });
  expect(mocks.createLenis).not.toHaveBeenCalled();
  expect(mocks.add).not.toHaveBeenCalled();
  cleanup();
  expect(mocks.destroy).not.toHaveBeenCalled();
  expect(mocks.revert).toHaveBeenCalledOnce();
});
