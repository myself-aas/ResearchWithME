import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verify } from '../scripts/verify-dns-aid.mjs';
import { RECORDS } from '../scripts/dns-aid-cloudflare.mjs';

test('validating DoH responses must authenticate every SVCB and parent DS', async () => {
  const messages = [];
  const fetcher = async (url) => {
    const record = RECORDS.find(({ name }) => url.includes(encodeURIComponent(name)));
    const result = record ? { Status: 0, AD: true, Answer: [{ type: 64, data: `1 ${record.data.target} ${record.data.value}` }] }
      : { Status: 0, AD: true, Answer: [{ type: 43, data: '1234 13 2 abcd' }] };
    return { ok: true, json: async () => result };
  };
  await verify(fetcher, (message) => messages.push(message));
  assert.equal(messages.length, 4);
});

test('does not report success if DNSSEC is not authenticated', async () => {
  const fetcher = async () => ({ ok: true, json: async () => ({ Status: 0, AD: false, Answer: [] }) });
  await assert.rejects(verify(fetcher, () => {}), /AD != true/);
});
