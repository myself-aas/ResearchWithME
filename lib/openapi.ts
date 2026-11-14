import { API_GROUPS, type ApiGroupId } from './api-catalog';

// Keep the catalog, reference page, and OpenAPI paths together. Each operation
// describes a real App Router handler; the coverage test checks for drift.
type Schema = Record<string, unknown>;
type Parameter = {
  name: string;
  in: 'path' | 'query';
  required?: boolean;
  description: string;
  schema: Schema;
};
type RequestBody = {
  required?: boolean;
  description?: string;
  content: Record<string, { schema: Schema }>;
};
type ApiResponse = { description: string; content?: Record<string, { schema: Schema }> };
type Security = Array<Record<string, string[]>>;

export type ApiOperation = {
  group: ApiGroupId;
  method: 'get' | 'post' | 'patch' | 'delete';
  path: string;
  operationId: string;
  summary: string;
  description: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, ApiResponse>;
  security?: Security;
};

const text = { type: 'string' };
const integer = { type: 'integer' };
const boolean = { type: 'boolean' };
const strings = { type: 'array', items: text };
const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const array = (items: Schema): Schema => ({ type: 'array', items });
const object = (properties: Record<string, Schema>, required: string[] = []): Schema => ({
  type: 'object', properties, ...(required.length ? { required } : {}),
});
const json = (description: string, schema: Schema): ApiResponse => ({
  description, content: { 'application/json': { schema } },
});
const jsonBody = (schema: Schema, description: string, required = true): RequestBody => ({
  required, description, content: { 'application/json': { schema } },
});
const query = (name: string, description: string, schema: Schema = text): Parameter => ({ name, in: 'query', description, schema });
const path = (name: string, description: string): Parameter => ({ name, in: 'path', required: true, description, schema: text });
const errorDescriptions: Record<number, string> = {
  400: 'Invalid request or input.',
  401: 'Authentication or a valid webhook secret is required.',
  403: 'Insufficient privileges or a disallowed cross-site request.',
  404: 'The requested record does not exist.',
  409: 'The request conflicts with an existing record.',
  413: 'The request body is too large.',
  415: 'The request must be sent as application/json.',
  422: 'The selected author cannot be used for publication.',
  429: 'Too many requests; retry later.',
  500: 'The operation could not be completed.',
  502: 'The upstream generation service failed.',
  503: 'The service or its backing store is unavailable or not configured.',
};
const errors = (...codes: number[]): Record<string, ApiResponse> =>
  Object.fromEntries(codes.map((code) => [String(code), json(errorDescriptions[code], ref('Error'))]));
const session: Security = [{ SessionCookie: [] }];
const webhookSecret: Security = [{ RevalidateSecret: [] }];
const billingWebhook: Security = [{ BillingWebhookSignature: [] }];
const articleId = path('id', 'Published article ID or slug.');
const authorId = path('id', 'Published author profile ID.');
const cmsId = path('id', 'Editorial record ID.');
const applicationId = path('id', 'Numeric application ID.');
const apiErrorDescriptions: Record<number, string> = {
  400: 'The request is malformed or a field is invalid.',
  401: 'No valid credential was presented.',
  404: 'The record does not exist or belongs to another account.',
  409: 'The first request with this Idempotency-Key is still running.',
  415: 'The request must be sent as application/json.',
  422: 'The Idempotency-Key was already used with a different body.',
  429: 'Either the burst limit (RATE_LIMITED) or the monthly allowance (QUOTA_EXHAUSTED) was reached.',
  500: 'The request failed and used no allowance.',
  503: 'The archive or the usage ledger could not be reached.',
};
/** Responses in the structured `{ error: { code, message, details? } }` shape used by the versioned API. */
const apiErrors = (...codes: number[]): Record<string, ApiResponse> =>
  Object.fromEntries(codes.map((code) => [String(code), json(apiErrorDescriptions[code], ref('ApiError'))]));

