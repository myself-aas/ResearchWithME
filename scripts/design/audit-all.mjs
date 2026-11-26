import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { withProductionServer } from './production-server.mjs';

// A failed or unmeasured gate never turns green merely because the runner ends.
const directory = 'artifacts/design-audit';
mkdirSync(directory, { recursive: true });
const results = [];
function run(script, env = {}) {
  console.log(`Auditing ${script}…`);
  const result = spawnSync('npm', ['run', script], { encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 25 * 1024 * 1024, timeout: 600000 });
  const log = `${directory}/${script.replaceAll(':', '-')}.log`;
  writeFileSync(log, (result.stdout ?? '') + (result.stderr ?? '') + (result.error?.message ?? ''));
  results.push({ command: `npm run ${script}`, status: result.status === 0 ? 'pass' : 'fail', exitCode: result.status, log });
  console.log(`${result.status === 0 ? 'PASS' : 'FAIL'} ${script} (${log})`);
  return result.status === 0;
}
run('quality');
const built = run('verify');
try {
  if (built) {
    await withProductionServer(origin => run('design:browser', { DESIGN_BASE_URL: origin }));
    run('design:payload');
  } else {
    results.push({ command: 'browser and payload', status: 'unmeasured', reason: 'Production verification failed.' });
  }
} catch (error) {
  results.push({ command: 'browser', status: 'fail', reason: String(error) });
}
run('design:lint:all');
const report = {
  scope: 'Executable checks only. See docs/design/AUDIT-v4.1.md for all 23 gates, manual checks, and unresolved requirements.',
  results,
  fullV41Compliance: false,
  remaining: ['50KB initial JS and 15KB lazy lab budgets', 'Full-site token migration and 10 localized templates', 'Strict nonce/hash CSP (isolation headers now enforced)', 'Real local model engine, weights, cache and shard verification', 'Dispatch service and edge rate limit', 'Five-run mobile Lighthouse, device/AT/zoom/locale and full streaming CLS tests'],
};
writeFileSync(`${directory}/results.json`, JSON.stringify(report, null, 2) + '\n');
console.log(`Audit report: ${directory}/results.json. Full v4.1 compliance: NOT achieved.`);
process.exitCode = results.some(result => result.status !== 'pass') || report.remaining.length ? 1 : 0;
