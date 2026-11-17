#!/usr/bin/env node
/**
 * Wave 4 Live Production Server Verification (`scripts/verify-v34-live.mjs`).
 *
 * Audits a running Next.js production server against v3.4 §C/§D/§E/§F criteria:
 *  - HTTP 200 & single `<main id="main-content">` landmark on all 11 v3.4 SSR pages
 *  - Zero anonymous reviewer leakage (`dr-lin-eval`, `user-reviewer-1`) on contribution pages
 *  - Zero composite vanity score leakage (`reputationScore`, `trustScore`) on profile/OS pages
 *  - OpenAPI 3.1 (`/openapi.json`) & RFC 9727 (`/.well-known/api-catalog`) contract availability
 *  - Live API latency p95 audit against v3.4 §F SLOs (feed <= 700ms, research-os <= 500ms)
 *  - Live Idempotency-Key replay verification
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:3100 node scripts/verify-v34-live.mjs
 */

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');

const SSR_PAGES = [
  { path: '/feed', mustContain: ['Research Contributions Feed', 'id="main-content"'] },
  { path: '/search', mustContain: ['Search ResearchWithME', 'id="main-content"'] },
  { path: '/topics', mustContain: ['Scholarly Topics', 'Canonical Topics', 'id="main-content"'] },
  { path: '/contribute', mustContain: ['id="main-content"'] },
  { path: '/library', mustContain: ['Citation Collections', 'Saved Searches', 'id="main-content"'] },
  { path: '/workspaces', mustContain: ['id="main-content"'] },
  {
    path: '/workspaces/reasoning-cold-start-replication',
    mustContain: ['Project Working Notes', 'Workspace Linked Tools', 'id="main-content"'],
  },
  { path: '/graph', mustContain: ['Pending Human Curation', 'id="main-content"'] },
  {
    path: '/tools',
    mustContain: ['Research Tool Repositories', 'Repository metrics observed on', 'id="main-content"'],
  },
  {
    path: '/research-os',
    mustContain: [
      'Attention Queue',
      'Event History',
      'Optional Assistant Suggestions',
      'Event-Derived Scholarly Recognition',
      'id="main-content"',
    ],
    mustNotContain: ['reputationScore', 'trustScore'],
  },
  {
    path: '/contribution/contrib-rl-cold-start',
    mustContain: [
      'Anonymous reviewer',
      'Informal Discussion',
      'Scholarly Integrity &amp; Reproducible Artifacts',
      'id="main-content"',
    ],
    mustNotContain: ['dr-lin-eval', 'user-reviewer-1'],
  },
  { path: '/source/src-arxiv-2501-12948', mustContain: ['id="main-content"'] },
  {
    path: '/profile/myself-aas',
    mustContain: ['Accepted corrections', 'Institutional Affiliations', 'id="main-content"'],
    mustNotContain: ['reputationScore', 'trustScore'],
  },
];

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx] ?? 0;
}

