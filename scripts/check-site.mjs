#!/usr/bin/env node
/**
 * Post-build definition-of-done check.
 *
 * Everything here is asserted against the artifacts that actually ship —
 * `.next/server/app` (prerendered HTML), `.next/static` (JS/CSS) and the
 * generated feeds — not against the source that was supposed to produce them.
 * That is the only way to catch the failure mode where the code looks right
 * and the page still ships without its content, canonical, or structured data.
 *
 * Run after `npm run build`: `npm run check:site`.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.cwd();
const APP = path.join(ROOT, '.next', 'server', 'app');
const STATIC_DIR = path.join(ROOT, '.next', 'static');
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://researchwith.me').replace(/\/$/, '');

const failures = [];
const checks = [];

function fail(message) {
  failures.push(message);
}
function pass(message) {
  checks.push(message);
}
function assert(condition, message) {
  if (condition) pass(message);
  else fail(message);
}

if (!fs.existsSync(APP)) {
  console.error('No build found at .next/server/app — run `npm run build` first.');
  process.exit(1);
}

/* ------------------------------------------------------------------ helpers */

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function routeOf(file) {
  const rel = path.relative(APP, file).split(path.sep).join('/').replace(/\.html$/, '');
  if (rel === 'index') return '/';
  return `/${rel}`;
}

const htmlFiles = walk(APP).filter((file) => file.endsWith('.html'));
const pages = htmlFiles.map((file) => {
  const html = fs.readFileSync(file, 'utf8');
  return { file, route: routeOf(file), html, isError: path.basename(file).startsWith('_not-found') };
});

const pageByRoute = new Map(pages.map((page) => [page.route, page]));

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'));
  return match ? match[1] : undefined;
}

function metaContent(html, name) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (attr(tag, 'name') === name || attr(tag, 'property') === name) return attr(tag, 'content');
  }
  return undefined;
}

function linkHref(html, rel, type) {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (attr(tag, 'rel') !== rel) continue;
    if (type && attr(tag, 'type') !== type) continue;
    return attr(tag, 'href');
  }
  return undefined;
}

function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(
    (match) => match[1],
  );
}

function jsonLdNodes(html) {
  const nodes = [];
  for (const raw of jsonLdBlocks(html)) {
    try {
      const parsed = JSON.parse(raw.replace(/\\u003c/g, '<'));
      for (const node of parsed['@graph'] ?? [parsed]) nodes.push(node);
    } catch (error) {
      fail(`invalid JSON-LD on page: ${error.message}`);
    }
  }
  return nodes;
}

function anchors(html) {
  return [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/gi)].map((match) => match[1]);
}

function normalizePath(href) {
  if (!href.startsWith('/')) return null;
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return '/';
  const withoutTrailing = clean.replace(/\/+$/, '');
  return withoutTrailing === '' ? '/' : withoutTrailing;
}

/* -------------------------------------------------------------- page checks */

const titles = new Map();
const descriptions = new Map();
const indexable = pages.filter((page) => !page.isError);
const articleRoutes = [];