export const API_OPERATIONS: ApiOperation[] = [
  {
    group: 'articles', method: 'get', path: '/api/articles', operationId: 'listArticles',
    summary: 'List published articles',
    description: 'Returns article metadata and a total count after filtering. The article body is omitted unless full=1; limit applies to the returned array, not the count.',
    parameters: [
      query('category', 'Exact category name, or All.'),
      query('format', 'Exact article format, or All.'),
      query('search', 'Case-insensitive search across article metadata, up to 120 characters.'),
      query('author', 'Case-insensitive exact author ID or name.'),
      query('limit', 'Maximum number of results, clamped to 1–100; defaults to 100.', { type: 'integer', minimum: 1, maximum: 100, default: 100 }),
      query('full', 'Set to 1 to include article bodies.', { type: 'string', enum: ['1'] }),
    ],
    responses: { 200: json('Matching articles and total count.', object({ articles: array(ref('Article')), count: integer }, ['articles', 'count'])), ...errors(500) },
  },
  {
    group: 'articles', method: 'get', path: '/api/articles/{id}', operationId: 'getArticle',
    summary: 'Get a published article', description: 'Returns the complete article, including its body, by ID or slug.',
    parameters: [articleId], responses: { 200: json('Published article.', object({ article: ref('Article') }, ['article'])), ...errors(400, 404, 500) },
  },
  {
    group: 'articles', method: 'patch', path: '/api/articles/{id}', operationId: 'likeArticle',
    summary: 'Record a reaction', description: 'Increments the article’s like count. No request body is needed; this operation is rate limited.',
    parameters: [articleId], responses: { 200: json('Updated like count.', object({ success: boolean, likes: integer }, ['success', 'likes'])), ...errors(400, 404, 429, 500) },
  },
  {
    group: 'authors', method: 'get', path: '/api/authors', operationId: 'listAuthors',
    summary: 'List published authors', description: 'Returns published profiles and their article counts.',
    responses: { 200: json('Published author profiles.', object({ authors: array(ref('Author')) }, ['authors'])), ...errors(500) },
  },
  {
    group: 'authors', method: 'get', path: '/api/authors/{id}', operationId: 'getAuthor',
    summary: 'Get an author archive', description: 'Returns a published profile, its articles, and aggregate metrics.',
    parameters: [authorId], responses: { 200: json('Author and archive.', object({ author: ref('Author'), articles: array(ref('Article')), metrics: ref('AuthorMetrics') }, ['author', 'articles', 'metrics'])), ...errors(400, 404, 500) },
  },
  {
    group: 'comments', method: 'get', path: '/api/comments', operationId: 'listComments',
    summary: 'List comments', description: 'Returns comments for a post ID. Without postId, returns up to 200 locally stored comments.',
    parameters: [query('postId', 'Article ID, including a CMS public post ID when applicable.')],
    responses: { 200: json('Comments.', object({ comments: array(ref('Comment')) }, ['comments'])), ...errors(500) },
  },
  {
    group: 'comments', method: 'post', path: '/api/comments', operationId: 'createComment',
    summary: 'Submit a comment', description: 'Accepts JSON with postId, authorName, text, and optional authorRole. Browser requests with an Origin must be same-origin; submissions are rate limited.',
    requestBody: jsonBody(ref('CommentInput'), 'The article and comment to publish.'),
    responses: { 201: json('Comment saved.', object({ success: boolean, comment: ref('Comment') }, ['success', 'comment'])), ...errors(400, 403, 404, 415, 429, 503) },
  },
  {
    group: 'research-assistant', method: 'post', path: '/api/research-assistant', operationId: 'askResearchAssistant',
    summary: 'Ask the research assistant', description: 'Send a JSON query (up to 600 characters). The answer uses the published catalog and falls back to a deterministic answer when the language model is unavailable.',
    requestBody: jsonBody(object({ query: { type: 'string', minLength: 1, maxLength: 600 } }, ['query']), 'Question about the archive.'),
    responses: { 200: json('Answer and citations.', object({ answer: text, citations: array(ref('AssistantCitation')), mode: { type: 'string', enum: ['catalog', 'model'] }, notice: text }, ['answer', 'citations', 'mode'])), ...errors(400, 415, 429) },
  },
  {
    group: 'a2a', method: 'post', path: '/api/a2a', operationId: 'sendA2aMessage',
    summary: 'Search reviews with the A2A agent',
    description: 'A2A JSON-RPC 1.0 SendMessage. Supply a unique messageId, ROLE_USER, and one text part (up to 600 characters). Synchronous read-only replies; no task retrieval or streaming.',
    requestBody: jsonBody(object({
      jsonrpc: { type: 'string', enum: ['2.0'] },
      id: { oneOf: [text, integer] },
      method: { type: 'string', enum: ['SendMessage'] },
      params: object({ message: object({ messageId: text, role: { type: 'string', enum: ['ROLE_USER'] },
        parts: array(object({ text }, ['text'])) }, ['messageId', 'role', 'parts']) }, ['message']),
    }, ['jsonrpc', 'id', 'method', 'params']), 'A2A JSON-RPC SendMessage request.'),
    responses: {
      200: json('JSON-RPC response with a textual agent message, or a JSON-RPC error.', object({
        jsonrpc: text, id: { oneOf: [text, integer] }, result: object({ message: object({
          messageId: text, contextId: text, role: text, parts: array(object({ text }, ['text'])),
        }, ['messageId', 'contextId', 'role', 'parts']) }, ['message']),
      }, ['jsonrpc', 'id'])),
      ...errors(413, 415, 429, 503),
    },
  },
  {
    group: 'cms-posts', method: 'get', path: '/api/cms/posts', operationId: 'listEditorialPosts',
    summary: 'List editorial posts', description: 'Editor-only. Includes drafts as well as published posts.',
    security: session, responses: { 200: json('Editorial posts and storage mode.', object({ posts: array(ref('CmsPost')), mode: text }, ['posts', 'mode'])), ...errors(401, 403, 500, 503) },
  },
  {
    group: 'cms-posts', method: 'post', path: '/api/cms/posts', operationId: 'createEditorialPost',
    summary: 'Create an editorial post', description: 'Editor-only. Send title and authorId plus post fields as JSON. Publishing additionally requires at least 200 characters of content, a 40-character summary, and one key takeaway. Browser requests with an Origin must be same-origin.',
    security: session, requestBody: jsonBody(ref('CmsPostInput'), 'Post to create.'),
    responses: { 201: json('Created post and storage mode.', object({ post: ref('CmsPost'), mode: text }, ['post', 'mode'])), ...errors(400, 401, 403, 409, 415, 422, 429, 500, 503) },
  },
  {
    group: 'cms-posts', method: 'get', path: '/api/cms/posts/{id}', operationId: 'getEditorialPost',
    summary: 'Get an editorial post', description: 'Editor-only. Returns a draft or published editorial post by its CMS ID.',
    security: session, parameters: [cmsId], responses: { 200: json('Post and storage mode.', object({ post: ref('CmsPost'), mode: text }, ['post', 'mode'])), ...errors(401, 403, 404, 500, 503) },
  },
  {
    group: 'cms-posts', method: 'patch', path: '/api/cms/posts/{id}', operationId: 'updateEditorialPost',
    summary: 'Update an editorial post', description: 'Editor-only. Send the fields to change as JSON; they are merged with the existing post and validated. Browser requests with an Origin must be same-origin.',
    security: session, parameters: [cmsId], requestBody: jsonBody(ref('CmsPostPatch'), 'Fields to change.'),
    responses: { 200: json('Updated post and storage mode.', object({ post: ref('CmsPost'), mode: text }, ['post', 'mode'])), ...errors(400, 401, 403, 404, 409, 415, 422, 429, 500, 503) },
  },
  {
    group: 'cms-posts', method: 'delete', path: '/api/cms/posts/{id}', operationId: 'deleteEditorialPost',
    summary: 'Delete an editorial post', description: 'Editor-only and rate limited. Browser requests with an Origin must be same-origin.',
    security: session, parameters: [cmsId], responses: { 200: json('Deletion confirmed.', object({ deleted: boolean, mode: text }, ['deleted', 'mode'])), ...errors(401, 403, 404, 429, 500, 503) },
  },
  {
    group: 'cms-comments', method: 'get', path: '/api/cms/comments', operationId: 'listModerationComments',
    summary: 'List comments for moderation', description: 'Editor-only. Lists CMS comments and the storage mode.',
    security: session, responses: { 200: json('CMS comments and storage mode.', object({ comments: array(ref('CmsComment')), mode: text }, ['comments', 'mode'])), ...errors(401, 403, 500, 503) },
  },
  {
    group: 'cms-comments', method: 'delete', path: '/api/cms/comments/{id}', operationId: 'deleteModerationComment',
    summary: 'Delete a comment', description: 'Editor-only and rate limited. Browser requests with an Origin must be same-origin.',
    security: session, parameters: [cmsId], responses: { 200: json('Deletion confirmed.', object({ deleted: boolean, mode: text }, ['deleted', 'mode'])), ...errors(401, 403, 404, 429, 500, 503) },
  },
  {
    group: 'applications', method: 'get', path: '/api/dashboard/applications', operationId: 'listApplications',
    summary: 'List writer applications', description: 'Requires a signed-in Supabase session. Readers see their own applications; editors see the queue, subject to row-level security.',
    security: session, responses: { 200: json('Visible applications.', object({ applications: array(ref('Application')) }, ['applications'])), ...errors(401, 503) },
  },
  {
    group: 'applications', method: 'post', path: '/api/dashboard/applications', operationId: 'submitApplication',
    summary: 'Submit a writer application', description: 'Requires a signed-in Supabase session and a connected GitHub or ORCID identity. Send provider, handle, optional displayName, and statement as JSON. Browser requests with an Origin must be same-origin.',
    security: session, requestBody: jsonBody(ref('ApplicationInput'), 'Writer application.'),
    responses: { 201: json('Saved application.', object({ application: ref('Application') }, ['application'])), ...errors(400, 401, 403, 415, 429, 503) },
  },
  {
    group: 'applications', method: 'post', path: '/api/dashboard/applications/{id}', operationId: 'reviewApplication',
    summary: 'Review a writer application', description: 'Editor-only. Send approve=true to approve, or approve=false to reject, with an optional note. Omission of approve also rejects; always send it explicitly. Browser requests with an Origin must be same-origin.',
    security: session, parameters: [applicationId], requestBody: jsonBody(object({ approve: boolean, note: { type: 'string', maxLength: 500 } }, ['approve']), 'Review decision.'),
    responses: { 200: json('Reviewed application.', object({ application: ref('Application') }, ['application'])), ...errors(400, 401, 403, 415, 429, 503) },
  },
  {
    group: 'revalidate', method: 'post', path: '/api/revalidate', operationId: 'revalidatePages',
    summary: 'Invalidate cached pages', description: 'Webhook protected by the x-revalidate-secret header. An optional Supabase webhook body can supply table and record.slug or old_record.slug. Without a valid slug, the home page and sitemap are still revalidated.',
    security: webhookSecret, requestBody: jsonBody(ref('RevalidationWebhook'), 'Optional Supabase database webhook.', false),
    responses: { 200: json('Revalidation result.', object({ revalidated: boolean, table: { type: ['string', 'null'] }, paths: strings, now: integer }, ['revalidated', 'table', 'paths', 'now'])), ...errors(401, 429, 500, 503) },
  },
  {
    group: 'billing', method: 'post', path: '/api/billing/checkout', operationId: 'createBillingCheckout',
    summary: 'Start a checkout',
    description: 'Creates a Lemon Squeezy checkout for one of this site’s products and returns its URL for the on-site overlay. The variant is resolved server-side from configuration: the request names a product, never a variant or a price. Rate limited to ten attempts a minute.',
    security: session,
    requestBody: jsonBody(object({ product: { type: 'string', enum: ['teardown', 'stat-tables'] } }, ['product']), 'The product to buy.'),
    responses: {
      201: json('The checkout to open.', object({ url: text }, ['url'])),
      ...errors(400, 401, 403, 415, 429, 502, 503),
    },
  },
  {
    group: 'api-keys', method: 'get', path: '/api/account/api-keys', operationId: 'listApiKeys',
    summary: 'List your API keys',
    description: 'Returns the caller’s keys, newest first. A key is identified by its name and its first 12 characters; the key itself is never returned after creation.',
    security: session,
    responses: { 200: json('The caller’s keys.', object({ data: array(ref('ApiKey')) }, ['data'])), ...apiErrors(400, 401, 503) },
  },
  {
    group: 'api-keys', method: 'post', path: '/api/account/api-keys', operationId: 'createApiKey',
    summary: 'Create an API key',
    description: 'Creates a key and returns it once. Only a SHA-256 hash is stored. An account can hold at most 5 active keys.',
    security: session,
    requestBody: jsonBody(object({ name: { type: 'string', minLength: 1, maxLength: 60 } }, ['name']), 'A label for the key.'),
    responses: { 201: json('The new key. The `key` field is shown only in this response.', ref('ApiKeyCreated')), ...apiErrors(400, 401, 415, 503) },
  },
  {
    group: 'api-keys', method: 'delete', path: '/api/account/api-keys/{keyId}', operationId: 'revokeApiKey',
    summary: 'Revoke an API key',
    description: 'Revokes the key. It is refused on its next request and cannot be restored.',
    security: session,
    parameters: [path('keyId', 'API key ID.')],
    responses: { 204: { description: 'Revoked.' }, ...apiErrors(400, 401, 404, 503) },
  },
  {
    group: 'entitlement', method: 'get', path: '/api/billing/entitlement', operationId: 'getBillingEntitlement',
    summary: 'Read the signed-in account plan',
    description: 'Returns the caller’s plan, subscription state, purchase credits, and the current period end. Uncacheable: a purchase is visible on the next request. Test-mode purchases are excluded.',
    security: session,
    responses: {
      200: json('The caller’s entitlement.', object({ entitlement: ref('Entitlement') }, ['entitlement'])),
      ...errors(401, 500, 503),
    },
  },
  {
    group: 'webhooks', method: 'post', path: '/api/webhooks/lemonsqueezy', operationId: 'receiveLemonSqueezyWebhook',
    summary: 'Receive a Lemon Squeezy billing event',
    description: 'Lemon Squeezy posts orders and subscription changes here. The X-Signature header is an HMAC-SHA256 of the raw request body and is the only credential; there is no session. Unhandled event names and unattributable purchases are acknowledged with 200 and recorded as ignored, so the sender stops retrying. Replayed event ids are acknowledged without being applied twice.',
    security: billingWebhook,
    responses: {
      200: json('The event was applied, was a duplicate, or was ignored.', object({
        received: boolean,
        outcome: { type: 'string', enum: ['applied', 'duplicate', 'ignored'] },
      }, ['received', 'outcome'])),
      ...errors(400, 401, 413, 500, 503),
    },
  },
];

