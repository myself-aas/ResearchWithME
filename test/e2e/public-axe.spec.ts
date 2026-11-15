import { expect, test } from '@playwright/test';

// Automated checks complement, but do not replace, keyboard and screen-reader review.
const routes = ['/', '/authors', '/editorial-board', '/assistant', '/bookmarks', '/cite', '/api-docs', '/about', '/contact', '/privacy', '/settings', '/category/research-reviews', '/post/nonexistent'];

for (const width of [390, 1440]) {
  for (const route of routes) {
    test(`public WCAG axe scan at ${width}px: ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const response = await page.goto(route, { waitUntil: 'networkidle' });
      expect(response?.status()).toBe(route === '/post/nonexistent' ? 404 : 200);
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => {
        const axe = (window as unknown as { axe: { run: (element: Document, options: object) => Promise<{ violations: unknown[] }> } }).axe;
        return (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations;
      });
      expect(violations).toEqual([]);
    });
  }
}
