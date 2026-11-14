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

for (const variant of ['emerging', 'uncertain']) {
  for (const theme of ['light', 'dark']) {
    test(`${variant} badge browser-composited text contrast passes in ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme as 'light' | 'dark' });
      await page.setContent(`<style>${css}</style>${['canvas', 'surface', 'surface-raised'].map((surface) => `<div style="background:var(--reme-${surface})"><span class="badge" style="color:var(--reme-domain-text-${variant});background:color-mix(in oklab,var(--reme-trust-${variant}) 10%,transparent)">${variant === 'emerging' ? 'Emerging consensus' : 'Uncertain'}</span></div>`).join('')}`);
      for (const badge of await page.locator('.badge').all()) {
        await expect(badge).toBeVisible();
        const contrast = await badge.evaluate((element) => {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const context = canvas.getContext('2d')!;
          const sample = (color: string, backdrop: string) => {
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = backdrop;
            context.fillRect(0, 0, 1, 1);
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
          };
          const style = getComputedStyle(element);
          const base = getComputedStyle(element.parentElement!).backgroundColor;
          const background = sample(style.backgroundColor, base);
          const foreground = sample(style.color, base);
          const luminance = (rgb: number[]) => rgb.map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
          const [hi, lo] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
          return (hi + 0.05) / (lo + 0.05);
        });
        expect(contrast).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
}