for (const page of pages) {
  const { route, html } = page;
  const label = route;
  const where = `${label}`;

  const h1s = html.match(/<h1\b[^>]*>/gi) ?? [];
  if (page.isError) {
    assert(h1s.length === 1, `${where}: error page has exactly one <h1>`);
  } else {
    assert(h1s.length === 1, `${where}: exactly one <h1> (found ${h1s.length})`);
  }

  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
  assert(attr(htmlTag, 'lang') === 'en', `${where}: <html lang="en">`);

  const canonical = linkHref(html, 'canonical');
  if (page.isError) {
    assert(metaContent(html, 'robots')?.includes('noindex'), `${where}: error page is noindex`);
  } else {
    const expected = route === '/' ? SITE_URL : `${SITE_URL}${route}`;
    const canonicalNormalized = (canonical ?? '').replace(/\/$/, '');
    assert(
      canonicalNormalized === expected.replace(/\/$/, ''),
      `${where}: canonical is its own final URL (${canonical ?? 'missing'})`,
    );
  }

  const title = textOf(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const description = metaContent(html, 'description') ?? '';

  if (!page.isError) {
    assert(title.length > 0, `${where}: <title> is not empty`);
    assert(description.length >= 20 && description.length <= 300, `${where}: meta description is 20–300 chars`);
    for (const [seenTitle, seenRoute] of titles) {
      if (seenTitle === title) fail(`${where}: duplicate <title> with ${seenRoute}`);
    }
    titles.set(title, route);
    for (const [seenDescription, seenRoute] of descriptions) {
      if (seenDescription === description) fail(`${where}: duplicate meta description with ${seenRoute}`);
    }
    descriptions.set(description, route);

    const ogImage = metaContent(html, 'og:image');
    assert(Boolean(ogImage), `${where}: has an Open Graph image`);
    assert(metaContent(html, 'twitter:card') === 'summary_large_image', `${where}: twitter card is summary_large_image`);
  }

  assert(!metaContent(html, 'keywords'), `${where}: no meta keywords tag`);
  const robotsMeta = (metaContent(html, 'robots') ?? '').toLowerCase();
  assert(!robotsMeta.includes('noai') && !robotsMeta.includes('noimageai'), `${where}: no noai/noimageai directive`);
  assert(!/noai|noimageai/i.test(html.slice(0, html.indexOf('</head>'))), `${where}: head free of opt-out directives`);

  // Images: every one has alt text and reserved dimensions.
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const src = attr(tag, 'src') ?? '';
    const alt = attr(tag, 'alt');
    const fill = attr(tag, 'data-nimg') === 'fill';
    assert(alt !== undefined, `${where}: <img> ${src.slice(0, 48)} has an alt attribute`);
    if (!fill) {
      assert(Boolean(attr(tag, 'width')), `${where}: <img> ${src.slice(0, 48)} declares width`);
      assert(Boolean(attr(tag, 'height')), `${where}: <img> ${src.slice(0, 48)} declares height`);
    } else {
      assert(Boolean(attr(tag, 'sizes')), `${where}: fill image declares sizes`);
    }
  }

  // Structured data: parseable, typed, and resolved by @id.
  const nodes = jsonLdNodes(html);
  if (!page.isError) {
    assert(nodes.length > 0, `${where}: ships JSON-LD`);
    for (const node of nodes) {
      assert(Boolean(node['@type']), `${where}: every JSON-LD node has an @type`);
      assert(Boolean(node['@id']), `${where}: every JSON-LD node has an @id`);
    }
  }

  const isArticle = /^\/blog\/[^/]+$/.test(route) && !page.isError;
  if (isArticle) {
    articleRoutes.push(route);
    const article = nodes.find((node) => node['@type'] === 'BlogPosting');
    assert(Boolean(article), `${where}: BlogPosting structured data`);
    if (article) {
      assert(Boolean(article.datePublished), `${where}: BlogPosting has datePublished`);
      assert(Boolean(article.dateModified), `${where}: BlogPosting has dateModified`);
      assert(Boolean(article.wordCount) && article.wordCount > 100, `${where}: BlogPosting has a real wordCount`);
      assert(Boolean(article.author?.['@id']), `${where}: author resolves to a Person @id`);
      assert(article.publisher?.['@id'] === article.author?.['@id'], `${where}: publisher matches author`);
      assert(article.image?.width === 1200 && article.image?.height === 630, `${where}: image is 1200×630`);
      assert(article.headline === (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ? textOf(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)[1]) : ''), `${where}: headline matches the visible <h1>`);
    }

    const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList');
    assert(Boolean(breadcrumb) && breadcrumb.itemListElement.length >= 2, `${where}: BreadcrumbList with ≥2 items`);

    assert(/<time\b[^>]*datetime="[^"]+"/i.test(html), `${where}: <time datetime> for the publication date`);

    // The reading map belongs before the essay body, not below it on mobile.
    const tocStart = html.indexOf('<nav aria-labelledby="toc-heading"');
    const bodyStart = html.search(/<div class="mdx-body/);
    if (html.includes('id="toc-heading"')) {
      assert(tocStart >= 0 && bodyStart > tocStart, `${where}: table of contents appears before the article body`);
    }

    // Answer-first: the first paragraph of the body is 40–60 words.
    const bodyEnd = html.indexOf('</article>', bodyStart);
    const body = bodyStart === -1 ? '' : html.slice(bodyStart, bodyEnd === -1 ? undefined : bodyEnd);
    const firstParagraph = body.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? '';
    const firstWords = wordCount(textOf(firstParagraph));
    assert(
      firstWords >= 40 && firstWords <= 60,
      `${where}: opening answer paragraph is 40–60 words (found ${firstWords})`,
    );

    const bodyAnchors = [...body.matchAll(/<a\b[^>]*href="([^"]+)"/gi)].map((match) => match[1]);
    const internal = bodyAnchors.filter((href) => href.startsWith('/') && !href.startsWith('//'));
    const external = bodyAnchors.filter((href) => href.startsWith('http') && !href.startsWith(SITE_URL));
    assert(internal.length >= 3, `${where}: at least 3 internal links in the body (found ${internal.length})`);
    assert(external.length >= 3, `${where}: at least 3 outbound citations (found ${external.length})`);

    // FAQ structured data exists only when the visible FAQ exists.
    const visibleFaq = /<h2[^>]*id="faq-heading"/i.test(html);
    const faqNode = nodes.find((node) => node['@type'] === 'FAQPage');
    assert(visibleFaq === Boolean(faqNode), `${where}: FAQPage present iff the FAQ section is visible`);
    if (visibleFaq && faqNode) {
      const visibleText = textOf(html);
      for (const question of faqNode.mainEntity) {
        assert(visibleText.includes(question.name), `${where}: FAQ question is visible: “${question.name.slice(0, 40)}”`);
        const answer = textOf(question.acceptedAnswer.text);
        assert(visibleText.includes(answer.slice(0, 60)), `${where}: FAQ answer is visible`);
      }
      const disclosures = html.match(/<details[^>]*data-faq-item/g) ?? [];
      assert(disclosures.length === faqNode.mainEntity.length, `${where}: every FAQ answer uses an interactive native disclosure`);
    }

    if (route === '/blog/prithvi-eo-2-0-multi-temporal-foundation-model') {
      const tableCount = (body.match(/<table/gi) ?? []).length;
      assert(tableCount >= 3 && tableCount <= 4, `${where}: contains 3–4 research tables (found ${tableCount})`);
      const charts = [...body.matchAll(/<figure[^>]*data-chart="([^"]+)"/gi)].map((match) => match[1]);
      assert(charts.includes('sen1floods11') && charts.includes('pastis'), `${where}: includes interactive Sen1Floods11 and PASTIS charts`);
      assert(body.includes('Szwarcman et al.'), `${where}: quotes are attributed to the paper authors`);
    }

    // Machine-readable representation.
    assert(
      linkHref(html, 'alternate', 'text/markdown') === `https://researchwith.me${route}/markdown` ||
        linkHref(html, 'alternate', 'text/markdown')?.endsWith(`${route}/markdown`),
      `${where}: advertises its markdown representation`,
    );
  }

  // Content is in the initial HTML: the visible text is substantial.
  if (!page.isError) {
    const visibleWords = wordCount(textOf(html));
    assert(
      visibleWords > (isArticle ? 400 : 60),
      `${where}: server-rendered text present (${visibleWords} words, no JS-only content)`,
    );
  }
}

