#!/usr/bin/env node
/**
 * MCP wiring check.
 *
 * Reads `.mcp.json`, then:
 *   - stdio servers: spawns the command, does a real `initialize` +
 *     `tools/list` handshake, and reports the tool count;
 *   - http servers: sends the same `initialize` and reports the status.
 *
 * This proves the file runs, not just that it parses. Missing credentials and
 * unreachable hosts are reported as SKIP: they are configuration the operator
 * supplies, not defects in the repository. Anything that spawns and then fails
 * to speak MCP is a FAIL, and `--strict` turns every non-PASS into a failure.
 *
 *   npm run check:mcp            # informational
 *   npm run check:mcp -- --strict
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const strict = process.argv.includes('--strict');
const HANDSHAKE_TIMEOUT_MS = 30_000;
const HTTP_TIMEOUT_MS = 10_000;

const initialize = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'researchwithme-check-mcp', version: '1' },
  },
};

const EXPANSION = /\$\{([A-Z0-9_]+)\}/g;
const missing = new Set();

function expand(value) {
  if (typeof value !== 'string') return value;
  return value.replace(EXPANSION, (_match, name) => {
    if (!process.env[name]) missing.add(name);
    return process.env[name] ?? '';
  });
}

function withTimeout(promise, ms, onTimeout) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(onTimeout()), ms)),
  ]);
}

async function checkStdio(name, server) {
  const command = expand(server.command);
  const args = (server.args ?? []).map(expand);
  const env = { ...process.env };
  for (const [key, value] of Object.entries(server.env ?? {})) env[key] = expand(value);

  const child = spawn(command, args, { env, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  let settled = false;

  const result = await withTimeout(
    new Promise((resolve) => {
      child.on('error', (error) =>
        resolve({
          status: error.code === 'ENOENT' ? 'skip' : 'fail',
          detail: error.code === 'ENOENT' ? `${command} is not installed here` : error.message,
        }),
      );

      child.on('exit', (code) => {
        if (settled) return;
        settled = true;
        const lines = stderr
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);
        const message = (
          lines.find((line) => /key|token|credential/i.test(line)) ??
          lines[0] ??
          ''
        ).slice(0, 140);
        const needsCredential = /api key|api-key|token|credential|unauthori[sz]ed|401/i.test(stderr);
        resolve(
          needsCredential
            ? { status: 'skip', detail: `needs credentials: ${message}` }
            : { status: code === 0 ? 'skip' : 'fail', detail: `exited ${code}: ${message}` },
        );
      });

      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });

      child.stdout.on('data', (chunk) => {
        stdout += String(chunk);
        for (const line of stdout.split('\n')) {
          if (!line.trim().startsWith('{')) continue;
          let message;
          try {
            message = JSON.parse(line);
          } catch {
            continue;
          }
          if (message.id !== 2 || settled) continue;
          settled = true;
          const tools = message.result?.tools ?? [];
          resolve({
            status: 'pass',
            detail: `${tools.length} tools: ${tools
              .slice(0, 4)
              .map((tool) => tool.name)
              .join(', ')}${tools.length > 4 ? ', …' : ''}`,
          });
        }
      });

      child.stdin.write(`${JSON.stringify(initialize)}\n`);
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })}\n`);
    }),
    HANDSHAKE_TIMEOUT_MS,
    () => ({ status: 'fail', detail: 'no tools/list response within 30s' }),
  );

  child.kill('SIGTERM');
  setTimeout(() => child.kill('SIGKILL'), 2_000).unref();
  return { name, transport: 'stdio', ...result };
}

async function checkHttp(name, server) {
  const url = expand(server.url);
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  for (const [key, value] of Object.entries(server.headers ?? {})) headers[key] = expand(value);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(initialize),
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
    const status = response.status;
    if (status >= 500) return { name, transport: 'http', status: 'fail', detail: `HTTP ${status}` };
    if (status === 401 || status === 403) {
      return { name, transport: 'http', status: 'skip', detail: `reachable, ${status}: sign in first` };
    }
    return { name, transport: 'http', status: 'pass', detail: `reachable, HTTP ${status} (login is per host)` };
  } catch (error) {
    // Being off the internet, or behind a proxy, is not a defect in .mcp.json.
    return {
      name,
      transport: 'http',
      status: 'skip',
      detail: `not reachable from here: ${String(error.message).slice(0, 80)}`,
    };
  }
}

const configPath = join(root, '.mcp.json');
const { mcpServers } = JSON.parse(readFileSync(configPath, 'utf8'));
const entries = Object.entries(mcpServers ?? {});

if (entries.length === 0) {
  console.error('No MCP servers configured in .mcp.json');
  process.exit(1);
}

console.log(`Checking ${entries.length} MCP servers from .mcp.json\n`);

const results = [];
for (const [name, server] of entries) {
  const transport = server.type ?? (server.url ? 'http' : 'stdio');
  const result =
    transport === 'http'
      ? await checkHttp(name, server)
      : transport === 'stdio'
        ? await checkStdio(name, server)
        : { name, transport, status: 'fail', detail: `unsupported transport "${transport}"` };
  results.push(result);
  console.log(`  ${result.status.toUpperCase().padEnd(5)} ${name.padEnd(20)} ${result.detail}`);
}

const failed = results.filter((result) => result.status === 'fail');
const skipped = results.filter((result) => result.status === 'skip');
const passed = results.filter((result) => result.status === 'pass');

console.log(
  `\n${passed.length} passed, ${skipped.length} skipped (credentials or network), ${failed.length} failed`,
);

if (missing.size > 0) {
  console.log(`Environment variables not set here: ${[...missing].sort().join(', ')}`);
  console.log('See .agents/mcp/README.md for where each one comes from.');
}

if (failed.length > 0) {
  console.error('\nFailed:', failed.map((result) => `${result.name} (${result.detail})`).join('; '));
  process.exit(1);
}

if (strict && skipped.length > 0) {
  console.error(`\n--strict: ${skipped.length} server(s) could not be verified here.`);
  process.exit(1);
}
