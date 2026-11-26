import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { renderDesign } from './system';

const root = process.cwd();
const verify = process.argv.includes('--verify');
const output = process.argv.indexOf('--out');
const files = renderDesign();
if (verify) {
  const temp = mkdtempSync(join(tmpdir(), 'reme-verify-'));
  try {
    const second = renderDesign();
    for (const [path, content] of Object.entries(files)) {
      if (content !== second[path]) throw new Error(`I14: non-deterministic ${path}`);
      const target = join(temp, path);
      mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content);
      if (!existsSync(join(root, path)) || !readFileSync(join(root, path)).equals(readFileSync(target))) throw new Error(`I14: stale generated file ${path}; run npm run design:gen`);
    }
    const walk = (dir: string): string[] => existsSync(join(root, dir)) ? readdirSync(join(root, dir), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]) : [];
    for (const path of walk('src/generated')) if (!(path in files)) throw new Error(`I14: unexpected generated artifact ${path}`);
    console.log(`PASS I14: ${Object.keys(files).length} outputs match two independent renders and fresh temporary files byte-for-byte.`);
  } finally { rmSync(temp, { recursive: true, force: true }); }
} else {
  const out = output < 0 ? root : resolve(process.argv[output + 1]);
  for (const [path, content] of Object.entries(files)) {
    const target = join(out, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content);
  }
  console.log(`Generated ${Object.keys(files).length} reme v4.1 artifacts.`);
}
