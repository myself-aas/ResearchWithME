import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { design } from '../../src/design';

// A reproducible HTML-declared-script gzip estimate, not a Lighthouse/network
// timing claim. Modern browsers do not fetch nomodule polyfills.
const html = readFileSync('.next/server/app/index.html', 'utf8');
const scripts = new Set<string>();
for (const match of html.matchAll(/<script([^>]+)src="([^"?]+)[^"]*"([^>]*)>/g)) {
  if (/nomodule/i.test(match[1] + match[3])) continue;
  if (!match[2].startsWith('/_next/')) throw new Error(`Unexpected initial script origin: ${match[2]}`);
  scripts.add(match[2]);
}
const initialScriptGzipBytes = [...scripts].reduce((sum, path) => sum + gzipSync(readFileSync('.next/' + path.replace('/_next/', ''))).length, 0);
const romanFontBytes = Object.values(design.type.fonts.files).reduce((sum, path) => sum + statSync('public' + path).size, 0);
const artwork = [design.primitive.frame.fallback.avif, design.primitive.frame.fallback.webp].map(path => ({ path, bytes: statSync('public' + path).size }));
const results = {
  method: 'gzip of unique modern script files declared in built landing HTML; font/artwork file sizes',
  initialScriptGzipBytes, initialScriptBudget: 50000,
  romanFontBytes, romanFontBudget: design.type.fonts.maxBytes,
  artwork, artworkBudgetEach: 100000,
  pass: initialScriptGzipBytes <= 50000 && romanFontBytes <= design.type.fonts.maxBytes && artwork.every(a => a.bytes <= 100000),
};
console.log(JSON.stringify(results, null, 2));
if (!results.pass) process.exitCode = 1;
