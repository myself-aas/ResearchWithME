import { expect, test } from '@playwright/test';

test('system theme follows OS while explicit choice persists across reload and controls', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const themes = page.getByRole('combobox', { name: 'Theme', exact: true });
  await themes.first().selectOption('system');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await themes.first().selectOption('dark');
  await expect(themes.last()).toHaveValue('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(themes.first()).toHaveValue('dark');
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('storage denial keeps system preference and an in-memory explicit choice usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } });
  });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  const themes = page.getByRole('combobox', { name: 'Theme', exact: true });
  await themes.first().selectOption('light');
  await expect(page.locator('html')).toHaveClass(/light/);
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect(themes.last()).toHaveValue('light');
});
