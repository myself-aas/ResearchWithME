import { spawnSync } from 'node:child_process';
import { withManagedServer } from '../design/production-server.mjs';

async function checkContent(origin) {
  const response = await fetch(`${origin}/search-index.json`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Worker search index returned ${response.status}.`);
  const index = await response.json();
  if (!index.docs?.length || !index.docs.some(doc => doc.text.includes('Prithvi'))) throw new Error('Worker search index lost published content.');
  const search = await fetch(`${origin}/search?q=Prithvi`, { signal: AbortSignal.timeout(15000) });
  if (!search.ok || !(await search.text()).includes('/blog/prithvi-eo-2-0-multi-temporal-foundation-model')) throw new Error('Dynamic Worker search lost its source content.');
  console.log(`PASS local Worker content: ${index.docs.length} published documents and dynamic full-text search.`);
}

function checkBrowser(origin) {
  const result = spawnSync('npm', ['run', 'design:browser'], {
    stdio: 'inherit', env: { ...process.env, DESIGN_BASE_URL: origin }, timeout: 300000,
  });
  if (result.status !== 0) throw new Error(`Worker browser suite failed (${result.status}): ${result.error?.message ?? ''}`);
}

await withManagedServer(async origin => {
  await checkContent(origin);
  checkBrowser(origin);
}, {
  // The adapter seeds prerendered article responses into local KV before starting
  // Wrangler. Bare `wrangler dev` leaves that cache empty and cannot serve the
  // statically compiled MDX routes; search-only checks previously missed this.
  args: ['node_modules/@opennextjs/cloudflare/dist/cli/index.js', 'preview', '--ip', '0.0.0.0', '--port', '3102'],
  port: 3102, timeoutMs: 60000, readiness: /Ready on/,
  env: { WRANGLER_SEND_METRICS: 'false' },
});
