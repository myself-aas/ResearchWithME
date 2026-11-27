import { AUTHOR, SITE } from '@/lib/site';
import { absoluteUrl } from '@/lib/seo';

/**
 * A2A Agent Card (https://a2a-protocol.org/latest/specification/#agent-discovery-the-agent-card),
 * served at the well-known URI `/.well-known/agent-card.json` per the A2A
 * Agent Discovery convention (RFC 8615 well-known path).
 *
 * This card describes the service honestly: a public, read-only research
 * archive. The advertised interface is HTTP+JSON over the service root —
 * every skill below maps to a real, working endpoint. The service
 * implements no A2A JSON-RPC or gRPC binding, so only the HTTP+JSON
 * interface is declared, and the no-auth reality is reflected by the
 * absence of `securitySchemes`.
 */
export const dynamic = 'force-static';

export function GET() {
  const card = {
    name: SITE.name,
    version: '1.0.0',
    description:
      'ResearchWithMe is a public, read-only research archive: long-form essays on research papers, open-source repositories, and reproducible work, plus a set of machine-readable interfaces for automated agents. No authentication is required or accepted; every interface is anonymous and served over HTTP+JSON.',
    supportedInterfaces: [
      {
        url: SITE.url,
        protocolBinding: 'HTTP+JSON',
        protocolVersion: '1.0',
      },
    ],
    provider: {
      url: SITE.url,
      organization: AUTHOR.name,
    },
    documentationUrl: absoluteUrl('/llms.txt'),
    capabilities: {
      streaming: false,
      pushNotifications: false,
      extendedAgentCard: false,
    },
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['text/markdown', 'application/json', 'text/html'],
    skills: [
      {
        id: 'read-article-markdown',
        name: 'Read articles as Markdown',
        description:
          'Retrieve any published essay as clean Markdown instead of HTML. Send Accept: text/markdown to any article page, or fetch the markdown representation directly. Use this for citation, quoting, or feeding article text into a downstream language-model pipeline.',
        tags: ['markdown', 'articles', 'reading', 'content-negotiation'],
        examples: [
          'Get the full text of the Airflow review as Markdown for quotation.',
          'Fetch an article as Markdown to summarise it in a pipeline.',
        ],
        inputModes: ['text/plain'],
        outputModes: ['text/markdown'],
      },
      {
        id: 'discover-api-surface',
        name: 'Discover the machine-readable API surface',
        description:
          'Fetch the RFC 9727 API catalog (a linkset of every machine-readable interface) and the OpenAPI 3.1 specifications for the feed, search, llms.txt, and markdown interfaces. Use this first to learn which endpoints exist and how to call them.',
        tags: ['discovery', 'openapi', 'api-catalog', 'rfc9727'],
        examples: [
          'List all machine-readable endpoints the service exposes.',
          'Read the OpenAPI spec for the markdown content-negotiation interface.',
        ],
        inputModes: ['application/json'],
        outputModes: ['application/json'],
      },
      {
        id: 'search-archive',
        name: 'Search the archive',
        description:
          'Run full-text search across every published essay using the prebuilt search index. Query terms are matched against titles and post text, returning matching posts with their canonical URLs. Use this to find articles by topic before reading them.',
        tags: ['search', 'full-text', 'archive', 'index'],
        examples: [
          'Find every essay that discusses retry semantics.',
          'Locate posts mentioning a specific tool or paper.',
        ],
        inputModes: ['text/plain'],
        outputModes: ['application/json'],
      },
      {
        id: 'subscribe-feed',
        name: 'Subscribe to the article feed',
        description:
          'Retrieve the syndication feed of published articles in either RSS 2.0 (XML) or JSON Feed format, with the latest posts first. Use this to follow new writing without scraping the archive.',
        tags: ['feed', 'rss', 'json-feed', 'syndication', 'subscription'],
        examples: [
          'Get the latest five published essays as a JSON feed.',
          'Subscribe to new posts via the RSS 2.0 feed.',
        ],
        inputModes: ['application/json'],
        outputModes: ['application/json', 'application/xml'],
      },
      {
        id: 'read-llms-index',
        name: 'Read the llms.txt index',
        description:
          'Fetch the plain-text index of the site: the canonical URLs of the writing, the machine-readable interfaces, and the auth contract. Use this as a lightweight orientation pass before using the other skills.',
        tags: ['llms-txt', 'index', 'orientation', 'discovery'],
        examples: [
          'Get a compact map of what the site offers before invoking other skills.',
          'Check where the auth contract lives.',
        ],
        inputModes: ['application/json'],
        outputModes: ['text/plain'],
      },
    ],
  };

  return new Response(JSON.stringify(card, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

