import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lintSource, migratedFiles } from './lint';

const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : /\.[jt]sx?$/.test(entry.name) ? [join(dir, entry.name)] : []);
const files = ['app', 'components'].flatMap(walk);
const findings = files.flatMap(file => lintSource(readFileSync(file, 'utf8'), file).map(message => ({ file, message })));
console.log(JSON.stringify({ method: 'Whole-tree TS AST token-escape inventory, not just the migration boundary; no allowlist exemptions.', scannedFiles: files.length, migratedFiles, findingCount: findings.length, filesWithFindings: new Set(findings.map(f => f.file)).size, findings, pass: findings.length === 0 }, null, 2));
if (findings.length) process.exitCode = 1;