assert(titles.size === indexable.length, 'every indexable page has a unique title');

/* ------------------------------------------------------------------ sitemap */

const sitemapPath = path.join(APP, 'sitemap.xml.body');
const sitemapUrlPath = path.join(APP, 'sitemap.xml');
const sitemap = fs.readFileSync(
  fs.existsSync(sitemapPath) ? sitemapPath : sitemapUrlPath,
  'utf8',
);
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const sitemapRoutes = sitemapUrls.map((url) => normalizePath(url.replace(SITE_URL, '')));

assert(new Set(sitemapUrls).size === sitemapUrls.length, 'sitemap has no duplicate URLs');
assert(!sitemapRoutes.includes('/search'), 'sitemap excludes the noindex search page');
for (const url of sitemapUrls) {
  const pathname = url.replace(SITE_URL, '');
  if (pathname !== '/' && !pathname.startsWith('/_next')) {
    assert(!pathname.endsWith('/'), `sitemap entry has no trailing slash: ${pathname}`);
  }
  const local = path.join(APP, `${pathname === '/' ? 'index' : pathname}.html`);
  assert(fs.existsSync(local), `sitemap entry resolves to a built page: ${pathname}`);
}

for (const page of indexable) {
  if (['/_not-found'].includes(page.route)) continue;
  const robots = (metaContent(page.html, 'robots') ?? '').toLowerCase();
  const isNoIndex = robots.includes('noindex');
  const inSitemap = sitemapRoutes.includes(page.route);
  if (isNoIndex) assert(!inSitemap, `${page.route}: noindex page stays out of the sitemap`);
  else assert(inSitemap, `${page.route}: indexable page is in the sitemap`);
}

