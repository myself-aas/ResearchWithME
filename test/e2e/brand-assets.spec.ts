import { expect, test } from '@playwright/test';

test('brand and installed-app assets are served as files', async ({ request }) => {
  for (const path of ['/brand/wordmark.svg', '/brand/mark.svg', '/favicon.svg', '/favicon.ico', '/favicon-32x32.png', '/apple-touch-icon.png', '/site.webmanifest', '/android-chrome-192x192.png']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).not.toContain('text/html');
  }
});
