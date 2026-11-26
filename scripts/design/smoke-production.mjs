import { spawnSync } from 'node:child_process';
import { withProductionServer } from './production-server.mjs';

const routes = ['/', '/blog', '/tags', '/about', '/search', '/assistant', '/lab/genui', '/rss.xml', '/feed.json', '/llms.txt', '/robots.txt', '/sitemap.xml', '/search-index.json', '/blog/welcome-to-the-new-researchwithme', '/blog/welcome-to-the-new-researchwithme/markdown', '/.well-known/security.txt'];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function checkRoutes(origin) {
  for (const route of routes) {
    const response = await fetch(origin + route, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    assert(response.status === 200, `${route}: expected 200, received ${response.status}`);
    await response.arrayBuffer();
    console.log(`PASS ${route}`);
  }
}

async function checkHeaders(origin) {
  const response = await fetch(origin, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
  assert(response.headers.get('content-signal') === 'search=yes, ai-input=yes, ai-train=yes', 'Missing or changed Content-Signal.');
  assert(response.headers.get('cache-control')?.includes('s-maxage='), 'Missing HTML shared-cache policy.');
  assert(response.headers.has('strict-transport-security'), 'Missing HSTS.');
}

async function checkSearchPayload(origin) {
  // Native fetch decodes gzip; curl's size_download is the on-wire measurement.
  const measured = spawnSync('curl', ['--fail', '--silent', '--show-error', '--max-time', '15', '-H', 'Accept-Encoding: gzip', '-o', '/dev/null', '-w', '%{size_download}', `${origin}/search`], { encoding: 'utf8' });
  assert(measured.status === 0, `Search payload request failed: ${measured.stderr}`);
  const searchBytes = Number(measured.stdout);
  assert(Number.isFinite(searchBytes) && searchBytes > 0 && searchBytes < 60000, `Search HTML exceeds budget: ${measured.stdout}`);
  const index = await fetch(`${origin}/search-index.json`, { signal: AbortSignal.timeout(15000) });
  assert((await index.arrayBuffer()).byteLength > 0, 'Archive index is empty.');
  console.log(`PASS search payload: ${searchBytes} bytes gzip`);
}

function checkBrowser(origin) {
  const result = spawnSync('npm', ['run', 'design:browser'], {
    stdio: 'inherit', env: { ...process.env, DESIGN_BASE_URL: origin }, timeout: 300000,
  });
  assert(result.status === 0, `Browser checks failed: ${result.error?.message ?? result.status}`);
}

await withProductionServer(async origin => {
  await checkRoutes(origin);
  await checkHeaders(origin);
  await checkSearchPayload(origin);
  checkBrowser(origin);
}, { port: 3100 });
