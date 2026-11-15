import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAIN, RECORDS, publish } from '../scripts/dns-aid-cloudflare.mjs';

test('ServiceMode records point to deployed HTTPS services, use real HTTP ALPN, and numeric extension keys', () => {
  assert.equal(DOMAIN, 'researchwith.me');
  assert.deepEqual(RECORDS.map((r) => r.name), [
    '_index._agents.researchwith.me', '_a2a._agents.researchwith.me', '_mcp._agents.researchwith.me',
  ]);
  for (const record of RECORDS) {
    assert.equal(record.data.priority, 1);
    assert.equal(record.data.target, 'researchwith.me.');
    assert.match(record.data.value, /mandatory="alpn,port" alpn="h2" port="443"/);
    assert.doesNotMatch(record.data.value, /\b(cap|well-known)=/);
  }
  assert.match(RECORDS[1].data.value, /key65409="agent-card.json"/);
  assert.match(RECORDS[2].data.value, /key65409="mcp\/server-card.json"/);
});

test('dry run makes no network calls, even without credentials', async () => {
  const lines = [];
  await publish({ fetcher: () => { throw new Error('network called'); }, log: (line) => lines.push(line) });
  assert.match(lines[1], /^_a2a\._agents\.researchwith\.me\. 3600 IN SVCB 1/);
  assert.match(lines.at(-1), /Dry run only/);
});

test('apply upserts only named SVCB records, checks DNSSEC, and never logs the token', async () => {
  const calls = [];
  const lines = [];
  const fetcher = async (url, init) => {
    calls.push([url, init]);
    let result;
    if (url.includes('/zones?')) result = [{ id: 'zone-from-api', name: DOMAIN }];
    else if (url.includes('/dns_records?')) result = [];
    else if (url.endsWith('/dnssec')) result = { status: 'active' };
    else result = { id: 'record-from-api' };
    return { ok: true, json: async () => ({ success: true, result }) };
  };
  await publish({ token: 'test-token', apply: true, fetcher, log: (line) => lines.push(line) });
  const writes = calls.filter(([, init]) => init.method === 'POST');
  assert.equal(writes.length, 3);
  for (const [url, init] of writes) {
    assert.equal(url, 'https://api.cloudflare.com/client/v4/zones/zone-from-api/dns_records');
    const body = JSON.parse(init.body);
    assert.equal(body.type, 'SVCB');
    assert.equal(body.ttl, 3600);
    assert.equal(body.data.priority, 1);
  }
  assert.ok(calls.some(([url]) => url.endsWith('/dnssec')));
  assert.ok(calls.every(([, init]) => init.headers.Authorization === 'Bearer test-token'));
  assert.doesNotMatch(lines.join('\n'), /test-token/);
});

test('fails closed when DNSSEC is inactive, without implicitly enabling it', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push(init.method);
    const result = url.includes('/zones?') ? [{ id: 'z', name: DOMAIN }] : url.includes('/dns_records?') ? [] : url.endsWith('/dnssec') ? { status: 'disabled' } : {};
    return { ok: true, json: async () => ({ success: true, result }) };
  };
  await assert.rejects(publish({ token: 't', apply: true, fetcher, log: () => {} }), /DNSSEC is not active/);
  assert.ok(!calls.includes('PATCH'));
});
