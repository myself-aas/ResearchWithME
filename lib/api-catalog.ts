import { SITE } from '@/lib/site';
import { absoluteUrl } from '@/lib/seo';

/**
 * RFC 9727 api-catalog — the linkset document served at
 * `/.well-known/api-catalog`, plus the OpenAPI specifications it links to.
 *
 * The catalog lists every machine-readable API the site publishes, so an
 * agent can discover them without scraping the HTML. Each entry carries an
 * `anchor` and the standard link relations from RFC 9727 Appendix A.1:
 * `service-desc` (OpenAPI spec, machine consumption), `service-doc`
 * (human-readable documentation), and `status` (health endpoint).
 *
 * The OpenAPI documents are built here rather than hand-written files so
 * the catalog and the specs stay in sync: one source of truth for both.
 */

export interface LinkObject {
  href: string;
  type: string;
}

export interface ApiCatalogEntry {
  anchor: string;
  'service-desc': LinkObject[];
  'service-doc': LinkObject[];
  'status'?: LinkObject[];
}

export interface ApiCatalog {
  linkset: ApiCatalogEntry[];
}

export interface OpenApiDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: { url: string }[];
  paths: Record<string, unknown>;
}

/** Well-known path of the catalog document itself. */
export const API_CATALOG_PATH = '/.well-known/api-catalog';

/** Path prefix under which the OpenAPI specifications are served. */
export const OPENAPI_PATH_PREFIX = `${API_CATALOG_PATH}/openapi`;

/** Health endpoint linked as the `status` relation. */
export const HEALTH_PATH = '/api/health';

/** Human-readable documentation of the machine-readable surface. */
const SERVICE_DOC: LinkObject = {
  href: absoluteUrl('/llms.txt'),
  type: 'text/plain',
};

const STATUS_LINK: LinkObject = {
  href: absoluteUrl(HEALTH_PATH),
  type: 'application/json',
};

/** Spec names, also used as the `[name]` route parameter. */
export const OPENAPI_SPECS = ['feeds.json', 'search.json', 'llms.json', 'markdown.json'] as const;
export type OpenApiSpecName = (typeof OPENAPI_SPECS)[number];

function specHref(name: OpenApiSpecName): string {
  return absoluteUrl(`${OPENAPI_PATH_PREFIX}/${name}`);
}

/**
 * The linkset document. Anchors point at the primary endpoint of each API;
 * `service-desc` at its OpenAPI specification.
 */
export function buildApiCatalog(): ApiCatalog {
  return {
    linkset: [
      {
        anchor: absoluteUrl('/feed.json'),
        'service-desc': [{ href: specHref('feeds.json'), type: 'application/json' }],
        'service-doc': [SERVICE_DOC],
        status: [STATUS_LINK],
      },
      {
        anchor: absoluteUrl('/search-index.json'),
        'service-desc': [{ href: specHref('search.json'), type: 'application/json' }],
        'service-doc': [SERVICE_DOC],
        status: [STATUS_LINK],
      },
      {
        anchor: absoluteUrl('/llms.txt'),
        'service-desc': [{ href: specHref('llms.json'), type: 'application/json' }],
        'service-doc': [SERVICE_DOC],
        status: [STATUS_LINK],
      },
      {
        anchor: absoluteUrl('/'),
        'service-desc': [{ href: specHref('markdown.json'), type: 'application/json' }],
        'service-doc': [SERVICE_DOC],
        status: [STATUS_LINK],
      },
    ],
  };
}

function serverList() {
  return [{ url: SITE.url }];
}