/* -------------------------------------------------------------- link graph */

const links = new Map();
for (const page of pages) {
  links.set(
    page.route,
    new Set(anchors(page.html).map(normalizePath).filter(Boolean)),
  );
}
const reachable = new Set(['/']);
const queue = ['/'];
while (queue.length) {
  const current = queue.shift();
  for (const target of links.get(current) ?? []) {
    if (reachable.has(target)) continue;
    if (!pageByRoute.has(target) && target !== '/search') continue;
    reachable.add(target);
    queue.push(target);
  }
}
for (const route of sitemapRoutes) {
  assert(reachable.has(route), `no orphan: ${route} is reachable from /`);
}

/* ------------------------------------------------------- feeds + artifacts */

const readBody = (name) => {
  const bodyPath = path.join(APP, name);
  return fs.existsSync(bodyPath) ? fs.readFileSync(bodyPath, 'utf8') : null;
};

const rss = readBody('rss.xml.body') ?? readBody('rss.xml');
assert(Boolean(rss) && rss.includes('<rss'), 'RSS feed exists');
const rssItems = [...(rss ?? '').matchAll(/<item>/g)].length;
assert(rssItems === articleRoutes.length, `RSS lists every article (${rssItems}/${articleRoutes.length})`);

const feedJson = JSON.parse(readBody('feed.json.body') ?? readBody('feed.json') ?? '{}');
assert(feedJson.version === 'https://jsonfeed.org/version/1.1', 'JSON Feed is version 1.1');
assert(feedJson.items?.length === articleRoutes.length, 'JSON Feed lists every article');
for (const item of feedJson.items ?? []) {
  assert(!Number.isNaN(Date.parse(item.date_published)), `JSON Feed item has an ISO date: ${item.url}`);
}

const llms = readBody('llms.txt.body') ?? readBody('llms.txt');
assert(Boolean(llms) && llms.startsWith('# '), 'llms.txt starts with an H1');
for (const route of articleRoutes) {
  assert(llms.includes(`${SITE_URL}${route}`), `llms.txt links ${route}`);
}

const robots = readBody('robots.txt.body') ?? readBody('robots.txt');
for (const agent of [
  'Googlebot',
  'Bingbot',
  'OAI-SearchBot',
  'GPTBot',
  'ClaudeBot',
  'PerplexityBot',
  'Google-Extended',
]) {
  assert(robots.includes(`User-Agent: ${agent}`), `robots.txt has an explicit group for ${agent}`);
}
assert(robots.includes(`${SITE_URL}/sitemap.xml`), 'robots.txt advertises the sitemap');
assert(!/Disallow:\s*\/search/i.test(robots), 'robots.txt does not block /search (noindex handles it)');

const securityTxt = path.join(APP, '.well-known', 'security.txt.body');
assert(fs.existsSync(securityTxt), 'security.txt is published at /.well-known/security.txt');
if (fs.existsSync(securityTxt)) {
  const contents = fs.readFileSync(securityTxt, 'utf8');
  assert(/^Contact: /m.test(contents), 'security.txt has a Contact field');
  const expires = contents.match(/^Expires: (.+)$/m);
  assert(Boolean(expires) && Date.parse(expires[1]) > Date.now(), 'security.txt Expires is in the future');
}

for (const route of articleRoutes) {
  const markdownPath = path.join(APP, `${route.slice(1)}`, 'markdown.body');
  const markdownAlt = path.join(APP, `${route.slice(1)}`, 'markdown');
  const markdown = fs.existsSync(markdownPath)
    ? fs.readFileSync(markdownPath, 'utf8')
    : fs.existsSync(markdownAlt)
      ? fs.readFileSync(markdownAlt, 'utf8')
      : '';
  assert(markdown.includes('canonical:'), `${route}: markdown representation carries its canonical URL`);
  assert(wordCount(markdown) > 100, `${route}: markdown representation carries the full text`);
}

