import { expect, test } from '@playwright/test';

test('mobile shortcuts reach search, saved items and menu, and yield to focused inputs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const dock = page.getByRole('navigation', { name: 'Mobile shortcuts' });
  await expect(dock).toBeVisible();
  await expect(dock.getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(dock.getByRole('link', { name: 'Saved' })).toHaveAttribute('href', '/bookmarks');
  await dock.getByRole('button', { name: 'Search articles and writers' }).click();
  await expect(page.getByRole('dialog', { name: 'Search Research With Me' })).toBeVisible();
  await expect(dock).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Search Research With Me' })).toHaveCount(0);
  await expect(dock).toBeVisible();
  await dock.getByRole('button', { name: /menu/i }).click();
  await expect(page.getByRole('navigation', { name: 'Mobile primary' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Settings', exact: true }).filter({ visible: true }).first()).toBeVisible();
});

test('mobile shortcuts stay above the page content at the bottom of the viewport', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const dock = page.getByRole('navigation', { name: 'Mobile shortcuts' });
  await expect(dock).toBeVisible();
  await page.waitForLoadState('networkidle');
  const blockers = await dock.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const result: string[] = [];
    for (let y = rect.top + 4; y < rect.bottom - 4; y += 8) {
      for (let x = rect.left + 4; x < rect.right - 4; x += 8) {
        const top = document.elementFromPoint(x, y);
        if (top && !element.contains(top)) result.push(top.tagName);
      }
    }
    return result;
  });
  expect(blockers).toEqual([]);
});
