/**
 * In-process test harness for the Pages runtime. NOT for production requests:
 * every fixture here is deterministic and lives in-process; a fixture is never
 * selectable from HTTP. Browser/workerd and local-Supabase coverage lives in
 * test/e2e and requires separate infrastructure.
 *
 * Two execution tiers read this:
 *   - test/pages/*.test.ts   vitest contracts using these fakes
 *   - npm run test:pages     Playwright against wrangler pages dev (separate)
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLocalCmsStore } from '@/lib/cms/local-store';
import type { CmsPost, CmsPostInput, CmsStore } from '@/lib/cms/types';
import type { Publication } from '@/lib/research-data';
import type { ProfileRow } from '@/lib/author-directory-core';
import type { AuthorApplication } from '@/lib/applications';
import type { KvNamespaceLike } from '@/lib/rate-limit-core';
import {
  createRequestContext,
  type AppEnv,
  type BuildTarget,
  type PublicConfigSource,
  type RequestContext,
  type Role,
  type RuntimeMode,
  type RuntimeServices,
} from '@/cloudflare-pages/src/server/context';
import { handleRequest } from '@/cloudflare-pages/src/server/dispatch';

// The server build injects the client manifest via a define; simulate it so the
// SSR shell works under vitest without a prior `npm run build:pages`.
(globalThis as Record<string, unknown>).__RWM_CLIENT_MANIFEST__ = {
  'src/entry-client.tsx': {
    file: 'assets/entry-client-test0000000000000000000000000000000000000.js',
    css: [],
  },
};

export const TEST_ORIGIN = 'https://test.researchwith.me';
export const TEST_SITE_URL = 'https://researchwith.me';
export const FAKE_SUPABASE_URL = 'https://fake.supabase.test';
export const FAKE_SUPABASE_KEY = 'sb_publishable_test-only-not-a-secret';

export type TestInit = RequestInit & { as?: Role };

export interface TestApp {
  request(path: string, init?: TestInit): Promise<Response>;
  context(role: Role): RequestContext;
  seedPost(post: Partial<CmsPost> & Pick<CmsPost, 'slug' | 'status'>): Promise<CmsPost>;
  updatePost(id: string, patch: Partial<CmsPost>): Promise<void>;
  seedPaper(paper: Partial<Publication> & Pick<Publication, 'slug' | 'title'>): void;
}

export interface TestAppOptions {
  runtime?: RuntimeMode;
  /** false → the public config resolves to blank (CI blanks .env.production). Default true. */
  configured?: boolean;
  /** Drives the fake auth exchange used by the callback port in Task 6. Default 'success'. */
  exchange?: 'success' | 'failure';
  /** Extra/override bindings for this app. Spread over the fake defaults; set a key to undefined to remove it. */
  env?: AppEnv;
  /** Makes the fake profiles lookup fail, like a dead database in front of the author directory. */
  authorLookupFails?: boolean;
  /** Fails only the profiles table (is_editor stays up) to exercise author-resolution outages. */
  profilesFail?: boolean;
  /** Seed rows for public.author_applications. The same array backs every fake client in the test. */
  applications?: AuthorApplication[];
  /** Fails the applications query/RPCs the way a database outage would (thrown client errors). */
  applicationsFail?: boolean;
  /** Deterministic Gemini stand-in: return this text instead of the default. */
  modelText?: string;
  /** Make the Gemini stand-in throw the way a provider outage would. */
  modelTextThrows?: boolean;
  /** The fake session client "refreshes" each request into two role-specific cookies. */
  expiredSessions?: boolean;
  /** Published rows the fake `profiles` table serves to the public client. Default: empty directory. */
  profileRows?: ProfileRow[];
}

const tempDirs: string[] = [];
process.on('exit', () => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best effort only.
    }
  }
});

/** In-memory stand-in for a Cloudflare KV namespace. */
export function createFakeKv(initial: Record<string, string> = {}) {
  const store = new Map<string, { value: string; ttl?: number }>(
    Object.entries(initial).map(([key, value]) => [key, { value }]),
  );
  const writes: Array<{ key: string; value: string; ttl?: number }> = [];
  const kv: KvNamespaceLike = {
    async get(key) {
      return store.get(key)?.value ?? null;
    },
    async put(key, value, putOptions) {
      writes.push({ key, value, ttl: putOptions?.expirationTtl });
      store.set(key, { value, ttl: putOptions?.expirationTtl });
    },
  };
  return { kv, store, writes };
}

