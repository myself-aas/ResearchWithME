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
  { id: 'billing', name: 'Billing', path: '/api/billing/entitlement', description: 'Read the signed-in account’s plan and purchase credits. A session is required.' },
  { id: 'webhooks', name: 'Billing webhook', path: '/api/webhooks/lemonsqueezy', description: 'Receive signed Lemon Squeezy billing events. A webhook signing secret is required.' },
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
