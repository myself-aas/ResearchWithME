import { expect, test } from '@playwright/test';

test('a clipboard failure preserves the answer without retrying the research request', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/research-assistant', async (route) => {
    requests += 1;
    await route.fulfill({ json: { answer: 'An evidence-based answer.', citations: [] } });
  });
  await page.addInitScript(() => {
    let attempts = 0;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async () => { if (++attempts === 1) throw new Error('Clipboard denied'); },
    } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/assistant');
  await page.getByRole('button', { name: /How does vLLM/ }).click();
  await expect(page.getByText('An evidence-based answer.')).toBeVisible();
  const copy = page.getByRole('button', { name: 'Copy answer' });
  await copy.click();
  await expect(page.getByRole('alert')).toContainText('Clipboard access was blocked');
  await expect(page.getByText('The request did not complete.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  await expect(page.getByText('An evidence-based answer.')).toBeVisible();
  await copy.click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(requests).toBe(1);
});
