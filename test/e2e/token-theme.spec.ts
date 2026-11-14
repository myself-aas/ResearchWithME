import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.resolve('tokens/generated/tokens.css'), 'utf8');

for (const card of ['source', 'evidence', 'claim']) {
  test(`${card} component aliases follow live light and dark semantic values`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setContent(`<style>${css}</style><div id="card" style="background:var(--reme-component-${card}-card-background)">Evidence</div>`);
    const cardElement = page.locator('#card');
    await expect(cardElement).toHaveCSS('background-color', 'rgb(243, 241, 236)');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await expect(cardElement).toHaveCSS('background-color', 'rgb(20, 22, 27)');
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await expect(cardElement).toHaveCSS('background-color', 'rgb(243, 241, 236)');
  });
}