const cmsPostProperties: Record<string, Schema> = {
  title: { type: 'string', minLength: 8, maxLength: 180 }, slug: { type: 'string', maxLength: 96 },
  content: { type: 'string', maxLength: 200000 }, status: { type: 'string', enum: ['draft', 'published'] },
  subtitle: { type: 'string', maxLength: 400 }, summary: { type: 'string', maxLength: 1200 },
  category: text, format: text, authorId: text, authorName: text, coverImage: { type: ['string', 'null'] },
  tags: strings, keyTakeaways: strings, featured: boolean, artifact: { anyOf: [ref('Artifact'), { type: 'null' }] },
};

const schemas: Record<string, Schema> = {
  Error: object({ error: text, fieldErrors: { type: 'object', additionalProperties: text }, needsConfig: boolean }, ['error']),
  Author: object({ id: text, name: text, avatar: text, bio: text, role: text, domain: text, institution: text, orcid: text, github: text, twitter: text, website: text, scholar: text, joinedDate: text, articleCount: integer, totalReads: text, verifiedVia: text, verifiedIdentifier: text, verifiedTitle: text }, ['id', 'name']),
  Artifact: object({ type: { type: 'string', enum: ['paper', 'github', 'dataset'] }, title: text, url: text, identifier: text, meta: text }, ['type', 'title', 'url', 'identifier', 'meta']),
  Article: object({ id: text, slug: text, title: text, subtitle: text, category: text, format: text, author: ref('Author'), publishedAt: text, dateISO: text, readTime: text, coverImage: text, featured: boolean, reviewedArtifact: ref('Artifact'), summary: text, content: strings, bodyMarkdown: text, keyTakeaways: strings, tags: strings, likes: integer, commentsCount: integer }, ['id', 'slug', 'title', 'author']),
  AuthorMetrics: object({ totalArticles: integer, totalLikes: integer, totalComments: integer, domains: strings, reviewedArtifactsCount: integer }, ['totalArticles', 'totalLikes', 'totalComments', 'domains', 'reviewedArtifactsCount']),
  Paper: object({ id: text, slug: text, title: text, subtitle: text, authors: array(object({ name: text, affiliation: text, orcid: text, role: text })), abstract: text, publishedDate: text, year: integer, doi: text, journal: text, volume: text, issue: text, pages: text, topic: text, citationCount: integer, readTime: text, keywords: strings, license: text, pdfFileName: text, dataUrl: text, fullContent: object({ background: text, methodology: text, findings: strings, discussion: text, implications: text, references: strings }) }, ['id', 'slug', 'title']),
  Comment: object({ id: text, postId: text, authorName: text, authorRole: text, avatar: text, timestamp: text, text }, ['id', 'postId', 'authorName', 'avatar', 'timestamp', 'text']),
  CommentInput: object({ postId: { type: 'string', minLength: 1, maxLength: 120 }, authorName: { type: 'string', minLength: 2, maxLength: 120 }, authorRole: { type: 'string', maxLength: 80 }, text: { type: 'string', minLength: 2, maxLength: 4000 } }, ['postId', 'authorName', 'text']),
  ApiError: object({
    error: object({
      code: { type: 'string', enum: ['INVALID_REQUEST', 'UNAUTHENTICATED', 'NOT_FOUND', 'UNSUPPORTED_MEDIA_TYPE', 'IDEMPOTENCY_KEY_REUSED', 'IDEMPOTENCY_IN_FLIGHT', 'RATE_LIMITED', 'QUOTA_EXHAUSTED', 'UPSTREAM_UNAVAILABLE', 'INTERNAL'] },
      message: text,
      details: { type: 'object', additionalProperties: true },
    }, ['code', 'message']),
  }, ['error']),
  ApiKey: object({
    id: text, name: text, prefix: text, createdAt: text,
    lastUsedAt: { type: ['string', 'null'] }, revokedAt: { type: ['string', 'null'] },
  }, ['id', 'name', 'prefix', 'createdAt', 'lastUsedAt', 'revokedAt']),
  ApiKeyCreated: object({
    id: text, name: text, prefix: text, createdAt: text,
    lastUsedAt: { type: ['string', 'null'] }, revokedAt: { type: ['string', 'null'] },
    key: { type: 'string', pattern: '^rwm_[A-Za-z0-9_-]{43}$' },
  }, ['id', 'name', 'prefix', 'createdAt', 'lastUsedAt', 'revokedAt', 'key']),
  AssistantCitation: object({ id: text, title: text, author: text, category: text }, ['id', 'title', 'author', 'category']),
  Entitlement: object({
    plan: { type: 'string', enum: ['none', 'copilot', 'purchases'] },
    status: { type: 'string', enum: ['none', 'on_trial', 'active', 'paused', 'past_due', 'unpaid', 'cancelled', 'expired'] },
    aiCredits: integer,
    currentPeriodEnd: { type: ['string', 'null'] },
  }, ['plan', 'status', 'aiCredits']),
  CmsPostInput: object(cmsPostProperties, ['title', 'authorId']),
  CmsPostPatch: object(cmsPostProperties),
  CmsPost: object({ ...cmsPostProperties, id: text, authorId: { type: ['string', 'null'] }, likes: integer, readTime: text, publishedAt: { type: ['string', 'null'] }, insertedAt: text, updatedAt: text }, ['id', 'title', 'slug', 'status']),
  CmsComment: object({ id: text, postId: text, postTitle: text, authorName: text, authorRole: text, content: text, insertedAt: text }, ['id', 'postId', 'authorName', 'content']),
  ApplicationInput: object({ provider: { type: 'string', enum: ['github', 'orcid'] }, handle: { type: 'string', minLength: 1, maxLength: 160 }, displayName: { type: 'string', maxLength: 120 }, statement: { type: 'string', maxLength: 1000 } }, ['provider', 'handle']),
  Application: object({ id: integer, user_id: text, provider: { type: 'string', enum: ['github', 'orcid'] }, handle: text, display_name: text, statement: text, status: { type: 'string', enum: ['pending', 'approved', 'rejected'] }, reviewed_by: { type: ['string', 'null'] }, reviewed_at: { type: ['string', 'null'] }, review_note: text, created_at: text, updated_at: text }, ['id', 'user_id', 'provider', 'handle', 'display_name', 'status']),
  RevalidationWebhook: object({ type: text, table: text, record: { anyOf: [object({ slug: text }), { type: 'null' }] }, old_record: { anyOf: [object({ slug: text }), { type: 'null' }] } }),
};

