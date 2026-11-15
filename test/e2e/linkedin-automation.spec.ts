import { test, expect } from '@playwright/test';

test.describe('LinkedIn Admin Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@researchwith.me');
    await page.fill('[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('admin can connect LinkedIn account', async ({ page }) => {
    await page.goto('/admin/linkedin');
    
    // Click connect button
    await page.click('button:has-text("Connect LinkedIn")');
    
    // Should redirect to LinkedIn OAuth
    await expect(page).toHaveURL(/linkedin\.com\/oauth/);
  });

  test('admin can manually post article', async ({ page }) => {
    await page.goto('/admin/linkedin');
    
    // Select article from dropdown
    await page.selectOption('select[name="articleSlug"]', 'inside-vllm-and-paged-attention');
    
    // Click post button
    await page.click('button:has-text("Post to LinkedIn")');
    
    // Wait for success toast
    await expect(page.locator('text=Successfully posted to LinkedIn')).toBeVisible({ timeout: 10000 });
  });

  test('shows LinkedIn posting status', async ({ page }) => {
    await page.goto('/admin/linkedin');
    
    // Check status cards
    await expect(page.locator('text=LinkedIn Status')).toBeVisible();
    await expect(page.locator('text=Connected')).toBeVisible(); // or "Not Connected"
  });
});