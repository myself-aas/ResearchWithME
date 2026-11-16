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

test('a failed request retains the question, retries once, and rejects an empty response', async ({ page }) => {
  let requests = 0;
  const bodies: string[] = [];
  await page.route('**/api/research-assistant', async (route) => {
    requests += 1;
    bodies.push(route.request().postData() || '');
    if (requests === 1) await route.fulfill({ status: 500, json: { error: 'Service unavailable' } });
    else if (requests === 2) await route.fulfill({ json: { answer: 'A recovered answer.', citations: [] } });
    else await route.fulfill({ json: { answer: '   ', citations: [] } });
  });
  await page.goto('/assistant');
  await page.getByRole('button', { name: /How does vLLM/ }).click();
  await expect(page.getByRole('alert')).toContainText('Service unavailable');
  const query = page.getByRole('textbox', { name: 'Question' });
  await expect(query).toHaveValue(/PagedAttention/);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('A recovered answer.')).toBeVisible();
  expect(bodies[0]).toEqual(bodies[1]);
  await page.getByRole('button', { name: 'Ask the archive' }).click();
  await expect(page.getByRole('alert')).toContainText('empty answer');
  expect(requests).toBe(3);
});