const TEST_TARGET: BuildTarget = 'test';

function roleUser(role: Role) {
  if (role === 'anonymous') return null;
  return {
    id: role === 'reader' ? '10000000-0000-4000-8000-000000000001' : '10000000-0000-4000-8000-000000000002',
    email: role === 'reader' ? 'reader@test.researchwith.me' : 'editor@test.researchwith.me',
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: role === 'reader' ? { full_name: 'Reader Example' } : { full_name: 'Editor Example' },
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

interface FakeSupabaseOptions extends TestAppOptions {
  role: Role;
}

// ---------------------------------------------------------------------------
// Fake Supabase client (in-process). Implements the auth flows and the
// editors/profiles lookups the editor gate needs. Every path that a real
// deployment resolves over the wire is resolved from deterministic data here.
// ---------------------------------------------------------------------------

function makeFakeSupabase(options: FakeSupabaseOptions): SupabaseClient & {
  __attachContext: (ctx: RequestContext) => void;
} {
  const {
    role,
    expiredSessions = false,
    authorLookupFails = false,
    profilesFail = false,
    applicationsFail = false,
    exchange = 'success',
  } = options;
  const applicationRows = options.applications;
  const user = roleUser(role);
  let attachedContext: RequestContext | null = null;

  function maybePersistRefresh() {
    if (!expiredSessions || !attachedContext || role === 'anonymous') return;
    attachedContext.cookies.setAll(
      [1, 2].map((n) => ({
        name: `${role}-refreshed-${n}`,
        value: `${role}-refresh-value-${n}`,
        options: { path: '/', httpOnly: true, sameSite: 'lax' as const, maxAge: 60 * 60 * 24 * 30 },
      })),
      {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
        Expires: '0',
        Pragma: 'no-cache',
      },
    );
  }

  const client = {
    auth: {
      async getUser() {
        maybePersistRefresh();
        if (!user) {
          return { data: { user: null }, error: { message: 'Auth session missing!', status: 401 } };
        }
        return { data: { user }, error: null };
      },
      async getSession() {
        maybePersistRefresh();
        if (!user) return { data: { session: null }, error: null };
        return {
          data: {
            session: {
              access_token: `test-access-token-${role}`,
              refresh_token: `test-refresh-token-${role}`,
              token_type: 'bearer',
              expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              user,
            },
          },
          error: null,
        };
      },
      async exchangeCodeForSession(code: string) {
        if (exchange === 'failure' || !code) {
          return {
            data: { session: null, user: null },
            error: { message: 'invalid_grant', status: 400 },
          };
        }
        if (attachedContext) {
          // Mirror @supabase/ssr: a successful exchange writes the (chunked)
          // session cookies and the no-store cache headers into the jar.
          attachedContext.cookies.setAll(
            [1, 2].map((n) => ({
              name: `sb-test-auth-token.${n}`,
              value: `session-chunk-${n}-${code}`,
              options: { path: '/', httpOnly: true, sameSite: 'lax' as const, maxAge: 60 * 60 * 24 * 30 },
            })),
            {
              'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
              Expires: '0',
              Pragma: 'no-cache',
            },
          );
        }
        const reader = roleUser('reader');
        return {
          data: {
            session: {
              access_token: 'test-access-token-exchange',
              refresh_token: 'test-refresh-token-exchange',
              token_type: 'bearer',
              expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              user: reader,
            },
            user: reader,
          },
          error: null,
        };
      },
      async signOut() {
        return { error: null };
      },
    },
    async rpc(name: string, args: Record<string, unknown> = {}) {
      if (name === 'is_editor') {
        if (authorLookupFails) {
          return { data: null, error: { message: 'fake database outage' } };
        }
        return { data: role === 'editor', error: null };
      }
      if (name === 'apply_as_author') {
        // A client-level outage (fetch threw, PostgREST unreachable) is the
        // path the route maps onto a 503; returning { error } is a domain error.
        if (applicationsFail) throw new Error('fake database outage');
        const caller = user?.id ?? null;
        if (!caller) return { data: null, error: { message: 'not_authenticated' } };
        const provider = String(args.p_provider ?? '');
        const handle = String(args.p_handle ?? '').trim();
        const displayName = String(args.p_display_name ?? '').trim();
        const statement = String(args.p_statement ?? '');
        if (provider !== 'github' && provider !== 'orcid') {
          return { data: null, error: { message: 'unsupported_provider' } };
        }
        if (!handle) return { data: null, error: { message: 'handle_required' } };
        if (!displayName) return { data: null, error: { message: 'name_required' } };
        if (role === 'editor') return { data: null, error: { message: 'already_editor' } };
        const store = applicationRows ?? (options.applications = []);
        const sameProvider = store.find(
          (entry) => entry.user_id === caller && entry.provider === provider,
        );
        if (sameProvider) {
          // The function upserts in place; a rejected applicant resets to pending.
          sameProvider.handle = handle.slice(0, 160);
          sameProvider.display_name = displayName.slice(0, 120);
          sameProvider.statement = statement.slice(0, 1000);
          if (sameProvider.status === 'rejected') sameProvider.status = 'pending';
          sameProvider.reviewed_by = null;
          sameProvider.reviewed_at = null;
          sameProvider.review_note = '';
          sameProvider.updated_at = new Date().toISOString();
          return { data: { ...sameProvider }, error: null };
        }
        const pending = store.find((entry) => entry.user_id === caller && entry.status === 'pending');
        if (pending) {
          return {
            data: null,
            error: {
              message:
                'duplicate key value violates unique constraint "author_applications_one_pending"',
            },
          };
        }
        const nextId = store.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
        const now = new Date().toISOString();
        const created: AuthorApplication = {
          id: nextId,
          user_id: caller,
          provider,
          handle: handle.slice(0, 160),
          display_name: displayName.slice(0, 120),
          statement: statement.slice(0, 1000),
          status: 'pending',
          reviewed_by: null,
          reviewed_at: null,
          review_note: '',
          created_at: now,
          updated_at: now,
        };
        store.push(created);
        return { data: { ...created }, error: null };
      }
      if (name === 'review_author_application') {
        if (applicationsFail) throw new Error('fake database outage');
        const caller = user?.id ?? null;
        if (!caller) return { data: null, error: { message: 'not_authenticated' } };
        if (role !== 'editor') return { data: null, error: { message: 'not_editor' } };
        const id = Number(args.p_id);
        const store = applicationRows ?? (options.applications = []);
        const target = store.find((entry) => entry.id === id);
        if (!target) return { data: null, error: { message: 'not_found' } };
        const now = new Date().toISOString();
        target.status = args.p_approve === true ? 'approved' : 'rejected';
        target.reviewed_by = caller;
        target.reviewed_at = now;
        target.review_note = String(args.p_note ?? '').slice(0, 500);
        target.updated_at = now;
        return { data: { ...target }, error: null };
      }
      throw new Error(`Fake Supabase client has no rpc "${name}" wired yet.`);
    },
    from(table: string) {
      const row = (data: unknown, error: { message: string } | null = null) => ({ data, error });
      if (authorLookupFails && table === 'editors') {
        const failing = {
          select: () => failing,
          eq: () => failing,
          maybeSingle: async () => row(null, { message: 'fake database outage' }),
          single: async () => row(null, { message: 'fake database outage' }),
        };
        return failing;
      }
      if (table === 'author_applications') {
        if (applicationsFail) {
          const failing: Record<string, unknown> = {};
          failing.select = () => failing;
          failing.order = () => failing;
          failing.then = (
            onFulfilled: (value: unknown) => unknown,
            onRejected: (reason: unknown) => unknown,
          ) =>
            Promise.resolve({ data: null, error: { message: 'fake database outage' } }).then(
              onFulfilled,
              onRejected,
            );
          return failing;
        }
        const chain: Record<string, unknown> = {};
        let ascending = false;
        chain.select = () => chain;
        chain.order = (column: string, options: { ascending: boolean }) => {
          ascending = options.ascending;
          chain.__column = column;
          return chain;
        };
        // RLS emulation: readers see only their own rows; editors see the queue.
        chain.then = (
          onFulfilled: (value: unknown) => unknown,
          onRejected: (reason: unknown) => unknown,
        ) => {
          const visible = (options.applications ?? []).filter(
            (entry) => role === 'editor' || (user && entry.user_id === user.id),
          );
          const rows = [...visible].sort((left, right) => {
            const a = String(left.created_at ?? '');
            const b = String(right.created_at ?? '');
            return ascending ? a.localeCompare(b) : b.localeCompare(a);
          });
          return Promise.resolve({ data: rows, error: null }).then(onFulfilled, onRejected);
        };
        return chain;
      }
      if (table === 'editors') {
        const chain = {
          select: () => chain,
          eq: () => ({
            maybeSingle: async () =>
              row(role === 'editor' ? { user_id: user?.id ?? '' } : null),
          }),
        };
        return chain;
      }
      if (table === 'profiles') {
        if (authorLookupFails || profilesFail) {
          const failing: Record<string, unknown> = {};
          failing.select = () => failing;
          failing.eq = () => failing;
          failing.order = () => failing;
          failing.maybeSingle = async () => row(null, { message: 'fake database outage' });
          failing.then = (
            onFulfilled: (value: unknown) => unknown,
            onRejected: (reason: unknown) => unknown,
          ) =>
            Promise.resolve({ data: null, error: { message: 'fake database outage' } }).then(
              onFulfilled,
              onRejected,
            );
          return failing;
        }
        let rows = (options.profileRows ?? []).map((entry) => ({ ...entry }));
        const chain: Record<string, unknown> = {};
        chain.select = () => chain;
        chain.eq = (column: string, value: unknown) => {
          rows = rows.filter((candidate) => candidate[column as keyof typeof candidate] === value);
          return chain;
        };
        // Fixture rows are kept in display_name order; the query only ever sorts by that column.
        chain.order = () => chain;
        chain.maybeSingle = async () => row(rows[0] ? { ...rows[0] } : null);
        chain.then = (
          onFulfilled: (value: unknown) => unknown,
          onRejected: (reason: unknown) => unknown,
        ) =>
          Promise.resolve({ data: rows.map((entry) => ({ ...entry })), error: null }).then(
            onFulfilled,
            onRejected,
          );
        return chain;
      }
      throw new Error(`Fake Supabase client has no table "${table}" wired yet.`);
    },
    __attachContext(ctx: RequestContext) {
      attachedContext = ctx;
    },
  };
  return client as unknown as SupabaseClient & { __attachContext: (ctx: RequestContext) => void };
}

function makePublication(
  input: Partial<Publication> & Pick<Publication, 'slug' | 'title'>,
): Publication {
  const year = input.year ?? 2026;
  const publication: Publication = {
    id: `pub-${input.slug}`,
    authors: [
      { name: 'Maya Lin', affiliation: 'ResearchWithMe', orcid: '0000-0002-1825-0097', role: 'Editor' },
    ],
    abstract: `Abstract for ${input.title}.`,
    publishedDate: `${year}-01-15`,
    year,
    doi: `10.1000/test.${input.slug}`,
    journal: 'ResearchWithMe Review',
    volume: '1',
    issue: '1',
    pages: '1-12',
    topic: 'Scholarly Tech',
    citationCount: 0,
    readTime: '12 min read',
    keywords: ['testing'],
    license: 'CC-BY-4.0',
    pdfFileName: `${input.slug}.pdf`,
    fullContent: {
      background: 'Background.',
      methodology: 'Methodology.',
      findings: ['Finding.'],
      discussion: 'Discussion.',
      implications: 'Implications.',
      references: ['Reference.'],
    },
    ...input,
    slug: input.slug,
    title: input.title,
  };
  return publication;
}

export function createTestApp(options: TestAppOptions = {}): TestApp {
  const {
    runtime = 'pages',
    configured = true,
    exchange = 'success',
    env: envOverrides,
    authorLookupFails = false,
    profilesFail = false,
    applicationsFail = false,
    expiredSessions = false,
    profileRows = [],
  } = options;

  const directory = mkdtempSync(path.join(tmpdir(), 'rwm-test-app-'));
  tempDirs.push(directory);
  const applications = (options.applications ?? []).map((entry) => ({ ...entry }));
  const sharedOptions: TestAppOptions = { ...options, applications, applicationsFail };

  const cmsStore: CmsStore = createLocalCmsStore({ dataDir: directory });

  const papers: Publication[] = [];

  const fakeKv = createFakeKv();
  const env: AppEnv = {
    RATE_LIMIT_KV: fakeKv.kv,
    ...envOverrides,
  };

  const configSource: PublicConfigSource = configured
    ? {
        NEXT_PUBLIC_SUPABASE_URL: FAKE_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: FAKE_SUPABASE_KEY,
        NEXT_PUBLIC_SITE_URL: TEST_SITE_URL,
        RWM_BUILD_TARGET: TEST_TARGET,
      }
    : {
        NEXT_PUBLIC_SUPABASE_URL: '',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
        NEXT_PUBLIC_SITE_URL: TEST_SITE_URL,
        RWM_BUILD_TARGET: TEST_TARGET,
      };

  function servicesFor(role: Role): RuntimeServices {
    return {
      publicClient: () => {
        if (!configured) return null;
        return makeFakeSupabase({ ...sharedOptions, role: 'anonymous', exchange, authorLookupFails, expiredSessions: false, profilesFail, profileRows });
      },
      sessionClient: (ctx) => {
        if (!configured) return null;
        const client = makeFakeSupabase({ ...sharedOptions, role, exchange, authorLookupFails, expiredSessions, profilesFail, profileRows });
        client.__attachContext(ctx);
        return client;
      },
      publicCms: () => Promise.resolve(cmsStore),
      editorCms: () => Promise.resolve(cmsStore),
      listPapers: () => papers,
      models: {
        generateText: async () => {
          if (options.modelTextThrows) throw new Error('fake model outage');
          return options.modelText ?? 'Deterministic fake model output.';
        },
      },
      email: () => ({
        sendScenario: () => Promise.resolve({ ok: true, id: 'email-test-0001', mode: 'local' as const }),
      }),
    };
  }

  function stubbedEnv<T>(fn: () => T): T {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', configured ? FAKE_SUPABASE_URL : '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', configured ? FAKE_SUPABASE_KEY : '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', TEST_SITE_URL);
    vi.stubEnv('RWM_BUILD_TARGET', TEST_TARGET);
    try {
      return fn();
    } finally {
      vi.unstubAllEnvs();
    }
  }

  return {
    async request(pathName, init) {
      const { as = 'anonymous', ...rest } = init ?? {};
      const request = new Request(new URL(pathName, TEST_ORIGIN), rest);
      // The dispatcher reads the bundled literals via process.env; stub them for
      // the synchronous context-creation section inside handleRequest.
      return stubbedEnv(() => handleRequest(request, env, runtime, servicesFor(as)));
    },

    context(role) {
      const request = new Request(TEST_ORIGIN + '/');
      return createRequestContext(request, env, runtime, servicesFor(role), {
        config: configSource,
        target: TEST_TARGET,
      });
    },

    async seedPost(input) {
      const payload: CmsPostInput = {
        title: input.title ?? `Test post: ${input.slug}`,
        slug: input.slug,
        content: input.content ?? `Deterministic test content for ${input.slug}. `.repeat(4),
        status: input.status,
        subtitle: input.subtitle ?? '',
        summary: input.summary ?? `Deterministic summary for ${input.slug}.`,
        category: input.category ?? 'Research Reviews',
        format: input.format ?? 'Paper Review',
        authorId: input.authorId ?? 'maya-lin',
        authorName: input.authorName ?? 'Maya Lin',
        coverImage: input.coverImage ?? null,
        tags: input.tags ?? ['testing'],
        keyTakeaways: input.keyTakeaways ?? ['Seeded by the test harness.'],
        readTime: input.readTime ?? '6 min read',
        featured: input.featured ?? false,
        artifact: input.artifact ?? null,
      };
      return cmsStore.createPost(payload);
    },

    async updatePost(id, patch) {
      const existing = await cmsStore.getPost(id);
      if (!existing) throw new Error(`Cannot update unknown seeded post ${id}`);
      const payload: CmsPostInput = {
        title: patch.title ?? existing.title,
        slug: patch.slug ?? existing.slug,
        content: patch.content ?? existing.content,
        status: patch.status ?? existing.status,
        subtitle: patch.subtitle ?? existing.subtitle,
        summary: patch.summary ?? existing.summary,
        category: patch.category ?? existing.category,
        format: patch.format ?? existing.format,
        authorId: patch.authorId ?? existing.authorId ?? 'maya-lin',
        authorName: patch.authorName ?? existing.authorName,
        coverImage: patch.coverImage ?? existing.coverImage,
        tags: patch.tags ?? existing.tags,
        keyTakeaways: patch.keyTakeaways ?? existing.keyTakeaways,
        readTime: patch.readTime ?? existing.readTime,
        featured: patch.featured ?? existing.featured,
        artifact: patch.artifact ?? existing.artifact,
      };
      await cmsStore.updatePost(id, payload);
    },

    seedPaper(input) {
      papers.push(makePublication(input));
    },
  };
}