export const OPENAPI_DOCUMENT = {
  openapi: '3.1.0',
  info: {
    title: 'ResearchWithMe API',
    version: '0.2.1',
    description: 'HTTP routes for the research archive and editorial studio. Some operations require a signed-in session, editor privileges, or a webhook secret. See each operation for its requirements.',
    license: { name: 'ISC', identifier: 'ISC' },
  },
  // Operations are anonymous unless they override this with a security scheme.
  security: [],
  // Relative to the OpenAPI document so preview and production use their own origin.
  servers: [{ url: '/' }],
  tags: API_GROUPS.map((group) => ({ name: group.name, description: group.description })),
  paths: API_OPERATIONS.reduce<Record<string, Record<string, unknown>>>((paths, operation) => {
    const { group, method, path: routePath, ...spec } = operation;
    const tag = API_GROUPS.find((item) => item.id === group);
    if (!tag) throw new Error(`Unknown API group: ${group}`);
    (paths[routePath] ??= {})[method] = { tags: [tag.name], ...spec };
    return paths;
  }, {}),
  components: {
    securitySchemes: {
      SessionCookie: {
        type: 'apiKey', in: 'header', name: 'Cookie',
        description: 'Supabase Auth session cookie(s), obtained by signing in on the site. Cookie names depend on the deployment and may be chunked. Editor-only operations additionally require an editor account.',
      },
      RevalidateSecret: {
        type: 'apiKey', in: 'header', name: 'x-revalidate-secret',
        description: 'Shared secret configured for database revalidation webhooks.',
      },
      BillingWebhookSignature: {
        type: 'apiKey', in: 'header', name: 'x-signature',
        description: 'Hex HMAC-SHA256 of the raw request body, signed with the Lemon Squeezy webhook signing secret.',
      },
    },
    schemas,
  },
};
