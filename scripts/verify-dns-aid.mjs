#!/usr/bin/env node
/** Verify published DNS-AID records through a validating DNS-over-HTTPS resolver. */
import { RECORDS, DOMAIN } from './dns-aid-cloudflare.mjs';

const RESOLVER = 'https://cloudflare-dns.com/dns-query';

export async function verify(fetcher = fetch, log = console.log) {
  for (const record of RECORDS) {
    const url = `${RESOLVER}?name=${encodeURIComponent(record.name)}&type=SVCB&do=1`;
    const response = await fetcher(url, { headers: { Accept: 'application/dns-json' } });
    if (!response.ok) throw new Error(`DoH failed for ${record.name}: HTTP ${response.status}`);
    const answer = await response.json();
    if (answer.Status !== 0 || answer.AD !== true) throw new Error(`${record.name}: SVCB response not DNSSEC-authenticated (AD != true). Check Cloudflare DNSSEC and parent DS.`);
    const svcb = answer.Answer?.filter((item) => item.type === 64) ?? [];
    if (!svcb.some((item) => item.data?.includes(record.data.target) &&
      item.data?.includes('alpn=') && item.data?.includes('port=') &&
      (!record.data.value.includes('key65409') || item.data?.includes('key65409=')))) {
      throw new Error(`${record.name}: expected ServiceMode SVCB not found.`);
    }
    log(`Authenticated SVCB: ${record.name}`);
  }
  const dsUrl = `${RESOLVER}?name=${encodeURIComponent(DOMAIN)}&type=DS&do=1`;
  const dsResponse = await fetcher(dsUrl, { headers: { Accept: 'application/dns-json' } });
  if (!dsResponse.ok) throw new Error(`DoH DS lookup failed: HTTP ${dsResponse.status}`);
  const ds = await dsResponse.json();
  if (ds.AD !== true || !(ds.Answer ?? []).some((item) => item.type === 43)) {
    throw new Error(`No validated DS for ${DOMAIN} at the parent; configure the registrar.`);
  }
  log(`Validated parent DS: ${DOMAIN}`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  verify().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
