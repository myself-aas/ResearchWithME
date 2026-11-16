import { expect, test } from '@playwright/test';

test('mobile navigation stays available in the header without a bottom dock', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Mobile shortcuts' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Search articles and writers (⌘K)' }).click();
  await expect(page.getByRole('dialog', { name: 'Search Research With Me' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Mobile primary' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Reading list', exact: true }).filter({ visible: true }).first()).toHaveAttribute('href', '/bookmarks');
});