/** OpenAPI 3.1 for the syndication feeds: one source, two representations. */
export function feedsSpec(): OpenApiDocument {
  return {
    openapi: '3.1.0',
    info: {
      title: 'ResearchWithMe Content Feeds API',
      version: '1.0.0',
      description:
        'The full essay archive as syndication feeds. JSON Feed 1.1 and RSS 2.0 are generated from the same content collection: an item present in one is present in the other.',
    },
    servers: serverList(),
    paths: {
      '/feed.json': {
        get: {
          summary: 'JSON Feed 1.1 archive',
          description: 'Every essay, newest first, as a JSON Feed 1.1 document.',
          responses: {
            '200': {
              description: 'JSON Feed 1.1 document.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['version', 'title', 'home_page_url', 'items'],
                    properties: {
                      version: { type: 'string' },
                      title: { type: 'string' },
                      home_page_url: { type: 'string' },
                      feed_url: { type: 'string' },
                      items: {
                        type: 'array',
                        items: {
                          type: 'object',
                          required: ['id', 'url', 'title'],
                          properties: {
                            id: { type: 'string' },
                            url: { type: 'string' },
                            title: { type: 'string' },
                            date_published: { type: 'string', format: 'date-time' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/rss.xml': {
        get: {
          summary: 'RSS 2.0 archive',
          description: 'The same items as an RSS 2.0 feed.',
          responses: {
            '200': {
              description: 'RSS 2.0 document.',
              content: {
                'application/rss+xml': {
                  schema: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  };
}

/** OpenAPI 3.1 for the full-text search index behind the search page. */
export function searchSpec(): OpenApiDocument {
  return {
    openapi: '3.1.0',
    info: {
      title: 'ResearchWithMe Search Index API',
      version: '1.0.0',
      description:
        'The full-text half of the site search. Bodies live here so the search page stays small; the browser fetches once and matches locally — no query leaves the reader’s machine.',
    },
    servers: serverList(),
    paths: {
      '/search-index.json': {
        get: {
          summary: 'Full-text search index',
          description: 'Titles, descriptions, tags, and bodies of every essay.',
          responses: {
            '200': {
              description: 'Search index document.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['version', 'count', 'docs'],
                    properties: {
                      version: { type: 'number' },
                      count: { type: 'number' },
                      docs: {
                        type: 'array',
                        items: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

/** OpenAPI 3.1 for the LLM-readable site index. */
export function llmsSpec(): OpenApiDocument {
  return {
    openapi: '3.1.0',
    info: {
      title: 'ResearchWithMe LLM Index API',
      version: '1.0.0',
      description:
        'The human-and-agent-readable index of the site: an H1, a one-paragraph summary, and annotated links to every essay and machine-readable resource.',
    },
    servers: serverList(),
    paths: {
      '/llms.txt': {
        get: {
          summary: 'LLM-readable site index',
          description: 'Plain-text index of the writing and the machine-readable endpoints.',
          responses: {
            '200': {
              description: 'Index document.',
              content: {
                'text/plain': {
                  schema: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  };
}

/** OpenAPI 3.1 for the markdown content-negotiation API. */
export function markdownSpec(): OpenApiDocument {
  return {
    openapi: '3.1.0',
    info: {
      title: 'ResearchWithMe Markdown API',
      version: '1.0.0',
      description:
        'Markdown representations for agents. Any HTML page serves markdown when the request sends `Accept: text/markdown`; every essay also has a stable markdown URL at `<canonical>/markdown`. Markdown responses carry `X-Markdown-Tokens` so agents can budget context before reading.',
    },
    servers: serverList(),
    paths: {
      '/': {
        get: {
          summary: 'Page with markdown content negotiation',
          description:
            'HTML by default. Send `Accept: text/markdown` to receive the markdown representation of the page.',
          parameters: [
            {
              name: 'Accept',
              in: 'header',
              required: false,
              description: 'Set to `text/markdown` to receive the markdown representation.',
              schema: { type: 'string', example: 'text/markdown' },
            },
          ],
          responses: {
            '200': {
              description: 'HTML, or markdown when `Accept: text/markdown` is sent.',
              headers: {
                'X-Markdown-Tokens': {
                  description: 'Approximate token count of the markdown body.',
                  schema: { type: 'integer' },
                },
              },
              content: {
                'text/html': {
                  schema: { type: 'string' },
                },
                'text/markdown': {
                  schema: { type: 'string' },
                },
              },
            },
          },
        },
      },
      '/blog/{slug}/markdown': {
        get: {
          summary: 'Markdown representation of an essay',
          description: 'The same source the HTML renders from, with YAML frontmatter.',
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Markdown document with YAML frontmatter.',
              headers: {
                'X-Markdown-Tokens': {
                  description: 'Approximate token count of the markdown body.',
                  schema: { type: 'integer' },
                },
              },
              content: {
                'text/markdown': {
                  schema: { type: 'string' },
                },
              },
            },
            '404': {
              description: 'No essay lives at this address.',
            },
          },
        },
      },
    },
  };
}

const SPEC_BUILDERS: Record<OpenApiSpecName, () => OpenApiDocument> = {
  'feeds.json': feedsSpec,
  'search.json': searchSpec,
  'llms.json': llmsSpec,
  'markdown.json': markdownSpec,
};

/** Look up a served OpenAPI document by its route name, or null. */
export function getOpenApiSpec(name: string): OpenApiDocument | null {
  if (!(name in SPEC_BUILDERS)) return null;
  return SPEC_BUILDERS[name as OpenApiSpecName]();
}

