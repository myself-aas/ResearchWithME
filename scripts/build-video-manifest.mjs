import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = join(process.cwd(), 'public', 'videos');
const found = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(mp4|webm)$/i.test(entry.name)) {
      found.push('/' + relative(join(process.cwd(), 'public'), path).split(sep).join('/'));
    }
  }
}

if (existsSync(root)) walk(root);

found.sort();
const target = join(process.cwd(), 'lib', 'video-manifest.json');
writeFileSync(target, JSON.stringify(found, null, 2) + '\n');
console.log(`video manifest: ${found.length} file(s) -> lib/video-manifest.json`);
