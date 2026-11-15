import type { SupabaseClient } from '@supabase/supabase-js';
import type { CmsStore } from '@/lib/cms/types';
import type { SendScenarioInput, SendScenarioOptions, SendScenarioResult } from '@/lib/email/send';
import type { Publication } from '@/lib/research-data';
import {
  createKvRateLimitStore,
  createMemoryRateLimitStore,
  type KvNamespaceLike,
  type RateLimitOutcome,
  type RateLimitStore,
} from '@/lib/rate-limit-core';
import { createCookieJar, type CookieJar } from './cookies';

export type RuntimeMode = 'node-local' | 'pages';
export type Role = 'anonymous' | 'reader' | 'editor';
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface PublicConfig {
  siteUrl: string;
  supabaseUrl: string;
  supabaseKey: string;
}

/**
 * Runtime bindings available to a request. Every field is a secret or an
 * operational toggle provided by the hosting environment — never by the
 * request. Only the four NEXT_PUBLIC_* values are compiled into the browser
 * bundle (and only there); everything here stays on the server.
 */
export interface AppEnv {
  RATE_LIMIT_KV?: KvNamespaceLike;
  GEMINI_API_KEY?: string;
  WEB_BOT_AUTH_PRIVATE_JWK?: string;
  GEMINI_MODEL?: string;
  RESEND_API_KEY?: string;
  REVALIDATE_SECRET?: string;
  /** Legacy name, still accepted. */
  MY_SECRET_TOKEN?: string;
  RESEND_TPL_WELCOME?: string;
  RESEND_TPL_VERIFY_EMAIL?: string;
  RESEND_TPL_PASSWORD_RESET?: string;
  RESEND_TPL_SECURITY_ALERT?: string;
  RESEND_TPL_SUPPORT_REPLY?: string;
  /** 'production' enables the fail-closed production guard. Anything else is preview/local. */
  RWM_DEPLOY_ENV?: 'preview' | 'production';
}

export interface ModelServices {
  generateText(input: { apiKey: string; model: string; prompt: string; timeoutMs: number }): Promise<string>;
}

export interface EmailSender {
  sendScenario(
    key: string,
    input: SendScenarioInput,
    options?: SendScenarioOptions,
  ): Promise<SendScenarioResult>;
}

export interface RuntimeServices {
  /** Anonymous, cookie-free client for public reads; null when Supabase is unconfigured. */
  publicClient(ctx: RequestContext): SupabaseClient | null;
  /** Session-scoped client bound to this request's cookie jar; null when unconfigured. */
  sessionClient(ctx: RequestContext): SupabaseClient | null;
  publicCms(ctx: RequestContext): Promise<CmsStore>;
  editorCms(ctx: RequestContext): Promise<CmsStore>;
  listPapers(): readonly Publication[];
  models: ModelServices;
  email(ctx: RequestContext): EmailSender;
}

export interface RequestContext {
  request: Request;
  env: AppEnv;
  runtime: RuntimeMode;
  config: PublicConfig;
  cookies: CookieJar;
  rateLimitStore: RateLimitStore;
  services: RuntimeServices;
}

// ---------------------------------------------------------------------------
// Public configuration
//
// The Vite builds inline exactly four NEXT_PUBLIC_* expressions (plus
// RWM_BUILD_TARGET). resolvePublicConfig is a pure function of its source so
// tests never depend on the bundler's define map.
// ---------------------------------------------------------------------------

export interface PublicConfigSource {
  NEXT_PUBLIC_SUPABASE_URL?: string | undefined;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string | undefined;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string | undefined;
  NEXT_PUBLIC_SITE_URL?: string | undefined;
  RWM_BUILD_TARGET?: string | undefined;
}

/**
 * Reads the four allowlisted public values through literal property accesses so
 * the Vite `define` can inline each one. Never read `process.env.<anything
 * else>` here — secrets must not reach the browser bundle.
 */
function inlineSource(): PublicConfigSource {
  if (typeof process === 'undefined') return {};
  // The member expressions below must stay literal: vite `define` replaces
  // them with the inlined public values at build time.
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    RWM_BUILD_TARGET: process.env.RWM_BUILD_TARGET,
  };
}

