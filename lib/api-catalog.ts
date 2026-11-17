import { absoluteUrl } from './seo';

/** Each entry represents a route group, including related item routes. */
export const API_GROUPS = [
  { id: 'articles', name: 'Articles', path: '/api/articles', description: 'Browse published articles and record reactions.' },
  { id: 'authors', name: 'Writers', path: '/api/authors', description: 'Browse published writer profiles and their article lists.' },
  { id: 'comments', name: 'Comments', path: '/api/comments', description: 'Read and submit article comments.' },
  { id: 'research-assistant', name: 'Research assistant', path: '/api/research-assistant', description: 'Ask questions grounded in the article catalog.' },
  { id: 'a2a', name: 'A2A archive agent', path: '/api/a2a', description: 'Send textual A2A JSON-RPC messages to search the published archive.' },
  { id: 'cms-posts', name: 'Editorial posts', path: '/api/cms/posts', description: 'Manage editorial posts. Editor access is required.' },
  { id: 'cms-comments', name: 'Comment moderation', path: '/api/cms/comments', description: 'Moderate comments. Editor access is required.' },
  { id: 'applications', name: 'Writer applications', path: '/api/dashboard/applications', description: 'Manage writer applications. A signed-in session is required; reviews require editor access.' },
  { id: 'revalidate', name: 'Cache revalidation', path: '/api/revalidate', description: 'Receive database webhooks that invalidate cached pages. A shared secret is required.' },
  { id: 'billing', name: 'Billing', path: '/api/billing/checkout', description: 'Start a checkout for one of this site’s products. A session is required.' },
  { id: 'entitlement', name: 'Account plan', path: '/api/billing/entitlement', description: 'Read the signed-in account’s plan and purchase credits. A session is required.' },
  { id: 'assistant-api', name: 'Assistant API', path: '/api/v1/assistant/answers', description: 'Ask the Assistant with an API key. Rate limited per key, with a monthly allowance per account.' },
  { id: 'api-usage', name: 'API usage', path: '/api/v1/usage', description: 'Read how much of the monthly Assistant API allowance is used. An API key is required.' },
  { id: 'api-keys', name: 'API keys', path: '/api/account/api-keys', description: 'Create, list, and revoke keys for the versioned Assistant API. A session is required.' },
  { id: 'linkedin', name: 'LinkedIn administration', path: '/api/admin/linkedin/auth', description: 'Manage LinkedIn authorization, posting, and status.' },
  { id: 'linkedin-callback', name: 'LinkedIn callback', path: '/api/admin/linkedin/callback', description: 'Complete LinkedIn authorization.' },
  { id: 'linkedin-post', name: 'LinkedIn posting', path: '/api/admin/linkedin/post', description: 'Post an article as an administrator.' },
  { id: 'linkedin-status', name: 'LinkedIn status', path: '/api/admin/linkedin/status', description: 'Read LinkedIn posting status as an administrator.' },
  { id: 'linkedin-cron', name: 'LinkedIn batch', path: '/api/cron/linkedin-batch', description: 'Trigger the LinkedIn batch using a cron secret.' },
  { id: 'article-webhook', name: 'Editorial publication webhook', path: '/api/webhooks/article-published', description: 'HMAC-verified webhook receiving published editorial post events for LinkedIn automation.' },
  { id: 'webhooks', name: 'Billing webhook', path: '/api/webhooks/lemonsqueezy', description: 'Receive signed Lemon Squeezy billing events. A webhook signing secret is required.' },
  { id: 'contributions', name: 'Research contributions', path: '/api/contributions', description: 'Create, update, browse, and publish evidence-linked scholarly contributions.' },
  { id: 'drafts', name: 'Offline-first drafts', path: '/api/drafts/{id}', description: 'Idempotent draft autosave, history snapshots, and optimistic concurrency conflict resolution.' },
  { id: 'sources', name: 'Canonical sources', path: '/api/sources', description: 'Resolve DOI, arXiv, GitHub, and URL sources and record integrity events.' },
  { id: 'evidence', name: 'Evidence units', path: '/api/evidence', description: 'Attach and refine located evidence units bound to canonical source versions.' },
  { id: 'claims', name: 'Structured claims', path: '/api/claims', description: 'Create and list typed scholarly claims.' },
  { id: 'relationships', name: 'Scholarly relationships', path: '/api/relationships', description: 'Link claims, evidence, and contributions with explicit support, contradiction, or qualification edges.' },
  { id: 'feed', name: 'Research network feed', path: '/api/feed', description: 'Query the unified feed combining structured contributions and published editorial reviews.' },
  { id: 'library', name: 'Personal research library', path: '/api/library', description: 'Save and organize sources, articles, and contributions into collections.' },
  { id: 'goals', name: 'Personal research goals', path: '/api/goals', description: 'Track calm, substantive research milestone goals.' },
  { id: 'workspaces', name: 'Research workspaces', path: '/api/workspaces', description: 'Create and manage collaborative research workspaces and membership roles.' },
  { id: 'projects', name: 'Research projects', path: '/api/projects', description: 'Manage structured research projects, milestones, linked scholarly objects, and workspace-bound project membership.' },
  { id: 'reviews', name: 'Formal peer reviews', path: '/api/reviews', description: 'Conduct version-aware formal peer reviews, linked author rebuttals, and editorial decisions.' },
  { id: 'discussions', name: 'Scholarly discussions', path: '/api/discussions', description: 'Informal threaded scholarly discussions kept explicitly separate from formal peer review.' },
  { id: 'tools', name: 'Tool repositories', path: '/api/tools', description: 'Global deduplicated open-source tool repositories with timestamped observations and citable software source links.' },
  { id: 'notifications', name: 'Notifications', path: '/api/notifications', description: 'Event-history notifications that can be read without resolving mandatory attention items.' },
  { id: 'attention', name: 'Attention queue', path: '/api/attention', description: 'Action-required attention items with open, acknowledged, resolved, and dismissed lifecycle states.' },
  { id: 'assistant-tasks', name: 'Assistant tasks', path: '/api/assistant-tasks', description: 'Optional AI-assisted research suggestions requiring explicit human promotion to enter the attention queue.' },
  { id: 'recognition', name: 'Scholarly recognition', path: '/api/recognition', description: 'Event-fact scholarly recognition ledger with non-self validation, reversals, and zero composite vanity scores.' },
  { id: 'dashboard-preferences', name: 'Dashboard preferences', path: '/api/dashboard/preferences', description: 'Personal Research OS default landing behavior, digest cadence, and followed topics.' },
  { id: 'dashboard-home', name: 'Research OS home', path: '/api/dashboard/home', description: 'Aggregated Personal Research OS snapshot combining attention queue, notifications, goals, library, workspaces, assistant suggestions, and recognition summary.' },
  { id: 'topics', name: 'Topic taxonomy', path: '/api/topics', description: 'First-class FK-backed scholarly topics and canonical assignments across contributions, sources, projects, and tools.' },
  { id: 'saved-searches', name: 'Saved searches & alerts', path: '/api/search/saved', description: 'Personal saved search queries with configurable alert cadence.' },
  { id: 'citation-collections', name: 'Citation collections', path: '/api/citation-collections', description: 'Structured citation collections enforcing single-target items (source, contribution, or evidence) with BibTeX export.' },
  { id: 'graph-projection', name: 'Graph read projection', path: '/api/graph/rebuild', description: 'Inspect and deterministically drop-and-rebuild the GraphNode/GraphEdge read projection from canonical tables.' },
  { id: 'search', name: 'Unified scholarly search', path: '/api/search', description: 'Multi-entity lexical and normalized identifier search across sources, contributions, tools, projects, claims, and topics with match-reason disclosure and transparent expansion.' },
  { id: 'ai-citations', name: 'AI citation validator', path: '/api/ai/validate-citations', description: 'Deterministic verification of citations, source versions, and claim-evidence links before publication with external provider classification guards.' },
  { id: 'ai-quotations', name: 'AI quotation verifier', path: '/api/ai/check-quotation', description: 'Verbatim and normalized quotation verification against canonical source excerpts with quotation-mismatch publication blockers.' },
  { id: 'ai-entailment', name: 'AI entailment verifier', path: '/api/ai/check-entailment', description: 'Deterministic claim-evidence entailment and contradiction verification with full AI provenance logging.' },
  { id: 'ai-provenance', name: 'AI provenance ledger', path: '/api/ai/provenance', description: 'Audit ledger and human approval workflow for AI-assisted research operations.' },
  { id: 'exports', name: 'Scholarly exports', path: '/api/exports', description: 'Checksummed BibTeX, CSL-JSON, Markdown provenance, and JSON-LD scholarly export artifacts.' },
  { id: 'devices', name: 'Registered devices', path: '/api/devices', description: 'Manage registered browser and PWA devices with remote revocation and logout wipe.' },
  { id: 'push-subscriptions', name: 'Push subscriptions', path: '/api/push/subscriptions', description: 'Manage Web Push subscriptions with classification-safe lock-screen preview defaults.' },
  { id: 'mobile-sync', name: 'Offline delta sync', path: '/api/sync/{resourceType}', description: 'Incremental cursor-based offline sync across drafts, library, notifications, attention, goals, and contributions.' },
  { id: 'me-profile', name: 'Contributor identity & affiliations', path: '/api/me/profile', description: 'Manage authenticated researcher profile, institutional affiliations, ORCID/GitHub handles, and expertise tags.' },
  { id: 'me-export', name: 'Portable account data export', path: '/api/me/export', description: 'Download a SHA-256 checksummed JSON export of all personal drafts, library items, goals, and research activity.' },
  { id: 'profiles', name: 'Public contributor profiles', path: '/api/profiles/{username}', description: 'Public scholarly identity, institutional affiliations, verified expertise, contributions, and event-fact recognition summary.' },
  { id: 'dashboard-modules', name: 'Dashboard module layout', path: '/api/dashboard/modules/{moduleKey}', description: 'Pin, collapse, hide, or reorder Personal Research OS dashboard modules.' },
] as const;

export type ApiGroupId = (typeof API_GROUPS)[number]['id'];
export const API_CATALOG_PATH = '/.well-known/api-catalog';
export const OPENAPI_PATH = '/openapi.json';
export const API_DOCS_PATH = '/api-docs';
export const API_CATALOG_LINK = `<${API_CATALOG_PATH}>; rel="api-catalog"; type="application/linkset+json"`;

/** RFC 9727 Appendix A.1: one link context for each API route group. */
export function apiCatalog() {
  return {
    linkset: API_GROUPS.map((group) => ({
      anchor: absoluteUrl(group.path),
      'service-desc': [{ href: absoluteUrl(OPENAPI_PATH), type: 'application/json' }],
      'service-doc': [{ href: `${absoluteUrl(API_DOCS_PATH)}#${group.id}`, type: 'text/html' }],
    })),
  };
}