/* ------------------------------------------------------------------ budgets */

function gzipSize(file) {
  return zlib.gzipSync(fs.readFileSync(file)).length;
}
function assetPath(href) {
  const clean = decodeURIComponent(href.split('?')[0]);
  return path.join(ROOT, clean.replace(/^\/_next\//, '.next/'));
}

/** Scripts a modern browser actually executes; `nomodule` polyfills are skipped. */
function executableScripts(html) {
  return [
    ...new Set(
      [...html.matchAll(/<script\b[^>]*>/gi)]
        .filter((match) => !/\snomodule\b/i.test(match[0]))
        .map((match) => match[0].match(/src="(\/_next\/[^"]+)"/)?.[1])
        .filter(Boolean),
    ),
  ];
}

const sharedScripts = (() => {
  const perPage = pages.map((page) => new Set(executableScripts(page.html)));
  return new Set([...perPage[0]].filter((src) => perPage.every((set) => set.has(src))));
})();

const articlePage = pageByRoute.get(articleRoutes[0]);
const articleScripts = executableScripts(articlePage?.html ?? '');
const pageSpecific = articleScripts
  .filter((src) => !sharedScripts.has(src))
  .reduce((total, src) => total + gzipSize(assetPath(src)), 0);
const totalJs = articleScripts.reduce((total, src) => total + gzipSize(assetPath(src)), 0);

assert(
  pageSpecific <= 100 * 1024,
  `article page-specific JS ≤ 100 KB gz (${Math.round(pageSpecific / 1024)} KB)`,
);
pass(`article JS measured: ${Math.round(pageSpecific / 1024)} KB page-specific, ${Math.round(totalJs / 1024)} KB total including the framework runtime`);

// The lab renders the whole figure registry client-side (AGENTS.md §9); it
// gets its own budget so the library cannot grow without paying attention.
const labPage = pageByRoute.get('/lab');
const labScripts = executableScripts(labPage?.html ?? '');
const labPageSpecific = labScripts
  .filter((src) => !sharedScripts.has(src))
  .reduce((total, src) => total + gzipSize(assetPath(src)), 0);
assert(
  labPageSpecific <= 80 * 1024,
  `lab page-specific JS ≤ 80 KB gz (${Math.round(labPageSpecific / 1024)} KB)`,
);
pass(`lab JS measured: ${Math.round(labPageSpecific / 1024)} KB page-specific (whole figure registry)`);

const cssFiles = [...(articlePage?.html ?? '').matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/_next\/[^"]+)"/gi)].map(
  (m) => m[1],
);
const totalCss = cssFiles.reduce((total, href) => total + gzipSize(assetPath(href)), 0);
assert(totalCss <= 50 * 1024, `CSS ≤ 50 KB gz (${Math.round(totalCss / 1024)} KB)`);

const thirdParty = articleScripts.filter((src) => !src.startsWith('/_next/'));
assert(thirdParty.length === 0, `no third-party scripts (found ${thirdParty.join(', ') || 'none'})`);

const fontFaces = fs
  .readdirSync(path.join(STATIC_DIR, 'css'))
  .flatMap((name) =>
    [...fs.readFileSync(path.join(STATIC_DIR, 'css', name), 'utf8').matchAll(/@font-face\s*{[^}]*}/g)].map(
      (match) => match[0],
    ),
  );
const fontFamilies = new Set(
  fontFaces.map((block) => block.match(/font-family:\s*['"]?([^;'"]+)/)?.[1]?.trim()).filter(Boolean),
);
assert(fontFamilies.size <= 2, `at most 2 downloaded font families (found ${[...fontFamilies].join(', ') || 'none'})`);

/* ------------------------------------------------------------------ report */

const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(`\nDefinition of done — ${pages.length} pages, ${articleRoutes.length} articles, ${checks.length} checks`);
console.log(`  JS   ${kb(pageSpecific)} page-specific · ${kb(totalJs)} total`);
console.log(`  CSS  ${kb(totalCss)}`);
for (const check of checks) console.log(`  ✓ ${check}`);

if (failures.length) {
  console.error(`\n${failures.length} failure${failures.length === 1 ? '' : 's'}:`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log('\nAll definition-of-done checks passed.\n');
