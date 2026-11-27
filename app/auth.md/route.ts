import { SITE } from '@/lib/site';
import { absoluteUrl } from '@/lib/seo';

/**
 * Auth.md — the agent-facing authentication and registration contract.
 *
 * This service is a public, read-only research site: every page and
 * machine-readable endpoint is served anonymously, and no credentials of
 * any kind are issued or accepted. There is no OAuth authorization server
 * and no protected resource, so no Protected Resource Metadata
 * (`/.well-known/oauth-protected-resource`) or Authorization Server
 * metadata exists to publish — inventing one would point agents at flows
 * that do not exist.
 *
 * This document is therefore self-contained: it names the agent audience,
 * states that no registration or provisioning is required, lists the
 * supported access method, and explains credential use (none).
 */
export const dynamic = 'force-static';

export function GET() {
  const body = [
    '# auth.md',
    '',
    `${SITE.name} is a public, read-only research site. This document tells automated`,
    'agents how to access it. There is no sign-up, no account, and no credential of',
    'any kind: read access is granted to everyone, including non-human clients.',
    '',
    '## Agent audience',
    '',
    'This document is addressed to automated agents — AI assistants, crawlers, and',
    'retrieval tools — that want to read the writing or consume the machine-readable',
    'endpoints. Human readers need nothing here; open any page in a browser.',
    '',
    '## Registration and provisioning',
    '',
    '**No registration or provisioning is required, and none is offered.** There are',
    'no registration endpoints, no provisioning endpoints, and no accounts to create.',
    'An agent that can make an HTTP GET request can use every resource listed below',
    'immediately, with no prior setup.',
    '',
    '## Supported methods',
    '',
    '- **Anonymous HTTP GET** — the only method. Every page and machine-readable',
    '  endpoint is served over HTTP(S) without authentication.',
    '- **No authentication headers** — do not send `Authorization`, `Cookie`, or',
    '  API-key headers. They are not expected and will not change the response.',
    '- **Markdown content negotiation** — send `Accept: text/markdown` on any HTML',
    '  page to receive its markdown representation (see the API catalog).',
    '',
    '## Credential use',
    '',
    '**No credentials are used, issued, or accepted.** There is no OAuth authorization',
    'server, no token endpoint, no API keys, and no bearer tokens. Because the site',
    'publishes no protected resource, no Protected Resource Metadata',
    '(`/.well-known/oauth-protected-resource`) and no Authorization Server metadata',
    '(`/.well-known/oauth-authorization-server`) exists — this document is the',
    'complete and authoritative auth contract.',
    '',
    '## Discovery',
    '',
    'The machine-readable surface an agent can consume:',
    '',
    `- [API Catalog](${absoluteUrl('/.well-known/api-catalog')}): RFC 9727 linkset of the machine-readable APIs, with OpenAPI specs.`,
    `- [llms.txt](${absoluteUrl('/llms.txt')}): plain-text index of the writing and endpoints.`,
    `- [Sitemap](${absoluteUrl('/sitemap.xml')}): every canonical URL.`,
    `- [robots.txt](${absoluteUrl('/robots.txt')}): crawl policy, including named AI crawlers.`,
    `- [security.txt](${absoluteUrl('/.well-known/security.txt')}): security contact for responsible disclosure.`,
    '',
    '## Rate and courtesy',
    '',
    'Be a polite reader: use the cached, machine-readable endpoints rather than',
    're-fetching article HTML, honour `Cache-Control`, and keep request volumes',
    'reasonable. The text is licensed ' + SITE.license + ' — quote and remix with attribution.',
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