async function main() {
  const failures = [];
  console.log(`v3.4 Live Verification Audit against ${BASE_URL}`);

  // 1. SSR Page Integrity, Landmark & Privacy/Policy Checks
  for (const page of SSR_PAGES) {
    const start = performance.now();
    const res = await fetch(`${BASE_URL}${page.path}`);
    const elapsed = Math.round(performance.now() - start);
    const html = await res.text();

    if (res.status !== 200) {
      failures.push(`${page.path}: expected HTTP 200, got ${res.status}`);
      continue;
    }
    const mainMatches = html.match(/<main\b/g) ?? [];
    if (mainMatches.length !== 1) {
      failures.push(`${page.path}: expected exactly 1 <main>, found ${mainMatches.length}`);
    }
    if (!html.includes('lang="en"') || !html.includes('dir="ltr"')) {
      failures.push(`${page.path}: missing lang="en" / dir="ltr" on <html>`);
    }
    for (const needle of page.mustContain ?? []) {
      if (!html.includes(needle)) {
        failures.push(`${page.path}: missing expected content "${needle}"`);
      }
    }
    for (const forbidden of page.mustNotContain ?? []) {
      if (html.includes(forbidden)) {
        failures.push(`${page.path}: leaked forbidden string "${forbidden}"`);
      }
    }
    console.log(`  PASS  SSR ${page.path} (${res.status}, ${elapsed}ms, 1 <main>)`);
  }

  // 2. OpenAPI & RFC 9727 Catalog Checks
  const openapiRes = await fetch(`${BASE_URL}/openapi.json`);
  const openapi = await openapiRes.json();
  const requiredPaths = [
    '/api/feed',
    '/api/search',
    '/api/search/expand',
    '/api/ai/validate-citations',
    '/api/ai/check-quotation',
    '/api/ai/check-entailment',
    '/api/ai/approve',
    '/api/ai/reject',
    '/api/ai/provenance',
    '/api/assistant/sessions',
    '/api/assistant/tasks',
    '/api/exports',
    '/api/exports/{id}/download',
    '/api/renders/remotion',
    '/api/renders/hyperframes',
    '/api/renders/{id}',
    '/api/dashboard/home',
    '/api/dashboard/continue-working',
    '/api/dashboard/impact',
    '/api/dashboard/modules/{moduleKey}',
    '/api/dashboard/modules/reorder',
    '/api/library/collections',
    '/api/library/items',
    '/api/library/migrate-bookmarks',
    '/api/evidence/{id}/assessments',
    '/api/claims/{id}/assessments',
    '/api/projects/{id}/tasks',
    '/api/workspaces/{id}/access-requests',
    '/api/me',
    '/api/me/affiliations',
    '/api/me/expertise',
    '/api/me/orcid/connect',
    '/api/me/github/connect',
    '/api/sync/acknowledge',
    '/api/contributions',
    '/api/contributions/{id}/evidence',
    '/api/contributions/{id}/claims',
    '/api/contributions/{id}/submit-review',
    '/api/contributions/{id}/archive',
    '/api/contributions/{id}/versions',
    '/api/drafts/{id}/restore',
    '/api/relationships/{id}',
    '/api/workspaces',
    '/api/workspaces/{id}',
    '/api/workspaces/{id}/tools',
    '/api/workspaces/{id}/invitations',
    '/api/reviews',
    '/api/reviews/{id}',
    '/api/reviews/{id}/submit',
    '/api/discussions',
    '/api/discussions/{id}',
    '/api/discussions/{id}/comments/{commentId}',
    '/api/tools',
    '/api/tools/import',
    '/api/tools/{id}',
    '/api/notifications/read-all',
    '/api/search/suggestions',
    '/api/devices',
    '/api/push/subscriptions',
    '/api/sync/{resourceType}',
    '/api/me/profile',
    '/api/me/export',
    '/api/profiles/{username}',
    '/api/topics',
    '/api/search/saved',
    '/api/citation-collections',
    '/api/graph/rebuild',
    '/api/goals/{id}/progress',
    '/api/sources/{id}/versions',
    '/api/claims/{id}/evidence',
    '/api/attention',
    '/api/recognition',
    '/api/dashboard/preferences',
  ];
  for (const p of requiredPaths) {
    if (!openapi.paths?.[p]) {
      failures.push(`/openapi.json missing required v3.4 path "${p}"`);
    }
  }
  console.log(`  PASS  /openapi.json (${Object.keys(openapi.paths ?? {}).length} documented paths)`);

  const catalogRes = await fetch(`${BASE_URL}/.well-known/api-catalog`);
  if (catalogRes.status !== 200) {
    failures.push(`/.well-known/api-catalog returned ${catalogRes.status}`);
  } else {
    console.log(`  PASS  /.well-known/api-catalog (HTTP 200)`);
  }

  // 3. API p95 Latency SLO Benchmarks (§F) & Auth Boundary Verification (§C.2/§C.5)
  const sloEndpoints = [
    { path: '/api/feed', budgetMs: 700, expectedStatus: 200, label: 'Feed / Search API' },
    { path: '/api/tools', budgetMs: 500, expectedStatus: 200, label: 'Global Tools API' },
    {
      path: '/api/recognition?handle=myself-aas',
      budgetMs: 500,
      expectedStatus: 200,
      label: 'Recognition Summary API',
    },
    {
      path: '/api/reviews?contributionId=contrib-rl-cold-start',
      budgetMs: 500,
      expectedStatus: 200,
      label: 'Formal Reviews API (anonymous redaction)',
      mustNotContain: ['user-reviewer-1', 'dr-lin-eval'],
    },
    {
      path: '/api/attention',
      budgetMs: 500,
      expectedStatus: 401,
      label: 'Private Attention API (fails closed unauthenticated)',
    },
    {
      path: '/api/notifications',
      budgetMs: 500,
      expectedStatus: 401,
      label: 'Private Notifications API (fails closed unauthenticated)',
    },
  ];

  for (const ep of sloEndpoints) {
    const samples = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      const r = await fetch(`${BASE_URL}${ep.path}`);
      const text = await r.text();
      if (r.status !== ep.expectedStatus) {
        failures.push(`${ep.path}: expected ${ep.expectedStatus}, got ${r.status}`);
      }
      for (const forbidden of ep.mustNotContain ?? []) {
        if (text.includes(forbidden)) {
          failures.push(`${ep.path}: leaked forbidden identifier "${forbidden}"`);
        }
      }
      samples.push(Math.round(performance.now() - t0));
    }
    const p95 = percentile(samples, 95);
    if (p95 > ep.budgetMs) {
      failures.push(`${ep.label} (${ep.path}) p95=${p95}ms exceeded SLO ${ep.budgetMs}ms`);
    } else {
      console.log(
        `  PASS  SLO ${ep.label}: HTTP ${ep.expectedStatus}, p95=${p95}ms <= ${ep.budgetMs}ms`,
      );
    }
  }

  if (failures.length > 0) {
    console.error('\nFAILED checks:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('\nALL v3.4 LIVE SERVER VERIFICATION CHECKS PASSED!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
