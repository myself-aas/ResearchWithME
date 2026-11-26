import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const output = '.open-next/dry-run';
const limits = { compressedWorker: 3 * 1024 * 1024, asset: 25 * 1024 * 1024 };
rmSync(output, { recursive: true, force: true });
const packaging = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--dry-run', '--outdir', output], {
  stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }, timeout: 120000,
});
if (packaging.status !== 0) throw new Error(`Worker packaging failed (${packaging.status}): ${packaging.error?.message ?? ''}`);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
const modules = walk(output).filter(path => !/\.(?:md|map)$/.test(path));
const gzipBytes = modules.reduce((total, path) => total + gzipSync(readFileSync(path)).byteLength, 0);
const oversizedAssets = walk('.open-next/assets').filter(path => statSync(path).size > limits.asset);
console.log(JSON.stringify({ method: 'independent gzip of Wrangler dry-run modules; static asset file sizes', gzipBytes, limits, modules, oversizedAssets }, null, 2));
if (gzipBytes > limits.compressedWorker || oversizedAssets.length) throw new Error('Worker artifact exceeds the configured Free-plan/asset limits.');
console.log('PASS local Worker artifact limits; not a deployment or account-permission check.');
