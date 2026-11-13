#!/usr/bin/env node
/** Publish the researchwith.me DNS-AID records using Cloudflare's DNS API.
 * Dry-run by default; --apply requires a zone-scoped API token. Never logs it.
 */
export const DOMAIN = 'researchwith.me';
export const TTL = 3600;
const TARGET = `${DOMAIN}.`;
const CORE = 'mandatory="alpn,port" alpn="h2" port="443"';

export const RECORDS = [
  { name: `_index._agents.${DOMAIN}`, data: { priority: 1, target: TARGET, value: CORE } },
  { name: `_a2a._agents.${DOMAIN}`, data: { priority: 1, target: TARGET, value: `${CORE} key65409="agent-card.json"` } },
  { name: `_mcp._agents.${DOMAIN}`, data: { priority: 1, target: TARGET, value: `${CORE} key65409="mcp/server-card.json"` } },
];

const API = 'https://api.cloudflare.com/client/v4';

export async function publish({ token, apply = false, enableDnssec = false, fetcher = fetch, log = console.log }) {
  if (!apply) {
    for (const record of RECORDS) log(`${record.name}. ${TTL} IN SVCB ${record.data.priority} ${record.data.target} ${record.data.value}`);
    log('Dry run only. Set CLOUDFLARE_API_TOKEN and pass --apply to publish. DNSSEC requires a separate opt-in and registrar DS verification.');
    return;
  }
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN is required for --apply.');
  const api = async (path, method = 'GET', body) => {
    const response = await fetcher(`${API}${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await response.json();
    if (!response.ok || json.success !== true) throw new Error(`Cloudflare ${method} ${path} failed: ${JSON.stringify(json.errors ?? response.status)}`);
    return json.result;
  };

  const zones = await api(`/zones?name=${DOMAIN}&status=active&per_page=50`);
  const zone = zones.filter((item) => item.name === DOMAIN);
  if (zone.length !== 1) throw new Error(`Expected exactly one active ${DOMAIN} zone.`);
  const zoneId = zone[0].id;
  const dnssecPath = `/zones/${zoneId}/dnssec`;
  let dnssec = await api(dnssecPath);
  if (enableDnssec && dnssec.status !== 'active') {
    dnssec = await api(dnssecPath, 'PATCH', { status: 'active' });
    log('Enabled Cloudflare DNSSEC; install/verify the DS record at the registrar before considering the zone authenticated.');
  }
  log(`Cloudflare DNSSEC: ${dnssec.status ?? 'unknown'}. Verify the parent DS and a validating resolver AD flag separately.`);
  if (dnssec.status !== 'active') throw new Error('DNSSEC is not active. Re-run with --enable-dnssec after reviewing registrar DS setup.');

  for (const record of RECORDS) {
    const path = `/zones/${zoneId}/dns_records`;
    const existing = await api(`${path}?name=${encodeURIComponent(record.name)}&per_page=100`);
    if (existing.some((item) => item.type === 'CNAME') || existing.filter((item) => item.type === 'SVCB').length > 1) {
      throw new Error(`Conflicting records at ${record.name}; inspect them manually before publishing.`);
    }
    const current = existing.find((item) => item.type === 'SVCB');
    const desired = { type: 'SVCB', name: record.name, ttl: TTL, data: record.data };
    if (current && JSON.stringify(current.data) === JSON.stringify(desired.data) && current.ttl === TTL) {
      log(`Unchanged: ${record.name}`);
      continue;
    }
    await api(current ? `${path}/${current.id}` : path, current ? 'PUT' : 'POST', desired);
    log(`${current ? 'Updated' : 'Created'}: ${record.name}`);
  }


}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const args = process.argv.slice(2);
  const allowed = new Set(['--apply', '--enable-dnssec']);
  if (args.some((arg) => !allowed.has(arg)) || (args.includes('--enable-dnssec') && !args.includes('--apply'))) {
    console.error('Usage: node scripts/dns-aid-cloudflare.mjs [--apply [--enable-dnssec]]');
    process.exitCode = 1;
  } else {
    publish({ token: process.env.CLOUDFLARE_API_TOKEN, apply: args.includes('--apply'), enableDnssec: args.includes('--enable-dnssec') })
      .catch((error) => { console.error(error.message); process.exitCode = 1; });
  }
}
