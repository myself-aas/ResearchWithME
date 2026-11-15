import { expect, test } from '@playwright/test';

test('the API example is keyboard-scrollable on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/api-docs');
  const example = page.locator('pre').first();
  await example.focus();
  await expect(example).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => example.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (element: Document, options: object) => Promise<{ violations: Array<{ id: string }> }> } }).axe;
    return (await axe.run(document, { runOnly: { type: 'rule', values: ['scrollable-region-focusable'] } })).violations;
  });
  expect(violations).toEqual([]);
});
