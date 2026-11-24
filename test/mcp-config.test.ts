import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `AGENTS.md` §17: `.mcp.json` is wiring, `.agents/mcp/README.md` is the manual,
 * and the contract is in AGENTS.md itself. A server that is not in all three is
 * a server nobody can safely use, so this gate enforces the trio.
 */
const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

type Server = {
  type?: string;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
};

const config = JSON.parse(read('.mcp.json')) as { mcpServers: Record<string, Server> };
const servers = config.mcpServers;
const agents = read('AGENTS.md');
const manual = read('.agents/mcp/README.md');
const rawConfig = read('.mcp.json');

describe('.mcp.json', () => {
  it('declares servers', () => {
    expect(Object.keys(servers).length).toBeGreaterThan(0);
  });

  it('gives every server a usable transport', () => {
    for (const [name, server] of Object.entries(servers)) {
      if (server.type === 'stdio') {
        expect(server.command, `${name} needs a command`).toBeTruthy();
        expect(Array.isArray(server.args ?? []), `${name} args must be an array`).toBe(true);
      } else if (server.type === 'http') {
        expect(server.url, `${name} needs a url`).toMatch(/^https?:\/\//);
      } else {
        throw new Error(`${name} has an unsupported transport: ${String(server.type)}`);
      }
    }
  });

  it('keeps every transport reachable-or-local: https for remote, loopback allowed only for dev servers', () => {
    for (const [name, server] of Object.entries(servers)) {
      if (server.type !== 'http') continue;
      if (server.url?.startsWith('http://')) {
        expect(server.url, `${name} may only use plain http on loopback`).toMatch(
          /^http:\/\/(127\.0\.0\.1|localhost):\d+\//,
        );
      }
    }
  });
});

describe('documentation coverage', () => {
  it('lists every server in AGENTS.md §17', () => {
    const section = agents.split('## §17 Agent tooling (MCP)')[1] ?? '';
    expect(section, 'AGENTS.md must keep a §17 for MCP').not.toBe('');
    for (const name of Object.keys(servers)) {
      expect(section, `${name} is missing from AGENTS.md §17`).toContain(`| \`${name}\` |`);
    }
  });

  it('has a section for every server in the operating manual', () => {
    for (const name of Object.keys(servers)) {
      expect(manual, `${name} is missing from .agents/mcp/README.md`).toContain(`### \`${name}\``);
    }
  });

  it('documents every placeholder in the credentials table', () => {
    const placeholders = new Set([...rawConfig.matchAll(/\$\{([A-Z0-9_]+)\}/g)].map((match) => match[1]));
    expect(placeholders.size).toBeGreaterThan(0);
    for (const name of placeholders) {
      expect(manual, `${name} is not in the credentials table`).toContain(`\`${name}\``);
    }
  });
});

describe('secrets', () => {
  it('contains no credential-shaped literal', () => {
    expect(rawConfig).not.toMatch(/ghp_[A-Za-z0-9]{20,}/);
    expect(rawConfig).not.toMatch(/github_pat_[A-Za-z0-9_]{20,}/);
    expect(rawConfig).not.toMatch(/sk-[A-Za-z0-9]{20,}/);
    expect(rawConfig).not.toMatch(/Bearer (?!\$\{)[A-Za-z0-9._-]{20,}/);
  });

  it('expands environment variables instead of hardcoding them', () => {
    const github = servers.github;
    expect(JSON.stringify(github.headers ?? {})).toContain('${GITHUB_PERSONAL_ACCESS_TOKEN}');
  });
});
