import { expect, test } from '@playwright/test';
import { makeTestArticle } from '../fixtures/articles';

const articles = [
  makeTestArticle({ id: 'fixture-one', slug: 'fixture-one', title: 'Fixture alpha review' }),
  makeTestArticle({ id: 'fixture-two', slug: 'fixture-two', title: 'Fixture beta review' }),
  makeTestArticle({ id: 'fixture-three', slug: 'fixture-three', title: 'Fixture gamma review' }),
];


const publicLayoutRoutes = [
  '/',
  '/authors',
  '/about',
  '/privacy',
  '/api-docs',
  '/contact',
  '/editorial-board',
  '/assistant',
  '/bookmarks',
  '/cite',
] as const;

test('public page families render one main landmark without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  for (const route of publicLayoutRoutes) {
    const response = await page.goto(route);
    expect(response?.status(), `${route} response`).toBe(200);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('main')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `${route} should not overflow horizontally at 1440px`,
    ).toBe(true);
  }
});

test('representative templates reflow and preserve reading measure at required widths', async ({ page }) => {
  const cases = [
    { route: '/', heading: 'Research you can read, check, and reuse.' },
    { route: '/about', heading: 'About ResearchWithMe' },
    { route: '/privacy', heading: 'Privacy Policy' },
    { route: '/api-docs', heading: 'ResearchWithMe API' },
    { route: '/authors', heading: 'The reviewers behind the archive' },
    { route: '/assistant', heading: 'Ask the archive a question' },
  ];

  for (const width of [320, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const { route, heading } of cases) {
      await page.goto(route);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      const overflow = await page.evaluate(() => ({
        safe: document.documentElement.scrollWidth <= window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        offenders: [...document.querySelectorAll<HTMLElement>('body *')]
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === 'string' ? element.className : '',
            text: element.innerText?.slice(0, 60) ?? '',
            left: Math.round(element.getBoundingClientRect().left),
            right: Math.round(element.getBoundingClientRect().right),
          }))
          .filter((element) => element.right > window.innerWidth + 1 || element.left < -1)
          .slice(0, 8),
      }));
      expect(overflow.safe, `${route} horizontal overflow at ${width}px: ${JSON.stringify(overflow)}`).toBe(true);

      const reading = page.locator('[data-layout-content="reading"]');
      if (await reading.count()) {
        await expect(reading).toBeVisible();
        const readingWidth = await reading.evaluate((element) => element.getBoundingClientRect().width);
        expect(readingWidth, `${route} reading measure at ${width}px`).toBeLessThanOrEqual(768);
      }

      const rail = page.locator('[data-layout-rail="section-navigation"]');
      if (['/about', '/privacy', '/api-docs'].includes(route)) {
        await expect(rail).toBeVisible();
        const railBox = await rail.boundingBox();
        const readingBox = await reading.boundingBox();
        expect(railBox).not.toBeNull();
        expect(readingBox).not.toBeNull();
        if (width < 1024) {
          expect(railBox!.y + railBox!.height).toBeLessThanOrEqual(readingBox!.y + 1);
        } else {
          expect(railBox!.x).toBeGreaterThanOrEqual(readingBox!.x + readingBox!.width);
          expect(railBox!.y).toBeLessThan(readingBox!.y + readingBox!.height);
        }
      }
    }
  }
});

test('article_and_author_cards_use_three_columns_only_at_xl', async ({ page }) => {
  await page.route('**/api/articles', (route) => route.fulfill({ json: { articles } }));
  for (const width of [1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const articleGrid = page.locator('[data-layout-grid="article-cards"]');
    await expect(articleGrid).toBeVisible();
    const articleColumns = await articleGrid.evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(' ').length,
    );
    expect(articleColumns, `article columns at ${width}px`).toBe(width < 1280 ? 2 : 3);

    await page.goto('/authors');
    const authorGrid = page.locator('[data-layout-grid="author-cards"]');
    if (await authorGrid.count()) {
      await expect(authorGrid).toBeVisible();
      const authorColumns = await authorGrid.evaluate((element) =>
        getComputedStyle(element).gridTemplateColumns.split(' ').length,
      );
      expect(authorColumns, `author columns at ${width}px`).toBe(width < 1280 ? 2 : 3);
    } else {
      // This environment may not have published profile data wired into Pages.
      await expect(page.getByRole('heading', { name: 'No published contributors yet' })).toBeVisible();
    }
  }
});

test('filtering article results resolves to matching and empty states', async ({ page }) => {
  await page.route('**/api/articles', (route) => route.fulfill({ json: { articles } }));
  await page.goto('/');
  const grid = page.locator('[data-layout-grid="article-cards"]');
  await expect(grid.locator('> li')).toHaveCount(3);
  const search = page.getByRole('searchbox', { name: 'Search reviews by keyword, writer, or repository' });
  await search.fill('beta');
  await expect(grid.locator('> li')).toHaveCount(1);
  await expect(grid.getByRole('heading', { name: 'Fixture beta review' })).toBeVisible();
  await expect.poll(() => grid.evaluate((element) => element.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length)).toBe(0);
  await search.fill('no such fixture');
  await expect(page.getByRole('heading', { name: 'No articles match these filters.' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(grid.locator('> li')).toHaveCount(3);
});

test('retired archive routes return 404', async ({ request }) => {
  for (const path of ['/papers', '/paper/retired', '/editions']) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

test('section_navigation_remains_visible_and_operable_with_reduced_motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const [route, targetId, count] of [['/about', 'mission-heading', 5], ['/privacy', 'principles-heading', 4]] as const) {
    await page.goto(route);
    const rail = page.locator('[data-layout-rail="section-navigation"]');
    const reading = page.locator('[data-layout-content="reading"]');
    await expect(rail).toBeVisible();
    await expect(reading).toBeVisible();
    const links = rail.getByRole('link');
    await expect(links).toHaveCount(count);
    for (let index = 0; index < count; index += 1) await expect(links.nth(index)).toBeVisible();

    let targetFocused = false;
    for (let index = 0; index < 30; index += 1) {
      await page.keyboard.press('Tab');
      const activeHref = await page.evaluate(() => document.activeElement?.getAttribute('href'));
      if (activeHref === `#${targetId}`) {
        targetFocused = true;
        break;
      }
    }
    expect(targetFocused, `${route} section link should be keyboard reachable`).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`#${targetId}$`));
    // Reduced-motion CSS uses a near-zero duration rather than literally zero;
    // allow those brief transitions while rejecting visible-duration animation.
    const durations = await rail.evaluate((element) =>
      element.getAnimations({ subtree: true })
        .filter((animation) => animation.playState === 'running')
        .map((animation) => Number(animation.effect?.getComputedTiming().duration ?? 0)),
    );
    expect(durations.every((duration) => duration <= 1)).toBe(true);
  }
});