export function resolvePublicConfig(source: PublicConfigSource = inlineSource()): PublicConfig {
  const siteUrl = (source.NEXT_PUBLIC_SITE_URL ?? '').trim() || 'https://researchwith.me';
  const supabaseUrl = (source.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  // Publishable key preferred; the legacy anon key still works.
  const supabaseKey =
    (source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim() ||
    (source.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  return { siteUrl, supabaseUrl, supabaseKey };
}

/** True only when the URL is well formed and a key is present — mirrors lib/supabase/config.ts. */
export function isPublicConfigValid(config: PublicConfig): boolean {
  if (!config.supabaseUrl || !config.supabaseKey) return false;
  try {
    const parsed = new URL(config.supabaseUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export type BuildTarget = 'local' | 'test' | 'preview' | 'production';

export function getBuildTarget(source: PublicConfigSource = inlineSource()): BuildTarget {
  const raw = (source.RWM_BUILD_TARGET ?? 'local').trim().toLowerCase();
  return raw === 'test' || raw === 'preview' || raw === 'production' ? raw : 'local';
}

export type DeployEnvironment = 'preview' | 'production' | null;

/**
 * Preview isolation: effective production requires BOTH the build artifact and
 * the runtime binding to agree on `production`. Any mismatch resolves to
 * preview (the less-privileged identity), never silently to production.
 * Runtime `preview` with a production build also stays preview.
 */
export function getEffectiveEnvironment(
  env: AppEnv,
  target: BuildTarget = getBuildTarget(),
): DeployEnvironment {
  if (target === 'production' && env.RWM_DEPLOY_ENV === 'production') return 'production';
  if (env.RWM_DEPLOY_ENV === 'preview' || target === 'preview') return 'preview';
  return null;
}

/** Fail-closed error for a production deployment without valid public config. */
export class PublicConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublicConfigError';
  }
}

/**
 * Production guard: an effective-production deployment with an invalid public
 * config refuses to serve rather than silently falling back to demo mode
 * against production hostnames. Preview and local deployments may run in demo
 * mode deliberately (Node local demo, isolated previews of the UI).
 */
export function assertProductionConfig(
  config: PublicConfig,
  env: AppEnv,
  target?: BuildTarget,
): void {
  if (getEffectiveEnvironment(env, target) !== 'production') return;
  if (!isPublicConfigValid(config)) {
    throw new PublicConfigError(
      'Production Pages deployment is missing a valid NEXT_PUBLIC_SUPABASE_URL/KEY; refusing to serve.',
    );
  }
}

// ---------------------------------------------------------------------------
// rate limiting
//
// A Pages request selects KV from its own binding, never from a module
// global. A deployment without a binding falls back to a process-scoped
// memory store (per isolate) rather than failing closed, matching the Next
// wrapper's fallback behaviour.
// ---------------------------------------------------------------------------

let sharedMemoryStore: RateLimitStore | null = null;
function getSharedMemoryStore(): RateLimitStore {
  if (!sharedMemoryStore) sharedMemoryStore = createMemoryRateLimitStore();
  return sharedMemoryStore;
}

/** Test hook: drop the shared memory bucket so suites are isolated. */
export function resetSharedRateLimitStoreForTesting(): void {
  sharedMemoryStore = null;
}

function selectRateLimitStore(env: AppEnv): RateLimitStore {
  const candidate = env.RATE_LIMIT_KV;
  if (
    candidate &&
    typeof candidate.get === 'function' &&
    typeof candidate.put === 'function'
  ) {
    // Fresh, stateless wrapper per request; the state lives in KV.
    return createKvRateLimitStore(candidate);
  }
  return getSharedMemoryStore();
}

export function rateLimit(
  ctx: RequestContext,
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitOutcome> {
  return ctx.rateLimitStore.hit(key, limit, windowMs);
}

// ---------------------------------------------------------------------------
// services
//
// Production services are constructed from AppEnv and the public config; tests
// inject fakes. Factories close over immutable configuration, never over a
// user. Nothing here reads a request, cookie jar or secret from a module
// global.
// ---------------------------------------------------------------------------

function unconfiguredServices(): RuntimeServices {
  const notWiredAsync = (name: string) => async () => {
    throw new Error(`Runtime services are not wired in this build (called ${name}).`);
  };
  return {
    publicClient: () => null,
    sessionClient: () => null,
    publicCms: notWiredAsync('publicCms') as RuntimeServices['publicCms'],
    editorCms: notWiredAsync('editorCms') as RuntimeServices['editorCms'],
    listPapers: () => [] as readonly Publication[],
    models: {
      generateText: () => Promise.reject(new Error('Models are not wired in this build.')),
    },
    email: () => ({
      sendScenario: () => {
        throw new Error('Runtime services are not wired in this build (called email).');
      },
    }),
  };
}

export interface CreateRequestContextOptions {
  /** Build target override for tests; defaults to RWM_BUILD_TARGET from the environment. */
  target?: BuildTarget;
  /** Public-config source override for tests; defaults to the bundled literals in inlineSource(). */
  config?: PublicConfigSource;
}

export function createRequestContext(
  request: Request,
  env: AppEnv,
  runtime: RuntimeMode,
  services?: Partial<RuntimeServices>,
  options?: CreateRequestContextOptions,
): RequestContext {
  const config = resolvePublicConfig(options?.config);
  assertProductionConfig(config, env, options?.target);
  const fallback = unconfiguredServices();
  return {
    request,
    env,
    runtime,
    config,
    cookies: createCookieJar(request),
    rateLimitStore: selectRateLimitStore(env),
    services: { ...fallback, ...services },
  };
}

// Re-exports so call sites can import the whole runtime from one module.
export type { CookieJar } from './cookies';
export type { KvNamespaceLike, RateLimitOutcome, RateLimitStore } from '@/lib/rate-limit-core';
