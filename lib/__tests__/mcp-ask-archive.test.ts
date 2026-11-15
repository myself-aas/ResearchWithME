import { describe, expect, it, vi } from 'vitest';
import { MCP_VERSION, handleMcp, mcpServerCard, type AskArchive } from '@/lib/mcp';

const SITE = 'https://researchwith.me';
const call = (name: string, args: unknown, id: string | number = 1, headers: Record<string, string> = {}) =>
  new Request(`${SITE}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'mcp-protocol-version': MCP_VERSION, ...headers },
    body: JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } }),
  });
const list = () =>
  new Request(`${SITE}/mcp`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });

describe('MCP ask_archive', () => {
  it('lists both tools', async () => {
    const body = await (await handleMcp(list(), async () => [], SITE)).json();
    expect(body.result.tools.map((tool: { name: string }) => tool.name)).toEqual(['search_reviews', 'ask_archive']);
    expect(body.result.tools[1].description).toContain('API key');
  });
  it('returns a tool error without a key', async () => {
    const res = await handleMcp(call('ask_archive', { query: 'q' }), async () => [], SITE, async () => ({ ok: false, message: 'A valid API key is required.' }));
    expect(res.status).toBe(200);
    expect((await res.json()).result).toEqual({ content: [{ type: 'text', text: 'A valid API key is required.' }], isError: true });
  });
  it('returns the answer text', async () => {
    const ask = vi.fn<AskArchive>(async () => ({ ok: true, text: 'Answer' }));
    const request = call('ask_archive', { query: '  what replicates?  ' }, 'abc');
    const body = await (await handleMcp(request, async () => [], SITE, ask)).json();
    expect(body.result).toEqual({ content: [{ type: 'text', text: 'Answer' }] });
    expect(ask).toHaveBeenCalledWith(request, 'what replicates?', 'abc');
  });
  it('search_reviews still needs no key', async () => {
    const ask = vi.fn<AskArchive>();
    const body = await (await handleMcp(call('search_reviews', { query: 'q' }), async () => [], SITE, ask)).json();
    expect(body.result.content[0].text).toBe('No matching published review in the archive.');
    expect(ask).not.toHaveBeenCalled();
  });
  it('rejects a query over 600 characters', async () => {
    const ask = vi.fn<AskArchive>();
    const body = await (await handleMcp(call('ask_archive', { query: 'x'.repeat(601) }), async () => [], SITE, ask)).json();
    expect(body.error.code).toBe(-32602);
    expect(ask).not.toHaveBeenCalled();
  });
  it('reports the tool as unavailable where no handler is wired', async () => {
    const body = await (await handleMcp(call('ask_archive', { query: 'q' }), async () => [], SITE)).json();
    expect(body.result.isError).toBe(true);
  });
  it('turns a thrown handler into a tool error, not a crash', async () => {
    const body = await (await handleMcp(call('ask_archive', { query: 'q' }), async () => [], SITE, async () => { throw new Error('boom'); })).json();
    expect(body.result).toEqual({ content: [{ type: 'text', text: 'The answer could not be produced.' }], isError: true });
  });
  it('publishes version 1.1.0', () => {
    expect(mcpServerCard(SITE).version).toBe('1.1.0');
  });
});
