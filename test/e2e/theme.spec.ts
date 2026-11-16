import { expect, test } from '@playwright/test';

test('system theme follows OS while explicit choice persists across reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/settings');
  await page.getByRole('radio', { name: 'System' }).check();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'reme-dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'reme-light');
  await page.getByRole('radio', { name: 'Dark' }).check();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'reme-dark');
});

test('storage denial keeps an in-memory explicit choice usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } });
  });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/settings');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'reme-dark');
  await page.getByRole('radio', { name: 'Light' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'reme-light');
});

test('theme choices use consistent pill targets and remain keyboard operable', async ({ page }) => {
  await page.goto('/settings');
  const choices = page.getByRole('group', { name: 'Theme' });
  const labels = choices.locator('label');
  await expect(labels).toHaveCount(3);
  const heights = await labels.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
  expect(heights.every((height) => height >= 44 && height === heights[0])).toBe(true);
  for (const label of await labels.all()) {
    await expect(label).toHaveCSS('border-radius', '9999px');
  }
  const light = choices.getByRole('radio', { name: 'Light' });
  await light.focus();
  await page.keyboard.press('ArrowRight');
  await expect(choices.getByRole('radio', { name: 'Dark' })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'reme-dark');
  await page.reload();
  await expect(choices.getByRole('radio', { name: 'Dark' })).toBeChecked();
});
