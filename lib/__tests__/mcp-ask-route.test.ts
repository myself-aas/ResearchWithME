import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryApiKeyStore, setApiKeyStoreForTesting } from '@/lib/api/key-store';
import { generateApiKey, hashApiKey } from '@/lib/api/keys';
import { createMemoryLedger, setLedgerForTesting, type ApiLedger } from '@/lib/api/ledger';
import { setAssistantForTesting } from '@/lib/assistant/service';
import { MCP_VERSION } from '@/lib/mcp';
import { createMemoryRateLimitStore, setRateLimitStoreForTesting } from '@/lib/rate-limit';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/cms/catalogue', () => ({ getArticleCatalogue: async () => [] }));

import { POST } from '@/app/mcp/route';

let key = '';
let ledger: ApiLedger;
const ask = (id: number, bearer = key, ip = '198.51.100.1') =>
  POST(new Request('https://researchwith.me/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json', 'mcp-protocol-version': MCP_VERSION, 'cf-connecting-ip': ip,
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'ask_archive', arguments: { query: 'replication' } } }),
  }));
const used = async () => (await ledger.usage('user-a', 100)).requestsUsed;

beforeEach(async () => {
  const keys = createMemoryApiKeyStore();
  key = generateApiKey().key;
  const created = await keys.create('user-a', { name: 't', prefix: key.slice(0, 12), keyHash: await hashApiKey(key) });
  if (created === 'LIMIT_REACHED') throw new Error('unexpected');
  ledger = createMemoryLedger(undefined, (id) => (id === created.id ? 'user-a' : null));
  setApiKeyStoreForTesting(keys); setLedgerForTesting(ledger);
  setRateLimitStoreForTesting(createMemoryRateLimitStore());
  setAssistantForTesting(async () => ({ answer: 'The answer.', mode: 'CATALOG', notice: null }));
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  setApiKeyStoreForTesting(null); setLedgerForTesting(null); setRateLimitStoreForTesting(null); setAssistantForTesting(null);
  vi.restoreAllMocks();
});

describe('POST /mcp ask_archive', () => {
  it('answers with a key and reports what is left', async () => {
    const body = await (await ask(1)).json();
    expect(body.result.isError).toBeUndefined();
    expect(body.result.content[0].text).toContain('The answer.');
    expect(body.result.content[0].text).toContain('1 of 100 answers used this month');
    expect(await used()).toBe(1);
  });
  it('counts a retry of the same call once', async () => {
    await ask(7); await ask(7);
    expect(await used()).toBe(1);
    await ask(8);
    expect(await used()).toBe(2);
  });
  it('refuses without a key and spends nothing', async () => {
    const body = await (await ask(1, '')).json();
    expect(body.result).toEqual({ content: [{ type: 'text', text: 'A valid API key is required.' }], isError: true });
    expect(await used()).toBe(0);
  });
  it('sends Retry-After in seconds when the address is rate limited', async () => {
    let res = await ask(0, '', '198.51.100.77');
    for (let i = 1; i <= 30; i++) res = await ask(i, '', '198.51.100.77');
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(1);
  });
});
