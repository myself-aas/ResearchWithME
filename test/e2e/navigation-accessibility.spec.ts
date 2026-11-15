import { expect, test } from '@playwright/test';

for (const width of [320, 768, 1024, 1440]) {
  test(`skip_link_bypasses_chrome_and_sign_in_is_named at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const assertMain = async () => {
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('#main-content')).toHaveCount(1);
      await page.keyboard.press('Tab');
      const skip = page.getByRole('link', { name: 'Skip to main content' });
      await expect(skip).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('main#main-content')).toBeFocused();
    };
    await assertMain();
    if (width === 768 || width === 1024) {
      await expect(page.getByRole('link', { name: 'Sign in', exact: true }).filter({ visible: true })).toHaveCount(1);
    }
    await page.getByRole('link', { name: /Research Reviews/ }).first().click();
    await expect(page).toHaveURL(/\/category\/research-reviews/);
    // Focus the persistent skip link explicitly after client navigation; tab
    // order may resume at the category link that initiated the navigation.
    await page.getByRole('link', { name: 'Skip to main content' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#main-content')).toBeFocused();
    await expect(page.locator('#main-content')).toHaveCount(1);
  });
}

const routes = ['/cite', '/authors', '/about', '/privacy', '/api-docs', '/editorial-board', '/not-a-route'];
if (process.env.RWM_TEST_NEXT) routes.push('/login', '/dashboard/access', '/dashboard/account');
for (const route of routes) {
  test(`one focusable main in ${route}`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(route === '/not-a-route' ? 404 : 200);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('#main-content')).toHaveCount(1);
    await expect(page.locator('main#main-content')).toHaveAttribute('tabindex', '-1');
  });
}
