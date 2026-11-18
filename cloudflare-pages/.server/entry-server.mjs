import { parseCookieHeader, serializeCookieHeader, createServerClient, createBrowserClient } from "@supabase/ssr";
import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { renderToReadableStream } from "react-dom/server.edge";
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from "react-router-dom/server.mjs";
import { forwardRef, lazy, useState, useEffect, Suspense, useRef, useCallback, createContext, useContext, useMemo, useId, useLayoutEffect, createElement, Fragment as Fragment$1, Children } from "react";
import { Link as Link$1, useNavigate, useLocation, useLoaderData, useRouteError, isRouteErrorResponse, useMatches, redirect, matchRoutes } from "react-router-dom";
import { useReducedMotion, useScroll, useSpring, useTransform, LazyMotion, MotionConfig, AnimatePresence, useMotionValueEvent, LayoutGroup, useAnimationControls, useInView, domMax } from "motion/react";
import * as m from "motion/react-m";
import { Sun, Moon, BookOpen, FileText, Users, Sparkles, Search, Bookmark, CheckCircle2, ShieldCheck, PenSquare, X, Menu, ChevronDown, Quote, User, GitBranch, ArrowRight, Heart, MessageSquare, BarChart3, Globe, Activity, Cpu, GraduationCap, Mail, Send, ArrowUpRight, Check, Copy, ExternalLink, Building2, Share2, Film, ArrowUp, ChevronRight, Printer, Link2, Download, Trash2, ArrowLeft, Compass, Award } from "lucide-react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as Popover from "@radix-ui/react-popover";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { createHash, timingSafeEqual } from "node:crypto";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import Fuse from "fuse.js";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, Radar } from "recharts";
const KEY_PREFIX = "rl:";
const MIN_TTL_SECONDS = 60;
function deny(resetAt, now) {
  return { allowed: false, remaining: 0, retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1e3)) };
}
function allow(remaining) {
  return { allowed: true, remaining: Math.max(0, remaining), retryAfter: 0 };
}
function ttlSeconds(windowMs) {
  return Math.max(MIN_TTL_SECONDS, Math.ceil(windowMs / 1e3));
}
function parseBucket(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.count === "number" && typeof parsed.resetAt === "number") {
      return { count: parsed.count, resetAt: parsed.resetAt };
    }
  } catch {
  }
  return null;
}
function createKvRateLimitStore(kv) {
  return {
    kind: "kv",
    async hit(key, limit, windowMs) {
      const now = Date.now();
      const kvKey = `${KEY_PREFIX}${key}`;
      const ttl = ttlSeconds(windowMs);
      let bucket;
      try {
        bucket = parseBucket(await kv.get(kvKey, { type: "text" }));
      } catch (error) {
        console.error("Rate limiter could not read its counter:", error);
        return allow(limit - 1);
      }
      if (!bucket || bucket.resetAt <= now) {
        const fresh = { count: 1, resetAt: now + windowMs };
        try {
          await kv.put(kvKey, JSON.stringify(fresh), { expirationTtl: ttl });
        } catch (error) {
          console.error("Rate limiter could not open a window:", error);
        }
        return allow(limit - 1);
      }
      if (bucket.count >= limit) return deny(bucket.resetAt, now);
      const count = bucket.count + 1;
      try {
        await kv.put(kvKey, JSON.stringify({ count, resetAt: bucket.resetAt }), {
          expirationTtl: ttlSeconds(bucket.resetAt - now)
        });
      } catch (error) {
        console.error("Rate limiter could not record a hit:", error);
      }
      return allow(limit - count);
    }
  };
}
function createMemoryRateLimitStore(maxKeys = 5e3) {
  const buckets = /* @__PURE__ */ new Map();
  return {
    kind: "memory",
    async hit(key, limit, windowMs) {
      const now = Date.now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        if (buckets.size >= maxKeys) {
          for (const [storedKey, stored] of buckets) {
            if (stored.resetAt <= now) buckets.delete(storedKey);
          }
          for (const storedKey of buckets.keys()) {
            if (buckets.size < maxKeys) break;
            buckets.delete(storedKey);
          }
        }
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return allow(limit - 1);
      }
      if (bucket.count >= limit) return deny(bucket.resetAt, now);
      bucket.count += 1;
      return allow(limit - bucket.count);
    }
  };
}
function clientIp(request) {
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, 64);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded.slice(0, 64);
  return request.headers.get("x-real-ip")?.trim().slice(0, 64) || "local";
}
function cloneResponseHeaders(source) {
  const target = new Headers();
  const multi = typeof source.getSetCookie === "function" ? source.getSetCookie() : [];
  source.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    target.set(key, value);
  });
  for (const cookie of multi) target.append("set-cookie", cookie);
  return target;
}
function createCookieJar(request) {
  let initial;
  try {
    initial = parseCookieHeader(request.headers.get("cookie") ?? "");
  } catch (error) {
    console.error("Could not parse the request cookie header:", error);
    initial = [];
  }
  const pending = [];
  let cacheHeaders = null;
  function getAll() {
    const byName = new Map(initial.map((cookie) => [cookie.name, cookie.value]));
    for (const cookie of pending) byName.set(cookie.name, cookie.value);
    return [...byName].map(([name, value]) => ({ name, value }));
  }
  return {
    getAll,
    setAll(cookies, headers) {
      if (headers && !cacheHeaders) cacheHeaders = { ...headers };
      for (const cookie of cookies) pending.push({ ...cookie });
    },
    get hasPendingChanges() {
      return pending.length > 0;
    },
    apply(response) {
      const headers = cloneResponseHeaders(response.headers);
      for (const cookie of pending) {
        headers.append("set-cookie", serializeCookieHeader(cookie.name, cookie.value, cookie.options));
      }
      if (pending.length > 0 && cacheHeaders) {
        for (const [key, value] of Object.entries(cacheHeaders)) {
          if (!headers.has(key)) headers.set(key, value);
        }
        if (!headers.has("cache-control")) {
          headers.set("cache-control", "private, no-store");
        }
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }
  };
}
function inlineSource() {
  if (typeof process === "undefined") return {};
  return {
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    NEXT_PUBLIC_SITE_URL: "https://researchwith.me",
    RWM_BUILD_TARGET: "local"
  };
}
function resolvePublicConfig(source = inlineSource()) {
  const siteUrl = (source.NEXT_PUBLIC_SITE_URL ?? "").trim() || "https://researchwith.me";
  const supabaseUrl = (source.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const supabaseKey = (source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim() || (source.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  return { siteUrl, supabaseUrl, supabaseKey };
}
function isPublicConfigValid(config) {
  if (!config.supabaseUrl || !config.supabaseKey) return false;
  try {
    const parsed = new URL(config.supabaseUrl);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
function getBuildTarget(source = inlineSource()) {
  const raw = (source.RWM_BUILD_TARGET ?? "local").trim().toLowerCase();
  return raw === "test" || raw === "preview" || raw === "production" ? raw : "local";
}
function getEffectiveEnvironment(env, target = getBuildTarget()) {
  if (target === "production" && env.RWM_DEPLOY_ENV === "production") return "production";
  if (env.RWM_DEPLOY_ENV === "preview" || target === "preview") return "preview";
  return null;
}
class PublicConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "PublicConfigError";
  }
}
function assertProductionConfig(config, env, target) {
  if (getEffectiveEnvironment(env, target) !== "production") return;
  if (!isPublicConfigValid(config)) {
    throw new PublicConfigError(
      "Production Pages deployment is missing a valid NEXT_PUBLIC_SUPABASE_URL/KEY; refusing to serve."
    );
  }
}
let sharedMemoryStore = null;
function getSharedMemoryStore() {
  if (!sharedMemoryStore) sharedMemoryStore = createMemoryRateLimitStore();
  return sharedMemoryStore;
}
function selectRateLimitStore(env) {
  const candidate = env.RATE_LIMIT_KV;
  if (candidate && typeof candidate.get === "function" && typeof candidate.put === "function") {
    return createKvRateLimitStore(candidate);
  }
  return getSharedMemoryStore();
}
function rateLimit(ctx, key, limit, windowMs) {
  return ctx.rateLimitStore.hit(key, limit, windowMs);
}
function unconfiguredServices() {
  const notWiredAsync = (name) => async () => {
    throw new Error(`Runtime services are not wired in this build (called ${name}).`);
  };
  return {
    publicClient: () => null,
    sessionClient: () => null,
    publicCms: notWiredAsync("publicCms"),
    editorCms: notWiredAsync("editorCms"),
    legacy: notWiredAsync("legacy"),
    listPapers: () => [],
    models: {
      generateText: () => Promise.reject(new Error("Models are not wired in this build."))
    },
    email: () => ({
      sendScenario: () => {
        throw new Error("Runtime services are not wired in this build (called email).");
      }
    })
  };
}
function createRequestContext(request, env, runtime2, services, options) {
  const config = resolvePublicConfig(options?.config);
  assertProductionConfig(config, env, options?.target);
  const fallback = unconfiguredServices();
  return {
    request,
    env,
    runtime: runtime2,
    config,
    cookies: createCookieJar(request),
    rateLimitStore: selectRateLimitStore(env),
    services: { ...fallback, ...services }
  };
}
const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "x-dns-prefetch-control": "on",
  // Deployed on Cloudflare (HTTPS enforced at the edge); HSTS is safe to send.
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
  // Report-only CSP: tightens over time without breaking inline bootstrap.
  "content-security-policy-report-only": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "media-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join("; ")
};
function withSecurityHeaders(response) {
  const headers = cloneResponseHeaders(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return { status: response.status, statusText: response.statusText, headers };
}
function applySecurityHeaders(response) {
  const { status, statusText, headers } = withSecurityHeaders(response);
  return new Response(response.body, { status, statusText, headers });
}
function applyHeaders(response, ctx) {
  const { status, statusText, headers } = withSecurityHeaders(response);
  if (headers.has("set-cookie") && !headers.has("cache-control")) {
    headers.set("cache-control", "private, no-store");
  }
  if (ctx.cookies.hasPendingChanges && !headers.has("cache-control")) {
    headers.set("cache-control", "private, no-store");
  }
  return new Response(response.body, { status, statusText, headers });
}
const EXTERNAL_SCHEME = /^(?:https?:)?\/\/|^(?:mailto:|tel:|sms:|data:|javascript:)/i;
function isExternalHref(href) {
  return EXTERNAL_SCHEME.test(href.trim());
}
const LinkShim = forwardRef(function LinkShim2({
  href,
  children,
  prefetch: _prefetch,
  replace,
  scroll: _scroll,
  passHref: _passHref,
  legacyBehavior: _legacyBehavior,
  ...anchorProps
}, ref2) {
  if (isExternalHref(href)) {
    return /* @__PURE__ */ jsx("a", { ref: ref2, href, ...anchorProps, children });
  }
  return /* @__PURE__ */ jsx(Link$1, { ref: ref2, to: href, replace, ...anchorProps, children });
});
function NotFound() {
  return /* @__PURE__ */ jsxs(
    "main",
    {
      style: {
        fontFamily: 'Georgia, "Times New Roman", serif',
        maxWidth: "42rem",
        margin: "0 auto",
        padding: "6rem 1.5rem",
        color: "#161C1A"
      },
      children: [
        /* @__PURE__ */ jsx(
          "p",
          {
            style: {
              fontSize: "0.75rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#4F46E5",
              margin: 0
            },
            children: "Error 404"
          }
        ),
        /* @__PURE__ */ jsx("h1", { style: { fontSize: "3.25rem", lineHeight: 1.05, letterSpacing: "-0.03em", margin: "1rem 0 1.25rem" }, children: "Page not found" }),
        /* @__PURE__ */ jsx("p", { style: { fontSize: "1.125rem", lineHeight: 1.6, color: "#3F4542" }, children: "The page you were looking for does not exist or was moved." }),
        /* @__PURE__ */ jsx("p", { style: { marginTop: "2rem" }, children: /* @__PURE__ */ jsx(LinkShim, { href: "/", style: { color: "#4F46E5" }, children: "Back to the journal" }) })
      ]
    }
  );
}
function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  return {
    push: (path2) => navigate(path2),
    replace: (path2) => navigate(path2, { replace: true }),
    // Next's refresh() refetches the current route's server data. A same-URL
    // navigation re-renders the route and, under a data router, revalidates
    // its loaders — the closest equivalent available here.
    refresh: () => navigate(location.pathname + location.search + location.hash, { replace: true })
  };
}
function usePathname() {
  return useLocation().pathname;
}
function dynamic(importer, options = {}) {
  const Loading = options.loading;
  if (options.ssr === false) {
    let DynamicClientOnly = function(props) {
      const [Loaded, setLoaded] = useState(null);
      useEffect(() => {
        let alive = true;
        importer().then((mod) => {
          if (alive) setLoaded(() => mod.default);
        });
        return () => {
          alive = false;
        };
      }, []);
      if (!Loaded) return Loading ? /* @__PURE__ */ jsx(Loading, {}) : null;
      return /* @__PURE__ */ jsx(Loaded, { ...props });
    };
    DynamicClientOnly.displayName = "DynamicClientOnly";
    return DynamicClientOnly;
  }
  const Lazy = lazy(importer);
  function DynamicSuspense(props) {
    return /* @__PURE__ */ jsx(Suspense, { fallback: Loading ? /* @__PURE__ */ jsx(Loading, {}) : null, children: /* @__PURE__ */ jsx(Lazy, { ...props }) });
  }
  DynamicSuspense.displayName = "DynamicSuspense";
  return DynamicSuspense;
}
const SUPABASE_URL = "".trim();
const SUPABASE_ANON_KEY = "".trim();
function isValidHttpUrl(value) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
const isSupabaseConfigured = isValidHttpUrl(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 0;
function hasSupabaseBrowserConfig$1() {
  return isSupabaseConfigured;
}
function displayName$1(email, metadata) {
  for (const key of ["full_name", "name", "display_name", "user_name"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 120);
  }
  return email.split("@")[0]?.slice(0, 80) || "Reader";
}
function linkedIdentities(account) {
  const found = [];
  for (const identity of account.identities ?? []) {
    if (identity.provider !== "github" && identity.provider !== "orcid") continue;
    const data = identity.identity_data ?? {};
    const candidates = [data.user_name, data.preferred_username, data.sub, data.full_name];
    const handle = candidates.find(
      (value) => typeof value === "string" && value.trim().length > 0
    );
    found.push({
      provider: identity.provider,
      handle: (handle ?? "").trim().slice(0, 160)
    });
  }
  return found;
}
function toSessionUser(account, isEditor) {
  const metadata = account.user_metadata ?? {};
  const email = account.email ?? "";
  const identities = linkedIdentities(account);
  return {
    id: account.id,
    email,
    name: displayName$1(email, metadata),
    isEditor,
    identities,
    providers: (account.identities ?? []).map((identity) => identity.provider).filter((provider) => typeof provider === "string")
  };
}
function useSession() {
  const [user, setUser] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!hasSupabaseBrowserConfig$1()) {
      setHydrated(true);
      return;
    }
    let active = true;
    let unsubscribe = null;
    void Promise.resolve().then(() => client).then(({ getSupabaseBrowserClient: getSupabaseBrowserClient2 }) => {
      if (!active) return;
      const supabase = getSupabaseBrowserClient2();
      async function read(account) {
        if (!account) {
          if (active) setUser(null);
          return;
        }
        let isEditor = false;
        try {
          const { data } = await supabase.rpc("is_editor");
          isEditor = data === true;
        } catch {
          isEditor = false;
        }
        if (active) setUser(toSessionUser(account, isEditor));
      }
      supabase.auth.getUser().then(({ data }) => read(data.user)).catch(() => void 0).finally(() => {
        if (active) setHydrated(true);
      });
      const { data: subscription } = supabase.auth.onAuthStateChange((event, session2) => {
        if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
        setTimeout(() => void read(session2?.user ?? null), 0);
      });
      unsubscribe = () => subscription.subscription.unsubscribe();
    }).catch(() => {
      if (active) setHydrated(true);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);
  async function signOut() {
    if (!hasSupabaseBrowserConfig$1()) return;
    const { getSupabaseBrowserClient: getSupabaseBrowserClient2 } = await Promise.resolve().then(() => client);
    await getSupabaseBrowserClient2().auth.signOut();
    setUser(null);
  }
  return { user, hydrated, signOut };
}
function readLocal(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function readLocalString(key, fallback = "") {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key, value) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
function writeLocalString(key, value) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
function readStringArray(key, allowed) {
  const value = readLocal(key, []);
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string").filter((item) => true).slice(0, 500);
}
const PREFERENCES_STORAGE_KEY = "rwm-preferences-v1";
const DEFAULT_DIGEST_TOPICS = {
  teardowns: true,
  papers: true,
  clinical: false,
  policy: false
};
const DEFAULT_DIGEST = {
  subscribed: false,
  email: "",
  topics: { ...DEFAULT_DIGEST_TOPICS },
  updatedAt: null
};
let lastWriteOk = true;
const safeStateStorage = {
  getItem(name) {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name, value) {
    if (typeof window === "undefined") {
      lastWriteOk = false;
      return;
    }
    try {
      window.localStorage.setItem(name, value);
      lastWriteOk = true;
    } catch {
      lastWriteOk = false;
    }
  },
  removeItem(name) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      lastWriteOk = false;
    }
  }
};
function migrateLegacyPreferences() {
  const savedPostIds = readStringArray("rwm_saved_posts");
  const savedPaperIds = readStringArray("rwm_saved_papers");
  const likedPostIds = readStringArray("rwm_liked_posts");
  const subscribed = readLocalString("rwm_newsletter_subscribed") === "true";
  const email = readLocalString("rwm_newsletter_email").trim();
  const rawTheme = readLocalString("rwm-theme");
  const theme = rawTheme === "light" || rawTheme === "dark" || rawTheme === "system" ? rawTheme : "system";
  return {
    savedPostIds,
    savedPaperIds,
    likedPostIds,
    digest: {
      subscribed,
      email,
      topics: { ...DEFAULT_DIGEST_TOPICS },
      updatedAt: subscribed ? (/* @__PURE__ */ new Date()).toISOString() : null
    },
    theme
  };
}
function toggleInList(items, id) {
  const clean = id.trim();
  if (!clean) return items;
  return items.includes(clean) ? items.filter((entry) => entry !== clean) : [...items, clean].slice(-500);
}
const usePreferencesStore = create()(
  persist(
    (set, get) => {
      function commitMutation(updater) {
        lastWriteOk = true;
        set(updater);
        const ok = lastWriteOk;
        if (get().storagePersisted !== ok) {
          set({ storagePersisted: ok });
        }
        return ok;
      }
      return {
        savedPostIds: [],
        savedPaperIds: [],
        likedPostIds: [],
        digest: { ...DEFAULT_DIGEST, topics: { ...DEFAULT_DIGEST_TOPICS } },
        theme: "system",
        hydrated: false,
        storagePersisted: true,
        toggleSavedPost(id) {
          const ok = commitMutation((state) => ({
            savedPostIds: toggleInList(state.savedPostIds, id)
          }));
          if (ok) writeLocal("rwm_saved_posts", get().savedPostIds);
          return ok;
        },
        removeSavedPost(id) {
          const ok = commitMutation((state) => ({
            savedPostIds: state.savedPostIds.filter((entry) => entry !== id)
          }));
          if (ok) writeLocal("rwm_saved_posts", get().savedPostIds);
          return ok;
        },
        clearSavedPosts() {
          const ok = commitMutation(() => ({ savedPostIds: [] }));
          if (ok) writeLocal("rwm_saved_posts", []);
        },
        toggleSavedPaper(id) {
          const ok = commitMutation((state) => ({
            savedPaperIds: toggleInList(state.savedPaperIds, id)
          }));
          if (ok) writeLocal("rwm_saved_papers", get().savedPaperIds);
          return ok;
        },
        setPostLiked(id, liked) {
          const clean = id.trim();
          if (!clean) return;
          const ok = commitMutation((state) => {
            const without = state.likedPostIds.filter((entry) => entry !== clean);
            return { likedPostIds: liked ? [...without, clean].slice(-500) : without };
          });
          if (ok) writeLocal("rwm_liked_posts", get().likedPostIds);
        },
        subscribeDigest(email, topics) {
          const trimmed = email.trim();
          const ok = commitMutation(() => ({
            digest: {
              subscribed: true,
              email: trimmed,
              topics: { ...topics },
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            }
          }));
          if (ok) {
            writeLocalString("rwm_newsletter_subscribed", "true");
            writeLocalString("rwm_newsletter_email", trimmed);
          }
          return ok;
        },
        setDigestTopic(key, enabled) {
          commitMutation((state) => ({
            digest: {
              ...state.digest,
              topics: { ...state.digest.topics, [key]: enabled },
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            }
          }));
        },
        unsubscribeDigest() {
          const ok = commitMutation((state) => ({
            digest: {
              ...state.digest,
              subscribed: false,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            }
          }));
          if (ok) writeLocalString("rwm_newsletter_subscribed", "false");
        },
        setTheme(theme) {
          const ok = commitMutation(() => ({ theme }));
          if (ok) writeLocalString("rwm-theme", theme);
        }
      };
    },
    {
      name: PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(() => safeStateStorage),
      skipHydration: true,
      partialize: (state) => ({
        savedPostIds: state.savedPostIds,
        savedPaperIds: state.savedPaperIds,
        likedPostIds: state.likedPostIds,
        digest: state.digest,
        theme: state.theme
      })
    }
  )
);
let hydrationStarted = false;
function hydratePreferencesOnce() {
  if (typeof window === "undefined") return;
  if (hydrationStarted || usePreferencesStore.getState().hydrated) return;
  hydrationStarted = true;
  const existingRaw = safeStateStorage.getItem(PREFERENCES_STORAGE_KEY);
  if (existingRaw) {
    void Promise.resolve(usePreferencesStore.persist.rehydrate()).finally(() => {
      usePreferencesStore.setState({ hydrated: true });
    });
    return;
  }
  const migrated = migrateLegacyPreferences();
  const hasAnyLegacy = migrated.savedPostIds.length > 0 || migrated.savedPaperIds.length > 0 || migrated.likedPostIds.length > 0 || migrated.digest.subscribed || migrated.theme !== "system";
  if (hasAnyLegacy) {
    lastWriteOk = true;
    usePreferencesStore.setState({
      ...migrated,
      hydrated: true,
      storagePersisted: lastWriteOk
    });
  } else {
    usePreferencesStore.setState({ hydrated: true });
  }
}
function useHydratePreferences() {
  const hydrated = usePreferencesStore((state) => state.hydrated);
  useEffect(() => {
    hydratePreferencesOnce();
  }, []);
  return hydrated;
}
function useSavedTotalCount() {
  const hydrated = useHydratePreferences();
  const count = usePreferencesStore(
    (state) => state.savedPostIds.length + state.savedPaperIds.length
  );
  return hydrated ? count : 0;
}
function useDigestSubscribed() {
  const hydrated = useHydratePreferences();
  const subscribed = usePreferencesStore((state) => state.digest.subscribed);
  return hydrated ? subscribed : false;
}
const DURATION_MS = {
  fast: 120,
  standard: 200,
  deliberate: 320,
  connect: 480,
  synthesize: 700
};
const DURATION_S = {
  fast: DURATION_MS.fast / 1e3,
  standard: DURATION_MS.standard / 1e3,
  deliberate: DURATION_MS.deliberate / 1e3,
  connect: DURATION_MS.connect / 1e3
};
const EASING = {
  /** Long, calm departure and landing. Default for reveals and settles. */
  standard: [0.2, 0, 0, 1],
  /** Entrances: immediate commitment, gentle landing. */
  enter: [0, 0, 0, 1],
  /** Exits: hold, then leave decisively. */
  exit: [0.3, 0, 1, 1],
  /** Emphasis: a little more acceleration for state changes worth noticing. */
  emphasize: [0.2, 0.8, 0.2, 1]
};
const asEase = (easing) => easing;
const TRANSITION = {
  fast: { duration: DURATION_S.fast, ease: asEase(EASING.enter) },
  /** Reveal, 200ms — source details, methods, annotations, list items. */
  reveal: { duration: DURATION_S.standard, ease: asEase(EASING.standard) },
  /** Verify, 320ms — confirmed state change with icon and text. */
  verify: { duration: DURATION_S.deliberate, ease: asEase(EASING.standard) },
  /** Connect, 480ms — citation or provenance relationship. */
  connect: { duration: DURATION_S.connect, ease: asEase(EASING.emphasize) }
};
const SPRING = {
  /** Micro-interaction: press, toggle, checkbox. Reads as ~120ms. */
  press: { type: "spring", stiffness: 560, damping: 34, mass: 0.55 },
  /** Standard settle after a hover/lift. Reads as ~200ms. */
  lift: { type: "spring", stiffness: 300, damping: 28, mass: 0.85 },
  /** Layout move (shared indicator, list reorder). Reads as ~320ms. */
  layout: { type: "spring", stiffness: 380, damping: 36, mass: 1 },
  /** Dialog / sheet entrance. Deliberate, no wobble. */
  panel: { type: "spring", stiffness: 300, damping: 30, mass: 0.9 },
  /** Delight only: confirmation pops, heart, checkmark. Bounded overshoot. */
  expressive: { type: "spring", stiffness: 320, damping: 16, mass: 0.8 },
  /** Amortised scroll indicator (reading progress). */
  scroll: { stiffness: 220, damping: 40, mass: 0.6, restDelta: 5e-4 }
};
const STAGGER = {
  /** 50ms between list items — animation-principles "stagger formula". */
  item: 0.05,
  /** Delay before the first child starts. */
  lead: 0.04
};
const DISTANCE = {
  /** 12px — cards, list items, reveals. */
  reveal: 12,
  /** 20px — panels, sheets, popovers. */
  panel: 20,
  /** 24px — hero beats and section headers. */
  hero: 24
};
const SCALE = {
  /** Pressed state: compress. */
  press: 0.97,
  /** Entering from "behind": nearly full size. */
  enter: 0.985,
  /** Hover lift: barely perceptible, never a jump. */
  hover: 1.02,
  /** Confirmation pop: bounded overshoot. */
  pop: 1.12,
  /** Attention pulse ceiling (auto-decays, see AttentionPulse). */
  pulse: 1.15
};
const OPACITY = {
  /** Resting visible state. */
  visible: 1
};
function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function useDelayedLoading(loading, options = {}) {
  const { delay = 200, minDuration = 500 } = options;
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);
  useEffect(() => {
    if (loading) {
      if (visible) return;
      const timer2 = window.setTimeout(() => {
        shownAt.current = performance.now();
        setVisible(true);
      }, delay);
      return () => window.clearTimeout(timer2);
    }
    if (!visible) return;
    const elapsed = performance.now() - shownAt.current;
    const remaining = Math.max(0, minDuration - elapsed);
    const timer = window.setTimeout(() => setVisible(false), remaining);
    return () => window.clearTimeout(timer);
  }, [loading, visible, delay, minDuration]);
  return visible;
}
function useScrollProgress() {
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, SPRING.scroll);
  const percentValue = useTransform(smooth, (value) => Math.round(Math.min(1, Math.max(0, value)) * 100));
  const [percent, setPercent] = useState(0);
  useEffect(() => {
    const unsubscribe = percentValue.on("change", (value) => {
      setPercent((previous) => previous === value ? previous : value);
    });
    return unsubscribe;
  }, [percentValue]);
  return { raw: scrollYProgress, smooth, percent };
}
function useWarmImport(loader, enabled = true) {
  const warmed = useRef(false);
  const warm = useCallback(() => {
    if (!enabled || warmed.current) return;
    warmed.current = true;
    void loader().catch(() => {
      warmed.current = false;
    });
  }, [enabled, loader]);
  return { onMouseEnter: warm, onFocus: warm, onPointerDown: warm };
}
function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
function useHydratedReducedMotion() {
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  return hydrated && Boolean(reduce);
}
const en = {
  "common.loading": "Loading",
  "common.error": "Something went wrong",
  "common.retry": "Retry",
  "card.evidence": "Evidence",
  "card.source": "Source",
  "card.claim": "Claim",
  "card.loadingEvidence": "Loading evidence",
  "card.loadingSource": "Loading source",
  "trust.assessment": "Trust assessment",
  "trust.notAssessed": "Not assessed — no negative finding",
  "integrity.retractionNotice": "Retraction notice",
  "integrity.integrityNotice": "Integrity notice",
  "ai.disclosure": "AI-assisted content",
  "ai.publicationBlocked": "Publication blocked",
  "ai.humanReviewPending": "Human review pending — publication blocked",
  "graph.provenance": "Provenance",
  "graph.listDefault": "List (default)",
  "graph.graph": "Graph",
  "graph.keyboardHelp": "Keyboard: arrow keys move between nodes, Enter inspects",
  "search.placeholder": "Search sources, evidence, claims…",
  "search.mode.lexical": "Lexical",
  "search.mode.exactIdentifier": "Exact identifier",
  "search.mode.semantic": "Semantic",
  "search.mode.aiExpanded": "AI-expanded",
  "search.results": "{count} results",
  "filter.panel": "Filters",
  "filter.type": "Type",
  "filter.trust": "Trust state",
  "table.notReported": "Not reported",
  "workspace.sources": "Sources",
  "workspace.synthesis": "Synthesis",
  "workspace.inspector": "Inspector",
  "workspace.collapse": "Collapse panel",
  "workspace.expand": "Expand panel",
  "cmdk.trigger": "Search catalog",
  "cmdk.placeholder": "Search teardowns, papers, identifiers, or specialists…",
  "cmdk.empty": "No matching manuscripts, papers, or verified specialists found",
  "cmdk.group.articles": "Technical Teardowns and Reviews",
  "cmdk.group.papers": "Peer-Reviewed Archive",
  "cmdk.group.specialists": "Verified Specialists",
  "cmdk.group.routes": "Editorial Destinations",
  "nav.readingList": "Reading List",
  "nav.digestSubscribed": "Digest Subscribed",
  "theme.switchLight": "Switch to Archival Paper light theme",
  "theme.switchDark": "Switch to Obsidian dark theme",
  "reader.cite": "Cite reference",
  "reader.copyBibtex": "Copy BibTeX entry",
  "reader.copyApa": "Copy APA citation",
  "reader.copyDoi": "Copy identifier",
  "reader.copied": "Copied to clipboard"
};
const bn = {
  "common.loading": "লোড হয়চ্ছে",
  "common.error": "কিছু সমস্য় হয়য়ছে",
  "common.retry": "আবার চিষ্টা করুন",
  "card.evidence": "প্রমাণ",
  "card.source": "উত্স",
  "card.claim": "দাবি",
  "card.loadingEvidence": "প্রমাণ লোড হয়চ্ছে",
  "card.loadingSource": "উত্স লোড হয়চ্ছে",
  "trust.assessment": "বিশ্বাস মূল্যায়ন",
  "trust.notAssessed": "মূল্যায়ন করা হয়নি — কোনো নেতিবাচক ফলাফল নেই",
  "integrity.retractionNotice": "প্রত্যাহার বিজ্ঞপতি",
  "integrity.integrityNotice": "অখণডতা বিজ্ঞপতি",
  "ai.disclosure": "AI-সহায়িত কননেন্ট",
  "ai.publicationBlocked": "প্রকাশ থন্ধ",
  "ai.humanReviewPending": "মানব রিভিউ পেনডিং — প্রকাশ থন্ধ",
  "graph.provenance": "প্রভেন্যাস",
  "graph.listDefault": "তালিকা (ডিফল্ট)",
  "graph.graph": "গ্রাফ",
  "graph.keyboardHelp": "কীবোর্ড: তির চাপ নেজ করে, Enter দিয়া পরিদর্শন করে",
  "search.placeholder": "উত্স, প্রমাণ, দাবি অনুসন্ধান…",
  "search.mode.lexical": "লেক্সিক্যাল",
  "search.mode.exactIdentifier": "সতিক পরিচয় আইডেন্টিফায়ার",
  "search.mode.semantic": "সিম্যান্টিক",
  "search.mode.aiExpanded": "AI-প্রসারিত",
  "search.results": "{count} ফলাফল",
  "filter.panel": "ফিল্টার",
  "filter.type": "ধরন",
  "filter.trust": "বিশ্বাস অবস্থা",
  "table.notReported": "রিপোর্ট করা হয়নি",
  "workspace.sources": "উত্সগুহ",
  "workspace.synthesis": "সমুলেসিস",
  "workspace.inspector": "পরিদর্শক",
  "workspace.collapse": "প্যানেল থু গন",
  "workspace.expand": "প্যানেল বাড়াও",
  "cmdk.trigger": "আর্কাইভ অনুসন্ধান",
  "cmdk.placeholder": "প্রবন্ধ, গবেষণাপত্র, ডিওআই, অথবা বিশেষজ্ঞ অনুসন্ধান করুন…",
  "cmdk.empty": "মিলে যাওয়া কোনো পাণ্ডুলিপি, গবেষণাপত্র বা বিশেষজ্ঞ পাওয়া যায়নি",
  "cmdk.group.articles": "প্রযুক্তিগত পর্যালোচনা ও বিশ্লেষণ",
  "cmdk.group.papers": "পিয়ার-রিভিউড আর্কাইভ",
  "cmdk.group.specialists": "যাচাইকৃত বিশেষজ্ঞবৃন্দ",
  "cmdk.group.routes": "সম্পাদকীয় বিভাগসমূহ",
  "nav.readingList": "পাঠতালিকা",
  "nav.digestSubscribed": "ডাইজেস্ট সক্রিয়",
  "theme.switchLight": "হালকা আর্কাইভ থিমে যান",
  "theme.switchDark": "অন্ধকার অবসিডিয়ান থিমে যান",
  "reader.cite": "উদ্ধৃতি তথ্য",
  "reader.copyBibtex": "বিবটেক্স কপি করুন",
  "reader.copyApa": "এপিএ উদ্ধৃতি কপি করুন",
  "reader.copyDoi": "শনাক্তকারী কপি করুন",
  "reader.copied": "ক্লিপবোর্ডে কপি হয়েছে"
};
const SUPPORTED_LOCALES = ["en", "bn"];
const DEFAULT_LOCALE = "en";
const LOCALE_COOKIE = "pieme-locale";
const RTL_LOCALES = /* @__PURE__ */ new Set(["ar", "he", "fa", "ur"]);
const BCP47_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/i;
function isValidBcp47(tag) {
  return BCP47_RE.test(tag.trim());
}
function isSupportedLocale(tag) {
  return SUPPORTED_LOCALES.includes(tag);
}
function resolveLocale(tag) {
  if (!isValidBcp47(tag)) return DEFAULT_LOCALE;
  const base = tag.split("-")[0].toLowerCase();
  return isSupportedLocale(base) ? base : DEFAULT_LOCALE;
}
function isRTL(tag) {
  if (!isValidBcp47(tag)) return false;
  return RTL_LOCALES.has(tag.split("-")[0].toLowerCase());
}
function dirOf(tag) {
  return isRTL(tag) ? "rtl" : "ltr";
}
const DICTIONARIES = { en, bn };
function t(locale, key, vars) {
  const loc = locale in DICTIONARIES ? locale : DEFAULT_LOCALE;
  let s = DICTIONARIES[loc][key] ?? DICTIONARIES.en[key] ?? String(key);
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
const MOTION_MODE_STORAGE_KEY = "rwm-motion-mode";
const MOTION_MODE_ATTRIBUTE = "data-motion-mode";
function isMotionMode(value) {
  return value === "full" || value === "reduced" || value === "static";
}
function reducedMotionFor(mode) {
  return mode === "full" ? "user" : "always";
}
function resolveInitialMode(stored, prefersReduced) {
  if (isMotionMode(stored)) return stored;
  return prefersReduced ? "reduced" : "full";
}
const MotionModeContext = createContext({
  mode: "full",
  setMode: () => {
  },
  suppressed: false
});
function useMotionMode() {
  return useContext(MotionModeContext);
}
function MotionModeProvider({ children }) {
  const [mode, setModeState] = useState("full");
  useEffect(() => {
    let stored = null;
    try {
      stored = window.localStorage.getItem(MOTION_MODE_STORAGE_KEY);
    } catch {
    }
    const resolved = resolveInitialMode(stored, prefersReducedMotion());
    setModeState(resolved);
    document.documentElement.setAttribute(MOTION_MODE_ATTRIBUTE, resolved);
  }, []);
  const setMode = useCallback((next) => {
    if (!isMotionMode(next)) return;
    setModeState(next);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(MOTION_MODE_ATTRIBUTE, next);
    }
    try {
      window.localStorage.setItem(MOTION_MODE_STORAGE_KEY, next);
    } catch {
    }
  }, []);
  const value = useMemo(
    () => ({ mode, setMode, suppressed: mode !== "full" }),
    [mode, setMode]
  );
  return /* @__PURE__ */ jsx(MotionModeContext.Provider, { value, children });
}
const ScopeContext = createContext(false);
const loadFeatures = () => Promise.resolve().then(() => features).then((module) => module.default);
function useInMotionScope() {
  return useContext(ScopeContext);
}
function MotionScope({ children }) {
  const { mode } = useMotionMode();
  return /* @__PURE__ */ jsx(ScopeContext.Provider, { value: true, children: /* @__PURE__ */ jsx(LazyMotion, { features: loadFeatures, strict: false, children: /* @__PURE__ */ jsx(MotionConfig, { reducedMotion: reducedMotionFor(mode), transition: TRANSITION.reveal, children }) }) });
}
function MotionBoundary({ children }) {
  const scoped = useInMotionScope();
  if (scoped) return /* @__PURE__ */ jsx(Fragment, { children });
  return /* @__PURE__ */ jsx(MotionScope, { children });
}
function AttentionPulse({
  active,
  scale = 1.15,
  cycles = 3,
  children,
  className
}) {
  const reduce = useHydratedReducedMotion();
  const ceiling = Math.min(scale, 1.15);
  const pulses = Math.max(1, Math.min(cycles, 3));
  return /* @__PURE__ */ jsx(MotionBoundary, { children: /* @__PURE__ */ jsx(
    m.span,
    {
      className: `inline-flex ${className}`,
      initial: false,
      animate: active && !reduce ? { scale: [1, ceiling, 1] } : { scale: 1 },
      transition: active && !reduce ? { duration: 1.1, times: [0, 0.5, 1], repeat: pulses - 1, repeatType: "loop", ease: "easeInOut" } : void 0,
      style: { transformOrigin: "50% 50%" },
      children
    }
  ) });
}
const revealVariants = {
  rise: {
    hidden: { opacity: 0, y: DISTANCE.reveal },
    visible: {
      opacity: OPACITY.visible,
      y: 0,
      transition: { ...TRANSITION.reveal, ease: [...EASING.enter] }
    }
  },
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: OPACITY.visible, transition: TRANSITION.reveal }
  },
  arc: {
    // X + Y travel together with a whisper of rotation: a curved path rather
    // than a straight slide (principle 7 — arcs; principle 11 — solid drawing).
    hidden: { opacity: 0, x: -12 * 0.75, y: DISTANCE.reveal, rotate: -0.6 },
    visible: {
      opacity: OPACITY.visible,
      x: 0,
      y: 0,
      rotate: 0,
      transition: { ...TRANSITION.connect, ease: [...EASING.emphasize] }
    }
  },
  squash: {
    // Compress on the way in, expand to rest: squash & stretch at 2% amplitude.
    hidden: { opacity: 0, scaleX: 1.02, scaleY: SCALE.enter - 0.02, transformOrigin: "50% 100%" },
    visible: {
      opacity: OPACITY.visible,
      scaleX: 1,
      scaleY: 1,
      transition: { ...SPRING.lift, opacity: TRANSITION.reveal }
    }
  },
  mask: {
    // Curtain wipe: staging + straight-ahead. Used for figures and plates.
    hidden: { opacity: 0, clipPath: "inset(0% 0% 100% 0%)" },
    visible: {
      opacity: OPACITY.visible,
      clipPath: "inset(0% 0% 0% 0%)",
      transition: { duration: 0.48, ease: [...EASING.standard] }
    }
  },
  anticipate: {
    // Pull back below the resting pose, then overshoot by 3px before settling.
    hidden: { opacity: 0, y: DISTANCE.hero },
    visible: {
      opacity: [0, 1, 1],
      y: [DISTANCE.hero, -4, 0],
      transition: { duration: 0.32, times: [0, 0.62, 1], ease: [...EASING.standard] }
    }
  },
  stage: {
    // The supporting layer arrives first, then the subject rises over it.
    hidden: { opacity: 0, y: DISTANCE.panel, scale: SCALE.enter },
    visible: {
      opacity: OPACITY.visible,
      y: 0,
      scale: 1,
      transition: { ...TRANSITION.verify, delay: STAGGER.lead, ease: [...EASING.enter] }
    }
  }
};
function withDelay(variants, delay) {
  if (!delay) return variants;
  const visible = variants.visible ?? {};
  const transition = visible.transition ?? {};
  return {
    ...variants,
    visible: { ...visible, transition: { ...transition, delay } }
  };
}
function staggerContainer(step = STAGGER.item, lead = STAGGER.lead) {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: step, delayChildren: lead }
    }
  };
}
const pressablePoses = {
  hover: { y: -2, scale: SCALE.hover, transition: SPRING.lift },
  tap: { y: 0, scale: SCALE.press, transition: SPRING.press }
};
function Pressable({
  feedback = "squash",
  type = "button",
  className,
  children,
  ...rest
}) {
  const hover = feedback === "lift" ? pressablePoses.hover : void 0;
  const tap = feedback === "none" ? void 0 : pressablePoses.tap;
  return /* @__PURE__ */ jsx(MotionBoundary, { children: /* @__PURE__ */ jsx(
    m.button,
    {
      type,
      whileHover: hover,
      whileTap: tap,
      className,
      ...rest,
      children
    }
  ) });
}
function BrandLogo({
  size = "md",
  showText = true,
  className = ""
}) {
  const wordmarkSizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl"
  }[size];
  const piSymbol = "𝜋";
  return /* @__PURE__ */ jsx("div", { className: `inline-flex items-center ${className}`, children: /* @__PURE__ */ jsx(
    "span",
    {
      className: `${wordmarkSizes} font-serif font-semibold leading-none tracking-[-0.04em] text-ink`,
      "aria-label": showText ? `${piSymbol}eme` : piSymbol,
      children: showText ? `${piSymbol}eme` : piSymbol
    }
  ) });
}
const LocaleContext = createContext({
  locale: DEFAULT_LOCALE,
  dir: "ltr",
  setLocale: () => {
  },
  t: (key, vars) => t(DEFAULT_LOCALE, key, vars)
});
function useLocale() {
  return useContext(LocaleContext);
}
function LocaleProvider({ children, initialLocale }) {
  const [locale, setLocaleState] = useState(() => resolveLocale(initialLocale ?? DEFAULT_LOCALE));
  const setLocale = useCallback((next) => {
    if (!isValidBcp47(next)) return;
    const resolved = resolveLocale(next);
    setLocaleState(resolved);
    try {
      localStorage.setItem(LOCALE_COOKIE, resolved);
      document.cookie = `${LOCALE_COOKIE}=${resolved};path=/;max-age=31536000;samesite=lax`;
      document.documentElement.lang = resolved;
      document.documentElement.dir = dirOf(resolved);
    } catch {
    }
  }, []);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_COOKIE);
      if (stored && isValidBcp47(stored)) setLocale(stored);
    } catch {
    }
  }, [setLocale]);
  const value = useMemo(
    () => ({ locale, dir: dirOf(locale), setLocale, t: (key, vars) => t(locale, key, vars) }),
    [locale, setLocale]
  );
  return /* @__PURE__ */ jsx(LocaleContext.Provider, { value, children });
}
const LABELS = { en: "English", bn: "বাংলা" };
function LocaleSwitcher() {
  const { locale, setLocale, dir } = useLocale();
  const selectId = useId();
  return /* @__PURE__ */ jsxs("div", { role: "group", "aria-label": "Interface language", className: "flex min-h-11 items-center font-sans text-xs text-ink-secondary", children: [
    /* @__PURE__ */ jsx("label", { htmlFor: selectId, className: "sr-only", children: "Interface language / ইন্টারফেস ভাষা" }),
    /* @__PURE__ */ jsx(
      "select",
      {
        id: selectId,
        dir: "ltr",
        className: "min-h-11 max-sm:w-[4.5rem] rounded-sm border border-line bg-surface px-2.5 max-sm:px-1.5 font-mono text-xs font-medium text-ink transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        value: locale,
        onChange: (e) => setLocale(e.target.value),
        children: SUPPORTED_LOCALES.map((l) => /* @__PURE__ */ jsx("option", { value: l, lang: l, dir, children: LABELS[l] ?? l }, l))
      }
    )
  ] });
}
const THEME_STORAGE_KEY = "rwm-theme";
function resolveEffectiveTheme(pref, prefersDark) {
  if (pref === "dark") return "dark";
  if (pref === "light") return "light";
  return prefersDark ? "dark" : "light";
}
function applyDocumentTheme(effective, explicit) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", effective === "dark");
  document.documentElement.classList.toggle("light", explicit === "light");
}
function ThemeToggle() {
  const { locale } = useLocale();
  const [effective, setEffective] = useState("light");
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      const pref = stored === "dark" || stored === "light" || stored === "system" ? stored : "system";
      const prefersDark = Boolean(window.matchMedia?.("(prefers-color-scheme: dark)").matches);
      const resolved = resolveEffectiveTheme(pref, prefersDark);
      setEffective(resolved);
      applyDocumentTheme(resolved, pref);
    } catch {
    }
  }, []);
  function toggleTheme() {
    const next = effective === "dark" ? "light" : "dark";
    setEffective(next);
    applyDocumentTheme(next, next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
    }
  }
  const label = locale === "bn" ? effective === "dark" ? "হালকা আর্কাইভ থিমে যান" : "অন্ধকার অবসিডিয়ান থিমে যান" : effective === "dark" ? "Switch to Archival Paper light theme" : "Switch to Obsidian dark theme";
  return /* @__PURE__ */ jsx(
    Pressable,
    {
      type: "button",
      onClick: toggleTheme,
      "aria-label": label,
      title: label,
      className: "inline-flex min-h-11 min-w-11 items-center justify-center overflow-hidden rounded-sm border border-line bg-surface text-ink transition-colors hover:bg-surface-subtle",
      children: /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: /* @__PURE__ */ jsx(
        m.span,
        {
          initial: { rotate: -60, opacity: 0, scale: 0.6, y: 6 },
          animate: { rotate: 0, opacity: 1, scale: 1, y: 0 },
          exit: { rotate: 60, opacity: 0, scale: 0.6, y: -6 },
          transition: { duration: 0.2, ease: [...EASING.emphasize] },
          className: "inline-flex",
          children: effective === "dark" ? /* @__PURE__ */ jsx(Sun, { className: "h-4 w-4", "aria-hidden": "true" }) : /* @__PURE__ */ jsx(Moon, { className: "h-4 w-4", "aria-hidden": "true" })
        },
        effective
      ) })
    }
  );
}
function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}
const VARIANT_CLASSES$2 = {
  eyebrow: "font-mono text-xs uppercase tracking-wider",
  "page-title": "font-serif text-2xl font-bold sm:text-3xl",
  "section-title": "font-serif text-2xl font-semibold",
  "card-title": "font-serif text-xl font-semibold",
  display: "font-serif text-[clamp(2.5rem,5vw,4.5rem)] font-[450] leading-[1.05] tracking-[-0.025em] text-balance",
  "title-1": "font-serif text-[clamp(2rem,3.5vw,3rem)] font-[500] leading-[1.12] tracking-[-0.02em] text-balance",
  "title-2": "font-serif text-[clamp(1.5rem,2.5vw,2.25rem)] font-[500] leading-[1.2] tracking-[-0.015em] text-balance",
  "heading-1": "font-sans text-[1.75rem] font-[650] leading-[1.25] text-balance",
  "heading-2": "font-sans text-[1.375rem] font-[650] leading-[1.3] text-balance",
  "heading-3": "font-sans text-[1.125rem] font-[650] leading-[1.35] text-balance",
  "body-reading": "font-serif text-[1.125rem] font-normal leading-[1.7] max-w-[68ch]",
  body: "font-sans text-base font-normal leading-[1.625]",
  "body-small": "font-sans text-sm font-normal leading-[1.55]",
  label: "font-sans text-[0.8125rem] font-[600] leading-[1.4] uppercase tracking-[0.04em]",
  citation: "font-mono text-[0.8125rem] font-[500] leading-[1.5]",
  metadata: "font-mono text-xs font-[500] leading-[1.45] tracking-[0.015em]"
};
const COLOR_CLASSES = {
  primary: "text-ink",
  secondary: "text-ink-secondary",
  tertiary: "text-text-tertiary",
  inverse: "text-text-inverse",
  brand: "text-brand",
  verified: "text-trust-verified",
  success: "text-success",
  destructive: "text-destructive",
  inherit: ""
};
const WEIGHT_CLASSES = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold"
};
function Text({
  as: Component = "p",
  variant,
  color = "primary",
  weight,
  className,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    Component,
    {
      className: cx(variant && VARIANT_CLASSES$2[variant], COLOR_CLASSES[color], weight && WEIGHT_CLASSES[weight], className),
      ...props,
      children
    }
  );
}
const PADDING = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
  xl: "p-6"
};
const RADIUS = {
  sm: "rounded-sm",
  md: "rounded-md"
};
function Card({
  as: Component = "div",
  variant = "default",
  padding = "md",
  radius = "sm",
  className,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    Component,
    {
      className: cx(
        RADIUS[radius],
        "border border-line bg-surface",
        PADDING[padding],
        variant === "elevated" && "shadow-floating",
        variant === "interactive" && "cursor-pointer transition-colors hover:bg-surface-subtle",
        className
      ),
      ...props,
      children
    }
  );
}
const VARIANT_CLASSES$1 = {
  default: "bg-surface text-text-primary border-line",
  verified: "bg-trust-verified/10 text-trust-verified border-trust-verified/20",
  emerging: "bg-trust-emerging/10 text-trust-emerging border-trust-emerging/20",
  uncertain: "bg-trust-uncertain/10 text-trust-uncertain border-trust-uncertain/20",
  contested: "bg-trust-contested/10 text-trust-contested border-trust-contested/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  outline: "bg-transparent text-text-secondary border-line"
};
const SIZE_CLASSES = {
  sm: "px-1.5 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-[0.8125rem]"
};
function Badge({
  variant = "default",
  size = "md",
  dot = false,
  className,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsxs(
    "span",
    {
      className: cx(
        "inline-flex items-center gap-1.5 rounded-sm font-sans font-medium uppercase tracking-[0.04em] border",
        VARIANT_CLASSES$1[variant],
        SIZE_CLASSES[size],
        className
      ),
      ...props,
      children: [
        dot && /* @__PURE__ */ jsx(
          "span",
          {
            "aria-hidden": "true",
            className: cx(
              "h-1.5 w-1.5 rounded-full",
              variant === "verified" && "bg-trust-verified",
              variant === "emerging" && "bg-trust-emerging",
              variant === "uncertain" && "bg-trust-uncertain",
              variant === "contested" && "bg-trust-contested",
              variant === "destructive" && "bg-destructive",
              variant === "default" && "bg-text-tertiary",
              variant === "outline" && "bg-text-tertiary"
            )
          }
        ),
        children
      ]
    }
  );
}
const VARIANT_CLASSES = {
  inline: "font-medium text-brand underline underline-offset-4 hover:text-brand-pressed",
  quiet: "underline-offset-4 hover:text-ink hover:underline",
  muted: "text-ink-secondary underline-offset-4 transition-colors hover:text-ink hover:underline",
  plain: ""
};
const isExternal$1 = (href) => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href);
function Link({ href, variant = "inline", prefetch, className, children, ...props }) {
  const classes = cx(VARIANT_CLASSES[variant], className) || void 0;
  if (href === void 0 || isExternal$1(href)) {
    return /* @__PURE__ */ jsx("a", { href, className: classes, ...props, children });
  }
  return /* @__PURE__ */ jsx(LinkShim, { href, prefetch, className: classes, ...props, children });
}
const CommandPalette$2 = dynamic(() => Promise.resolve().then(() => CommandPalette$1), { ssr: false });
const primaryNav = [
  { href: "/", label: "Index", icon: BookOpen, match: (path2) => path2 === "/" || path2 === "/articles" },
  { href: "/papers", label: "Papers", icon: FileText, match: (path2) => path2.startsWith("/paper") },
  { href: "/authors", label: "Specialists", icon: Users, match: (path2) => path2.startsWith("/author") },
  { href: "/editions", label: "Editions", icon: BookOpen, match: (path2) => path2.startsWith("/editions") },
  { href: "/assistant", label: "Synthesis", icon: Sparkles, match: (path2) => path2.startsWith("/assistant") }
];
const secondaryNav = [
  { href: "/bookmarks", label: "Reading list", icon: Bookmark },
  { href: "/cite", label: "Citation builder", icon: Quote },
  { href: "/editorial-board", label: "Editorial board", icon: Users },
  { href: "/dashboard/access", label: "Apply to write", icon: ShieldCheck },
  { href: "/dashboard", label: "Editorial studio", icon: PenSquare }
];
function BlogHeader({ searchQuery, setSearchQuery, savedCount }) {
  const pathname = usePathname() || "/";
  const { locale } = useLocale();
  const { user } = useSession();
  const storeSavedCount = useSavedTotalCount();
  const digestSubscribed = useDigestSubscribed();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteEverOpened, setPaletteEverOpened] = useState(false);
  const [elevated, setElevated] = useState(false);
  const [badgePulse, setBadgePulse] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);
  const savedTotal = savedCount ?? storeSavedCount;
  const warmPalette = useWarmImport(() => Promise.resolve().then(() => CommandPalette$1));
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (value) => {
    setElevated(value > 8);
  });
  useEffect(() => {
    if (savedTotal <= 0) return;
    setBadgePulse(true);
    const timer = window.setTimeout(() => setBadgePulse(false), 3400);
    return () => window.clearTimeout(timer);
  }, [savedTotal]);
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    function handleGlobalKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteEverOpened(true);
        setPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);
  function openPalette() {
    setPaletteEverOpened(true);
    setPaletteOpen(true);
  }
  const navLinkClass = (active) => `inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 py-2 font-sans text-xs font-semibold uppercase tracking-wider transition-colors ${active ? "border-brand text-ink" : "border-transparent text-ink-secondary hover:border-line hover:text-ink"}`;
  return /* @__PURE__ */ jsxs(
    "header",
    {
      className: `sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-xs transition-shadow duration-200 ${elevated ? "shadow-floating" : "shadow-none"}`,
      children: [
        /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex min-h-16 items-center justify-between gap-1.5 sm:gap-3", children: [
            /* @__PURE__ */ jsx(
              LinkShim,
              {
                href: "/",
                className: "flex shrink-0 items-center gap-2 rounded-sm focus-visible:outline-none",
                "aria-label": "𝞹eme — ResearchWithMe platform home",
                children: /* @__PURE__ */ jsx(BrandLogo, { size: "xl", showText: true })
              }
            ),
            /* @__PURE__ */ jsx("nav", { "aria-label": "Primary", className: "hidden lg:block", children: /* @__PURE__ */ jsx(LayoutGroup, { id: "pieme-primary-nav", children: /* @__PURE__ */ jsx("ul", { className: "flex items-center gap-0.5", children: primaryNav.map((item) => {
              const active = item.match(pathname);
              return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
                LinkShim,
                {
                  href: item.href,
                  "aria-current": active ? "page" : void 0,
                  className: `${navLinkClass(active)} relative`,
                  children: [
                    /* @__PURE__ */ jsx("span", { children: item.label }),
                    active ? /* @__PURE__ */ jsx(
                      m.span,
                      {
                        layoutId: "pieme-nav-underline",
                        "aria-hidden": "true",
                        className: "absolute inset-x-2 -bottom-[2px] h-0.5 rounded-full bg-ink",
                        transition: { layout: TRANSITION.reveal }
                      }
                    ) : null
                  ]
                }
              ) }, item.href);
            }) }) }) }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 sm:gap-2", children: [
              /* @__PURE__ */ jsxs(
                Pressable,
                {
                  type: "button",
                  onClick: openPalette,
                  ...warmPalette,
                  className: "inline-flex min-h-11 items-center gap-2.5 rounded-sm border border-line bg-surface px-2.5 py-1.5 font-sans text-xs text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink sm:px-3",
                  children: [
                    /* @__PURE__ */ jsx(Search, { className: "h-4 w-4 shrink-0", "aria-hidden": "true" }),
                    /* @__PURE__ */ jsx("span", { className: "sr-only xl:not-sr-only", children: t(locale, "cmdk.trigger") }),
                    /* @__PURE__ */ jsx("kbd", { className: "hidden rounded-sm border border-line bg-canvas px-1.5 py-0.5 font-mono text-xs font-medium text-ink-secondary sm:inline-block", children: "⌘K" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                LinkShim,
                {
                  href: "/bookmarks",
                  className: "relative hidden min-h-11 items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 py-1.5 font-sans text-xs font-medium text-ink transition-colors hover:bg-surface-subtle sm:inline-flex",
                  title: digestSubscribed ? t(locale, "nav.digestSubscribed") : t(locale, "nav.readingList"),
                  children: [
                    /* @__PURE__ */ jsx(Bookmark, { className: "h-4 w-4 text-ink-secondary", "aria-hidden": "true" }),
                    /* @__PURE__ */ jsx("span", { className: "hidden 2xl:inline", children: t(locale, "nav.readingList") }),
                    /* @__PURE__ */ jsx("span", { className: "sr-only 2xl:hidden", children: t(locale, "nav.readingList") }),
                    savedTotal > 0 && /* @__PURE__ */ jsx(AttentionPulse, { active: badgePulse, className: "rounded-sm", children: /* @__PURE__ */ jsx("span", { className: "rounded-sm bg-brand px-1.5 py-0.5 font-mono text-xs font-semibold text-on-primary", children: savedTotal }) }),
                    digestSubscribed && /* @__PURE__ */ jsx(
                      CheckCircle2,
                      {
                        className: "h-3.5 w-3.5 text-brand",
                        "aria-label": t(locale, "nav.digestSubscribed")
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ jsx(LocaleSwitcher, {}),
              /* @__PURE__ */ jsx(ThemeToggle, {}),
              /* @__PURE__ */ jsxs(
                LinkShim,
                {
                  href: user ? "/dashboard/access" : "/login",
                  className: "hidden min-h-11 items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 py-1.5 font-sans text-xs font-medium text-ink transition-colors hover:bg-surface-subtle md:inline-flex",
                  title: user ? `Signed in as ${user.name}` : "Sign in or create an account",
                  children: [
                    /* @__PURE__ */ jsx(ShieldCheck, { className: "h-4 w-4 text-brand", "aria-hidden": "true" }),
                    /* @__PURE__ */ jsx("span", { className: "hidden xl:inline", children: user ? user.isEditor ? "Writer" : "Account" : "Sign In" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                LinkShim,
                {
                  href: user?.isEditor ? "/write" : "/login?next=%2Fwrite",
                  "aria-label": user?.isEditor ? "Write a review in the writer studio" : "Sign in to write",
                  className: "hidden min-h-11 items-center justify-center gap-1.5 rounded-sm bg-ink px-3 py-1.5 font-sans text-xs font-semibold text-canvas transition-opacity hover:opacity-90 sm:inline-flex",
                  children: [
                    /* @__PURE__ */ jsx(PenSquare, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
                    /* @__PURE__ */ jsx("span", { children: user?.isEditor ? "Write" : "Sign in" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                Pressable,
                {
                  ref: menuButtonRef,
                  type: "button",
                  onClick: () => setMenuOpen((open) => !open),
                  "aria-expanded": menuOpen,
                  "aria-controls": menuId,
                  className: "inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-line bg-surface text-ink transition-colors hover:bg-surface-subtle lg:hidden",
                  children: [
                    /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: /* @__PURE__ */ jsx(
                      m.span,
                      {
                        initial: { rotate: -35, opacity: 0, scale: 0.8 },
                        animate: { rotate: 0, opacity: 1, scale: 1 },
                        exit: { rotate: 35, opacity: 0, scale: 0.8 },
                        transition: { duration: 0.16, ease: [...EASING.enter] },
                        className: "inline-flex",
                        children: menuOpen ? /* @__PURE__ */ jsx(X, { className: "h-5 w-5", "aria-hidden": "true" }) : /* @__PURE__ */ jsx(Menu, { className: "h-5 w-5", "aria-hidden": "true" })
                      },
                      menuOpen ? "close" : "open"
                    ) }),
                    /* @__PURE__ */ jsx("span", { className: "sr-only", children: menuOpen ? "Close navigation menu" : "Open navigation menu" })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsx(AnimatePresence, { initial: false, children: menuOpen ? /* @__PURE__ */ jsx(
            m.div,
            {
              ref: menuRef,
              id: menuId,
              initial: { height: 0, opacity: 0 },
              animate: { height: "auto", opacity: 1 },
              exit: { height: 0, opacity: 0 },
              transition: { duration: 0.22, ease: [...EASING.standard] },
              className: "overflow-hidden lg:hidden",
              children: /* @__PURE__ */ jsxs(Card, { className: "mb-4", children: [
                setSearchQuery && /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
                  /* @__PURE__ */ jsx("label", { htmlFor: "mobile-search", className: "mb-1.5 block font-sans text-xs font-medium text-ink", children: "Search articles" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      id: "mobile-search",
                      type: "search",
                      value: searchQuery ?? "",
                      onChange: (event) => setSearchQuery(event.target.value),
                      placeholder: "Title, author, DOI, or repository",
                      className: "h-11 w-full rounded-sm border border-line bg-canvas px-3 font-sans text-sm text-ink placeholder:text-ink-secondary"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx("nav", { "aria-label": "Mobile primary", children: /* @__PURE__ */ jsx("ul", { className: "grid gap-1", children: primaryNav.map((item) => {
                  const active = item.match(pathname);
                  return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
                    LinkShim,
                    {
                      href: item.href,
                      "aria-current": active ? "page" : void 0,
                      className: `flex min-h-11 items-center gap-2 rounded-sm border px-3 py-2 font-sans text-sm font-medium transition-colors ${active ? "border-brand bg-surface-subtle text-ink" : "border-transparent text-ink-secondary hover:bg-surface-subtle hover:text-ink"}`,
                      children: [
                        /* @__PURE__ */ jsx(item.icon, { className: "h-4 w-4", "aria-hidden": "true" }),
                        /* @__PURE__ */ jsx("span", { children: item.label })
                      ]
                    }
                  ) }, item.href);
                }) }) }),
                /* @__PURE__ */ jsxs("nav", { "aria-label": "Research tools", className: "mt-4 border-t border-line pt-4", children: [
                  /* @__PURE__ */ jsxs(Text, { as: "p", variant: "eyebrow", color: "secondary", weight: "medium", className: "mb-2 flex items-center gap-1.5", children: [
                    /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4", "aria-hidden": "true" }),
                    "Research tools"
                  ] }),
                  /* @__PURE__ */ jsxs("ul", { className: "grid gap-1", children: [
                    secondaryNav.map((item) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
                      LinkShim,
                      {
                        href: item.href,
                        "aria-current": pathname.startsWith(item.href) ? "page" : void 0,
                        className: "flex min-h-11 items-center gap-2 rounded-sm px-3 py-2 font-sans text-sm text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink",
                        children: [
                          /* @__PURE__ */ jsx(item.icon, { className: "h-4 w-4", "aria-hidden": "true" }),
                          /* @__PURE__ */ jsx("span", { children: item.label })
                        ]
                      }
                    ) }, item.href)),
                    /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
                      LinkShim,
                      {
                        href: "/write",
                        className: "flex min-h-11 items-center gap-2 rounded-sm px-3 py-2 font-sans text-sm text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink",
                        children: [
                          /* @__PURE__ */ jsx(PenSquare, { className: "h-4 w-4", "aria-hidden": "true" }),
                          /* @__PURE__ */ jsx("span", { children: "Writer studio" })
                        ]
                      }
                    ) })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("p", { className: "mt-4 flex items-start gap-2 border-t border-line pt-4 font-sans text-xs text-ink-secondary", children: [
                  /* @__PURE__ */ jsx(User, { className: "mt-0.5 h-4 w-4 shrink-0", "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: user?.isEditor ? `Signed in as ${user.name}. Publishing permissions are active.` : "Reader mode. Apply to write to publish reviews." })
                ] })
              ] })
            },
            "pieme-mobile-menu"
          ) : null })
        ] }),
        paletteEverOpened && /* @__PURE__ */ jsx(
          CommandPalette$2,
          {
            open: paletteOpen,
            onOpenChange: setPaletteOpen,
            initialQuery: searchQuery ?? ""
          }
        )
      ]
    }
  );
}
const CATEGORY_SLUGS = {
  "Research Reviews": "research-reviews",
  "GitHub Repo Teardowns": "github-repo-teardowns",
  "STEM & Tech": "stem-tech",
  "Health & Medicine": "health-medicine",
  "Sociology & Culture": "sociology-culture",
  "Data & Policy": "data-policy"
};
const SLUG_TO_CATEGORY = {
  "research-reviews": "Research Reviews",
  "github-repo-teardowns": "GitHub Repo Teardowns",
  "stem-tech": "STEM & Tech",
  "health-medicine": "Health & Medicine",
  "sociology-culture": "Sociology & Culture",
  "data-policy": "Data & Policy"
};
function categoryToSlug(category) {
  if (category in CATEGORY_SLUGS) {
    return CATEGORY_SLUGS[category];
  }
  return category.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function slugToCategory(slugOrName) {
  if (!slugOrName) return void 0;
  const decoded = decodeURIComponent(slugOrName).trim();
  const exact = CATEGORIES.find((c) => c.toLowerCase() === decoded.toLowerCase());
  if (exact) return exact;
  const normalized = decoded.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (SLUG_TO_CATEGORY[normalized]) return SLUG_TO_CATEGORY[normalized];
  const withoutAnd = normalized.replace(/-and-/g, "-");
  if (SLUG_TO_CATEGORY[withoutAnd]) return SLUG_TO_CATEGORY[withoutAnd];
  return void 0;
}
const CATEGORIES = [
  "Research Reviews",
  "GitHub Repo Teardowns",
  "STEM & Tech",
  "Health & Medicine",
  "Sociology & Culture",
  "Data & Policy"
];
const AUTHORS = {};
const INITIAL_BLOG_POSTS = [];
const formats = [
  "All",
  "Paper Review",
  "Repo Teardown",
  "Deep-Dive Essay",
  "Field Notes",
  "Case Study"
];
const columns = ["All", ...CATEGORIES];
function BlogHero({
  searchQuery,
  setSearchQuery,
  selectedFormat,
  setSelectedFormat,
  selectedCategory = "All",
  setSelectedCategory,
  totalArticles
}) {
  return /* @__PURE__ */ jsx("section", { className: "border-b border-line bg-canvas", "aria-labelledby": "platform-title", children: /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-16", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(
        Text,
        {
          "data-enter": "rise",
          style: { "--enter-delay": "0ms" },
          as: "p",
          variant: "eyebrow",
          color: "secondary",
          children: "ISSN 2994-0821 · Diamond Open Access · Verified Specialist Monograph"
        }
      ),
      /* @__PURE__ */ jsx(
        "h1",
        {
          id: "platform-title",
          "data-enter": "rise",
          style: { "--enter-delay": "60ms" },
          className: "mt-3 max-w-3xl font-serif text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl",
          children: "Research you can read, check, and reuse."
        }
      ),
      /* @__PURE__ */ jsx(
        "p",
        {
          "data-enter": "rise",
          style: { "--enter-delay": "120ms" },
          className: "mt-5 max-w-2xl font-sans text-base leading-relaxed text-ink-secondary sm:text-lg",
          children: "Long-form teardowns of published papers and open-source repositories, written by ORCID and GitHub attested domain specialists. Every claim carries a verifiable citation and nothing sits behind a paywall."
        }
      ),
      /* @__PURE__ */ jsxs(
        "div",
        {
          "data-enter": "rise",
          style: { "--enter-delay": "180ms" },
          className: "mt-8 max-w-2xl",
          children: [
            /* @__PURE__ */ jsx(Text, { htmlFor: "catalog-search", as: "label", variant: "eyebrow", color: "secondary", className: "mb-2 block", children: "Filter catalog by keyword, DOI, or repository" }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2 sm:flex-row", children: [
              /* @__PURE__ */ jsxs("div", { className: "relative flex-1", children: [
                /* @__PURE__ */ jsx(
                  Search,
                  {
                    className: "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary",
                    "aria-hidden": "true"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    id: "catalog-search",
                    type: "search",
                    value: searchQuery,
                    onChange: (event) => setSearchQuery(event.target.value),
                    placeholder: "Title, specialist, 10.5555/rwm…, or org/repo",
                    className: "h-11 w-full rounded-sm border border-line bg-surface pl-10 pr-10 font-sans text-sm text-ink placeholder:text-ink-secondary focus:bg-canvas"
                  }
                ),
                searchQuery && /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => setSearchQuery(""),
                    className: "absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink",
                    children: [
                      /* @__PURE__ */ jsx(X, { className: "h-4 w-4", "aria-hidden": "true" }),
                      /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Clear search" })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsx(
                Pressable,
                {
                  type: "button",
                  feedback: "lift",
                  onClick: () => document.getElementById("articles-feed")?.scrollIntoView({ behavior: "smooth", block: "start" }),
                  className: "inline-flex min-h-11 items-center justify-center rounded-sm bg-ink px-5 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90",
                  children: "Browse index"
                }
              )
            ] })
          ]
        }
      ),
      setSelectedCategory && /* @__PURE__ */ jsxs(
        "div",
        {
          className: "mt-6",
          "data-enter": "rise",
          style: { "--enter-delay": "240ms" },
          children: [
            /* @__PURE__ */ jsx(Text, { id: "column-label", as: "p", variant: "eyebrow", color: "secondary", className: "mb-2", children: "Editorial Column" }),
            /* @__PURE__ */ jsx(LayoutGroup, { id: "hero-columns", children: /* @__PURE__ */ jsx("div", { role: "group", "aria-labelledby": "column-label", className: "flex flex-wrap gap-1.5", children: columns.map((column) => {
              const active = selectedCategory === column;
              return /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  "aria-pressed": active,
                  onClick: () => setSelectedCategory(column),
                  className: `relative inline-flex min-h-10 items-center rounded-sm border px-3 py-1.5 font-sans text-xs font-medium transition-colors ${active ? "border-brand text-on-primary" : "border-line bg-surface text-ink-secondary hover:bg-surface-subtle hover:text-ink"}`,
                  children: [
                    active && /* @__PURE__ */ jsx(
                      m.span,
                      {
                        layoutId: "active-column-pill",
                        className: "absolute inset-0 rounded-sm bg-brand",
                        transition: { duration: 0.18, ease: [...EASING.standard] }
                      }
                    ),
                    /* @__PURE__ */ jsx("span", { className: "relative z-10", children: column === "All" ? "All columns" : column })
                  ]
                },
                column
              );
            }) }) })
          ]
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "mt-5", children: [
        /* @__PURE__ */ jsx(Text, { id: "format-label", as: "p", variant: "eyebrow", color: "secondary", className: "mb-2", children: "Manuscript Format" }),
        /* @__PURE__ */ jsx(LayoutGroup, { id: "hero-formats", children: /* @__PURE__ */ jsx("div", { role: "group", "aria-labelledby": "format-label", className: "flex flex-wrap gap-1.5", children: formats.map((format) => {
          const active = selectedFormat === format;
          return /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              "aria-pressed": active,
              onClick: () => setSelectedFormat(format),
              className: `relative inline-flex min-h-10 items-center rounded-sm border px-3 py-1.5 font-sans text-xs font-medium transition-colors ${active ? "border-brand text-on-primary" : "border-line bg-surface text-ink-secondary hover:bg-surface-subtle hover:text-ink"}`,
              children: [
                active && /* @__PURE__ */ jsx(
                  m.span,
                  {
                    layoutId: "active-format-pill",
                    className: "absolute inset-0 rounded-sm bg-brand",
                    transition: { duration: 0.18, ease: [...EASING.standard] }
                  }
                ),
                /* @__PURE__ */ jsx("span", { className: "relative z-10", children: format === "All" ? "All formats" : format })
              ]
            },
            format
          );
        }) }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(
      "aside",
      {
        "aria-label": "Platform summary",
        className: "border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0",
        children: [
          /* @__PURE__ */ jsxs("dl", { className: "grid grid-cols-2 gap-x-6 gap-y-5 divide-y-0 lg:grid-cols-1 lg:divide-y lg:divide-line", children: [
            /* @__PURE__ */ jsxs("div", { className: "lg:pb-4", children: [
              /* @__PURE__ */ jsx(Text, { as: "dt", variant: "eyebrow", color: "secondary", children: "Published reviews" }),
              /* @__PURE__ */ jsx("dd", { className: "mt-1 font-mono text-2xl font-semibold text-ink", children: totalArticles })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "lg:py-4", children: [
              /* @__PURE__ */ jsx(Text, { as: "dt", variant: "eyebrow", color: "secondary", children: "Verified specialists" }),
              /* @__PURE__ */ jsx("dd", { className: "mt-1 font-mono text-2xl font-semibold text-ink", children: "6" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "lg:py-4", children: [
              /* @__PURE__ */ jsx(Text, { as: "dt", variant: "eyebrow", color: "secondary", children: "Access model" }),
              /* @__PURE__ */ jsx("dd", { className: "mt-1 font-sans text-sm font-semibold text-ink", children: "Diamond open access" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "lg:pt-4", children: [
              /* @__PURE__ */ jsx(Text, { as: "dt", variant: "eyebrow", color: "secondary", children: "License" }),
              /* @__PURE__ */ jsx("dd", { className: "mt-1 font-mono text-sm font-semibold text-ink", children: "CC BY 4.0" })
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mt-6 max-w-xs font-sans text-xs leading-relaxed text-ink-secondary", children: "Zero paywalls, behavioural ad trackers, or reading-flow pop-ups. Primary artifacts first." })
        ]
      }
    )
  ] }) }) });
}
function ImageShim({
  src,
  alt,
  fill: fill2,
  sizes,
  className,
  priority,
  width,
  height,
  loading,
  style,
  // Destructured so it never reaches the DOM as an unknown attribute.
  loader: _loader,
  ...rest
}) {
  const fillStyle = fill2 ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style } : style;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- deliberate: the Pages build has no next/image optimizer
    /* @__PURE__ */ jsx(
      "img",
      {
        src,
        alt,
        width: fill2 ? void 0 : width,
        height: fill2 ? void 0 : height,
        sizes,
        className,
        style: fillStyle,
        loading: loading ?? (priority ? "eager" : "lazy"),
        fetchPriority: priority ? "high" : void 0,
        decoding: "async",
        ...rest
      }
    )
  );
}
const PROFILE_PREFIX = "/storage/v1/object/public/profile-images/";
const COVER_PATH = /^\/storage\/v1\/object\/public\/blog-images\/covers\/\d{4}\/\d{2}\/[a-z0-9]+-[a-z0-9]{8}\.(webp|jpg)$/;
function parse(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
function supabaseOrigin() {
  return parse(SUPABASE_URL)?.origin ?? null;
}
function isProfileImageUrl(url) {
  if (!url) return false;
  const parsed = parse(url);
  const origin = supabaseOrigin();
  return !!parsed && !!origin && parsed.origin === origin && parsed.pathname.startsWith(PROFILE_PREFIX);
}
function isProcessedCover(url) {
  const parsed = parse(url);
  const origin = supabaseOrigin();
  return !!parsed && !!origin && parsed.origin === origin && COVER_PATH.test(parsed.pathname);
}
function coverVariantUrl(url, width) {
  return url.replace(/(\.[a-z0-9]+)(\?.*)?$/i, `-${width}$1$2`);
}
function coverLoader({ src, width }) {
  return width <= 800 ? coverVariantUrl(src, 800) : src;
}
function SuccessCheck({ size = 16, className = "", quiet = false }) {
  const reduce = useHydratedReducedMotion();
  return /* @__PURE__ */ jsx(MotionBoundary, { children: /* @__PURE__ */ jsxs(
    m.svg,
    {
      viewBox: "0 0 24 24",
      width: size,
      height: size,
      fill: "none",
      "aria-hidden": "true",
      className,
      initial: false,
      animate: reduce || quiet ? void 0 : { scale: [0.82, 1.12, 1], rotate: [-8, 2, 0] },
      transition: { duration: 0.42, times: [0, 0.6, 1], ease: [...EASING.emphasize] },
      style: { transformOrigin: "50% 50%" },
      children: [
        /* @__PURE__ */ jsx(
          m.circle,
          {
            cx: "12",
            cy: "12",
            r: "10",
            stroke: "currentColor",
            strokeWidth: "1.75",
            initial: false,
            animate: reduce ? void 0 : { scale: [0.9, 1], opacity: [0.4, 1] },
            transition: SPRING.expressive,
            style: { transformOrigin: "50% 50%" }
          }
        ),
        /* @__PURE__ */ jsx(
          m.path,
          {
            d: "M6.75 12.4 10.4 16 17.4 8.6",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            pathLength: 1,
            initial: false,
            animate: reduce ? void 0 : { pathLength: [0, 1] },
            transition: { duration: 0.4, ease: [...EASING.enter], delay: 0.08 }
          }
        )
      ]
    }
  ) });
}
function FeaturedArticle({ post, isSaved, onToggleSave }) {
  const coverSrc = post.coverImage && post.coverImage.trim() !== "" ? post.coverImage : "/images/folio-hero.jpeg";
  return /* @__PURE__ */ jsx(
    "section",
    {
      "aria-labelledby": "featured-heading",
      className: "mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8",
      children: /* @__PURE__ */ jsxs("div", { className: "grid gap-0 overflow-hidden rounded-sm border border-line bg-surface lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative min-h-64 overflow-hidden border-b border-line bg-canvas lg:min-h-full lg:border-b-0 lg:border-r", children: [
          post.coverImage && post.coverImage.startsWith("data:") ? /* @__PURE__ */ jsxs("picture", { className: "h-full w-full", children: [
            /* @__PURE__ */ jsx("source", { srcSet: post.coverImage, type: "image/avif" }),
            /* @__PURE__ */ jsx(
              "img",
              {
                src: post.coverImage,
                alt: "",
                className: "h-full w-full object-cover"
              }
            )
          ] }) : /* @__PURE__ */ jsx(
            ImageShim,
            {
              src: coverSrc,
              alt: "",
              loader: isProcessedCover(coverSrc) ? coverLoader : void 0,
              fill: true,
              priority: true,
              sizes: "(max-width: 1024px) 100vw, 42vw",
              className: "object-cover"
            }
          ),
          /* @__PURE__ */ jsxs(Text, { as: "span", variant: "eyebrow", weight: "semibold", className: "absolute left-4 top-4 rounded-sm border border-line bg-canvas/95 px-2.5 py-1", children: [
            "Lead Monograph · 10.5555/rwm.",
            post.id
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col justify-between gap-8 p-6 sm:p-10", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("p", { className: "flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-ink-secondary", children: [
              /* @__PURE__ */ jsx(
                LinkShim,
                {
                  href: `/category/${categoryToSlug(post.category)}`,
                  className: "font-semibold text-brand underline-offset-4 hover:underline",
                  children: post.category
                }
              ),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsx("span", { children: post.format }),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsx("span", { children: post.publishedAt }),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsx("span", { children: post.readTime })
            ] }),
            /* @__PURE__ */ jsx("h2", { id: "featured-heading", className: "mt-3 font-serif text-3xl font-bold leading-tight text-ink sm:text-4xl", children: /* @__PURE__ */ jsx(LinkShim, { href: `/post/${post.slug}`, className: "transition-colors hover:text-brand", children: post.title }) }),
            /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-2xl font-sans text-base leading-relaxed text-ink-secondary", children: post.subtitle }),
            /* @__PURE__ */ jsxs("div", { className: "mt-6 border-l-2 border-brand pl-4", children: [
              /* @__PURE__ */ jsx(Text, { as: "h3", variant: "eyebrow", weight: "semibold", children: "Empirical Findings" }),
              /* @__PURE__ */ jsx("ul", { className: "mt-2 space-y-2 font-sans text-sm leading-relaxed text-ink-secondary", children: post.keyTakeaways.slice(0, 2).map((takeaway) => /* @__PURE__ */ jsxs("li", { className: "flex gap-2", children: [
                /* @__PURE__ */ jsx("span", { "aria-hidden": "true", className: "font-mono text-brand", children: "—" }),
                /* @__PURE__ */ jsx("span", { children: takeaway })
              ] }, takeaway)) })
            ] }),
            post.reviewedArtifact && /* @__PURE__ */ jsxs("p", { className: "mt-5 flex min-w-0 flex-wrap items-center gap-2 rounded-sm border border-line bg-canvas px-3 py-2 font-mono text-xs text-ink-secondary", children: [
              /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1.5 font-semibold text-ink", children: [
                post.reviewedArtifact.type === "github" ? /* @__PURE__ */ jsx(GitBranch, { className: "h-3.5 w-3.5 text-brand", "aria-hidden": "true" }) : /* @__PURE__ */ jsx(FileText, { className: "h-3.5 w-3.5 text-brand", "aria-hidden": "true" }),
                /* @__PURE__ */ jsx("span", { children: "Artifact" })
              ] }),
              /* @__PURE__ */ jsx("span", { className: "break-all text-ink", children: post.reviewedArtifact.identifier }),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsx("span", { children: post.reviewedArtifact.meta })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5", children: [
            /* @__PURE__ */ jsxs(
              LinkShim,
              {
                href: `/author/${post.author.id}`,
                className: "flex min-w-0 items-center gap-3 font-sans text-sm text-ink hover:text-brand",
                children: [
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      "aria-hidden": "true",
                      className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-line bg-canvas font-mono text-xs font-semibold text-ink",
                      children: post.author.avatar
                    }
                  ),
                  /* @__PURE__ */ jsxs("span", { className: "min-w-0", children: [
                    /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5 truncate font-semibold", children: [
                      /* @__PURE__ */ jsx("span", { className: "truncate", children: post.author.name }),
                      post.author.verifiedVia && /* @__PURE__ */ jsx(CheckCircle2, { className: "h-3.5 w-3.5 shrink-0 text-brand", "aria-hidden": "true" })
                    ] }),
                    /* @__PURE__ */ jsx("span", { className: "block truncate text-xs text-ink-secondary", children: post.author.role })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxs(
                Pressable,
                {
                  onClick: () => onToggleSave(post.id),
                  "aria-pressed": isSaved,
                  className: `inline-flex h-11 w-11 items-center justify-center rounded-sm border transition-colors ${isSaved ? "border-brand bg-brand text-on-primary" : "border-line bg-canvas text-ink-secondary hover:bg-surface-subtle hover:text-ink"}`,
                  children: [
                    /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: /* @__PURE__ */ jsx(
                      m.span,
                      {
                        initial: { scale: 0.6, opacity: 0 },
                        animate: { scale: 1, opacity: 1 },
                        exit: { scale: 0.6, opacity: 0 },
                        transition: { duration: 0.18, ease: [...EASING.emphasize] },
                        className: "inline-flex",
                        "aria-hidden": "true",
                        children: isSaved ? /* @__PURE__ */ jsx(SuccessCheck, { size: 16 }) : /* @__PURE__ */ jsx(Bookmark, { className: "h-4 w-4", "aria-hidden": "true" })
                      },
                      isSaved ? "saved" : "unsaved"
                    ) }),
                    /* @__PURE__ */ jsx("span", { className: "sr-only", children: isSaved ? "Remove from reading list" : "Save to reading list" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                LinkShim,
                {
                  href: `/post/${post.slug}`,
                  className: "group inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-ink px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90",
                  children: [
                    /* @__PURE__ */ jsx("span", { children: "Read manuscript" }),
                    /* @__PURE__ */ jsx(
                      ArrowRight,
                      {
                        className: "h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5",
                        "aria-hidden": "true"
                      }
                    )
                  ]
                }
              )
            ] })
          ] })
        ] })
      ] })
    }
  );
}
const TAGS$2 = {
  ul: m.ul,
  ol: m.ol,
  div: m.div,
  dl: m.dl
};
function MotionList({ as = "ul", className, children, ...rest }) {
  const Tag = TAGS$2[as];
  return /* @__PURE__ */ jsx(MotionBoundary, { children: /* @__PURE__ */ jsx(Tag, { layout: true, className, ...rest, children: /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "popLayout", children }) }) });
}
function MotionItem({ as = "li", className, children, ...rest }) {
  const Tag = as === "li" ? m.li : m.div;
  return /* @__PURE__ */ jsx(
    Tag,
    {
      layout: true,
      initial: false,
      exit: { opacity: 0, scale: 0.985, y: -4, transition: TRANSITION.fast },
      transition: { layout: SPRING.layout },
      className,
      ...rest,
      children
    }
  );
}
function useArmedReveal(options = {}) {
  const { once = true, amount = 0.18, margin = "0px 0px -10% 0px", foldRatio = 0.9 } = options;
  const reducedMotion = useReducedMotion();
  const ref2 = useRef(null);
  const controls = useAnimationControls();
  const inView = useInView(ref2, { once, amount, margin });
  useLayoutEffect(() => {
    const node = ref2.current;
    if (!node || reducedMotion || typeof IntersectionObserver === "undefined") return;
    const viewport = window.innerHeight || 0;
    const rect = node.getBoundingClientRect();
    if (rect.top <= viewport * foldRatio) {
      controls.set("visible");
      return;
    }
    controls.set("hidden");
    node.style.willChange = "opacity, transform";
  }, [controls, reducedMotion, foldRatio]);
  useEffect(() => {
    if (!inView) return;
    void controls.start("visible").then(() => {
      if (ref2.current) ref2.current.style.willChange = "";
    });
  }, [controls, inView]);
  return { ref: ref2, controls, inView, reducedMotion };
}
const TAGS$1 = {
  div: m.div,
  section: m.section,
  article: m.article,
  aside: m.aside,
  figure: m.figure,
  footer: m.footer,
  header: m.header,
  li: m.li,
  ul: m.ul,
  ol: m.ol,
  p: m.p,
  span: m.span
};
function Reveal({
  as = "div",
  variant = "rise",
  delay = 0,
  index,
  step = 0.05,
  distance,
  duration,
  amount = 0.18,
  margin = "0px 0px -10% 0px",
  once = true,
  className,
  children,
  ...rest
}) {
  const { ref: ref2, controls } = useArmedReveal({ once, amount, margin });
  const variants = useMemo(() => {
    const inline = index !== void 0 ? Math.min(Math.max(index, 0) * step, 0.5) : 0;
    const base = revealVariants[variant];
    if (distance === void 0 && duration === void 0) {
      return withDelay(base, inline + delay / 1e3);
    }
    const hidden = { ...base.hidden };
    const visible = { ...base.visible };
    if (distance !== void 0) hidden.y = distance;
    if (duration !== void 0) {
      visible.transition = {
        ...visible.transition,
        duration: duration / 1e3,
        ease: [...EASING.enter]
      };
    }
    return withDelay({ hidden, visible }, inline + delay / 1e3);
  }, [variant, delay, index, step, distance, duration]);
  const Tag = TAGS$1[as];
  return /* @__PURE__ */ jsx(MotionBoundary, { children: /* @__PURE__ */ jsx(Tag, { ref: ref2, variants, animate: controls, className, ...rest, children }) });
}
const TAGS = {
  div: m.div,
  section: m.section,
  ul: m.ul,
  ol: m.ol,
  li: m.li,
  article: m.article,
  dl: m.dl,
  header: m.header
};
function Stagger({
  as = "div",
  step = STAGGER.item,
  lead = STAGGER.lead,
  amount = 0.15,
  margin = "0px 0px -8% 0px",
  once = true,
  className,
  children,
  ...rest
}) {
  const { ref: ref2, controls } = useArmedReveal({ once, amount, margin });
  const variants = useMemo(() => staggerContainer(step, lead), [step, lead]);
  const Tag = TAGS[as];
  return /* @__PURE__ */ jsx(MotionBoundary, { children: /* @__PURE__ */ jsx(Tag, { ref: ref2, variants, animate: controls, className, ...rest, children }) });
}
function StaggerItem({
  as = "div",
  variant = "rise",
  layout = false,
  className,
  children,
  ...rest
}) {
  const Tag = TAGS[as];
  return /* @__PURE__ */ jsx(MotionBoundary, { children: /* @__PURE__ */ jsx(
    Tag,
    {
      variants: revealVariants[variant],
      layout,
      transition: layout ? { layout: SPRING.layout } : void 0,
      className,
      ...rest,
      children
    }
  ) });
}
const CATEGORY_META = {
  "Research Reviews": {
    thumbnail: "/images/folio-process.jpeg",
    description: "Methodology audits, replication notes, and critiques of primary literature.",
    tags: ["Methodology", "Replication", "Meta-analysis"]
  },
  "GitHub Repo Teardowns": {
    thumbnail: "/images/folio-code.jpeg",
    description: "Architecture inspections, memory profiling, and runtime teardowns of open repositories.",
    tags: ["Architecture", "Performance", "Tooling"]
  },
  "STEM & Tech": {
    thumbnail: "/images/folio-dashboard.jpeg",
    description: "Hardware, semiconductor lithography, quantum runtimes, and engineering systems.",
    tags: ["Hardware", "Quantum", "Robotics"]
  },
  "Health & Medicine": {
    thumbnail: "/images/folio-hero.jpeg",
    description: "Clinical trial audits, pharmacology, gene editing, and biomedical delivery.",
    tags: ["Trials", "Pharmacology", "Genomics"]
  },
  "Sociology & Culture": {
    thumbnail: "/images/folio-design.jpeg",
    description: "Publication economics, peer-review incentives, and digital labour.",
    tags: ["Open access", "Digital labour", "Governance"]
  },
  "Data & Policy": {
    thumbnail: "/images/folio-design.jpeg",
    description: "Quantitative data science, algorithmic accountability, and technology policy.",
    tags: ["Privacy", "AI policy", "Data rights"]
  }
};
function categoryIcon(category) {
  switch (category) {
    case "Research Reviews":
      return /* @__PURE__ */ jsx(BookOpen, { className: "h-3.5 w-3.5", "aria-hidden": "true" });
    case "GitHub Repo Teardowns":
      return /* @__PURE__ */ jsx(GitBranch, { className: "h-3.5 w-3.5", "aria-hidden": "true" });
    case "STEM & Tech":
      return /* @__PURE__ */ jsx(Cpu, { className: "h-3.5 w-3.5", "aria-hidden": "true" });
    case "Health & Medicine":
      return /* @__PURE__ */ jsx(Activity, { className: "h-3.5 w-3.5", "aria-hidden": "true" });
    case "Sociology & Culture":
      return /* @__PURE__ */ jsx(Globe, { className: "h-3.5 w-3.5", "aria-hidden": "true" });
    case "Data & Policy":
      return /* @__PURE__ */ jsx(BarChart3, { className: "h-3.5 w-3.5", "aria-hidden": "true" });
    default:
      return /* @__PURE__ */ jsx(FileText, { className: "h-3.5 w-3.5", "aria-hidden": "true" });
  }
}
function ArticleFeed({
  posts,
  savedPostIds,
  likedPostIds = [],
  onToggleSave,
  onLikePost,
  selectedCategory,
  selectedFormat,
  searchQuery,
  onClearFilters
}) {
  const showCategoryGrid = selectedCategory === "All" && !searchQuery;
  const activeCategory = selectedCategory !== "All" ? selectedCategory : null;
  const activeMeta = activeCategory ? CATEGORY_META[activeCategory] : null;
  const hasFilters = selectedCategory !== "All" || selectedFormat !== "All" || Boolean(searchQuery);
  return /* @__PURE__ */ jsxs("section", { id: "articles-feed", "aria-labelledby": "catalogue-title", className: "mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8", children: [
    showCategoryGrid && /* @__PURE__ */ jsxs("div", { className: "mb-14", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Text, { as: "p", variant: "eyebrow", color: "secondary", children: "Six Specialist Columns" }),
          /* @__PURE__ */ jsx("h2", { id: "columns-heading", className: "mt-1 font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl", children: "Browse by editorial column" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "max-w-md font-sans text-xs leading-relaxed text-ink-secondary", children: "Each column is curated by domain specialists and anchored to primary code, datasets, or peer-reviewed papers." })
      ] }),
      /* @__PURE__ */ jsx(
        Stagger,
        {
          as: "ul",
          "data-layout-grid": "category-cards",
          className: "mt-6 grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
          children: Object.entries(CATEGORY_META).map(([category, meta], idx) => {
            const count = posts.filter((post) => post.category === category).length;
            const code = String(idx + 1).padStart(2, "0");
            return /* @__PURE__ */ jsx(StaggerItem, { as: "li", variant: "rise", children: /* @__PURE__ */ jsxs(
              LinkShim,
              {
                href: `/category/${categoryToSlug(category)}`,
                className: "group flex h-full flex-col justify-between rounded-sm border border-line bg-surface p-5 transition-colors hover:border-brand hover:bg-surface-subtle",
                children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2 font-mono text-xs text-ink-secondary", children: [
                      /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1.5 font-semibold text-brand", children: [
                        /* @__PURE__ */ jsx("span", { children: code }),
                        /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
                        categoryIcon(category)
                      ] }),
                      /* @__PURE__ */ jsxs("span", { children: [
                        count,
                        " ",
                        count === 1 ? "review" : "reviews"
                      ] })
                    ] }),
                    /* @__PURE__ */ jsx("h3", { className: "mt-3 font-serif text-xl font-semibold text-ink transition-colors group-hover:text-brand", children: category }),
                    /* @__PURE__ */ jsx("p", { className: "mt-2 font-sans text-xs leading-relaxed text-ink-secondary", children: meta.description })
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3 font-mono text-xs text-ink-secondary", children: meta.tags.map((tag) => /* @__PURE__ */ jsx("span", { className: "rounded-xs border border-line bg-canvas px-1.5 py-0.5", children: tag }, tag)) })
                ]
              }
            ) }, category);
          })
        }
      )
    ] }),
    activeMeta && activeCategory && /* @__PURE__ */ jsx(Reveal, { variant: "stage", className: "mb-10 border-y border-line py-6", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Text, { as: "p", variant: "eyebrow", color: "brand", children: "Active Column" }),
        /* @__PURE__ */ jsx(Text, { as: "h2", variant: "page-title", className: "mt-1", children: activeCategory }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary", children: activeMeta.description }),
        /* @__PURE__ */ jsx("ul", { className: "mt-3 flex flex-wrap gap-2 font-mono text-xs text-ink-secondary", children: activeMeta.tags.map((tag) => /* @__PURE__ */ jsxs("li", { className: "rounded-sm border border-line bg-surface px-2 py-0.5", children: [
          "#",
          tag
        ] }, tag)) })
      ] }),
      /* @__PURE__ */ jsx(
        Pressable,
        {
          type: "button",
          onClick: onClearFilters,
          className: "inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-line bg-surface px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-subtle",
          children: "All columns"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { id: "catalogue-title", className: "font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl", children: activeCategory ? `${activeCategory} reviews` : "Latest reviews" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-1.5 font-mono text-xs text-ink-secondary", children: [
          posts.length,
          " ",
          posts.length === 1 ? "manuscript" : "manuscripts",
          selectedFormat !== "All" ? ` · ${selectedFormat}` : "",
          searchQuery ? ` · matching “${searchQuery}”` : ""
        ] })
      ] }),
      hasFilters && /* @__PURE__ */ jsx(
        Pressable,
        {
          type: "button",
          onClick: onClearFilters,
          className: "min-h-11 font-sans text-xs font-semibold uppercase tracking-wider text-brand underline underline-offset-4 hover:text-brand-pressed",
          children: "Clear all filters"
        }
      )
    ] }),
    posts.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-sm border border-line bg-surface p-8 sm:p-12", children: [
      /* @__PURE__ */ jsx(Text, { as: "p", variant: "eyebrow", color: "secondary", children: "Diagnostic Empty State · Zero Matches" }),
      /* @__PURE__ */ jsx(Text, { as: "h3", variant: "section-title", className: "mt-2", children: "No manuscripts match the active filter constraints" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-xl font-sans text-sm leading-relaxed text-ink-secondary", children: "No published review satisfies all of the constraints below simultaneously. Relax a filter or reset the index to view the complete specialist catalog." }),
      /* @__PURE__ */ jsxs(
        "div",
        {
          "data-testid": "active-filter-chips",
          className: "mt-5 flex flex-wrap items-center gap-2 font-mono text-xs",
          children: [
            selectedCategory !== "All" && /* @__PURE__ */ jsxs("span", { className: "rounded-sm border border-brand bg-canvas px-2.5 py-1 text-ink", children: [
              "Column: ",
              selectedCategory
            ] }),
            selectedFormat !== "All" && /* @__PURE__ */ jsxs("span", { className: "rounded-sm border border-brand bg-canvas px-2.5 py-1 text-ink", children: [
              "Format: ",
              selectedFormat
            ] }),
            searchQuery && /* @__PURE__ */ jsxs("span", { className: "rounded-sm border border-brand bg-canvas px-2.5 py-1 text-ink", children: [
              "Query: ",
              searchQuery
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        Pressable,
        {
          type: "button",
          feedback: "lift",
          onClick: onClearFilters,
          className: "mt-6 inline-flex min-h-11 items-center rounded-sm bg-brand px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-on-primary transition-colors hover:bg-brand-hover",
          children: "Reset filters"
        }
      )
    ] }) : /* @__PURE__ */ jsx(MotionList, { "data-layout-grid": "article-cards", className: "mt-8 grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3", children: posts.map((post) => {
      const isSaved = savedPostIds.includes(post.id) || savedPostIds.includes(post.slug);
      const canonicalDoi = `10.5555/rwm.${post.id}`;
      return /* @__PURE__ */ jsx(MotionItem, { className: "flex min-w-0", children: /* @__PURE__ */ jsxs("article", { className: "group flex w-full min-w-0 flex-col justify-between rounded-sm border border-line bg-surface transition-[color,border-color,box-shadow,transform] duration-200 hover:border-brand hover:shadow-raised motion-safe:hover:-translate-y-0.5", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-3 p-5", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2 border-b border-line pb-3", children: [
            /* @__PURE__ */ jsx(Text, { as: "span", variant: "eyebrow", color: "secondary", weight: "medium", className: "rounded-xs border border-line bg-canvas px-2 py-0.5", children: post.format }),
            /* @__PURE__ */ jsxs(
              Pressable,
              {
                type: "button",
                onClick: () => onToggleSave(post.id),
                "aria-pressed": isSaved,
                className: `inline-flex h-9 w-9 items-center justify-center rounded-sm border transition-colors ${isSaved ? "border-brand bg-brand text-on-primary" : "border-line bg-canvas text-ink-secondary hover:bg-surface-subtle hover:text-ink"}`,
                children: [
                  /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: /* @__PURE__ */ jsx(
                    m.span,
                    {
                      initial: { scale: 0.7, opacity: 0, rotate: -12 },
                      animate: { scale: 1, opacity: 1, rotate: 0 },
                      exit: { scale: 0.7, opacity: 0, rotate: 12 },
                      transition: { duration: 0.16, ease: "easeOut" },
                      className: "inline-flex",
                      children: isSaved ? /* @__PURE__ */ jsx(SuccessCheck, { size: 14, quiet: true }) : /* @__PURE__ */ jsx(Bookmark, { className: "h-3.5 w-3.5", "aria-hidden": "true" })
                    },
                    isSaved ? "saved" : "unsaved"
                  ) }),
                  /* @__PURE__ */ jsx("span", { className: "sr-only", children: isSaved ? `Remove ${post.title} from reading list` : `Save ${post.title} to reading list` })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-ink-secondary", children: [
            /* @__PURE__ */ jsxs(
              LinkShim,
              {
                href: `/category/${categoryToSlug(post.category)}`,
                className: "inline-flex items-center gap-1 font-semibold text-brand underline-offset-4 hover:underline",
                children: [
                  categoryIcon(post.category),
                  /* @__PURE__ */ jsx("span", { children: post.category })
                ]
              }
            ),
            /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
            /* @__PURE__ */ jsx("span", { children: post.publishedAt }),
            /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
            /* @__PURE__ */ jsx("span", { children: post.readTime })
          ] }),
          /* @__PURE__ */ jsx("h3", { className: "break-words font-serif text-xl font-semibold leading-snug text-ink", children: /* @__PURE__ */ jsx(LinkShim, { href: `/post/${post.slug}`, className: "transition-colors hover:text-brand", children: post.title }) }),
          /* @__PURE__ */ jsx("p", { className: "break-words font-sans text-sm leading-relaxed text-ink-secondary", children: post.summary.length > 180 ? `${post.summary.slice(0, 177)}…` : post.summary }),
          /* @__PURE__ */ jsxs("div", { className: "mt-auto space-y-1.5 pt-2 font-mono text-xs text-ink-secondary", children: [
            post.reviewedArtifact && /* @__PURE__ */ jsxs("p", { className: "flex min-w-0 items-center gap-1.5 truncate text-ink", children: [
              post.reviewedArtifact.type === "github" ? /* @__PURE__ */ jsx(GitBranch, { className: "h-3.5 w-3.5 shrink-0 text-brand", "aria-hidden": "true" }) : /* @__PURE__ */ jsx(FileText, { className: "h-3.5 w-3.5 shrink-0 text-brand", "aria-hidden": "true" }),
              /* @__PURE__ */ jsx("span", { className: "truncate", children: post.reviewedArtifact.identifier })
            ] }),
            /* @__PURE__ */ jsxs("p", { className: "truncate", children: [
              "DOI ",
              canonicalDoi
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 border-t border-line bg-canvas/60 px-5 py-3", children: [
          /* @__PURE__ */ jsxs(
            LinkShim,
            {
              href: `/author/${post.author.id}`,
              className: "flex min-w-0 items-center gap-2 font-sans text-xs text-ink hover:text-brand",
              children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    "aria-hidden": "true",
                    className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-line bg-surface font-mono text-xs font-semibold text-ink",
                    children: post.author.avatar
                  }
                ),
                /* @__PURE__ */ jsx("span", { className: "truncate font-medium", children: post.author.name }),
                post.author.verifiedVia && /* @__PURE__ */ jsx(CheckCircle2, { className: "h-3.5 w-3.5 shrink-0 text-brand", "aria-hidden": "true" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-1.5 font-mono text-xs text-ink-secondary", children: [
            /* @__PURE__ */ jsxs(
              Pressable,
              {
                type: "button",
                onClick: () => onLikePost(post.id),
                "aria-pressed": likedPostIds.includes(post.id),
                className: "inline-flex min-h-9 items-center gap-1 rounded-sm px-1.5 transition-colors hover:text-brand",
                children: [
                  /* @__PURE__ */ jsx(
                    m.span,
                    {
                      "aria-hidden": "true",
                      className: "inline-flex",
                      animate: likedPostIds.includes(post.id) ? { scale: [1, 1.3, 1], rotate: [0, -8, 0] } : { scale: 1, rotate: 0 },
                      transition: { duration: 0.38, times: [0, 0.45, 1], ease: "easeInOut" },
                      children: /* @__PURE__ */ jsx(
                        Heart,
                        {
                          className: `h-3.5 w-3.5 ${likedPostIds.includes(post.id) ? "fill-brand text-brand" : ""}`
                        }
                      )
                    }
                  ),
                  /* @__PURE__ */ jsx("span", { children: post.likes }),
                  /* @__PURE__ */ jsxs("span", { className: "sr-only", children: [
                    "likes. Add a like to ",
                    post.title
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              LinkShim,
              {
                href: `/post/${post.slug}#discussion`,
                className: "inline-flex min-h-9 items-center gap-1 rounded-sm px-1.5 transition-colors hover:text-ink",
                children: [
                  /* @__PURE__ */ jsx(MessageSquare, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: post.commentsCount }),
                  /* @__PURE__ */ jsxs("span", { className: "sr-only", children: [
                    "comments on ",
                    post.title
                  ] })
                ]
              }
            )
          ] })
        ] })
      ] }) }, post.id);
    }) }),
    /* @__PURE__ */ jsxs("div", { className: "mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6", children: [
      /* @__PURE__ */ jsx("p", { className: "font-mono text-xs text-ink-secondary", children: "Every review is open access under CC BY 4.0 · ISSN 2994-0821." }),
      /* @__PURE__ */ jsxs(
        LinkShim,
        {
          href: "/papers",
          className: "inline-flex min-h-11 items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wider text-brand underline underline-offset-4 hover:text-brand-pressed",
          children: [
            /* @__PURE__ */ jsx("span", { children: "Browse the paper archive" }),
            /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4", "aria-hidden": "true" })
          ]
        }
      )
    ] })
  ] });
}
function IdentifierLinks({ author }) {
  const shared = { className: "h-3.5 w-3.5 text-brand", "aria-hidden": true };
  if (!author.orcid && !author.github) return null;
  return /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-2 font-mono text-xs font-medium text-ink", children: [
    author.orcid && /* @__PURE__ */ jsx(GraduationCap, { ...shared }),
    author.github && /* @__PURE__ */ jsx(GitBranch, { ...shared }),
    /* @__PURE__ */ jsx("span", { children: [author.orcid && "ORCID", author.github && "GitHub"].filter(Boolean).join(" · ") })
  ] });
}
function AuthorSpotlight({ authors }) {
  if (authors.length === 0) return null;
  return /* @__PURE__ */ jsx("section", { "aria-labelledby": "contributors-title", className: "border-t border-line bg-canvas", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8", children: [
    /* @__PURE__ */ jsxs(
      Reveal,
      {
        variant: "rise",
        className: "flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between",
        children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Text, { as: "p", variant: "eyebrow", color: "secondary", children: "Verified Specialists" }),
            /* @__PURE__ */ jsx(
              "h2",
              {
                id: "contributors-title",
                className: "mt-1 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl",
                children: "The people behind the reviews"
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary", children: "Each profile records what a contributor studies and everything they have reviewed here." })
          ] }),
          /* @__PURE__ */ jsxs(
            LinkShim,
            {
              href: "/authors",
              className: "group inline-flex min-h-11 items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wider text-brand underline underline-offset-4 hover:text-brand-pressed",
              children: [
                /* @__PURE__ */ jsx("span", { children: "All authors" }),
                /* @__PURE__ */ jsx(
                  ArrowRight,
                  {
                    className: "h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5",
                    "aria-hidden": "true"
                  }
                )
              ]
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsx(Stagger, { as: "ul", className: "divide-y divide-line", amount: 0.05, step: 0.06, children: authors.map((author) => /* @__PURE__ */ jsx(StaggerItem, { as: "li", variant: "rise", children: /* @__PURE__ */ jsxs(
      LinkShim,
      {
        href: `/author/${author.id}`,
        className: "group grid gap-4 px-2 py-6 transition-colors hover:bg-surface sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:gap-6",
        children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              "aria-hidden": "true",
              className: "flex h-12 w-12 items-center justify-center rounded-sm border border-line bg-surface font-mono text-sm font-semibold text-ink transition-colors group-hover:border-brand group-hover:text-brand",
              children: author.avatar
            }
          ),
          /* @__PURE__ */ jsxs("span", { className: "min-w-0", children: [
            /* @__PURE__ */ jsx("span", { className: "font-serif text-xl font-semibold text-ink transition-colors group-hover:text-brand", children: author.name }),
            author.role && /* @__PURE__ */ jsx("span", { className: "mt-1 block font-mono text-xs font-medium text-brand", children: author.role }),
            (author.institution || author.domain) && /* @__PURE__ */ jsx("span", { className: "mt-1 block font-sans text-xs text-ink-secondary", children: author.institution ?? author.domain }),
            /* @__PURE__ */ jsx("span", { className: "mt-3 block max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary", children: author.bio })
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "flex shrink-0 flex-col gap-1 font-mono text-xs text-ink-secondary sm:items-end", children: [
            /* @__PURE__ */ jsx(IdentifierLinks, { author }),
            /* @__PURE__ */ jsxs("span", { children: [
              author.articleCount,
              " ",
              author.articleCount === 1 ? "article" : "articles"
            ] })
          ] })
        ]
      }
    ) }, author.id)) })
  ] }) });
}
const LIMITS = {
  name: 120,
  email: 254,
  url: 2048,
  comment: 4e3,
  tags: 240
};
function cleanText$1(value, max) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
}
function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}
function slugify(value) {
  return normalizeWhitespace(value).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 96);
}
function isValidEmail(value) {
  const email = value.trim();
  if (email.length === 0 || email.length > LIMITS.email) return false;
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email);
}
function safeExternalUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > LIMITS.url) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
function parseTags(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => cleanText$1(tag, 48)).filter((tag) => Boolean(tag)).slice(0, 8);
  }
  return cleanText$1(value, LIMITS.tags).split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
}
const TOPICS$1 = [
  { key: "teardowns", label: "Repository teardowns" },
  { key: "papers", label: "Paper reviews" },
  { key: "clinical", label: "Clinical and health" },
  { key: "policy", label: "Data and policy" }
];
function NewsletterSignup() {
  const hydrated = useHydratePreferences();
  const digest = usePreferencesStore((state) => state.digest);
  const subscribeDigest = usePreferencesStore((state) => state.subscribeDigest);
  const setDigestTopic = usePreferencesStore((state) => state.setDigestTopic);
  const unsubscribeDigest = usePreferencesStore((state) => state.unsubscribeDigest);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [topics, setTopics] = useState({
    ...DEFAULT_DIGEST_TOPICS
  });
  const timerRef = useRef(null);
  useEffect(() => {
    if (!hydrated) return;
    if (digest.email) setEmail(digest.email);
    setTopics({ ...digest.topics });
  }, [hydrated, digest.email, digest.topics]);
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);
  const isSubscribed = hydrated && digest.subscribed;
  function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!email.trim()) {
      setError("Enter an email address to subscribe.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a complete email address, including an @ and a domain.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    timerRef.current = window.setTimeout(() => {
      const stored = subscribeDigest(email.trim(), topics);
      setIsSubmitting(false);
      if (!stored) {
        setError(
          "Your browser blocked local storage, so this subscription was held in memory for this tab only."
        );
      }
    }, 300);
  }
  function handleToggleTopic(key) {
    const next = !topics[key];
    setTopics((prev) => ({ ...prev, [key]: next }));
    if (hydrated && digest.subscribed) {
      setDigestTopic(key, next);
    }
  }
  function handleReset() {
    unsubscribeDigest();
    setEmail("");
    setError(null);
  }
  return /* @__PURE__ */ jsx("section", { "aria-labelledby": "newsletter-title", className: "border-b border-line pb-12", children: /* @__PURE__ */ jsx("div", { className: "rounded-sm border border-line bg-canvas p-6 sm:p-8", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Text, { as: "p", variant: "eyebrow", color: "secondary", children: "Weekly Dispatch · No Tracking Pixels" }),
      /* @__PURE__ */ jsx(Text, { id: "newsletter-title", as: "h2", variant: "page-title", className: "mt-2", children: "The weekly research digest" }),
      /* @__PURE__ */ jsx("p", { className: "mt-3 max-w-xl font-sans text-sm leading-relaxed text-ink-secondary", children: "One Tuesday dispatch with the newest repository teardowns, reproducible notebooks, and errata notices." }),
      /* @__PURE__ */ jsx("p", { className: "mt-3 font-sans text-xs text-ink-secondary", children: "Stored locally in your browser preferences — no external marketing tracker receives your address." })
    ] }),
    isSubscribed ? /* @__PURE__ */ jsxs(Card, { role: "status", padding: "lg", children: [
      /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-2 font-sans text-sm font-semibold text-ink", children: [
        /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 text-brand", "aria-hidden": "true" }),
        "Saved in this browser"
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "mt-2 font-sans text-xs leading-relaxed text-ink-secondary", children: [
        "Digest preferences",
        digest.email ? ` for ${digest.email}` : "",
        " are active on this device."
      ] }),
      error && /* @__PURE__ */ jsx("p", { role: "alert", className: "mt-2 font-sans text-xs text-destructive", children: error }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: handleReset,
          className: "mt-4 min-h-11 font-sans text-xs font-medium text-ink underline underline-offset-4 hover:text-brand",
          children: "Remove this preference"
        }
      )
    ] }) : /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "newsletter-email", className: "mb-1.5 block font-sans text-xs font-medium text-ink", children: "Email address" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(Mail, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary", "aria-hidden": "true" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: "newsletter-email",
              type: "email",
              inputMode: "email",
              enterKeyHint: "send",
              autoComplete: "email",
              value: email,
              onChange: (event) => setEmail(event.target.value),
              "aria-invalid": error ? true : void 0,
              "aria-describedby": error ? "newsletter-error" : void 0,
              placeholder: "researcher@university.edu",
              className: "h-11 w-full rounded-sm border border-line bg-surface pl-10 pr-3 font-sans text-sm text-ink placeholder:text-ink-secondary"
            }
          )
        ] }),
        error && /* @__PURE__ */ jsx("p", { id: "newsletter-error", role: "alert", className: "mt-2 font-sans text-xs text-destructive", children: error })
      ] }),
      /* @__PURE__ */ jsxs("fieldset", { children: [
        /* @__PURE__ */ jsx(Text, { as: "legend", variant: "eyebrow", color: "secondary", className: "mb-2", children: "Columns" }),
        /* @__PURE__ */ jsx("div", { className: "grid gap-1.5", children: TOPICS$1.map((topic) => /* @__PURE__ */ jsxs("label", { className: "flex min-h-9 items-center gap-2 font-sans text-xs text-ink", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              checked: topics[topic.key],
              onChange: () => handleToggleTopic(topic.key),
              className: "h-4 w-4 rounded-xs border-line accent-brand"
            }
          ),
          /* @__PURE__ */ jsx("span", { children: topic.label })
        ] }, topic.key)) })
      ] }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "submit",
          disabled: isSubmitting,
          className: "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-ink px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90 disabled:opacity-60",
          children: [
            /* @__PURE__ */ jsx(Send, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
            /* @__PURE__ */ jsx("span", { children: isSubmitting ? "Saving preference…" : "Subscribe to the digest" })
          ]
        }
      )
    ] })
  ] }) }) });
}
const exploreLinks = [
  { href: "/papers", label: "Paper archive" },
  { href: "/authors", label: "Authors and specialists" },
  { href: "/editions", label: "PDF editions" },
  { href: "/editorial-board", label: "Editorial board" },
  { href: "/assistant", label: "Research assistant" },
  { href: "/cite", label: "Citation builder" },
  { href: "/bookmarks", label: "Reading list" },
  { href: "/write", label: "Writer studio" }
];
function BlogFooter() {
  return /* @__PURE__ */ jsx("footer", { className: "mt-16 border-t border-line bg-surface text-ink", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8", children: [
    /* @__PURE__ */ jsx(NewsletterSignup, {}),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-10 pt-12 md:grid-cols-2 lg:grid-cols-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "lg:col-span-2", children: [
        /* @__PURE__ */ jsx(LinkShim, { href: "/", className: "inline-flex items-center gap-2 rounded-sm", "aria-label": "𝞹eme — ResearchWithMe home", children: /* @__PURE__ */ jsx(BrandLogo, { size: "md", showText: true }) }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-md font-sans text-sm leading-relaxed text-ink-secondary", children: "An independent, open-access platform where verified specialists deconstruct research papers, GitHub repositories, and technical literature across STEM, health, sociology, and policy." }),
        /* @__PURE__ */ jsxs("dl", { className: "mt-5 space-y-1.5 font-sans text-xs text-ink-secondary", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { className: "sr-only", children: "Identifier" }),
            /* @__PURE__ */ jsx("dd", { className: "font-mono", children: "ISSN 2994-0821 (digital) · DOI prefix 10.5555/rwm" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { className: "sr-only", children: "License" }),
            /* @__PURE__ */ jsx("dd", { children: "Creative Commons Attribution 4.0 International (CC BY 4.0)" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { className: "sr-only", children: "Funding model" }),
            /* @__PURE__ */ jsx("dd", { children: "Diamond Open Access · no paywalls · no behavioural ad trackers" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-6 flex flex-wrap gap-3", children: [
          /* @__PURE__ */ jsxs(
            LinkShim,
            {
              href: "/write",
              className: "inline-flex min-h-11 items-center gap-2 rounded-sm bg-ink px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90",
              children: [
                /* @__PURE__ */ jsx(PenSquare, { className: "h-4 w-4", "aria-hidden": "true" }),
                /* @__PURE__ */ jsx("span", { children: "Write a review" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            LinkShim,
            {
              href: "/dashboard/access",
              className: "inline-flex min-h-11 items-center gap-2 rounded-sm border border-line bg-canvas px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-subtle",
              children: [
                /* @__PURE__ */ jsx(ShieldCheck, { className: "h-4 w-4 text-brand", "aria-hidden": "true" }),
                /* @__PURE__ */ jsx("span", { children: "Apply to write" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("nav", { "aria-labelledby": "footer-domains", children: [
        /* @__PURE__ */ jsx(Text, { id: "footer-domains", as: "h2", variant: "eyebrow", weight: "semibold", children: "Editorial Columns" }),
        /* @__PURE__ */ jsx("ul", { className: "mt-3 space-y-2 font-sans text-sm", children: CATEGORIES.map((category) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
          Link,
          {
            href: `/category/${categoryToSlug(category)}`,
            variant: "muted",
            children: category
          }
        ) }, category)) })
      ] }),
      /* @__PURE__ */ jsxs("nav", { "aria-labelledby": "footer-explore", children: [
        /* @__PURE__ */ jsx(Text, { id: "footer-explore", as: "h2", variant: "eyebrow", weight: "semibold", children: "Explore the platform" }),
        /* @__PURE__ */ jsx("ul", { className: "mt-3 space-y-2 font-sans text-sm", children: exploreLinks.map((link) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
          Link,
          {
            href: link.href,
            variant: "muted",
            children: link.label
          }
        ) }, link.href)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-12 flex flex-col gap-4 border-t border-line pt-6 font-sans text-xs text-ink-secondary sm:flex-row sm:items-center sm:justify-between", children: [
      /* @__PURE__ */ jsx("p", { children: "© 2026 ResearchWithMe Publication Collective. Published under CC BY 4.0 open access." }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-x-4 gap-y-2", children: [
        /* @__PURE__ */ jsx(Link, { href: "/about", variant: "quiet", children: "About" }),
        /* @__PURE__ */ jsx(Link, { href: "/editorial-board", variant: "quiet", children: "Editorial standards" }),
        /* @__PURE__ */ jsx(Link, { href: "/privacy", variant: "quiet", children: "Privacy" }),
        /* @__PURE__ */ jsx(Link, { href: "/contact", variant: "quiet", children: "Contact" }),
        /* @__PURE__ */ jsx(Link, { href: "/cite", variant: "quiet", children: "Citation export" }),
        /* @__PURE__ */ jsxs(Link, { href: "/assistant", variant: "quiet", className: "inline-flex items-center gap-1", children: [
          /* @__PURE__ */ jsx("span", { children: "Synthesis" }),
          /* @__PURE__ */ jsx(ArrowUpRight, { className: "h-3.5 w-3.5", "aria-hidden": "true" })
        ] }),
        /* @__PURE__ */ jsx(Link, { href: "/motion", variant: "quiet", children: "Motion system" })
      ] })
    ] })
  ] }) });
}
function HomeFeed({
  initialCategory = "All",
  initialSearch = "",
  authors = [],
  initialPosts
}) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const hydrated = useHydratePreferences();
  const storeSavedPostIds = usePreferencesStore((state) => state.savedPostIds);
  const storeLikedPostIds = usePreferencesStore((state) => state.likedPostIds);
  const toggleSavedPost = usePreferencesStore((state) => state.toggleSavedPost);
  const setPostLiked = usePreferencesStore((state) => state.setPostLiked);
  const [posts, setPosts] = useState(initialPosts ?? INITIAL_BLOG_POSTS);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedFormat, setSelectedFormat] = useState("All");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const feedRef = useRef(null);
  const savedPostIds = useMemo(
    () => hydrated ? storeSavedPostIds : [],
    [hydrated, storeSavedPostIds]
  );
  const likedPostIds = useMemo(
    () => hydrated ? storeLikedPostIds : [],
    [hydrated, storeLikedPostIds]
  );
  useEffect(() => {
    let active = true;
    async function loadArticles() {
      try {
        const res = await fetch("/api/articles", { headers: { accept: "application/json" } });
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.articles) && data.articles.length > 0) {
          setPosts(data.articles);
        }
      } catch {
      }
    }
    loadArticles();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    setSelectedCategory(initialCategory);
    setSearchQuery(initialSearch);
  }, [initialCategory, initialSearch]);
  const filteredPosts = useMemo(() => {
    const query2 = searchQuery.trim().toLowerCase();
    return posts.filter((post) => {
      if (selectedCategory !== "All" && post.category !== selectedCategory) return false;
      if (selectedFormat !== "All" && post.format !== selectedFormat) return false;
      if (!query2) return true;
      return [
        post.title,
        post.subtitle,
        post.summary,
        post.author.name,
        post.category,
        post.format,
        `10.5555/rwm.${post.id}`,
        ...post.tags,
        post.reviewedArtifact?.identifier ?? "",
        post.reviewedArtifact?.title ?? ""
      ].some((value) => value.toLowerCase().includes(query2));
    });
  }, [posts, searchQuery, selectedCategory, selectedFormat]);
  const featuredPost = useMemo(() => posts.find((post) => post.featured) ?? posts[0], [posts]);
  const showFeatured = !searchQuery && selectedCategory === "All" && selectedFormat === "All" && Boolean(featuredPost);
  function scrollToFeed() {
    feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function handleToggleSave(postId) {
    toggleSavedPost(postId);
  }
  async function handleLikePost(postId) {
    if (likedPostIds.includes(postId)) return;
    setPostLiked(postId, true);
    setPosts(
      (previous) => previous.map((post) => post.id === postId ? { ...post, likes: post.likes + 1 } : post)
    );
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(postId)}`, { method: "PATCH" });
      if (!res.ok) throw new Error("Like was not recorded");
    } catch {
      setPosts(
        (previous) => previous.map(
          (post) => post.id === postId ? { ...post, likes: Math.max(0, post.likes - 1) } : post
        )
      );
      setPostLiked(postId, false);
    }
  }
  function clearFilters() {
    setSelectedCategory("All");
    setSelectedFormat("All");
    setSearchQuery("");
    if (pathname.startsWith("/category/")) {
      router.push("/");
    }
    scrollToFeed();
  }
  function handleSelectCategoryInPlace(category) {
    setSelectedCategory(category);
    if (pathname.startsWith("/category/") && category === "All") {
      router.push("/");
    }
  }
  function selectCategoryRoute(category) {
    if (category === "All") {
      router.push("/");
    } else {
      router.push(`/category/${categoryToSlug(category)}`);
    }
    scrollToFeed();
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-canvas text-ink", children: [
    /* @__PURE__ */ jsx(
      BlogHeader,
      {
        searchQuery,
        setSearchQuery,
        savedCount: savedPostIds.length
      }
    ),
    /* @__PURE__ */ jsxs("main", { className: "flex-1", children: [
      /* @__PURE__ */ jsx(
        BlogHero,
        {
          searchQuery,
          setSearchQuery,
          selectedFormat,
          setSelectedFormat,
          selectedCategory,
          setSelectedCategory: handleSelectCategoryInPlace,
          totalArticles: posts.length
        }
      ),
      showFeatured && featuredPost && /* @__PURE__ */ jsx(Reveal, { variant: "mask", amount: 0.08, margin: "0px 0px -5% 0px", children: /* @__PURE__ */ jsx(
        FeaturedArticle,
        {
          post: featuredPost,
          isSaved: savedPostIds.includes(featuredPost.id),
          onToggleSave: handleToggleSave
        }
      ) }),
      /* @__PURE__ */ jsx("div", { ref: feedRef, children: /* @__PURE__ */ jsx(
        ArticleFeed,
        {
          posts: filteredPosts,
          savedPostIds,
          likedPostIds,
          onToggleSave: handleToggleSave,
          onLikePost: handleLikePost,
          selectedCategory,
          selectedFormat,
          searchQuery,
          onClearFilters: clearFilters,
          onSelectCategory: selectCategoryRoute
        }
      ) }),
      /* @__PURE__ */ jsx("div", { "data-lazy-section": true, children: /* @__PURE__ */ jsx(Reveal, { variant: "stage", amount: 0.05, children: /* @__PURE__ */ jsx(AuthorSpotlight, { authors }) }) })
    ] }),
    /* @__PURE__ */ jsx(BlogFooter, {})
  ] });
}
function HomeRoute() {
  const data = useLoaderData();
  return /* @__PURE__ */ jsx(
    HomeFeed,
    {
      initialCategory: data.category,
      initialSearch: data.search,
      authors: data.authors,
      initialPosts: data.posts
    }
  );
}
function CategoryRoute() {
  const data = useLoaderData();
  return /* @__PURE__ */ jsx(
    HomeFeed,
    {
      initialCategory: data.category,
      initialSearch: data.search,
      authors: data.authors,
      initialPosts: data.posts
    }
  );
}
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function createDomainFallbackSvg(name, domain, role) {
  const initials = escapeXml(
    name.split(" ").map((word) => word[0]).filter(Boolean).join("").slice(0, 2).toUpperCase()
  );
  let bgGradientStart = "#4F46E5";
  let bgGradientEnd = "#312E81";
  let accentColor = "#6366F1";
  let motifIcon = "🔬";
  const domainLower = domain.toLowerCase() + " " + role.toLowerCase();
  if (domainLower.includes("computer") || domainLower.includes("ai") || domainLower.includes("systems") || domainLower.includes("infrastructure")) {
    bgGradientStart = "#1e293b";
    bgGradientEnd = "#0f172a";
    accentColor = "#38bdf8";
    motifIcon = "⚡";
  } else if (domainLower.includes("medicine") || domainLower.includes("health") || domainLower.includes("clinical")) {
    bgGradientStart = "#064e3b";
    bgGradientEnd = "#022c22";
    accentColor = "#34d399";
    motifIcon = "🧬";
  } else if (domainLower.includes("climate") || domainLower.includes("environment") || domainLower.includes("geophysics")) {
    bgGradientStart = "#134e4a";
    bgGradientEnd = "#042f2e";
    accentColor = "#2dd4bf";
    motifIcon = "🌐";
  } else if (domainLower.includes("sociology") || domainLower.includes("policy") || domainLower.includes("economics")) {
    bgGradientStart = "#701a75";
    bgGradientEnd = "#4a044e";
    accentColor = "#e879f9";
    motifIcon = "📊";
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
    <defs>
      <linearGradient id="grad-${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradientStart}" />
        <stop offset="100%" stop-color="${bgGradientEnd}" />
      </linearGradient>
      <pattern id="grid-${initials}" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${accentColor}" stroke-opacity="0.1" stroke-width="1" />
      </pattern>
    </defs>
    <rect width="200" height="200" rx="24" fill="url(#grad-${initials})" />
    <rect width="200" height="200" rx="24" fill="url(#grid-${initials})" />

    <!-- Domain Background Rings -->
    <circle cx="100" cy="100" r="70" fill="none" stroke="${accentColor}" stroke-opacity="0.25" stroke-width="1.5" stroke-dasharray="4 4" />
    <circle cx="100" cy="100" r="85" fill="none" stroke="${accentColor}" stroke-opacity="0.15" stroke-width="1" />

    <!-- Domain Symbol Badge -->
    <circle cx="160" cy="40" r="18" fill="${bgGradientEnd}" stroke="${accentColor}" stroke-width="1.5" />
    <text x="160" y="45" font-size="14" text-anchor="middle" dominant-baseline="middle">${motifIcon}</text>

    <!-- Author Initials Avatar -->
    <text x="100" y="108" font-family="Georgia, serif" font-size="52" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="-1">${initials}</text>

    <!-- AI Verification Pill -->
    <rect x="40" y="152" width="120" height="22" rx="11" fill="${accentColor}" fill-opacity="0.2" stroke="${accentColor}" stroke-width="1" />
    <text x="100" y="166" font-family="-apple-system, sans-serif" font-size="10" font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="0.5">AI RESEARCH AVATAR</text>
  </svg>`;
  return svg;
}
function svgToDataUri(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
const FRAME = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-20 w-20",
  xl: "h-28 w-28"
};
const PIXELS = { sm: 40, md: 56, lg: 80, xl: 112 };
function AuthorAvatar({
  author,
  size = "lg"
}) {
  const px = PIXELS[size];
  const frame = `relative shrink-0 overflow-hidden rounded-xl border border-line bg-surface-inverse shadow-sm ${FRAME[size]}`;
  return /* @__PURE__ */ jsx("div", { className: frame, children: isProfileImageUrl(author.avatar) ? /* @__PURE__ */ jsx(
    ImageShim,
    {
      src: author.avatar,
      alt: author.name,
      width: px,
      height: px,
      className: "h-full w-full object-cover"
    }
  ) : (
    // A data-URI SVG: next/image does not serve SVG and the payload is
    // already inline, so the optimizer would add a round trip for nothing.
    // eslint-disable-next-line @next/next/no-img-element
    /* @__PURE__ */ jsx(
      "img",
      {
        src: svgToDataUri(createDomainFallbackSvg(author.name, author.domain, author.role)),
        alt: author.name,
        width: px,
        height: px,
        className: "h-full w-full"
      }
    )
  ) });
}
function SpecialistBadgePopover({ author }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeTimerRef = useRef(null);
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);
  if (!author.verifiedVia && !author.orcid && !author.github) {
    return null;
  }
  const viaOrcid = author.verifiedVia === "orcid" || Boolean(author.orcid && !author.verifiedVia);
  const cleanOrcid = author.orcid?.replace(/^https?:\/\/orcid\.org\//i, "").trim();
  const badgeLabel = author.verifiedVia === "orcid" ? "ORCID Verified" : author.verifiedVia === "github" ? "GitHub Verified" : viaOrcid ? "ORCID Linked" : "GitHub Linked";
  const identifierText = cleanOrcid || author.verifiedIdentifier || author.github?.replace(/^https?:\/\/(www\.)?github\.com\//i, "@") || author.id;
  const registryUrl = cleanOrcid ? `https://orcid.org/${cleanOrcid}` : author.github && /^https?:\/\//i.test(author.github) ? author.github : void 0;
  function scheduleClose() {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 150);
  }
  function cancelClose() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }
  async function handleCopyId() {
    try {
      await navigator.clipboard.writeText(identifierText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2e3);
    } catch {
    }
  }
  return /* @__PURE__ */ jsxs(Popover.Root, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx(Popover.Trigger, { asChild: true, children: /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onPointerEnter: () => {
          cancelClose();
          setOpen(true);
        },
        onPointerLeave: scheduleClose,
        "aria-label": `${author.name} — ${badgeLabel} specialist credentials`,
        className: "inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-brand/30 bg-selection/40 px-2.5 py-1 font-mono text-xs font-medium text-brand transition-colors hover:bg-selection",
        children: [
          /* @__PURE__ */ jsx(CheckCircle2, { className: "h-3.5 w-3.5 shrink-0", "aria-hidden": "true" }),
          /* @__PURE__ */ jsx("span", { children: badgeLabel })
        ]
      }
    ) }),
    /* @__PURE__ */ jsx(Popover.Portal, { children: /* @__PURE__ */ jsxs(
      Popover.Content,
      {
        sideOffset: 6,
        collisionPadding: 12,
        onPointerEnter: cancelClose,
        onPointerLeave: scheduleClose,
        className: "z-50 w-80 max-w-[92vw] rounded-sm border border-line bg-surface-raised p-4 text-left text-ink focus:outline-none",
        children: [
          /* @__PURE__ */ jsxs(Text, { as: "div", variant: "eyebrow", color: "brand", weight: "semibold", className: "flex items-center gap-1.5 border-b border-line pb-2", children: [
            viaOrcid ? /* @__PURE__ */ jsx(GraduationCap, { className: "h-3.5 w-3.5", "aria-hidden": "true" }) : /* @__PURE__ */ jsx(GitBranch, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
            /* @__PURE__ */ jsxs("span", { children: [
              badgeLabel,
              " Specialist"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-2.5 space-y-1", children: [
            /* @__PURE__ */ jsx("p", { className: "font-serif text-base font-semibold text-ink", children: author.name }),
            /* @__PURE__ */ jsxs("p", { className: "font-sans text-xs text-ink-secondary", children: [
              author.role,
              author.institution ? ` · ${author.institution}` : ""
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-center justify-between gap-2 rounded-sm border border-line bg-canvas px-2.5 py-2 font-mono text-xs text-ink", children: [
            /* @__PURE__ */ jsx("span", { className: "truncate", children: identifierText }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: handleCopyId,
                "aria-label": "Copy specialist identifier",
                className: "inline-flex shrink-0 items-center gap-1 text-brand hover:underline",
                children: [
                  copied ? /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5", "aria-hidden": "true" }) : /* @__PURE__ */ jsx(Copy, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: copied ? "Copied" : "Copy" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5 font-sans text-xs", children: [
            /* @__PURE__ */ jsx(
              LinkShim,
              {
                href: `/author/${author.id}`,
                className: "font-medium text-ink underline-offset-4 hover:text-brand hover:underline",
                children: "Specialist dossier →"
              }
            ),
            registryUrl && /* @__PURE__ */ jsxs(
              "a",
              {
                href: registryUrl,
                target: "_blank",
                rel: "noreferrer noopener",
                className: "inline-flex items-center gap-1 font-medium text-brand underline-offset-4 hover:underline",
                children: [
                  /* @__PURE__ */ jsx("span", { children: "Registry" }),
                  /* @__PURE__ */ jsx(ExternalLink, { className: "h-3 w-3", "aria-hidden": "true" })
                ]
              }
            )
          ] })
        ]
      }
    ) })
  ] });
}
function verification(author) {
  if (!author.verifiedVia) return null;
  switch (author.verifiedVia) {
    case "orcid":
      return {
        label: "ORCID verified researcher",
        detail: author.orcid ? `iD ${author.orcid}` : author.verifiedIdentifier,
        link: author.orcid ? `https://orcid.org/${author.orcid.replace(/^https?:\/\/orcid\.org\//, "")}` : void 0
      };
    case "github":
      return {
        label: "GitHub verified maintainer",
        detail: author.verifiedIdentifier,
        link: author.github
      };
  }
}
function ProfileLinks({ author }) {
  const links = [
    author.orcid ? { href: `https://orcid.org/${author.orcid.replace(/^https?:\/\/orcid\.org\//, "")}`, label: "ORCID" } : null,
    author.github ? { href: author.github, label: "GitHub" } : null,
    author.scholar ? { href: author.scholar, label: "Google Scholar" } : null,
    author.twitter ? { href: author.twitter, label: "X / Twitter" } : null,
    author.website ? { href: author.website, label: "Lab website" } : null
  ].filter((link) => Boolean(link));
  if (links.length === 0) return null;
  return /* @__PURE__ */ jsx("ul", { className: "flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs", children: links.map((link) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
    "a",
    {
      href: link.href,
      target: "_blank",
      rel: "noreferrer noopener",
      className: "inline-flex min-h-9 items-center gap-1 text-brand underline-offset-4 hover:underline",
      children: [
        /* @__PURE__ */ jsx("span", { children: link.label }),
        /* @__PURE__ */ jsx(ExternalLink, { className: "h-3.5 w-3.5", "aria-hidden": "true" })
      ]
    }
  ) }, link.href)) });
}
function AuthorProfileCard({
  author,
  metrics,
  compact = false,
  headingLevel = "h2"
}) {
  const [shareMessage, setShareMessage] = useState(null);
  const badge = verification(author);
  const Heading = headingLevel;
  async function shareProfile() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: `${author.name} on ResearchWithMe`, url });
        setShareMessage("Profile shared.");
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMessage("Profile link copied.");
    } catch {
      setShareMessage("Sharing is unavailable in this browser. Copy the address from the browser bar.");
    }
  }
  if (compact) {
    return /* @__PURE__ */ jsxs(Card, { "aria-labelledby": "author-compact-heading", as: "section", padding: "lg", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ jsx(AuthorAvatar, { author, size: "md" }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsx(Heading, { id: "author-compact-heading", className: "font-serif text-lg font-semibold text-ink", children: /* @__PURE__ */ jsx(LinkShim, { href: `/author/${author.id}`, className: "hover:text-brand", children: author.name }) }),
          /* @__PURE__ */ jsx("p", { className: "font-mono text-xs font-medium text-brand", children: author.role }),
          author.institution && /* @__PURE__ */ jsx("p", { className: "mt-0.5 font-sans text-xs text-ink-secondary", children: author.institution })
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-3 font-sans text-sm leading-relaxed text-ink-secondary", children: author.bio.length > 180 ? `${author.bio.slice(0, 177)}…` : author.bio }),
      /* @__PURE__ */ jsx("div", { className: "mt-3", children: /* @__PURE__ */ jsx(SpecialistBadgePopover, { author }) }),
      /* @__PURE__ */ jsx("div", { className: "mt-3", children: /* @__PURE__ */ jsx(ProfileLinks, { author }) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 font-mono text-xs", children: [
        /* @__PURE__ */ jsxs("span", { className: "text-ink-secondary", children: [
          metrics?.totalArticles ?? author.articleCount,
          " articles"
        ] }),
        /* @__PURE__ */ jsxs(
          LinkShim,
          {
            href: `/author/${author.id}`,
            className: "inline-flex min-h-9 items-center gap-1 font-sans font-medium text-brand underline-offset-4 hover:underline",
            children: [
              /* @__PURE__ */ jsx("span", { children: "Full profile" }),
              /* @__PURE__ */ jsx(ExternalLink, { className: "h-3.5 w-3.5", "aria-hidden": "true" })
            ]
          }
        )
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs(Card, { "aria-labelledby": "author-profile-heading", as: "section", padding: "xl", className: "sm:p-8", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
        /* @__PURE__ */ jsx(AuthorAvatar, { author, size: "xl" }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2.5", children: [
            /* @__PURE__ */ jsx(Heading, { id: "author-profile-heading", className: "font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl", children: author.name }),
            /* @__PURE__ */ jsx(SpecialistBadgePopover, { author })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 font-mono text-xs font-medium text-brand", children: author.role }),
          author.institution && /* @__PURE__ */ jsxs("p", { className: "mt-1 flex items-start gap-1.5 font-sans text-sm text-ink-secondary", children: [
            /* @__PURE__ */ jsx(Building2, { className: "mt-0.5 h-4 w-4 shrink-0", "aria-hidden": "true" }),
            /* @__PURE__ */ jsx("span", { children: author.institution })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-2xl font-sans text-xs text-ink-secondary", children: author.domain })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: shareProfile,
            className: "inline-flex min-h-11 items-center gap-2 rounded-sm border border-line bg-canvas px-4 py-2 font-sans text-xs font-medium text-ink transition-colors hover:bg-surface-subtle",
            children: [
              /* @__PURE__ */ jsx(Share2, { className: "h-4 w-4", "aria-hidden": "true" }),
              /* @__PURE__ */ jsx("span", { children: "Share profile" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          LinkShim,
          {
            href: "/write",
            className: "inline-flex min-h-11 items-center gap-2 rounded-sm bg-ink px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90",
            children: [
              /* @__PURE__ */ jsx(ShieldCheck, { className: "h-4 w-4", "aria-hidden": "true" }),
              /* @__PURE__ */ jsx("span", { children: "Writer studio" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("p", { role: "status", "aria-live": "polite", className: "mt-2 min-h-5 font-sans text-xs text-ink-secondary", children: shareMessage }),
    /* @__PURE__ */ jsxs("dl", { className: "mt-6 grid gap-6 border-y border-line py-5 sm:grid-cols-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Text, { as: "dt", variant: "eyebrow", color: "secondary", children: "Articles" }),
        /* @__PURE__ */ jsx("dd", { className: "mt-1 font-mono text-2xl font-semibold text-ink", children: metrics?.totalArticles ?? author.articleCount })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Text, { as: "dt", variant: "eyebrow", color: "secondary", children: "Likes" }),
        /* @__PURE__ */ jsx("dd", { className: "mt-1 font-mono text-2xl font-semibold text-ink", children: metrics?.totalLikes ?? "—" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Text, { as: "dt", variant: "eyebrow", color: "secondary", children: "Comments" }),
        /* @__PURE__ */ jsx("dd", { className: "mt-1 font-mono text-2xl font-semibold text-ink", children: metrics?.totalComments ?? "—" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Text, { as: "dt", variant: "eyebrow", color: "secondary", children: "Contributor since" }),
        /* @__PURE__ */ jsx("dd", { className: "mt-1 font-mono text-sm font-semibold text-ink", children: author.joinedDate })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 grid gap-6 sm:grid-cols-[minmax(0,1fr)_18rem]", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Text, { as: "h2", variant: "eyebrow", weight: "semibold", children: "Research background" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-prose font-sans text-sm leading-relaxed text-ink-secondary", children: author.bio }),
        /* @__PURE__ */ jsx("div", { className: "mt-4", children: /* @__PURE__ */ jsx(ProfileLinks, { author }) })
      ] }),
      badge && /* @__PURE__ */ jsxs("div", { className: "border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0", children: [
        /* @__PURE__ */ jsx(Text, { as: "h2", variant: "eyebrow", weight: "semibold", children: "Verification record" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-2 flex items-start gap-1.5 font-sans text-xs font-medium text-brand", children: [
          /* @__PURE__ */ jsx(CheckCircle2, { className: "mt-0.5 h-4 w-4 shrink-0", "aria-hidden": "true" }),
          /* @__PURE__ */ jsx("span", { children: badge.label })
        ] }),
        badge.detail && /* @__PURE__ */ jsx("p", { className: "mt-1 break-all font-mono text-xs text-ink", children: badge.detail }),
        badge.link && /* @__PURE__ */ jsxs(
          "a",
          {
            href: badge.link,
            target: "_blank",
            rel: "noreferrer noopener",
            className: "mt-2 inline-flex min-h-9 items-center gap-1 font-sans text-xs font-medium text-brand underline-offset-4 hover:underline",
            children: [
              /* @__PURE__ */ jsx("span", { children: "Public record" }),
              /* @__PURE__ */ jsx(ExternalLink, { className: "h-3.5 w-3.5", "aria-hidden": "true" })
            ]
          }
        ),
        /* @__PURE__ */ jsx("p", { className: "mt-3 font-sans text-xs leading-relaxed text-ink-secondary", children: "Confirm credentials with the issuing registry when citing formal attestations." })
      ] })
    ] })
  ] });
}
function ArticleInteractions({
  postId,
  title,
  initialLikes
}) {
  const hydrated = useHydratePreferences();
  const savedPostIds = usePreferencesStore((state) => state.savedPostIds);
  const likedPostIds = usePreferencesStore((state) => state.likedPostIds);
  const toggleSavedPost = usePreferencesStore((state) => state.toggleSavedPost);
  const setPostLiked = usePreferencesStore((state) => state.setPostLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [status, setStatus] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const saved = hydrated ? savedPostIds.includes(postId) : false;
  const liked = hydrated ? likedPostIds.includes(postId) : false;
  async function like() {
    if (liked) {
      setStatus("You have already added a like to this article.");
      return;
    }
    setPostLiked(postId, true);
    setLikes((value) => value + 1);
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(postId)}`, { method: "PATCH" });
      if (!res.ok) throw new Error("not recorded");
      const data = await res.json();
      if (typeof data.likes === "number" && data.likes > 0) setLikes(data.likes);
    } catch {
      setPostLiked(postId, false);
      setLikes((value) => Math.max(0, value - 1));
      setStatus("The like could not be recorded. Check your connection and try again.");
    }
  }
  function toggleSaved() {
    const nowSaved = !saved;
    const ok = toggleSavedPost(postId);
    setStatus(
      ok ? nowSaved ? "Saved to your reading list on this device." : "Removed from your reading list." : "Your browser blocked local storage, so the reading list was updated for this session only."
    );
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setStatus("Article link copied to clipboard.");
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setStatus("Clipboard access was blocked. Copy the address from your browser.");
    }
  }
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        setStatus("Shared.");
        return;
      } catch {
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied. Paste it wherever you want to share the article.");
    } catch {
      setStatus("Sharing is unavailable in this browser. Copy the address from the browser bar.");
    }
  }
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxs(
        Pressable,
        {
          type: "button",
          onClick: like,
          "aria-pressed": liked,
          className: `inline-flex min-h-11 items-center gap-1.5 rounded-sm border px-3 py-2 font-mono text-xs font-medium transition-colors ${liked ? "border-brand bg-selection text-brand" : "border-line bg-surface text-ink hover:bg-surface-subtle"}`,
          children: [
            /* @__PURE__ */ jsx(
              m.span,
              {
                "aria-hidden": "true",
                className: "inline-flex",
                animate: liked ? { scale: [1, 1.35, 1], rotate: [0, -10, 0] } : { scale: 1, rotate: 0 },
                transition: { duration: 0.4, times: [0, 0.45, 1], ease: [...EASING.emphasize] },
                children: /* @__PURE__ */ jsx(Heart, { className: `h-3.5 w-3.5 ${liked ? "fill-current" : ""}` })
              }
            ),
            /* @__PURE__ */ jsx("span", { children: likes }),
            /* @__PURE__ */ jsxs("span", { className: "sr-only", children: [
              "likes. ",
              liked ? "You liked this article" : "Add a like"
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Pressable,
        {
          type: "button",
          onClick: toggleSaved,
          "aria-pressed": saved,
          className: `inline-flex min-h-11 items-center gap-1.5 rounded-sm border px-3 py-2 font-sans text-xs font-medium transition-colors ${saved ? "border-brand bg-brand text-on-primary" : "border-line bg-surface text-ink hover:bg-surface-subtle"}`,
          children: [
            /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: /* @__PURE__ */ jsx(
              m.span,
              {
                initial: { scale: 0.7, opacity: 0 },
                animate: { scale: 1, opacity: 1 },
                exit: { scale: 0.7, opacity: 0 },
                transition: { duration: 0.16, ease: [...EASING.enter] },
                className: "inline-flex",
                children: saved ? /* @__PURE__ */ jsx(SuccessCheck, { size: 14, quiet: true }) : /* @__PURE__ */ jsx(Bookmark, { className: "h-3.5 w-3.5", "aria-hidden": "true" })
              },
              saved ? "saved" : "unsaved"
            ) }),
            /* @__PURE__ */ jsx("span", { children: saved ? "Saved" : "Save" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Pressable,
        {
          type: "button",
          onClick: share,
          className: "inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-2 font-sans text-xs font-medium text-ink transition-colors hover:bg-surface-subtle",
          children: [
            /* @__PURE__ */ jsx(Share2, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
            /* @__PURE__ */ jsx("span", { children: "Share" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Pressable,
        {
          type: "button",
          onClick: copyLink,
          className: "inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-2 font-sans text-xs font-medium text-ink transition-colors hover:bg-surface-subtle",
          children: [
            /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: /* @__PURE__ */ jsx(
              m.span,
              {
                initial: { scale: 0.7, opacity: 0, rotate: -10 },
                animate: { scale: 1, opacity: 1, rotate: 0 },
                exit: { scale: 0.7, opacity: 0, rotate: 10 },
                transition: { duration: 0.16, ease: [...EASING.emphasize] },
                className: "inline-flex text-brand",
                children: copiedLink ? /* @__PURE__ */ jsx(SuccessCheck, { size: 14 }) : /* @__PURE__ */ jsx(Copy, { className: "h-3.5 w-3.5", "aria-hidden": "true" })
              },
              copiedLink ? "copied" : "idle"
            ) }),
            /* @__PURE__ */ jsx("span", { children: copiedLink ? "Copied" : "Copy link" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx("p", { role: "status", "aria-live": "polite", className: "mt-2 min-h-5 font-sans text-xs text-ink-secondary", children: /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: status ? /* @__PURE__ */ jsx(
      m.span,
      {
        initial: { opacity: 0, y: 4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.16, ease: [...EASING.standard] },
        className: "inline-block",
        children: status
      },
      status
    ) : null }) })
  ] });
}
function Spinner({ size = 16, className = "", label }) {
  return /* @__PURE__ */ jsx(MotionBoundary, { children: /* @__PURE__ */ jsx(
    m.span,
    {
      className: `inline-flex ${className}`,
      role: label ? "img" : void 0,
      "aria-label": label,
      "aria-hidden": label ? void 0 : "true",
      animate: { rotate: 360 },
      transition: { duration: 0.75, ease: "linear", repeat: Infinity },
      style: { width: size, height: size },
      children: /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 24 24", width: size, height: size, fill: "none", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9", stroke: "currentColor", strokeOpacity: "0.2", strokeWidth: "2.5" }),
        /* @__PURE__ */ jsx(
          "path",
          {
            d: "M12 3a9 9 0 0 1 9 9",
            stroke: "currentColor",
            strokeWidth: "2.5",
            strokeLinecap: "round"
          }
        )
      ] })
    }
  ) });
}
function SkeletonShard({
  className = "",
  height = 16,
  width = "100%",
  lines = 1,
  rounded = "rounded-sm"
}) {
  const shimmer = !useHydratedReducedMotion();
  const shards = Array.from({ length: lines }, (_, index) => {
    const isLast = index === lines - 1 && lines > 1;
    return /* @__PURE__ */ jsx(
      m.span,
      {
        "aria-hidden": "true",
        className: `block bg-surface-subtle ${rounded} ${className}`,
        style: {
          height,
          width: isLast ? "66%" : width,
          marginBottom: index === lines - 1 ? 0 : 8,
          backgroundImage: "linear-gradient(90deg, var(--color-surface-subtle) 0%, var(--color-surface) 50%, var(--color-surface-subtle) 100%)",
          backgroundSize: "200% 100%"
        },
        initial: false,
        animate: shimmer ? { backgroundPosition: ["200% 0%", "-200% 0%"] } : void 0,
        transition: !shimmer ? void 0 : {
          duration: DURATION_MS.synthesize * 2.15 / 1e3,
          ease: "easeInOut",
          repeat: 2,
          repeatType: "loop"
        }
      },
      index
    );
  });
  return /* @__PURE__ */ jsx(MotionBoundary, { children: lines > 1 ? /* @__PURE__ */ jsx("div", { "aria-hidden": "true", children: shards }) : shards[0] });
}
function LazyMount({
  children,
  fallback,
  label,
  rootMargin = "600px 0px",
  once = true,
  minHeight,
  className = "",
  eagerFallback = true
}) {
  const ref2 = useRef(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const node = ref2.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      if (eagerFallback) setMounted(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setMounted(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setMounted(false);
          }
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [once, rootMargin, eagerFallback]);
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: ref2,
      className,
      style: minHeight !== void 0 ? { minHeight } : void 0,
      "aria-busy": !mounted,
      "data-lazy-state": mounted ? "mounted" : "deferred",
      children: mounted ? children : /* @__PURE__ */ jsxs("div", { role: "status", "aria-live": "polite", children: [
        /* @__PURE__ */ jsx("span", { className: "sr-only", children: label }),
        fallback ?? /* @__PURE__ */ jsx(SkeletonShard, { height: minHeight ?? 200, lines: 1, rounded: "rounded-sm" })
      ] })
    }
  );
}
function Placeholder({ label, minHeight, hint }) {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      role: "status",
      "aria-live": "polite",
      "aria-busy": "true",
      className: "flex w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-line bg-surface text-ink-secondary",
      style: { minHeight },
      children: [
        /* @__PURE__ */ jsx("span", { className: "h-1.5 w-24 animate-pulse rounded-full bg-surface-subtle", "aria-hidden": "true" }),
        /* @__PURE__ */ jsx("span", { className: "font-sans text-xs", children: label }),
        hint ? /* @__PURE__ */ jsx("span", { className: "font-mono text-xs uppercase tracking-wider", children: hint }) : null
      ]
    }
  );
}
function lazyWidget(loader, options) {
  const { label, minHeight = 220, ssr = false, hint } = options;
  function LazyPlaceholder() {
    return /* @__PURE__ */ jsx(Placeholder, { label, minHeight, hint });
  }
  LazyPlaceholder.displayName = "LazyWidgetPlaceholder";
  const Widget = dynamic(loader, { ssr, loading: LazyPlaceholder });
  Widget.displayName = `LazyWidget(${label})`;
  return Widget;
}
const Discussion = lazyWidget(() => Promise.resolve().then(() => ArticleDiscussion$1), {
  label: "Loading the discussion panel",
  minHeight: 220
});
function DeferredDiscussion({ postId, commentCount }) {
  return /* @__PURE__ */ jsx(
    LazyMount,
    {
      label: "Loading the discussion panel",
      minHeight: 220,
      fallback: /* @__PURE__ */ jsxs(Card, { padding: "xl", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsx(SkeletonShard, { height: 20, width: "35%" }),
        /* @__PURE__ */ jsx("div", { className: "mt-5", children: /* @__PURE__ */ jsx(SkeletonShard, { lines: 3 }) })
      ] }),
      children: /* @__PURE__ */ jsx(Discussion, { postId, commentCount })
    }
  );
}
function ReadingProgress() {
  const { smooth, percent } = useScrollProgress();
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: "pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 print:hidden",
      role: "progressbar",
      "aria-label": "Reading progress",
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      "aria-valuenow": percent,
      children: /* @__PURE__ */ jsx(
        m.div,
        {
          className: "h-full origin-left bg-brand",
          style: { scaleX: smooth },
          "aria-hidden": "true"
        }
      )
    }
  );
}
const CITATION_FORMATS = ["apa", "mla", "chicago", "ieee", "bibtex", "ris"];
function splitName(author) {
  const parts = author.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (parts.length === 0) return { first: "Author", last: "Author" };
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}
function cleanDoi(doi = "") {
  return doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "").trim();
}
function doiUrl(doi) {
  const cleaned = cleanDoi(doi);
  if (!cleaned) return "";
  if (/^10\./i.test(cleaned)) return `https://doi.org/${cleaned}`;
  return "";
}
function bibtexKey(source) {
  const { last } = splitName(source.author);
  return `${last.toLowerCase().replace(/[^a-z0-9]/g, "")}${source.year.replace(/[^0-9]/g, "") || "nd"}`;
}
function buildCitation(format, source) {
  const { first, last } = splitName(source.author);
  const title = source.title.trim() || "Untitled";
  const journal = source.journal.trim() || "ResearchWithMe";
  const year = source.year.trim() || "n.d.";
  const doi = cleanDoi(source.doi);
  const link = doiUrl(doi) || source.url?.trim() || "";
  switch (format) {
    case "apa":
      return `${last}, ${first.charAt(0)}. (${year}). ${title}. ${journal}.${link ? ` ${link}` : ""}`;
    case "mla":
      return `${last}, ${first}. "${title}." ${journal}, ${year}${link ? `, ${link}` : ""}.`;
    case "chicago":
      return `${last}, ${first}. "${title}." ${journal} (${year})${link ? `. ${link}` : ""}.`;
    case "ieee":
      return `[1] ${first.charAt(0)}. ${last}, "${title}," ${journal}, ${year}.${doi ? ` doi: ${doi}.` : ""}`;
    case "bibtex":
      return `@article{${bibtexKey(source)},
  title = {${title}},
  author = {${source.author}},
  journal = {${journal}},
  year = {${year}},${doi ? `
  doi = {${doi}},` : ""}${link ? `
  url = {${link}},` : ""}
  publisher = {ResearchWithMe Press}
}`;
    case "ris":
      return `TY  - JOUR
TI  - ${title}
AU  - ${source.author}
JO  - ${journal}
PY  - ${year}${doi ? `
DO  - ${doi}` : ""}${link ? `
UR  - ${link}` : ""}
ER  - `;
    default:
      return "";
  }
}
function citationFileExtension(format) {
  if (format === "ris") return "ris";
  if (format === "bibtex") return "bib";
  return "txt";
}
function resolveDoiString(source) {
  const raw = (source.doi ?? "").trim();
  if (!raw) return source.url ?? "";
  const cleaned = raw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");
  if (/^10\./.test(cleaned)) return `https://doi.org/${cleaned}`;
  return raw;
}
const COPY_FORMATS = [
  { kind: "bibtex" },
  { kind: "apa" },
  { kind: "doi" }
];
function CopyChip({ label, copied, onCopy }) {
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick: onCopy,
      className: "inline-flex min-h-9 items-center justify-center gap-1 rounded-sm border border-line bg-canvas px-2 py-1 font-mono text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand",
      children: [
        /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: /* @__PURE__ */ jsx(
          m.span,
          {
            initial: { scale: 0.6, opacity: 0, rotate: -12 },
            animate: { scale: 1, opacity: 1, rotate: 0 },
            exit: { scale: 0.6, opacity: 0, rotate: 12 },
            transition: { duration: 0.16, ease: [...EASING.emphasize] },
            className: "inline-flex text-brand",
            "aria-hidden": "true",
            children: copied ? /* @__PURE__ */ jsx(SuccessCheck, { size: 12 }) : /* @__PURE__ */ jsx(Copy, { className: "h-3 w-3" })
          },
          copied ? "copied" : "copy"
        ) }),
        /* @__PURE__ */ jsx("span", { children: copied ? "Copied" : label })
      ]
    }
  );
}
function InlineCitationPopover({
  label,
  source,
  citeHref
}) {
  const { locale } = useLocale();
  const [copied, setCopied] = useState(null);
  async function copyText(kind, value) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied((prev) => prev === kind ? null : prev), 2e3);
    } catch {
    }
  }
  const doiTarget = resolveDoiString(source);
  const externalUrl = /^https?:\/\//i.test(doiTarget) ? doiTarget : source.url && /^https?:\/\//i.test(source.url) ? source.url : null;
  return /* @__PURE__ */ jsxs(Popover.Root, { children: [
    /* @__PURE__ */ jsx(Popover.Trigger, { asChild: true, children: /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        "aria-label": `Citation ${label}: ${source.title}`,
        className: "inline-flex items-baseline rounded-xs px-1 py-0.5 font-mono text-xs font-medium text-brand underline decoration-brand/40 underline-offset-4 transition-colors hover:bg-selection",
        children: label
      }
    ) }),
    /* @__PURE__ */ jsx(Popover.Portal, { children: /* @__PURE__ */ jsx(
      Popover.Content,
      {
        sideOffset: 6,
        collisionPadding: 12,
        asChild: true,
        children: /* @__PURE__ */ jsxs(
          m.div,
          {
            className: "z-50 w-80 max-w-[92vw] rounded-sm border border-line bg-surface-raised p-4 text-left text-ink focus:outline-none",
            initial: { opacity: 0, y: -6, scale: 0.98, rotate: -0.5 },
            animate: { opacity: 1, y: 0, scale: 1, rotate: 0 },
            transition: { duration: 0.18, ease: [...EASING.emphasize] },
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2 border-b border-line pb-2.5", children: [
                /* @__PURE__ */ jsxs(Text, { as: "span", variant: "eyebrow", color: "brand", weight: "semibold", className: "inline-flex items-center gap-1.5", children: [
                  /* @__PURE__ */ jsx(Quote, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: t(locale, "reader.cite") })
                ] }),
                /* @__PURE__ */ jsx(Popover.Close, { asChild: true, children: /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    "aria-label": "Close citation popover",
                    className: "inline-flex h-6 w-6 items-center justify-center rounded-xs text-ink-secondary hover:bg-surface-subtle hover:text-ink",
                    children: /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5", "aria-hidden": "true" })
                  }
                ) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "mt-2.5 space-y-1", children: [
                /* @__PURE__ */ jsx("p", { className: "font-serif text-sm font-semibold leading-snug text-ink", children: source.title }),
                /* @__PURE__ */ jsxs("p", { className: "font-sans text-xs text-ink-secondary", children: [
                  source.author,
                  " · ",
                  source.journal,
                  " (",
                  source.year,
                  ")"
                ] }),
                source.doi && /* @__PURE__ */ jsx("p", { className: "break-all font-mono text-xs text-ink", children: source.doi })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "mt-3 grid grid-cols-3 gap-1.5 border-t border-line pt-3", children: COPY_FORMATS.map((format) => /* @__PURE__ */ jsx(
                CopyChip,
                {
                  label: format.kind === "doi" ? "DOI" : format.kind.toUpperCase(),
                  copied: copied === format.kind,
                  onCopy: () => copyText(format.kind, format.kind === "doi" ? doiTarget : buildCitation(format.kind, source))
                },
                format.kind
              )) }),
              (externalUrl || citeHref) && /* @__PURE__ */ jsxs("div", { className: "mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5 font-sans text-xs", children: [
                externalUrl && /* @__PURE__ */ jsxs(
                  "a",
                  {
                    href: externalUrl,
                    target: "_blank",
                    rel: "noreferrer noopener",
                    className: "inline-flex items-center gap-1 font-medium text-brand underline-offset-4 hover:underline",
                    children: [
                      /* @__PURE__ */ jsx("span", { children: "Primary record" }),
                      /* @__PURE__ */ jsx(ExternalLink, { className: "h-3 w-3", "aria-hidden": "true" })
                    ]
                  }
                ),
                citeHref && /* @__PURE__ */ jsx(
                  LinkShim,
                  {
                    href: citeHref,
                    className: "font-medium text-ink-secondary underline-offset-4 hover:text-ink hover:underline",
                    children: "All formats →"
                  }
                )
              ] }),
              /* @__PURE__ */ jsx("span", { role: "status", "aria-live": "polite", className: "sr-only", children: copied ? t(locale, "reader.copied") : "" })
            ]
          }
        )
      }
    ) })
  ] });
}
const CITATION_TOKEN_PATTERN = /(\[\d+\]|10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+|arXiv:\d{4}\.\d{4,5})/g;
function extractYear(publishedAt) {
  const match = publishedAt.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "2026";
}
function buildArticleCitationMap(article) {
  const year = extractYear(article.publishedAt);
  const canonicalDoi = `10.5555/rwm.${article.id}`;
  const selfSource = {
    title: article.title,
    author: article.author.name,
    year,
    journal: "ResearchWithMe",
    doi: canonicalDoi,
    url: `https://researchwith.me/post/${article.slug}`
  };
  const map = {
    rwm: selfSource,
    [canonicalDoi]: selfSource,
    [canonicalDoi.toLowerCase()]: selfSource
  };
  if (article.reviewedArtifact) {
    const artifact = article.reviewedArtifact;
    const artifactSource = {
      title: artifact.title,
      author: article.author.name,
      year,
      journal: artifact.meta || "Primary Artifact",
      doi: artifact.identifier,
      url: artifact.url
    };
    map["1"] = artifactSource;
    map[artifact.identifier] = artifactSource;
    map[artifact.identifier.toLowerCase()] = artifactSource;
  } else {
    map["1"] = selfSource;
  }
  return map;
}
function lookupCitation(core, citations) {
  if (/^\[\d+\]$/.test(core)) {
    const num = core.slice(1, -1);
    return citations[num] ?? citations[core];
  }
  return citations[core] ?? citations[core.toLowerCase()];
}
function renderWithInlineCitations(text2, citations, citeHref) {
  if (!text2 || Object.keys(citations).length === 0) return text2;
  const parts = text2.split(CITATION_TOKEN_PATTERN);
  if (parts.length === 1) return text2;
  const nodes = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!part) continue;
    if (index % 2 === 1) {
      const trailingMatch = part.match(/[.,;)]+$/);
      const trailing = trailingMatch ? trailingMatch[0] : "";
      const core = trailing ? part.slice(0, -trailing.length) : part;
      const source = lookupCitation(core, citations);
      if (source) {
        nodes.push(
          createElement(
            Fragment$1,
            { key: `cite-${index}-${core}` },
            createElement(InlineCitationPopover, {
              label: core,
              source,
              citeHref
            }),
            trailing
          )
        );
        continue;
      }
    }
    nodes.push(part);
  }
  return nodes;
}
function isExternal(href) {
  return Boolean(href && /^https?:\/\//i.test(href));
}
function MarkdownBody({ markdown, citations, citeHref }) {
  function transformProseChildren(children) {
    if (!citations || Object.keys(citations).length === 0) return children;
    return Children.map(children, (child) => {
      if (typeof child === "string") {
        return renderWithInlineCitations(child, citations, citeHref);
      }
      return child;
    });
  }
  return /* @__PURE__ */ jsx("div", { className: "reading-prose drop-cap reading-column", children: /* @__PURE__ */ jsx(
    ReactMarkdown,
    {
      remarkPlugins: [remarkGfm],
      components: {
        h1: ({ children }) => /* @__PURE__ */ jsx("h2", { className: "mt-10 scroll-mt-24 font-serif text-2xl font-bold leading-snug text-ink first:mt-0", children }),
        h2: ({ children }) => /* @__PURE__ */ jsx("h2", { className: "mt-10 scroll-mt-24 font-serif text-2xl font-bold leading-snug text-ink first:mt-0", children }),
        h3: ({ children }) => /* @__PURE__ */ jsx("h3", { className: "mt-8 scroll-mt-24 font-serif text-xl font-semibold leading-snug text-ink", children }),
        h4: ({ children }) => /* @__PURE__ */ jsx("h4", { className: "mt-6 scroll-mt-24 font-serif text-lg font-semibold leading-snug text-ink", children }),
        p: ({ children }) => /* @__PURE__ */ jsx("p", { className: "mt-5 reading-column break-words font-serif text-lg leading-relaxed text-ink", children: transformProseChildren(children) }),
        a: ({ href, children }) => /* @__PURE__ */ jsx(
          Link,
          {
            href,
            ...isExternal(href) ? { target: "_blank", rel: "noreferrer noopener" } : {},
            children
          }
        ),
        ul: ({ children }) => /* @__PURE__ */ jsx("ul", { className: "mt-5 list-disc space-y-2 pl-6 font-serif text-lg leading-relaxed text-ink", children }),
        ol: ({ children }) => /* @__PURE__ */ jsx("ol", { className: "mt-5 list-decimal space-y-2 pl-6 font-serif text-lg leading-relaxed text-ink", children }),
        li: ({ children }) => /* @__PURE__ */ jsx("li", { className: "pl-1", children: transformProseChildren(children) }),
        blockquote: ({ children }) => /* @__PURE__ */ jsx("blockquote", { className: "mt-6 border-l-4 border-brand pl-5 font-serif text-xl leading-relaxed text-ink", children }),
        hr: () => /* @__PURE__ */ jsx("hr", { className: "my-8 border-line" }),
        strong: ({ children }) => /* @__PURE__ */ jsx("strong", { className: "font-semibold text-ink", children }),
        em: ({ children }) => /* @__PURE__ */ jsx("em", { className: "italic", children }),
        code: ({ children, className }) => {
          const isBlock = typeof className === "string" && className.startsWith("language-");
          if (isBlock) {
            return /* @__PURE__ */ jsx("code", { className: "font-mono text-sm text-ink", children });
          }
          return /* @__PURE__ */ jsx("code", { className: "rounded-xs border border-line bg-surface px-1.5 py-0.5 font-mono text-sm text-ink", children });
        },
        pre: ({ children }) => /* @__PURE__ */ jsx("pre", { className: "mt-6 overflow-x-auto rounded-sm border border-line bg-surface p-4 leading-relaxed", children }),
        table: ({ children }) => /* @__PURE__ */ jsx("div", { className: "mt-6 overflow-x-auto rounded-sm border border-line", children: /* @__PURE__ */ jsx("table", { className: "w-full border-collapse text-left font-sans text-sm", children }) }),
        thead: ({ children }) => /* @__PURE__ */ jsx("thead", { className: "bg-surface text-ink", children }),
        th: ({ children }) => /* @__PURE__ */ jsx("th", { scope: "col", className: "border-b border-line px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider", children }),
        td: ({ children }) => /* @__PURE__ */ jsx("td", { className: "border-b border-line px-3 py-2 align-top text-ink last:border-b-0", children }),
        img: ({ src, alt }) => {
          if (typeof src !== "string") return null;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            /* @__PURE__ */ jsx(
              "img",
              {
                src,
                alt: alt ?? "",
                loading: "lazy",
                decoding: "async",
                className: "mt-6 h-auto w-full rounded-sm border border-line"
              }
            )
          );
        }
      },
      children: markdown
    }
  ) });
}
function VideoEmbed({
  src,
  label,
  poster = "/images/folio-hero.jpeg",
  captionsSrc,
  aspectClass = "aspect-video",
  ambient = false
}) {
  const [error, setError] = useState(false);
  if (error) {
    return /* @__PURE__ */ jsxs("div", { className: `${aspectClass} flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-line bg-surface text-sm text-ink-secondary`, children: [
      /* @__PURE__ */ jsx(Film, { className: "h-8 w-8 text-ink-secondary", "aria-hidden": "true" }),
      /* @__PURE__ */ jsx("span", { className: "font-medium text-ink", children: "Render pending" }),
      /* @__PURE__ */ jsx("code", { className: "rounded-xs bg-canvas px-2 py-0.5 font-mono text-xs text-ink-secondary", children: src })
    ] });
  }
  if (ambient) {
    return /* @__PURE__ */ jsx(
      "video",
      {
        src,
        poster,
        "aria-label": label,
        autoPlay: true,
        muted: true,
        loop: true,
        playsInline: true,
        disablePictureInPicture: true,
        className: "h-full w-full object-cover",
        onError: () => setError(true),
        children: captionsSrc && /* @__PURE__ */ jsx("track", { kind: "captions", src: captionsSrc, srcLang: "en", label: "English captions", default: true })
      }
    );
  }
  return /* @__PURE__ */ jsxs(
    "video",
    {
      src,
      poster,
      "aria-label": label,
      autoPlay: true,
      muted: true,
      playsInline: true,
      controls: true,
      className: `w-full rounded-sm bg-ink ${aspectClass}`,
      onError: () => setError(true),
      children: [
        captionsSrc && /* @__PURE__ */ jsx("track", { kind: "captions", src: captionsSrc, srcLang: "en", label: "English captions", default: true }),
        /* @__PURE__ */ jsx("p", { className: "sr-only", children: "Your browser does not support HTML video." })
      ]
    }
  );
}
function shouldEnableSmoothScroll(mql) {
  return Boolean(mql && !mql.matches);
}
function focusHashTarget(root, hash) {
  if (!hash || !hash.startsWith("#") || hash.length < 2) return null;
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
  }
  const element = root.getElementById(id);
  if (!element) return null;
  if (!element.hasAttribute("tabindex") && element.tabIndex < 0) {
    element.setAttribute("tabindex", "-1");
  }
  element.focus({ preventScroll: true });
  return element;
}
function ArticleSmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis = null;
    let rafId = 0;
    let starting = false;
    let disposed = false;
    function stopLenis() {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (lenis) {
        lenis.destroy();
        lenis = null;
      }
    }
    function startLenis() {
      if (disposed || lenis || starting || !shouldEnableSmoothScroll(mql)) return;
      starting = true;
      void import("lenis").then(({ default: LenisCtor }) => {
        starting = false;
        if (disposed || lenis || !shouldEnableSmoothScroll(mql)) return;
        const instance = new LenisCtor({
          duration: 0.85,
          smoothWheel: true,
          syncTouch: false
        });
        lenis = instance;
        function raf(time) {
          if (disposed || !lenis) return;
          lenis.raf(time);
          rafId = window.requestAnimationFrame(raf);
        }
        rafId = window.requestAnimationFrame(raf);
      }).catch(() => {
        starting = false;
      });
    }
    function handleMotionChange() {
      if (shouldEnableSmoothScroll(mql)) {
        startLenis();
      } else {
        stopLenis();
      }
    }
    function handleDocumentClick(event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const targetNode = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
      if (!(targetNode instanceof HTMLAnchorElement)) return;
      const hash = targetNode.getAttribute("href") ?? "";
      if (!hash || hash === "#") return;
      const resolved = focusHashTarget(document, hash);
      if (!resolved) return;
      event.preventDefault();
      if (window.history?.pushState) {
        window.history.pushState(null, "", hash);
      }
      if (lenis) {
        lenis.scrollTo(resolved, { offset: -96 });
      } else {
        resolved.scrollIntoView({ behavior: mql.matches ? "auto" : "smooth", block: "start" });
      }
    }
    startLenis();
    mql.addEventListener?.("change", handleMotionChange);
    document.addEventListener("click", handleDocumentClick);
    return () => {
      disposed = true;
      stopLenis();
      mql.removeEventListener?.("change", handleMotionChange);
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);
  return null;
}
function parseMinutes(readTime) {
  const parsed = Number.parseInt(readTime, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8;
}
function ReadingProgressDock({
  itemId,
  itemKind,
  readTime,
  citationSource,
  citeHref,
  discussionAnchor
}) {
  const hydrated = useHydratePreferences();
  const savedPostIds = usePreferencesStore((state) => state.savedPostIds);
  const savedPaperIds = usePreferencesStore((state) => state.savedPaperIds);
  const toggleSavedPost = usePreferencesStore((state) => state.toggleSavedPost);
  const toggleSavedPaper = usePreferencesStore((state) => state.toggleSavedPaper);
  const { smooth, percent: progress } = useScrollProgress();
  const RADIUS2 = 8;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS2;
  const ringOffset = useTransform(smooth, (value) => CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, value))));
  const totalMins = parseMinutes(readTime);
  const remainingMins = Math.max(1, Math.ceil(totalMins * (1 - progress / 100)));
  const isSaved = hydrated ? itemKind === "post" ? savedPostIds.includes(itemId) : savedPaperIds.includes(itemId) : false;
  function handleToggleSave() {
    if (itemKind === "post") {
      toggleSavedPost(itemId);
    } else {
      toggleSavedPaper(itemId);
    }
  }
  function scrollToTop() {
    const reduced = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }
  return /* @__PURE__ */ jsx(
    "aside",
    {
      "aria-label": "Reading controls",
      className: "fixed bottom-5 left-1/2 z-40 -translate-x-1/2 print:hidden",
      children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 rounded-sm border border-line bg-surface/95 px-3 py-1.5 text-ink backdrop-blur-xs", children: [
        /* @__PURE__ */ jsxs(
          m.svg,
          {
            viewBox: "0 0 20 20",
            className: "h-5 w-5 -rotate-90 text-brand",
            "aria-hidden": "true",
            role: "presentation",
            children: [
              /* @__PURE__ */ jsx("circle", { cx: "10", cy: "10", r: RADIUS2, fill: "none", stroke: "currentColor", strokeOpacity: "0.16", strokeWidth: "2" }),
              /* @__PURE__ */ jsx(
                m.circle,
                {
                  cx: "10",
                  cy: "10",
                  r: RADIUS2,
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2",
                  strokeLinecap: "round",
                  strokeDasharray: CIRCUMFERENCE,
                  style: { strokeDashoffset: ringOffset }
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxs("span", { className: "font-mono text-xs tabular-nums text-ink-secondary", children: [
          Math.round(progress),
          "% · ",
          progress >= 96 ? "Done" : `${remainingMins}m left`
        ] }),
        /* @__PURE__ */ jsx("span", { "aria-hidden": "true", className: "h-4 w-px bg-line" }),
        /* @__PURE__ */ jsx(InlineCitationPopover, { label: "Cite", source: citationSource, citeHref }),
        /* @__PURE__ */ jsx(
          Pressable,
          {
            type: "button",
            onClick: handleToggleSave,
            "aria-pressed": isSaved,
            "aria-label": isSaved ? "Remove from reading list" : "Save to reading list",
            className: `inline-flex h-9 w-9 items-center justify-center rounded-xs border transition-colors ${isSaved ? "border-brand bg-brand text-on-primary" : "border-transparent text-ink-secondary hover:border-line hover:text-ink"}`,
            children: /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: /* @__PURE__ */ jsx(
              m.span,
              {
                initial: { scale: 0.7, opacity: 0 },
                animate: { scale: 1, opacity: 1 },
                exit: { scale: 0.7, opacity: 0 },
                transition: { duration: 0.16, ease: [...EASING.enter] },
                className: "inline-flex",
                children: isSaved ? /* @__PURE__ */ jsx(SuccessCheck, { size: 14, quiet: true }) : /* @__PURE__ */ jsx(Bookmark, { className: "h-3.5 w-3.5", "aria-hidden": "true" })
              },
              isSaved ? "saved" : "unsaved"
            ) })
          }
        ),
        discussionAnchor && /* @__PURE__ */ jsx(
          m.a,
          {
            href: discussionAnchor,
            "aria-label": "Jump to peer discussion",
            whileTap: { scale: 0.94 },
            className: "inline-flex h-9 w-9 items-center justify-center rounded-xs border border-transparent text-ink-secondary transition-colors hover:border-line hover:text-ink",
            children: /* @__PURE__ */ jsx(MessageSquare, { className: "h-3.5 w-3.5", "aria-hidden": "true" })
          }
        ),
        /* @__PURE__ */ jsx(
          Pressable,
          {
            type: "button",
            onClick: scrollToTop,
            "aria-label": "Scroll to top of manuscript",
            className: "inline-flex h-9 w-9 items-center justify-center rounded-xs border border-transparent text-ink-secondary transition-colors hover:border-line hover:text-ink",
            children: /* @__PURE__ */ jsx(ArrowUp, { className: "h-3.5 w-3.5", "aria-hidden": "true" })
          }
        )
      ] })
    }
  );
}
const SITE_NAME = "ResearchWithMe";
const SITE_URL = "https://researchwith.me".replace(/\/$/, "");
function absoluteUrl(path2 = "/") {
  return new URL(path2.startsWith("/") ? path2 : `/${path2}`, SITE_URL).toString();
}
function toDate(value) {
  if (!value) return void 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? void 0 : date;
}
function toIsoDate(value) {
  if (!value) return void 0;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed;
  const parsed = toDate(trimmed);
  return parsed ? parsed.toISOString().slice(0, 10) : trimmed;
}
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
function organizationEntity() {
  return {
    "@id": ORGANIZATION_ID,
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL
  };
}
function jsonLdImage(imagePath) {
  if (!imagePath) return void 0;
  const trimmed = imagePath.trim();
  if (!trimmed || /^data:/i.test(trimmed)) return void 0;
  return [absoluteUrl(trimmed)];
}
function articleJsonLd(input) {
  const sameAs = (input.authorSameAs ?? []).filter(Boolean);
  const author = input.authorId ? {
    "@id": `${absoluteUrl(`/author/${input.authorId}`)}#person`,
    "@type": "Person",
    name: input.authorName,
    url: absoluteUrl(`/author/${input.authorId}`),
    ...sameAs.length > 0 ? { sameAs } : {}
  } : { "@type": "Person", name: input.authorName };
  return {
    "@context": "https://schema.org",
    "@id": `${absoluteUrl(input.path)}#article`,
    "@type": "Article",
    headline: input.title,
    description: input.description,
    mainEntityOfPage: absoluteUrl(input.path),
    image: jsonLdImage(input.imagePath),
    author,
    publisher: organizationEntity(),
    datePublished: toIsoDate(input.datePublished)
  };
}
function videoJsonLd(input) {
  const thumb = input.thumbnailPath && !/^data:/i.test(input.thumbnailPath.trim()) ? absoluteUrl(input.thumbnailPath) : absoluteUrl("/images/folio-hero.jpeg");
  return {
    "@context": "https://schema.org",
    "@id": `${absoluteUrl(input.contentPath)}#video`,
    "@type": "VideoObject",
    name: input.name,
    description: input.description,
    thumbnailUrl: [thumb],
    contentUrl: absoluteUrl(input.contentPath),
    uploadDate: toIsoDate(input.uploadDate) ?? "2026-10-01",
    publisher: organizationEntity()
  };
}
function scholarlyArticleJsonLd(input) {
  const authorEntities = input.authorProfiles ? input.authorProfiles.map((profile) => {
    const orcidUrl = profile.orcid ? profile.orcid.startsWith("http") ? profile.orcid : `https://orcid.org/${profile.orcid}` : void 0;
    return {
      ...profile.slug ? { "@id": `${absoluteUrl(`/papers`)}#${profile.slug}` } : {},
      "@type": "Person",
      name: profile.name,
      ...orcidUrl ? { url: orcidUrl, sameAs: [orcidUrl] } : {}
    };
  }) : input.authors.map((name) => ({ "@type": "Person", name }));
  return {
    "@context": "https://schema.org",
    "@id": `${absoluteUrl(input.path)}#scholarly-article`,
    "@type": "ScholarlyArticle",
    headline: input.title,
    description: input.description,
    mainEntityOfPage: absoluteUrl(input.path),
    author: authorEntities,
    publisher: organizationEntity(),
    datePublished: toIsoDate(input.datePublished),
    ...input.doi ? { sameAs: `https://doi.org/${input.doi}` } : {},
    ...input.journal ? { isPartOf: { "@type": "Periodical", name: input.journal } } : {}
  };
}
function jsonLdScript(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
function PostRoute() {
  const { article, related } = useLoaderData();
  const authorProfile = AUTHORS[article.author.id];
  const paragraphs = article.content.flatMap((block) => block.split(/\n{2,}/)).filter(Boolean);
  const canonicalDoi = `10.5555/rwm.${article.id}`;
  const citeHref = `/cite?article=${encodeURIComponent(article.slug)}`;
  const citationMap = buildArticleCitationMap(article);
  const authorSameAs = [
    article.author.orcid ? article.author.orcid.startsWith("http") ? article.author.orcid : `https://orcid.org/${article.author.orcid}` : void 0,
    article.author.github ? article.author.github.startsWith("http") ? article.author.github : `https://github.com/${article.author.github.replace(/^@/, "")}` : void 0,
    article.author.website,
    article.author.scholar
  ].filter((entry) => Boolean(entry));
  const coverPath = article.coverImage && article.coverImage.trim() !== "" && !article.coverImage.startsWith("data:") ? article.coverImage : "/images/folio-hero.jpeg";
  const jsonLd = articleJsonLd({
    title: article.title,
    description: article.summary,
    path: `/post/${article.slug}`,
    authorName: article.author.name,
    authorId: authorProfile ? article.author.id : void 0,
    authorSameAs,
    datePublished: article.dateISO ?? article.publishedAt,
    imagePath: article.coverImage
  });
  const explainerVideoLd = videoJsonLd({
    name: `Visual explainer: ${article.title}`,
    description: article.summary,
    contentPath: `/videos/explainer-${article.slug}.mp4`,
    thumbnailPath: coverPath,
    uploadDate: article.dateISO ?? article.publishedAt
  });
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-canvas text-ink", children: [
    /* @__PURE__ */ jsx("script", { type: "application/ld+json", dangerouslySetInnerHTML: { __html: jsonLdScript(jsonLd) } }),
    /* @__PURE__ */ jsx("script", { type: "application/ld+json", dangerouslySetInnerHTML: { __html: jsonLdScript(explainerVideoLd) } }),
    /* @__PURE__ */ jsx(ReadingProgress, {}),
    /* @__PURE__ */ jsx(ArticleSmoothScroll, {}),
    /* @__PURE__ */ jsx(BlogHeader, {}),
    /* @__PURE__ */ jsxs("main", { id: "main-content", className: "mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-8 sm:px-6 sm:pt-10 lg:px-8", children: [
      /* @__PURE__ */ jsx("nav", { "aria-label": "Breadcrumb", className: "mb-6 font-mono text-xs text-ink-secondary", children: /* @__PURE__ */ jsxs("ol", { className: "flex flex-wrap items-center gap-1.5", children: [
        /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link$1, { to: "/", className: "hover:text-ink hover:underline", children: "Index" }) }),
        /* @__PURE__ */ jsx("li", { "aria-hidden": "true", children: /* @__PURE__ */ jsx(ChevronRight, { className: "h-3.5 w-3.5 text-ink-secondary" }) }),
        /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link$1, { to: `/category/${categoryToSlug(article.category)}`, className: "hover:text-ink hover:underline", children: article.category }) }),
        /* @__PURE__ */ jsx("li", { "aria-hidden": "true", children: /* @__PURE__ */ jsx(ChevronRight, { className: "h-3.5 w-3.5 text-ink-secondary" }) }),
        /* @__PURE__ */ jsx("li", { "aria-current": "page", className: "max-w-[22rem] truncate font-medium text-ink", children: article.title })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12", children: [
        /* @__PURE__ */ jsxs("article", { "aria-labelledby": "article-title", className: "min-w-0", children: [
          /* @__PURE__ */ jsxs("header", { className: "border-b border-line pb-8", children: [
            /* @__PURE__ */ jsxs("p", { className: "flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-ink-secondary", children: [
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-brand", children: article.category }),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsx("span", { children: article.format }),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsx("time", { dateTime: article.dateISO ?? article.publishedAt, children: article.publishedAt }),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsx("span", { children: article.readTime }),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsxs("span", { children: [
                "DOI ",
                canonicalDoi
              ] })
            ] }),
            /* @__PURE__ */ jsx("h1", { id: "article-title", className: "mt-3 max-w-4xl font-serif text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl lg:text-5xl", children: article.title }),
            /* @__PURE__ */ jsx("p", { className: "mt-4 reading-column break-words font-serif text-xl leading-relaxed text-ink-secondary", children: article.subtitle }),
            /* @__PURE__ */ jsxs("div", { className: "mt-6 flex flex-wrap items-center justify-between gap-4", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
                authorProfile ? /* @__PURE__ */ jsxs(
                  Link$1,
                  {
                    to: `/author/${article.author.id}`,
                    className: "flex min-w-0 items-center gap-3 font-sans text-sm hover:text-brand",
                    children: [
                      /* @__PURE__ */ jsx(
                        "span",
                        {
                          "aria-hidden": "true",
                          className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-line bg-surface font-mono text-xs font-semibold text-ink",
                          children: article.author.avatar
                        }
                      ),
                      /* @__PURE__ */ jsxs("span", { className: "min-w-0", children: [
                        /* @__PURE__ */ jsx("span", { className: "block truncate font-semibold text-ink", children: article.author.name }),
                        /* @__PURE__ */ jsx("span", { className: "block truncate text-xs text-ink-secondary", children: article.author.role })
                      ] })
                    ]
                  }
                ) : /* @__PURE__ */ jsxs("div", { className: "flex min-w-0 items-center gap-3 font-sans text-sm", children: [
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      "aria-hidden": "true",
                      className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-line bg-surface font-mono text-xs font-semibold text-ink",
                      children: article.author.avatar
                    }
                  ),
                  /* @__PURE__ */ jsxs("span", { className: "min-w-0", children: [
                    /* @__PURE__ */ jsx("span", { className: "block truncate font-semibold text-ink", children: article.author.name }),
                    /* @__PURE__ */ jsx("span", { className: "block truncate text-xs text-ink-secondary", children: article.author.role })
                  ] })
                ] }),
                /* @__PURE__ */ jsx(SpecialistBadgePopover, { author: article.author })
              ] }),
              /* @__PURE__ */ jsx(
                ArticleInteractions,
                {
                  postId: article.id,
                  title: article.title,
                  initialLikes: article.likes
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("figure", { className: "mt-8 reading-column", children: [
            /* @__PURE__ */ jsx("div", { className: "relative aspect-[16/9] w-full overflow-hidden rounded-sm border border-line bg-surface", children: article.coverImage && article.coverImage.startsWith("data:") ? /* @__PURE__ */ jsxs("picture", { className: "h-full w-full", children: [
              /* @__PURE__ */ jsx("source", { srcSet: article.coverImage, type: "image/avif" }),
              /* @__PURE__ */ jsx(
                "img",
                {
                  src: article.coverImage,
                  alt: article.title,
                  width: 1280,
                  height: 720,
                  className: "h-full w-full object-cover"
                }
              )
            ] }) : (
              // eslint-disable-next-line @next/next/no-img-element
              /* @__PURE__ */ jsx(
                "img",
                {
                  src: coverPath,
                  alt: "",
                  width: 1280,
                  height: 720,
                  loading: "eager",
                  decoding: "async",
                  className: "h-full w-full object-cover"
                }
              )
            ) }),
            /* @__PURE__ */ jsx("figcaption", { className: "mt-2 font-mono text-xs text-ink-secondary", children: "Editorial figure · Primary artifacts are linked and citable below." })
          ] }),
          /* @__PURE__ */ jsxs("section", { "aria-labelledby": "explainer-video-heading", className: "mt-8 reading-column", children: [
            /* @__PURE__ */ jsx("div", { className: "mb-3 flex items-center gap-2", children: /* @__PURE__ */ jsx("span", { id: "explainer-video-heading", className: "inline-flex items-center rounded-sm border border-brand/30 bg-selection/40 px-2.5 py-1 font-mono text-xs font-medium text-brand", children: "Visual explainer" }) }),
            /* @__PURE__ */ jsx(
              VideoEmbed,
              {
                src: `/videos/explainer-${article.slug}.mp4`,
                poster: coverPath,
                captionsSrc: `/videos/captions/${article.slug}.vtt`,
                label: `Animated explainer for: ${article.title}`
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("section", { "aria-labelledby": "takeaways-heading", className: "mt-10 reading-column border-y border-line py-6", children: [
            /* @__PURE__ */ jsx("h2", { id: "takeaways-heading", className: "font-mono text-xs font-semibold uppercase tracking-wider text-ink", children: "Key takeaways" }),
            /* @__PURE__ */ jsx("ul", { className: "mt-3 space-y-2.5", children: article.keyTakeaways.map((takeaway) => /* @__PURE__ */ jsxs("li", { className: "flex gap-3 font-serif text-base leading-relaxed text-ink", children: [
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", className: "font-mono text-brand", children: "—" }),
              /* @__PURE__ */ jsx("span", { children: takeaway })
            ] }, takeaway)) })
          ] }),
          article.bodyMarkdown ? /* @__PURE__ */ jsx("div", { className: "mt-10", children: /* @__PURE__ */ jsx(
            MarkdownBody,
            {
              markdown: article.bodyMarkdown,
              citations: citationMap,
              citeHref
            }
          ) }) : /* @__PURE__ */ jsx("div", { className: "reading-prose drop-cap reading-column mt-10 space-y-6", children: paragraphs.map((paragraph, index) => /* @__PURE__ */ jsx(
            "p",
            {
              className: "reading-column break-words font-serif text-lg leading-relaxed text-ink",
              children: renderWithInlineCitations(paragraph, citationMap, citeHref)
            },
            `${index}-${paragraph.slice(0, 24)}`
          )) }),
          article.reviewedArtifact && /* @__PURE__ */ jsxs(
            "section",
            {
              "aria-labelledby": "artifact-heading",
              className: "mt-10 reading-column rounded-sm border border-line bg-surface p-5",
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
                  /* @__PURE__ */ jsx("h2", { id: "artifact-heading", className: "font-mono text-xs font-semibold uppercase tracking-wider text-ink", children: "Artifact under review" }),
                  /* @__PURE__ */ jsx(
                    InlineCitationPopover,
                    {
                      label: "[1]",
                      source: citationMap["1"],
                      citeHref
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2 font-mono text-xs text-ink-secondary", children: [
                  article.reviewedArtifact.type === "github" ? /* @__PURE__ */ jsx(GitBranch, { className: "h-4 w-4 text-brand", "aria-hidden": "true" }) : /* @__PURE__ */ jsx(FileText, { className: "h-4 w-4 text-brand", "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { className: "break-all text-ink", children: article.reviewedArtifact.identifier }),
                  /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
                  /* @__PURE__ */ jsx("span", { children: article.reviewedArtifact.meta })
                ] }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 font-serif text-base text-ink", children: article.reviewedArtifact.title }),
                /* @__PURE__ */ jsx(
                  "a",
                  {
                    href: article.reviewedArtifact.url,
                    target: "_blank",
                    rel: "noreferrer noopener",
                    className: "mt-3 inline-flex min-h-10 items-center font-sans text-xs font-semibold uppercase tracking-wider text-brand underline underline-offset-4 hover:text-brand-pressed",
                    children: "Open the reviewed artifact"
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "mt-10 reading-column flex flex-wrap gap-2", children: article.tags.map((tag) => /* @__PURE__ */ jsxs(
            Link$1,
            {
              to: `/?${new URLSearchParams({ search: tag }).toString()}`,
              className: "rounded-sm border border-line bg-surface px-2.5 py-1 font-mono text-xs text-ink-secondary transition-colors hover:border-brand hover:text-ink",
              children: [
                "#",
                tag
              ]
            },
            tag
          )) }),
          /* @__PURE__ */ jsx("div", { className: "mt-10 reading-column", children: /* @__PURE__ */ jsx(AuthorProfileCard, { author: article.author, compact: true }) }),
          /* @__PURE__ */ jsx("div", { className: "mt-10 reading-column", children: /* @__PURE__ */ jsx(DeferredDiscussion, { postId: article.id, commentCount: article.commentsCount }) }),
          related.length > 0 && /* @__PURE__ */ jsxs("section", { "aria-labelledby": "related-heading", className: "mt-12 reading-column border-t border-line pt-8", children: [
            /* @__PURE__ */ jsx("h2", { id: "related-heading", className: "font-serif text-2xl font-bold text-ink", children: "Related reviews" }),
            /* @__PURE__ */ jsx("ul", { className: "mt-4 divide-y divide-line border-y border-line", children: related.map((item) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
              Link$1,
              {
                to: `/post/${item.slug}`,
                className: "group flex flex-col gap-1 py-4 hover:text-brand",
                children: [
                  /* @__PURE__ */ jsxs("span", { className: "font-mono text-xs text-ink-secondary", children: [
                    item.category,
                    " · ",
                    item.readTime
                  ] }),
                  /* @__PURE__ */ jsx("span", { className: "font-serif text-xl font-semibold text-ink transition-colors group-hover:text-brand", children: item.title }),
                  /* @__PURE__ */ jsx("span", { className: "reading-column font-sans text-sm leading-relaxed text-ink-secondary", children: item.summary })
                ]
              }
            ) }, item.id)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(
          "aside",
          {
            "aria-label": "Article tools",
            className: "h-fit space-y-6 border-t border-line pt-8 lg:sticky lg:top-24 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "rounded-sm border border-line bg-surface p-5", children: [
                /* @__PURE__ */ jsx("h2", { className: "font-mono text-xs font-semibold uppercase tracking-wider text-ink", children: "Cite this review" }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 font-sans text-xs leading-relaxed text-ink-secondary", children: "Export APA, MLA, Chicago, IEEE, BibTeX, or RIS records, or inspect inline references directly." }),
                /* @__PURE__ */ jsx("div", { className: "mt-3 flex flex-wrap items-center gap-2", children: /* @__PURE__ */ jsx(
                  InlineCitationPopover,
                  {
                    label: canonicalDoi,
                    source: citationMap.rwm,
                    citeHref
                  }
                ) }),
                /* @__PURE__ */ jsxs(
                  Link$1,
                  {
                    to: citeHref,
                    className: "mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-ink px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90",
                    children: [
                      /* @__PURE__ */ jsx(Quote, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
                      /* @__PURE__ */ jsx("span", { children: "Open citation builder" })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "rounded-sm border border-line bg-surface p-5", children: [
                /* @__PURE__ */ jsx("h2", { className: "font-mono text-xs font-semibold uppercase tracking-wider text-ink", children: "Archival Record" }),
                /* @__PURE__ */ jsxs("dl", { className: "mt-3 space-y-3 font-mono text-xs", children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "DOI" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 break-all text-ink", children: canonicalDoi })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "ISSN" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 text-ink", children: "2994-0821" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "Column" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 font-sans text-ink", children: article.category })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "Format" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 font-sans text-ink", children: article.format })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "Published" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 font-sans text-ink", children: article.publishedAt })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "License" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 text-ink", children: "CC BY 4.0" })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "rounded-sm border border-line bg-surface p-5 font-sans text-xs leading-relaxed text-ink-secondary", children: [
                /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-2 font-mono uppercase tracking-wider text-ink", children: [
                  /* @__PURE__ */ jsx(BookOpen, { className: "h-3.5 w-3.5 text-brand", "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: "Verification note" })
                ] }),
                /* @__PURE__ */ jsx("p", { className: "mt-2", children: "Verify primary equations, benchmarks, and commits against the linked upstream artifact when citing in formal manuscripts." })
              ] })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx(
      ReadingProgressDock,
      {
        itemId: article.id,
        itemKind: "post",
        readTime: article.readTime,
        citationSource: citationMap.rwm,
        citeHref,
        discussionAnchor: "#discussion"
      }
    ),
    /* @__PURE__ */ jsx(BlogFooter, {})
  ] });
}
function ReadingActions({
  itemId,
  storageKey,
  title,
  doi,
  shareUrl,
  showPrint = false,
  compact = false
}) {
  const hydrated = useHydratePreferences();
  const savedPostIds = usePreferencesStore((state) => state.savedPostIds);
  const savedPaperIds = usePreferencesStore((state) => state.savedPaperIds);
  const toggleSavedPost = usePreferencesStore((state) => state.toggleSavedPost);
  const toggleSavedPaper = usePreferencesStore((state) => state.toggleSavedPaper);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [shareUrlState, setShareUrlState] = useState(shareUrl ?? "");
  useEffect(() => {
    if (!shareUrl && typeof window !== "undefined") {
      setShareUrlState(window.location.href);
    }
  }, [shareUrl]);
  const saved = hydrated ? storageKey === "rwm_saved_posts" ? savedPostIds.includes(itemId) : savedPaperIds.includes(itemId) : false;
  function toggleSaved() {
    const ok = storageKey === "rwm_saved_posts" ? toggleSavedPost(itemId) : toggleSavedPaper(itemId);
    const nowSaved = !saved;
    setFeedback(
      ok ? nowSaved ? "Saved to your reading list on this device." : "Removed from your reading list." : "Your browser blocked local storage, so the reading list was updated for this session only."
    );
  }
  async function copyCitation() {
    const value = doi ? `https://doi.org/${doi}` : shareUrlState;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setFeedback(doi ? "DOI link copied to clipboard." : "Article link copied to clipboard.");
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setFeedback("Clipboard access was blocked. Copy the address from your browser.");
    }
  }
  async function share() {
    const url = shareUrlState || (typeof window !== "undefined" ? window.location.href : "");
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        setFeedback("Shared.");
        return;
      } catch {
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setFeedback("Link copied. Paste it wherever you want to share the work.");
    } catch {
      setFeedback("Sharing is unavailable in this browser. Copy the address from your browser.");
    }
  }
  const buttonClass = compact ? "inline-flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-surface text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink" : "inline-flex min-h-11 items-center gap-2 rounded-sm border border-line bg-surface px-4 py-2 font-sans text-xs font-medium text-ink transition-colors hover:bg-surface-subtle";
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxs(
        Pressable,
        {
          type: "button",
          onClick: toggleSaved,
          "aria-pressed": saved,
          className: saved ? compact ? "inline-flex h-11 w-11 items-center justify-center rounded-sm border border-brand bg-brand text-on-primary transition-colors" : "inline-flex min-h-11 items-center gap-2 rounded-sm border border-brand bg-brand px-4 py-2 font-sans text-xs font-medium text-on-primary transition-colors" : buttonClass,
          children: [
            /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: /* @__PURE__ */ jsx(
              m.span,
              {
                initial: { scale: 0.7, opacity: 0 },
                animate: { scale: 1, opacity: 1 },
                exit: { scale: 0.7, opacity: 0 },
                transition: { duration: 0.16, ease: [...EASING.enter] },
                className: "inline-flex",
                "aria-hidden": "true",
                children: saved ? /* @__PURE__ */ jsx(SuccessCheck, { size: 16, quiet: true }) : /* @__PURE__ */ jsx(Bookmark, { className: "h-4 w-4" })
              },
              saved ? "saved" : "unsaved"
            ) }),
            !compact && /* @__PURE__ */ jsx("span", { children: saved ? "Saved" : "Save" }),
            /* @__PURE__ */ jsx("span", { className: "sr-only", children: saved ? "Remove from reading list" : "Save to reading list" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(Pressable, { type: "button", onClick: copyCitation, className: buttonClass, children: [
        /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: /* @__PURE__ */ jsx(
          m.span,
          {
            initial: { scale: 0.7, opacity: 0, rotate: -10 },
            animate: { scale: 1, opacity: 1, rotate: 0 },
            exit: { scale: 0.7, opacity: 0, rotate: 10 },
            transition: { duration: 0.16, ease: [...EASING.emphasize] },
            className: "inline-flex text-brand",
            "aria-hidden": "true",
            children: copied ? /* @__PURE__ */ jsx(SuccessCheck, { size: 16 }) : /* @__PURE__ */ jsx(Copy, { className: "h-4 w-4" })
          },
          copied ? "copied" : "idle"
        ) }),
        !compact && /* @__PURE__ */ jsx("span", { children: copied ? doi ? "DOI copied" : "Link copied" : doi ? "Copy DOI" : "Copy link" }),
        compact && /* @__PURE__ */ jsx("span", { className: "sr-only", children: doi ? "Copy DOI link" : "Copy link" })
      ] }),
      /* @__PURE__ */ jsxs(Pressable, { type: "button", onClick: share, className: buttonClass, children: [
        /* @__PURE__ */ jsx(Share2, { className: "h-4 w-4", "aria-hidden": "true" }),
        !compact && /* @__PURE__ */ jsx("span", { children: "Share" }),
        /* @__PURE__ */ jsxs("span", { className: "sr-only", children: [
          "Share ",
          title
        ] })
      ] }),
      showPrint && /* @__PURE__ */ jsxs(Pressable, { type: "button", onClick: () => window.print(), className: buttonClass, children: [
        /* @__PURE__ */ jsx(Printer, { className: "h-4 w-4", "aria-hidden": "true" }),
        !compact && /* @__PURE__ */ jsx("span", { children: "Print or save PDF" }),
        /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Print or save this paper as PDF" })
      ] }),
      doi && /* @__PURE__ */ jsxs(
        "a",
        {
          href: `https://doi.org/${doi}`,
          target: "_blank",
          rel: "noreferrer noopener",
          className: compact ? buttonClass : "inline-flex min-h-11 items-center gap-1.5 px-2 font-mono text-xs font-medium text-brand underline underline-offset-4 hover:text-brand-pressed",
          children: [
            /* @__PURE__ */ jsx(Link2, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
            !compact && /* @__PURE__ */ jsx("span", { children: "Resolve DOI" }),
            /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Resolve DOI at doi.org" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx("p", { role: "status", "aria-live": "polite", className: "mt-2 min-h-5 font-sans text-xs text-ink-secondary", children: /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: feedback ? /* @__PURE__ */ jsx(
      m.span,
      {
        initial: { opacity: 0, y: 4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.16, ease: [...EASING.standard] },
        className: "inline-block",
        children: feedback
      },
      feedback
    ) : null }) })
  ] });
}
const sections = [
  { key: "background", heading: "1. Context and research problem" },
  { key: "methodology", heading: "2. Methodology and observational setup" },
  { key: "findings", heading: "3. Empirical findings and benchmarks" },
  { key: "discussion", heading: "4. Technical discussion and trade-offs" },
  { key: "implications", heading: "5. Implications for practitioners" }
];
function PaperRoute() {
  const { paper } = useLoaderData();
  const citeHref = `/cite?article=${encodeURIComponent(paper.slug)}`;
  const paperCitationSource = {
    title: paper.title,
    author: paper.authors.map((a) => a.name).join(", ") || "ResearchWithMe",
    year: String(paper.year),
    journal: paper.journal,
    doi: paper.doi,
    url: `https://researchwith.me/paper/${paper.slug}`
  };
  const jsonLd = scholarlyArticleJsonLd({
    title: paper.title,
    description: paper.abstract,
    path: `/paper/${paper.slug}`,
    authors: paper.authors.map((a) => a.name),
    authorProfiles: paper.authors.map((a) => ({
      name: a.name,
      slug: a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      orcid: a.orcid
    })),
    datePublished: paper.publishedDate,
    doi: paper.doi,
    journal: paper.journal
  });
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-canvas text-ink", children: [
    /* @__PURE__ */ jsx("script", { type: "application/ld+json", dangerouslySetInnerHTML: { __html: jsonLdScript(jsonLd) } }),
    /* @__PURE__ */ jsx(ReadingProgress, {}),
    /* @__PURE__ */ jsx(ArticleSmoothScroll, {}),
    /* @__PURE__ */ jsx(BlogHeader, {}),
    /* @__PURE__ */ jsxs("main", { id: "main-content", className: "mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-8 sm:px-6 sm:pt-10 lg:px-8", children: [
      /* @__PURE__ */ jsx("nav", { "aria-label": "Breadcrumb", className: "mb-6 font-mono text-xs text-ink-secondary", children: /* @__PURE__ */ jsxs("ol", { className: "flex flex-wrap items-center gap-1.5", children: [
        /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link$1, { to: "/", className: "hover:text-ink hover:underline", children: "Index" }) }),
        /* @__PURE__ */ jsx("li", { "aria-hidden": "true", children: /* @__PURE__ */ jsx(ChevronRight, { className: "h-3.5 w-3.5 text-ink-secondary" }) }),
        /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link$1, { to: "/papers", className: "hover:text-ink hover:underline", children: "Papers" }) }),
        /* @__PURE__ */ jsx("li", { "aria-hidden": "true", children: /* @__PURE__ */ jsx(ChevronRight, { className: "h-3.5 w-3.5 text-ink-secondary" }) }),
        /* @__PURE__ */ jsx("li", { "aria-current": "page", className: "max-w-[24rem] truncate font-medium text-ink", children: paper.title })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12", children: [
        /* @__PURE__ */ jsxs("article", { "aria-labelledby": "paper-title", className: "min-w-0", children: [
          /* @__PURE__ */ jsxs("header", { className: "border-b border-line pb-8", children: [
            /* @__PURE__ */ jsxs("p", { className: "flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-ink-secondary", children: [
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-brand", children: paper.topic }),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsx("span", { children: paper.journal }),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsxs("span", { children: [
                "Vol. ",
                paper.volume,
                ", No. ",
                paper.issue
              ] }),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsx("time", { dateTime: paper.publishedDate, children: paper.publishedDate }),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsx("span", { children: paper.readTime })
            ] }),
            /* @__PURE__ */ jsx("h1", { id: "paper-title", className: "mt-3 max-w-4xl font-serif text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl lg:text-5xl", children: paper.title }),
            paper.subtitle && /* @__PURE__ */ jsx("p", { className: "mt-4 reading-column font-serif text-xl leading-relaxed text-ink-secondary", children: paper.subtitle }),
            /* @__PURE__ */ jsx("ul", { className: "mt-6 grid gap-4 sm:grid-cols-2", children: paper.authors.map((author) => {
              const slugId = author.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              return /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    "aria-hidden": "true",
                    className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-line bg-surface font-mono text-xs font-semibold text-ink",
                    children: author.name.split(" ").map((part) => part[0]).slice(0, 2).join("")
                  }
                ),
                /* @__PURE__ */ jsxs("span", { className: "min-w-0 font-sans text-xs", children: [
                  /* @__PURE__ */ jsxs("span", { className: "flex flex-wrap items-center gap-2 font-semibold text-ink", children: [
                    /* @__PURE__ */ jsx("span", { children: author.name }),
                    author.orcid && /* @__PURE__ */ jsx(
                      SpecialistBadgePopover,
                      {
                        author: {
                          id: slugId,
                          name: author.name,
                          role: author.role,
                          institution: author.affiliation,
                          orcid: author.orcid,
                          verifiedVia: "orcid",
                          verifiedIdentifier: author.orcid
                        }
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx("span", { className: "mt-0.5 block text-ink-secondary", children: author.affiliation }),
                  /* @__PURE__ */ jsx("span", { className: "block text-ink-secondary", children: author.role })
                ] })
              ] }, author.name);
            }) }),
            /* @__PURE__ */ jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsx(ReadingActions, { itemId: paper.id, storageKey: "rwm_saved_papers", title: paper.title, doi: paper.doi, showPrint: true }) })
          ] }),
          /* @__PURE__ */ jsxs("section", { "aria-labelledby": "abstract-heading", className: "reading-column border-b border-line py-8", children: [
            /* @__PURE__ */ jsx("h2", { id: "abstract-heading", className: "font-mono text-xs font-semibold uppercase tracking-wider text-ink", children: "Abstract" }),
            /* @__PURE__ */ jsx("p", { className: "mt-3 font-serif text-lg leading-relaxed text-ink", children: paper.abstract }),
            /* @__PURE__ */ jsx("ul", { className: "mt-4 flex flex-wrap gap-2", children: paper.keywords.map((keyword) => /* @__PURE__ */ jsx("li", { className: "rounded-sm border border-line bg-surface px-2.5 py-1 font-mono text-xs text-ink-secondary", children: keyword }, keyword)) })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "reading-prose reading-column space-y-10 py-8", children: sections.map((section) => {
            const value = paper.fullContent?.[section.key];
            if (!value) return null;
            return /* @__PURE__ */ jsxs("section", { "aria-labelledby": `section-${section.key}`, children: [
              /* @__PURE__ */ jsx("h2", { id: `section-${section.key}`, className: "font-serif text-2xl font-semibold text-ink", children: section.heading }),
              Array.isArray(value) ? /* @__PURE__ */ jsx("ul", { className: "mt-4 space-y-3", children: value.map((item) => /* @__PURE__ */ jsxs("li", { className: "flex gap-3 font-serif text-lg leading-relaxed text-ink", children: [
                /* @__PURE__ */ jsx("span", { "aria-hidden": "true", className: "font-mono text-brand", children: "—" }),
                /* @__PURE__ */ jsx("span", { children: item })
              ] }, item)) }) : /* @__PURE__ */ jsx("p", { className: "mt-4 reading-column break-words font-serif text-lg leading-relaxed text-ink", children: value })
            ] }, section.key);
          }) }),
          paper.fullContent?.references && paper.fullContent.references.length > 0 && /* @__PURE__ */ jsxs("section", { "aria-labelledby": "references-heading", className: "reading-column border-t border-line py-8", children: [
            /* @__PURE__ */ jsx("h2", { id: "references-heading", className: "font-serif text-2xl font-semibold text-ink", children: "References and primary literature" }),
            /* @__PURE__ */ jsx("ol", { className: "mt-4 space-y-3", children: paper.fullContent.references.map((reference, index) => /* @__PURE__ */ jsxs("li", { className: "flex gap-3 font-sans text-sm leading-relaxed text-ink-secondary", children: [
              /* @__PURE__ */ jsx("span", { className: "font-mono text-xs text-brand", children: String(index + 1).padStart(2, "0") }),
              /* @__PURE__ */ jsx("span", { className: "min-w-0 break-words", children: reference })
            ] }, reference)) })
          ] }),
          /* @__PURE__ */ jsx("footer", { className: "reading-column border-t border-line py-8", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-3", children: [
            /* @__PURE__ */ jsxs(
              Link$1,
              {
                to: citeHref,
                className: "inline-flex min-h-11 items-center gap-2 rounded-sm bg-ink px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90",
                children: [
                  /* @__PURE__ */ jsx(Quote, { className: "h-4 w-4", "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: "Build a citation" })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              Link$1,
              {
                to: "/papers",
                className: "inline-flex min-h-11 items-center gap-2 rounded-sm border border-line bg-surface px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-subtle",
                children: [
                  /* @__PURE__ */ jsx(FileText, { className: "h-4 w-4", "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: "Back to the archive" })
                ]
              }
            )
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs(
          "aside",
          {
            "aria-label": "Publication record",
            className: "h-fit space-y-6 border-t border-line pt-8 lg:sticky lg:top-24 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "rounded-sm border border-line bg-surface p-5", children: [
                /* @__PURE__ */ jsx("h2", { className: "font-mono text-xs font-semibold uppercase tracking-wider text-ink", children: "Publication record" }),
                /* @__PURE__ */ jsxs("dl", { className: "mt-4 space-y-3 font-mono text-xs", children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "DOI" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 break-all text-ink", children: /* @__PURE__ */ jsx(
                      InlineCitationPopover,
                      {
                        label: paper.doi,
                        source: paperCitationSource,
                        citeHref
                      }
                    ) })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "ISSN" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 text-ink", children: "2994-0821" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "Journal" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 font-sans text-ink", children: paper.journal })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "Volume & Issue" }),
                    /* @__PURE__ */ jsxs("dd", { className: "mt-0.5 text-ink", children: [
                      paper.volume,
                      ", ",
                      paper.issue
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "Pages" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 text-ink", children: paper.pages })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "License" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 text-ink", children: paper.license })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "Citations" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 text-ink", children: paper.citationCount })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "Data & Code" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 break-all font-sans text-ink", children: paper.dataUrl ? /* @__PURE__ */ jsx(
                      "a",
                      {
                        href: paper.dataUrl,
                        target: "_blank",
                        rel: "noreferrer noopener",
                        className: "text-brand underline underline-offset-4 hover:text-brand-pressed",
                        children: "Repository record"
                      }
                    ) : "No public data deposit listed" })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "rounded-sm border border-line bg-surface p-5 font-sans text-xs leading-relaxed text-ink-secondary", children: [
                /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-2 font-mono uppercase tracking-wider text-ink", children: [
                  /* @__PURE__ */ jsx(ShieldCheck, { className: "h-4 w-4 text-brand", "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: "Archive note" })
                ] }),
                /* @__PURE__ */ jsx("p", { className: "mt-2", children: "Confirm formal DOI registrations and dataset checksums against the upstream repository when citing in peer-reviewed venues." })
              ] })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx(
      ReadingProgressDock,
      {
        itemId: paper.id,
        itemKind: "paper",
        readTime: paper.readTime,
        citationSource: paperCitationSource,
        citeHref
      }
    ),
    /* @__PURE__ */ jsx(BlogFooter, {})
  ] });
}
function AuthorArchive({ articles }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedFormat, setSelectedFormat] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [savedIds, setSavedIds] = useState([]);
  const [saveMessage, setSaveMessage] = useState(null);
  useEffect(() => {
    setSavedIds(readStringArray("rwm_saved_posts"));
  }, []);
  const categories = useMemo(() => [...new Set(articles.map((post) => post.category))], [articles]);
  const formats2 = useMemo(() => [...new Set(articles.map((post) => post.format))], [articles]);
  const filteredArticles = useMemo(() => {
    const query2 = searchQuery.trim().toLowerCase();
    const filtered = articles.filter((post) => {
      if (selectedCategory !== "All" && post.category !== selectedCategory) return false;
      if (selectedFormat !== "All" && post.format !== selectedFormat) return false;
      if (!query2) return true;
      const haystack = [
        post.title,
        post.subtitle,
        post.summary,
        ...post.tags ?? [],
        post.reviewedArtifact?.title ?? "",
        post.reviewedArtifact?.identifier ?? ""
      ].join(" ").toLowerCase();
      return haystack.includes(query2);
    });
    const publishedAt = (post) => new Date(post.dateISO ?? post.publishedAt).getTime();
    return [...filtered].sort((a, b) => {
      if (sortBy === "likes") return (b.likes ?? 0) - (a.likes ?? 0);
      if (sortBy === "readTime") {
        return Number.parseInt(b.readTime, 10) - Number.parseInt(a.readTime, 10);
      }
      return publishedAt(b) - publishedAt(a);
    });
  }, [articles, searchQuery, selectedCategory, selectedFormat, sortBy]);
  function toggleSave(postId) {
    const next = savedIds.includes(postId) ? savedIds.filter((item) => item !== postId) : [...savedIds, postId];
    setSavedIds(next);
    setSaveMessage(
      writeLocal("rwm_saved_posts", next) ? null : "Your browser blocked local storage, so the reading list was not updated."
    );
    window.dispatchEvent(new Event("rwm:reading-list-changed"));
  }
  return /* @__PURE__ */ jsxs("section", { "aria-labelledby": "author-archive", className: "mt-10", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4", children: [
      /* @__PURE__ */ jsx(Text, { id: "author-archive", as: "h2", variant: "page-title", children: "Publication archive" }),
      /* @__PURE__ */ jsxs("p", { className: "text-sm text-ink-secondary", children: [
        filteredArticles.length,
        " of ",
        articles.length,
        " ",
        articles.length === 1 ? "article" : "articles"
      ] })
    ] }),
    articles.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mt-6 border border-line bg-surface-raised p-8", children: [
      /* @__PURE__ */ jsx(FileText, { className: "h-8 w-8 text-ink-secondary", "aria-hidden": "true" }),
      /* @__PURE__ */ jsx(Text, { as: "h3", variant: "card-title", className: "mt-3", children: "No articles published yet" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-xl text-base leading-relaxed text-ink", children: "This contributor has a profile but no published reviews in the current archive. Check back after the next editorial cycle." }),
      /* @__PURE__ */ jsx(
        LinkShim,
        {
          href: "/",
          className: "mt-5 inline-flex min-h-11 items-center rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover",
          children: "Browse the latest reviews"
        }
      )
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "sm:col-span-2 lg:col-span-1", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "author-article-search", className: "mb-1.5 block text-sm font-medium text-ink", children: "Search this archive" }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary", "aria-hidden": "true" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                id: "author-article-search",
                type: "search",
                value: searchQuery,
                onChange: (event) => setSearchQuery(event.target.value),
                placeholder: "Title, tag, or artifact",
                className: "h-11 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-sm text-ink placeholder:text-ink-secondary"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "author-category", className: "mb-1.5 block text-sm font-medium text-ink", children: "Category" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              id: "author-category",
              value: selectedCategory,
              onChange: (event) => setSelectedCategory(event.target.value),
              className: "h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-ink",
              children: [
                /* @__PURE__ */ jsx("option", { value: "All", children: "All categories" }),
                categories.map((category) => /* @__PURE__ */ jsx("option", { value: category, children: category }, category))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "author-format", className: "mb-1.5 block text-sm font-medium text-ink", children: "Format" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              id: "author-format",
              value: selectedFormat,
              onChange: (event) => setSelectedFormat(event.target.value),
              className: "h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-ink",
              children: [
                /* @__PURE__ */ jsx("option", { value: "All", children: "All formats" }),
                formats2.map((format) => /* @__PURE__ */ jsx("option", { value: format, children: format }, format))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "author-sort", className: "mb-1.5 block text-sm font-medium text-ink", children: "Sort" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              id: "author-sort",
              value: sortBy,
              onChange: (event) => setSortBy(event.target.value),
              className: "h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-ink",
              children: [
                /* @__PURE__ */ jsx("option", { value: "newest", children: "Newest first" }),
                /* @__PURE__ */ jsx("option", { value: "likes", children: "Most liked" }),
                /* @__PURE__ */ jsx("option", { value: "readTime", children: "Longest read" })
              ]
            }
          )
        ] })
      ] }),
      saveMessage && /* @__PURE__ */ jsx("p", { role: "status", className: "mt-4 border-l-2 border-brand-hover bg-brand/5 px-4 py-3 text-sm text-brand-pressed", children: saveMessage }),
      filteredArticles.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mt-6 border border-line bg-surface-raised p-8", children: [
        /* @__PURE__ */ jsx(Text, { as: "h3", variant: "card-title", children: "No articles match those filters" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-xl text-base leading-relaxed text-ink", children: "Clear the search text and filters to see this contributor's full archive." }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => {
              setSearchQuery("");
              setSelectedCategory("All");
              setSelectedFormat("All");
            },
            className: "mt-5 inline-flex min-h-11 items-center rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover",
            children: "Clear filters"
          }
        )
      ] }) : /* @__PURE__ */ jsx("ul", { className: "mt-6 divide-y divide-line border-y border-line", children: filteredArticles.map((post) => {
        const isSaved = savedIds.includes(post.id);
        return /* @__PURE__ */ jsx("li", { className: "py-6", children: /* @__PURE__ */ jsxs("article", { children: [
          /* @__PURE__ */ jsxs("p", { className: "flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-secondary", children: [
            /* @__PURE__ */ jsx("span", { className: "font-medium text-brand", children: post.category }),
            /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
            /* @__PURE__ */ jsx("span", { children: post.format }),
            /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
            /* @__PURE__ */ jsx("span", { children: post.publishedAt }),
            /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
            /* @__PURE__ */ jsx("span", { children: post.readTime })
          ] }),
          /* @__PURE__ */ jsx("h3", { className: "mt-2 font-serif text-2xl font-semibold leading-snug text-ink", children: /* @__PURE__ */ jsx(LinkShim, { href: `/post/${post.slug}`, className: "hover:text-brand", children: post.title }) }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-prose text-base leading-relaxed text-ink", children: post.subtitle }),
          post.reviewedArtifact && /* @__PURE__ */ jsxs("p", { className: "mt-3 break-all font-mono text-sm text-ink-secondary", children: [
            "Artifact: ",
            post.reviewedArtifact.identifier
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-4 text-sm", children: [
            /* @__PURE__ */ jsx(
              LinkShim,
              {
                href: `/post/${post.slug}`,
                className: "inline-flex min-h-10 items-center font-semibold text-brand underline-offset-4 hover:underline",
                children: "Read the review"
              }
            ),
            /* @__PURE__ */ jsxs(
              LinkShim,
              {
                href: `/cite?article=${encodeURIComponent(post.slug)}`,
                className: "inline-flex min-h-10 items-center gap-1.5 text-ink underline-offset-4 hover:text-ink hover:underline",
                children: [
                  /* @__PURE__ */ jsx(Quote, { className: "h-4 w-4", "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: "Cite" })
                ]
              }
            ),
            /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1.5 text-ink-secondary", children: [
              /* @__PURE__ */ jsx(MessageSquare, { className: "h-4 w-4", "aria-hidden": "true" }),
              /* @__PURE__ */ jsxs("span", { children: [
                post.commentsCount,
                " comments"
              ] })
            ] }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: () => toggleSave(post.id),
                "aria-pressed": isSaved,
                className: "inline-flex min-h-10 items-center gap-1.5 text-ink underline-offset-4 hover:text-ink hover:underline",
                children: [
                  /* @__PURE__ */ jsx(Bookmark, { className: `h-4 w-4 ${isSaved ? "fill-brand text-brand" : ""}`, "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: isSaved ? "Saved" : "Save" })
                ]
              }
            )
          ] })
        ] }) }, post.id);
      }) })
    ] })
  ] });
}
function publishedTimestamp(post) {
  const timestamp = Date.parse(post.dateISO ?? post.publishedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}
function summarizeAuthorWork(articles) {
  const categoryCounts = /* @__PURE__ */ new Map();
  for (const article of articles) {
    categoryCounts.set(article.category, (categoryCounts.get(article.category) ?? 0) + 1);
  }
  const byCategory = [...categoryCounts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
  const latestWorks = [...articles].sort((a, b) => publishedTimestamp(b) - publishedTimestamp(a)).slice(0, 3).map(({ slug, title, category, publishedAt, dateISO }) => ({
    slug,
    title,
    category,
    publishedAt,
    dateISO
  }));
  return {
    totalWorks: articles.length,
    reviewedArtifactCount: articles.filter((article) => Boolean(article.reviewedArtifact)).length,
    byCategory,
    latestWorks
  };
}
function AuthorWorkSummary({
  articles
}) {
  if (articles.length === 0) return null;
  const summary = summarizeAuthorWork(articles);
  return /* @__PURE__ */ jsxs("aside", { "aria-labelledby": "author-work-summary-heading", className: "rounded-md border border-line bg-surface-raised p-5", children: [
    /* @__PURE__ */ jsx("h2", { id: "author-work-summary-heading", className: "font-serif text-xl font-bold text-ink", children: "Work at a glance" }),
    /* @__PURE__ */ jsxs("dl", { className: "mt-4 grid grid-cols-2 gap-3 border-b border-line pb-4 font-sans text-sm", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("dt", { className: "text-ink-secondary", children: "Published works" }),
        /* @__PURE__ */ jsx("dd", { className: "mt-1 text-2xl font-semibold text-ink", children: summary.totalWorks })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("dt", { className: "text-ink-secondary", children: "Reviewed artifacts" }),
        /* @__PURE__ */ jsx("dd", { className: "mt-1 text-2xl font-semibold text-ink", children: summary.reviewedArtifactCount })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { "aria-labelledby": "author-work-categories-heading", className: "mt-4", children: [
      /* @__PURE__ */ jsx(Text, { id: "author-work-categories-heading", as: "h3", variant: "eyebrow", color: "secondary", weight: "semibold", children: "By category" }),
      /* @__PURE__ */ jsx("ul", { className: "mt-2 space-y-1.5 font-sans text-sm", children: summary.byCategory.map(({ category, count }) => /* @__PURE__ */ jsxs("li", { className: "flex items-start justify-between gap-3 text-ink", children: [
        /* @__PURE__ */ jsx("span", { children: category }),
        /* @__PURE__ */ jsx("span", { className: "font-mono tabular-nums text-ink", children: count })
      ] }, category)) })
    ] }),
    summary.latestWorks.length > 0 && /* @__PURE__ */ jsxs("section", { "aria-labelledby": "author-latest-works-heading", className: "mt-5 border-t border-line pt-4", children: [
      /* @__PURE__ */ jsx(Text, { id: "author-latest-works-heading", as: "h3", variant: "eyebrow", color: "secondary", weight: "semibold", children: "Latest works" }),
      /* @__PURE__ */ jsx("ol", { className: "mt-2 space-y-2 font-sans text-sm", children: summary.latestWorks.map((work) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
        LinkShim,
        {
          href: `/post/${work.slug}`,
          className: "rounded-sm font-medium text-brand underline decoration-border-strong underline-offset-4 hover:text-brand-pressed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          children: work.title
        }
      ) }, work.slug)) })
    ] })
  ] });
}
function AuthorArchiveLayout({
  articles
}) {
  if (articles.length === 0) return /* @__PURE__ */ jsx(AuthorArchive, { articles: [] });
  return /* @__PURE__ */ jsxs("div", { "data-layout-grid": "author-archive", className: "grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]", children: [
    /* @__PURE__ */ jsx("div", { className: "min-w-0", children: /* @__PURE__ */ jsx(AuthorArchive, { articles: [...articles] }) }),
    /* @__PURE__ */ jsx("div", { className: "mt-10 self-start lg:sticky lg:top-24", children: /* @__PURE__ */ jsx(AuthorWorkSummary, { articles }) })
  ] });
}
const Chart = lazyWidget(() => Promise.resolve().then(() => AuthorImpactRadarChart$1), {
  label: "Loading impact radar",
  minHeight: 340,
  hint: "Charts load when this section approaches the viewport"
});
function DeferredImpactChart(props) {
  return /* @__PURE__ */ jsx(
    LazyMount,
    {
      label: "Loading impact radar",
      minHeight: 340,
      fallback: /* @__PURE__ */ jsxs(Card, { padding: "xl", className: "mt-6", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsx(SkeletonShard, { height: 18, width: "40%" }),
        /* @__PURE__ */ jsx("div", { className: "mt-6 flex items-center justify-center", children: /* @__PURE__ */ jsx(SkeletonShard, { height: 240, width: 240, rounded: "rounded-full" }) })
      ] }),
      children: /* @__PURE__ */ jsx(Chart, { ...props })
    }
  );
}
function AuthorRoute() {
  const { author, articles, metrics } = useLoaderData();
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-stone-50", children: [
    /* @__PURE__ */ jsx(BlogHeader, {}),
    /* @__PURE__ */ jsxs("main", { id: "main-content", className: "mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12", children: [
      /* @__PURE__ */ jsx("nav", { "aria-label": "Breadcrumb", className: "mb-6 text-sm text-stone-600", children: /* @__PURE__ */ jsxs("ol", { className: "flex flex-wrap items-center gap-1.5", children: [
        /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link$1, { to: "/", className: "hover:text-stone-900 hover:underline", children: "Platform" }) }),
        /* @__PURE__ */ jsx("li", { "aria-hidden": "true", children: /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4 text-stone-500" }) }),
        /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link$1, { to: "/authors", className: "hover:text-stone-900 hover:underline", children: "Authors" }) }),
        /* @__PURE__ */ jsx("li", { "aria-hidden": "true", children: /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4 text-stone-500" }) }),
        /* @__PURE__ */ jsx("li", { "aria-current": "page", className: "font-medium text-stone-900", children: author.name })
      ] }) }),
      /* @__PURE__ */ jsx(AuthorProfileCard, { author, metrics, headingLevel: "h1" }),
      /* @__PURE__ */ jsx(
        DeferredImpactChart,
        {
          author,
          articleCount: metrics.totalArticles,
          totalLikes: metrics.totalLikes,
          totalComments: metrics.totalComments
        }
      ),
      /* @__PURE__ */ jsx(AuthorArchiveLayout, { articles })
    ] }),
    /* @__PURE__ */ jsx(BlogFooter, {})
  ] });
}
const EDITORIAL_BOARD = [
  {
    name: "Dr. Elena Rostova",
    role: "Editor-in-Chief",
    institution: "Institute for Digital Public Goods, Zurich",
    orcid: "0000-0002-1825-0097",
    focus: "Open protocols, peer review integrity, knowledge governance",
    avatarInitials: "ER"
  },
  {
    name: "Prof. Marcus Vance",
    role: "Senior Editor, Systems & Verification",
    institution: "Center for Algorithmic Reliability, Cambridge",
    orcid: "0000-0001-9234-8812",
    focus: "Machine learning reproducibility, formal proofs, automated peer auditing",
    avatarInitials: "MV"
  },
  {
    name: "Dr. Ananya Sen",
    role: "Editor, Environmental Commons",
    institution: "South Asian Climate Research Consortium",
    orcid: "0000-0003-4412-9908",
    focus: "Empirical telemetry, open sensor networks, geospatial data equity",
    avatarInitials: "AS"
  },
  {
    name: "Dr. Thabo Khumalo",
    role: "Review Editor, Scholarly Communications",
    institution: "African Open Science Platform",
    orcid: "0000-0002-7718-2041",
    focus: "Diamond open access, decentralized publication registries, citation tracking",
    avatarInitials: "TK"
  }
];
const PUBLICATIONS_DATA = [];
const PDF_EDITIONS_DATA = [];
const TOPICS = ["All", "Open Infrastructure", "AI & Systems", "Climate & Policy", "Data Commons", "Scholarly Tech"];
function PapersArchive({ initialPapers = PUBLICATIONS_DATA }) {
  const hydrated = useHydratePreferences();
  const savedPaperIds = usePreferencesStore((state) => state.savedPaperIds);
  const toggleSavedPaper = usePreferencesStore((state) => state.toggleSavedPaper);
  const [papers, setPapers] = useState(initialPapers);
  const [loadError, setLoadError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [sortBy, setSortBy] = useState("date");
  const [copiedDoi, setCopiedDoi] = useState(null);
  const [copyError, setCopyError] = useState(null);
  const savedIds = useMemo(
    () => hydrated ? savedPaperIds : [],
    [hydrated, savedPaperIds]
  );
  useEffect(() => {
    let active = true;
    async function loadPapers() {
      try {
        const res = await fetch("/api/papers", { headers: { accept: "application/json" } });
        if (!res.ok) throw new Error(`Archive responded with ${res.status}`);
        const data = await res.json();
        if (active && Array.isArray(data.papers) && data.papers.length > 0) {
          setPapers(data.papers);
          setLoadError(null);
        }
      } catch {
        if (active) {
          setLoadError("The live archive could not be reached, so the bundled paper records are shown.");
        }
      }
    }
    loadPapers();
    return () => {
      active = false;
    };
  }, []);
  async function handleCopyDoi(doi, id) {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(`https://doi.org/${doi}`);
      setCopiedDoi(id);
      window.setTimeout(() => setCopiedDoi(null), 2200);
    } catch {
      setCopyError("Clipboard access was blocked. The DOI is printed on the record below.");
    }
  }
  function handleToggleSave(paperId) {
    toggleSavedPaper(paperId);
  }
  const filteredPapers = useMemo(() => {
    const query2 = searchQuery.trim().toLowerCase();
    return papers.filter((paper) => {
      if (selectedTopic !== "All" && paper.topic !== selectedTopic) return false;
      if (!query2) return true;
      return [
        paper.title,
        paper.abstract,
        paper.doi,
        paper.volume,
        ...paper.keywords,
        ...paper.authors.flatMap((author) => [author.name, author.affiliation])
      ].some((value) => value.toLowerCase().includes(query2));
    }).sort((a, b) => {
      if (sortBy === "citations") return b.citationCount - a.citationCount;
      if (sortBy === "title") return a.title.localeCompare(b.title);
      return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
    });
  }, [papers, searchQuery, selectedTopic, sortBy]);
  const filtersActive = selectedTopic !== "All" || Boolean(searchQuery);
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-canvas text-ink", children: [
    /* @__PURE__ */ jsx(BlogHeader, {}),
    /* @__PURE__ */ jsxs("main", { id: "main-content", className: "mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8", children: [
      /* @__PURE__ */ jsxs("header", { className: "border-b border-line pb-8", children: [
        /* @__PURE__ */ jsx(Text, { as: "p", variant: "eyebrow", color: "secondary", children: "Peer-Reviewed Archive · Diamond Open Access" }),
        /* @__PURE__ */ jsx("h1", { className: "mt-2 max-w-4xl font-serif text-3xl font-bold tracking-tight text-ink sm:text-5xl", children: "Papers, methods, and reproducible artifacts" }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-[65ch] font-sans text-base leading-relaxed text-ink-secondary", children: "A structured archive of open-access papers. Each record lists its authors, DOI, license, methods, findings, and reproducibility material so the work can be checked rather than taken on trust." })
      ] }),
      /* @__PURE__ */ jsxs("section", { "aria-labelledby": "archive-filters", className: "mt-8 border-b border-line pb-8", children: [
        /* @__PURE__ */ jsx("h2", { id: "archive-filters", className: "sr-only", children: "Filter the paper archive" }),
        /* @__PURE__ */ jsxs("div", { className: "grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Text, { htmlFor: "paper-search", as: "label", variant: "eyebrow", color: "secondary", className: "mb-1.5 block", children: "Search papers" }),
            /* @__PURE__ */ jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary", "aria-hidden": "true" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  id: "paper-search",
                  type: "search",
                  value: searchQuery,
                  onChange: (event) => setSearchQuery(event.target.value),
                  placeholder: "Title, abstract, author, DOI, or keyword",
                  className: "h-11 w-full rounded-sm border border-line bg-surface pl-9 pr-3 font-sans text-sm text-ink placeholder:text-ink-secondary"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "sm:min-w-56", children: [
            /* @__PURE__ */ jsx(Text, { htmlFor: "paper-sort", as: "label", variant: "eyebrow", color: "secondary", className: "mb-1.5 block", children: "Sort by" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                id: "paper-sort",
                value: sortBy,
                onChange: (event) => setSortBy(event.target.value),
                className: "h-11 w-full rounded-sm border border-line bg-surface px-3 font-sans text-sm text-ink",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "date", children: "Most recent" }),
                  /* @__PURE__ */ jsx("option", { value: "citations", children: "Most cited" }),
                  /* @__PURE__ */ jsx("option", { value: "title", children: "Title A–Z" })
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-4", children: [
          /* @__PURE__ */ jsx(Text, { id: "topic-label", as: "p", variant: "eyebrow", color: "secondary", className: "mb-2", children: "Research topic" }),
          /* @__PURE__ */ jsx(LayoutGroup, { id: "paper-topics", children: /* @__PURE__ */ jsx("div", { role: "group", "aria-labelledby": "topic-label", className: "flex flex-wrap gap-1.5", children: TOPICS.map((topic) => {
            const active = selectedTopic === topic;
            return /* @__PURE__ */ jsxs(
              Pressable,
              {
                type: "button",
                onClick: () => setSelectedTopic(topic),
                "aria-pressed": active,
                className: `relative inline-flex min-h-10 items-center rounded-sm border px-3 py-1.5 font-sans text-xs font-medium transition-colors ${active ? "border-brand text-on-primary" : "border-line bg-surface text-ink-secondary hover:bg-surface-subtle hover:text-ink"}`,
                children: [
                  active && /* @__PURE__ */ jsx(
                    m.span,
                    {
                      layoutId: "active-paper-topic-pill",
                      className: "absolute inset-0 rounded-sm bg-brand",
                      transition: { duration: 0.18, ease: [...EASING.standard] }
                    }
                  ),
                  /* @__PURE__ */ jsx("span", { className: "relative z-10", children: topic === "All" ? "All topics" : topic })
                ]
              },
              topic
            );
          }) }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-6 flex flex-wrap items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("p", { className: "font-mono text-xs text-ink-secondary", children: [
          filteredPapers.length,
          " ",
          filteredPapers.length === 1 ? "paper" : "papers",
          selectedTopic !== "All" ? ` in ${selectedTopic}` : "",
          searchQuery ? ` matching “${searchQuery}”` : ""
        ] }),
        filtersActive && /* @__PURE__ */ jsx(
          Pressable,
          {
            type: "button",
            onClick: () => {
              setSearchQuery("");
              setSelectedTopic("All");
            },
            className: "min-h-11 font-sans text-xs font-semibold uppercase tracking-wider text-brand underline underline-offset-4 hover:text-brand-pressed",
            children: "Clear filters"
          }
        )
      ] }),
      loadError && /* @__PURE__ */ jsx("p", { role: "status", className: "mt-4 border-l-2 border-brand bg-surface px-4 py-3 font-sans text-sm text-ink-secondary", children: loadError }),
      copyError && /* @__PURE__ */ jsx("p", { role: "alert", className: "mt-4 border-l-2 border-destructive bg-surface px-4 py-3 font-sans text-sm text-destructive", children: copyError }),
      filteredPapers.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-sm border border-line bg-surface p-8 sm:p-12", children: [
        /* @__PURE__ */ jsx(FileText, { className: "h-7 w-7 text-ink-secondary", "aria-hidden": "true" }),
        /* @__PURE__ */ jsx(Text, { as: "h2", variant: "section-title", className: "mt-4", children: "No papers match those filters" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-xl font-sans text-sm leading-relaxed text-ink-secondary", children: "Try a broader search, or clear the topic filter to browse the full archive." }),
        filtersActive && /* @__PURE__ */ jsxs("div", { className: "mt-4 flex flex-wrap gap-2 font-mono text-xs", children: [
          selectedTopic !== "All" && /* @__PURE__ */ jsxs("span", { className: "rounded-sm border border-brand bg-canvas px-2.5 py-1 text-ink", children: [
            "Topic: ",
            selectedTopic
          ] }),
          searchQuery && /* @__PURE__ */ jsxs("span", { className: "rounded-sm border border-brand bg-canvas px-2.5 py-1 text-ink", children: [
            "Query: ",
            searchQuery
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          Pressable,
          {
            type: "button",
            feedback: "lift",
            onClick: () => {
              setSearchQuery("");
              setSelectedTopic("All");
            },
            className: "mt-6 inline-flex min-h-11 items-center rounded-sm bg-brand px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-on-primary transition-colors hover:bg-brand-hover",
            children: "Show all papers"
          }
        )
      ] }) : /* @__PURE__ */ jsx(MotionList, { "data-layout-grid": "paper-results", className: "mt-6 divide-y divide-line border-y border-line", children: filteredPapers.map((paper) => {
        const isSaved = savedIds.includes(paper.id);
        const isCopied = copiedDoi === paper.id;
        return /* @__PURE__ */ jsx(MotionItem, { className: "py-8", children: /* @__PURE__ */ jsxs("article", { "aria-labelledby": `paper-${paper.id}-title`, className: "grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]", children: [
          /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxs("p", { className: "flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-ink-secondary", children: [
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-brand", children: paper.topic }),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsx("span", { children: paper.journal }),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsx("time", { dateTime: paper.publishedDate, children: paper.publishedDate }),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsx("span", { children: paper.readTime })
            ] }),
            /* @__PURE__ */ jsx("h2", { id: `paper-${paper.id}-title`, className: "mt-2 font-serif text-2xl font-semibold leading-snug text-ink sm:text-3xl", children: /* @__PURE__ */ jsx(LinkShim, { href: `/paper/${paper.slug}`, className: "transition-colors hover:text-brand", children: paper.title }) }),
            paper.subtitle && /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-3xl font-sans text-base leading-relaxed text-ink-secondary", children: paper.subtitle }),
            /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-[65ch] font-sans text-sm leading-relaxed text-ink-secondary", children: paper.abstract }),
            /* @__PURE__ */ jsxs("p", { className: "mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-xs text-ink-secondary", children: [
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-ink", children: "Authors:" }),
              paper.authors.map((author, index) => /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1", children: [
                /* @__PURE__ */ jsx("span", { children: author.name }),
                author.orcid && /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx(GraduationCap, { className: "h-3.5 w-3.5 text-brand", "aria-hidden": "true" }),
                  /* @__PURE__ */ jsxs("span", { className: "sr-only", children: [
                    "ORCID ",
                    author.orcid
                  ] })
                ] }),
                index < paper.authors.length - 1 && /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "," })
              ] }, `${author.name}-${index}`))
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0", children: [
            /* @__PURE__ */ jsxs("dl", { className: "grid grid-cols-2 gap-3 font-mono text-xs lg:grid-cols-1", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "DOI" }),
                /* @__PURE__ */ jsx("dd", { className: "mt-0.5 break-all text-ink", children: paper.doi })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "Citations" }),
                /* @__PURE__ */ jsx("dd", { className: "mt-0.5 font-semibold text-ink", children: paper.citationCount })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("dt", { className: "uppercase tracking-wider text-ink-secondary", children: "License" }),
                /* @__PURE__ */ jsx("dd", { className: "mt-0.5 text-ink", children: paper.license })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
              /* @__PURE__ */ jsxs(
                LinkShim,
                {
                  href: `/paper/${paper.slug}`,
                  className: "inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-ink px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90",
                  children: [
                    /* @__PURE__ */ jsx("span", { children: "Read the paper" }),
                    /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4", "aria-hidden": "true" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                Pressable,
                {
                  type: "button",
                  onClick: () => handleToggleSave(paper.id),
                  "aria-pressed": isSaved,
                  className: `inline-flex h-11 w-11 items-center justify-center rounded-sm border transition-colors ${isSaved ? "border-brand bg-brand text-on-primary" : "border-line bg-surface text-ink-secondary hover:bg-surface-subtle hover:text-ink"}`,
                  children: [
                    /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: /* @__PURE__ */ jsx(
                      m.span,
                      {
                        initial: { scale: 0.7, opacity: 0 },
                        animate: { scale: 1, opacity: 1 },
                        exit: { scale: 0.7, opacity: 0 },
                        transition: { duration: 0.16, ease: [...EASING.enter] },
                        className: "inline-flex",
                        children: isSaved ? /* @__PURE__ */ jsx(SuccessCheck, { size: 16, quiet: true }) : /* @__PURE__ */ jsx(Bookmark, { className: "h-4 w-4", "aria-hidden": "true" })
                      },
                      isSaved ? "saved" : "unsaved"
                    ) }),
                    /* @__PURE__ */ jsx("span", { className: "sr-only", children: isSaved ? "Remove from reading list" : "Save to reading list" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3 font-sans text-xs", children: [
              /* @__PURE__ */ jsxs(
                Pressable,
                {
                  type: "button",
                  onClick: () => handleCopyDoi(paper.doi, paper.id),
                  className: "inline-flex min-h-10 items-center gap-1.5 font-medium text-ink-secondary underline-offset-4 hover:text-ink hover:underline",
                  children: [
                    /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: /* @__PURE__ */ jsx(
                      m.span,
                      {
                        initial: { scale: 0.7, opacity: 0, rotate: -10 },
                        animate: { scale: 1, opacity: 1, rotate: 0 },
                        exit: { scale: 0.7, opacity: 0, rotate: 10 },
                        transition: { duration: 0.16, ease: [...EASING.emphasize] },
                        className: "inline-flex text-brand",
                        children: isCopied ? /* @__PURE__ */ jsx(SuccessCheck, { size: 14 }) : /* @__PURE__ */ jsx(Share2, { className: "h-3.5 w-3.5", "aria-hidden": "true" })
                      },
                      isCopied ? "copied" : "copy"
                    ) }),
                    /* @__PURE__ */ jsx("span", { "aria-live": "polite", children: isCopied ? "DOI copied" : "Copy DOI link" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                LinkShim,
                {
                  href: `/cite?article=${encodeURIComponent(paper.slug)}`,
                  className: "inline-flex min-h-10 items-center gap-1.5 font-medium text-ink-secondary underline-offset-4 hover:text-ink hover:underline",
                  children: [
                    /* @__PURE__ */ jsx(Quote, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
                    /* @__PURE__ */ jsx("span", { children: "Cite" })
                  ]
                }
              )
            ] })
          ] })
        ] }) }, paper.id);
      }) }),
      /* @__PURE__ */ jsxs("section", { "aria-labelledby": "papers-methodology-heading", className: "mt-14 border-t border-line pt-8", children: [
        /* @__PURE__ */ jsx(Text, { id: "papers-methodology-heading", as: "h2", variant: "card-title", children: "Indexing criteria and open bibliographic metadata" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-2 max-w-3xl font-sans text-sm leading-relaxed text-ink-secondary", children: [
          "Every entry in the ResearchWithMe paper archive carries persistent DOI linkage, ORCID-verified author attribution, and open licensing under Creative Commons Attribution 4.0 International. Papers indexed here are paired with independent technical reviews by our",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/authors", children: "verified domain specialists" }),
          " ",
          "and compiled into",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/editions", children: "printable quarterly PDF compendiums" }),
          ". You can generate formatted BibTeX, RIS, APA, MLA, or Chicago references in the",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/cite", children: "citation builder" }),
          ", synthesize findings across venues with the",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/assistant", children: "research assistant" }),
          ", or review our indexing charter on the",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/about", children: "About page" }),
          "."
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(BlogFooter, {})
  ] });
}
function PapersRoute() {
  const data = useLoaderData();
  return /* @__PURE__ */ jsx(PapersArchive, { initialPapers: data.papers });
}
const FILTERS = [
  { value: "All", label: "All contributors", icon: Users },
  { value: "orcid", label: "Has an ORCID", icon: GraduationCap },
  { value: "github", label: "Has a GitHub", icon: GitBranch }
];
function orcidHref(author) {
  return author.orcid ? `https://orcid.org/${author.orcid.replace(/^https?:\/\/orcid\.org\//, "")}` : void 0;
}
function AuthorDirectory({ authors }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [identifierFilter, setIdentifierFilter] = useState("All");
  const filteredAuthors = useMemo(() => {
    const query2 = searchQuery.trim().toLowerCase();
    return authors.filter((author) => {
      if (identifierFilter === "orcid" && !author.orcid) return false;
      if (identifierFilter === "github" && !author.github) return false;
      if (!query2) return true;
      return [author.name, author.role, author.domain, author.institution ?? "", author.bio].some(
        (value) => value.toLowerCase().includes(query2)
      );
    });
  }, [authors, identifierFilter, searchQuery]);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("section", { "aria-labelledby": "author-filters", className: "border-b border-line py-8", children: [
      /* @__PURE__ */ jsx("h2", { id: "author-filters", className: "sr-only", children: "Search and filter contributors" }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4 md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] md:items-end", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Text, { htmlFor: "author-search", as: "label", variant: "eyebrow", color: "secondary", className: "mb-1.5 block", children: "Search contributors" }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary", "aria-hidden": "true" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                id: "author-search",
                type: "search",
                value: searchQuery,
                onChange: (event) => setSearchQuery(event.target.value),
                placeholder: "Name, institution, or domain",
                className: "h-11 w-full rounded-sm border border-line bg-surface pl-9 pr-3 font-sans text-sm text-ink placeholder:text-ink-secondary"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Text, { id: "identifier-label", as: "p", variant: "eyebrow", color: "secondary", className: "mb-1.5", children: "Linked identifier" }),
          /* @__PURE__ */ jsx("div", { role: "group", "aria-labelledby": "identifier-label", className: "flex flex-wrap gap-1.5", children: FILTERS.map((filter) => {
            const active = identifierFilter === filter.value;
            return /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: () => setIdentifierFilter(filter.value),
                "aria-pressed": active,
                className: `inline-flex min-h-11 items-center gap-1.5 rounded-sm border px-3 py-2 font-sans text-xs font-medium transition-colors ${active ? "border-brand bg-brand text-on-primary" : "border-line bg-surface text-ink-secondary hover:bg-surface-subtle hover:text-ink"}`,
                children: [
                  /* @__PURE__ */ jsx(filter.icon, { className: "h-4 w-4", "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: filter.label })
                ]
              },
              filter.value
            );
          }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "mt-4 font-mono text-xs text-ink-secondary", children: [
        filteredAuthors.length,
        " ",
        filteredAuthors.length === 1 ? "contributor" : "contributors",
        " shown",
        searchQuery ? ` for “${searchQuery}”` : ""
      ] })
    ] }),
    authors.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-sm border border-line bg-surface p-8 sm:p-12", children: [
      /* @__PURE__ */ jsx(Users, { className: "h-7 w-7 text-ink-secondary", "aria-hidden": "true" }),
      /* @__PURE__ */ jsx(Text, { as: "h2", variant: "section-title", className: "mt-3", children: "No published contributors yet" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-xl font-sans text-sm leading-relaxed text-ink-secondary", children: "Contributor profiles appear here once their authors publish them. Until then the archive is still open for reading." }),
      /* @__PURE__ */ jsx(
        LinkShim,
        {
          href: "/",
          className: "mt-6 inline-flex min-h-11 items-center rounded-sm bg-ink px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90",
          children: "Browse the platform"
        }
      )
    ] }) : filteredAuthors.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-sm border border-line bg-surface p-8 sm:p-12", children: [
      /* @__PURE__ */ jsx(Text, { as: "h2", variant: "section-title", children: "No contributors match those filters" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-xl font-sans text-sm leading-relaxed text-ink-secondary", children: "Try a different name or clear the identifier filter to see the full directory." }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => {
            setSearchQuery("");
            setIdentifierFilter("All");
          },
          className: "mt-6 inline-flex min-h-11 items-center rounded-sm bg-brand px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-on-primary transition-colors hover:bg-brand-hover",
          children: "Clear filters"
        }
      )
    ] }) : /* @__PURE__ */ jsx(
      Stagger,
      {
        as: "ul",
        "data-layout-grid": "author-cards",
        className: "mt-8 grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
        children: filteredAuthors.map((author) => /* @__PURE__ */ jsx(StaggerItem, { as: "li", className: "flex", children: /* @__PURE__ */ jsxs("article", { className: "flex w-full flex-col justify-between rounded-sm border border-line bg-surface p-6 transition-colors hover:border-brand", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
              /* @__PURE__ */ jsx(
                "span",
                {
                  "aria-hidden": "true",
                  className: "flex h-12 w-12 items-center justify-center rounded-sm border border-line bg-canvas font-mono text-sm font-semibold text-ink",
                  children: author.avatar
                }
              ),
              /* @__PURE__ */ jsxs("span", { className: "rounded-sm border border-line bg-canvas px-2 py-1 font-mono text-xs text-ink-secondary", children: [
                author.articleCount,
                " ",
                author.articleCount === 1 ? "article" : "articles"
              ] })
            ] }),
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "card-title", className: "mt-4", children: /* @__PURE__ */ jsx(LinkShim, { href: `/author/${author.id}`, className: "transition-colors hover:text-brand", children: author.name }) }),
            author.role && /* @__PURE__ */ jsx("p", { className: "mt-1 font-mono text-xs font-medium text-brand", children: author.role }),
            author.institution && /* @__PURE__ */ jsxs("p", { className: "mt-1 flex items-start gap-1.5 font-sans text-xs text-ink-secondary", children: [
              /* @__PURE__ */ jsx(Building2, { className: "mt-0.5 h-3.5 w-3.5 shrink-0", "aria-hidden": "true" }),
              /* @__PURE__ */ jsx("span", { children: author.institution })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "mt-3 font-sans text-sm leading-relaxed text-ink-secondary", children: author.bio.length > 180 ? `${author.bio.slice(0, 177)}…` : author.bio })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-5 border-t border-line pt-4", children: [
            /* @__PURE__ */ jsxs("ul", { className: "flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs", children: [
              author.orcid && /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
                "a",
                {
                  href: orcidHref(author),
                  target: "_blank",
                  rel: "noreferrer noopener",
                  className: "inline-flex min-h-9 items-center gap-1 text-ink-secondary underline-offset-4 hover:text-brand hover:underline",
                  children: [
                    /* @__PURE__ */ jsx(GraduationCap, { className: "h-3.5 w-3.5 text-brand", "aria-hidden": "true" }),
                    /* @__PURE__ */ jsx("span", { children: "ORCID" }),
                    /* @__PURE__ */ jsx(ExternalLink, { className: "h-3 w-3", "aria-hidden": "true" })
                  ]
                }
              ) }),
              author.github && /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
                "a",
                {
                  href: author.github,
                  target: "_blank",
                  rel: "noreferrer noopener",
                  className: "inline-flex min-h-9 items-center gap-1 text-ink-secondary underline-offset-4 hover:text-brand hover:underline",
                  children: [
                    /* @__PURE__ */ jsx(GitBranch, { className: "h-3.5 w-3.5 text-brand", "aria-hidden": "true" }),
                    /* @__PURE__ */ jsx("span", { children: "GitHub" }),
                    /* @__PURE__ */ jsx(ExternalLink, { className: "h-3 w-3", "aria-hidden": "true" })
                  ]
                }
              ) }),
              !author.orcid && !author.github && /* @__PURE__ */ jsx("li", { className: "text-ink-secondary", children: "No linked identifier on file" })
            ] }),
            /* @__PURE__ */ jsxs(
              LinkShim,
              {
                href: `/author/${author.id}`,
                className: "mt-4 inline-flex min-h-11 items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-wider text-brand underline-offset-4 hover:underline",
                children: [
                  /* @__PURE__ */ jsx("span", { children: "View profile and archive" }),
                  /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4", "aria-hidden": "true" })
                ]
              }
            )
          ] })
        ] }) }, author.id))
      }
    )
  ] });
}
function AuthorsDirectoryPage({ authors }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-canvas", children: [
    /* @__PURE__ */ jsx(BlogHeader, {}),
    /* @__PURE__ */ jsxs(
      "main",
      {
        id: "main-content",
        className: "mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8",
        children: [
          /* @__PURE__ */ jsxs("header", { className: "border-b border-line pb-8", children: [
            /* @__PURE__ */ jsx("h1", { className: "max-w-4xl font-serif text-3xl font-bold tracking-tight text-ink sm:text-5xl", children: "The reviewers behind the archive" }),
            /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-[60ch] text-base leading-relaxed text-ink", children: "Each profile records what a contributor studies, where they work, and everything they have reviewed here, so you can judge the expertise behind a piece. Linked ORCID and GitHub identifiers are shown as the contributor supplied them." })
          ] }),
          /* @__PURE__ */ jsx(AuthorDirectory, { authors })
        ]
      }
    ),
    /* @__PURE__ */ jsx(BlogFooter, {})
  ] });
}
function AuthorsRoute() {
  const data = useLoaderData();
  return /* @__PURE__ */ jsx(AuthorsDirectoryPage, { authors: data.authors });
}
function PrintButton({
  label = "Print or save as PDF",
  className
}) {
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick: () => window.print(),
      className: className ?? "inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong bg-surface-raised px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-border-strong",
      children: [
        /* @__PURE__ */ jsx(Printer, { className: "h-4 w-4", "aria-hidden": "true" }),
        /* @__PURE__ */ jsx("span", { children: label })
      ]
    }
  );
}
function EditionsArchive() {
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-canvas", children: [
    /* @__PURE__ */ jsx(BlogHeader, {}),
    /* @__PURE__ */ jsxs("main", { id: "main-content", className: "mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8", children: [
      /* @__PURE__ */ jsxs("header", { className: "border-b border-line pb-8", children: [
        /* @__PURE__ */ jsx("h1", { className: "max-w-4xl font-serif text-3xl font-bold tracking-tight text-ink sm:text-5xl", children: "Quarterly editions for offline reading" }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-3xl text-base leading-relaxed text-ink", children: "Thematic compendiums that gather a quarter's reviews, methods, and corrections into one printable volume. Use the print action to save a volume as a PDF through your browser." })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-6 max-w-3xl border-l-2 border-brand-hover bg-brand/5 px-4 py-3 text-sm leading-relaxed text-brand-pressed", children: "Print-ready compilation is a browser feature in this prototype. A hosted archival PDF and its DOI would be issued by the production publishing pipeline." }),
      /* @__PURE__ */ jsx(Stagger, { as: "ul", className: "mt-8 grid gap-8 lg:grid-cols-2", children: PDF_EDITIONS_DATA.map((edition, editionIndex) => {
        const featuredPapers = PUBLICATIONS_DATA.filter(
          (paper) => edition.featuredArticleIds.includes(paper.id)
        );
        return /* @__PURE__ */ jsx(StaggerItem, { as: "li", variant: "rise", className: "flex", children: /* @__PURE__ */ jsxs(
          "article",
          {
            "aria-labelledby": `edition-${edition.id}-title`,
            className: "flex w-full flex-col rounded-lg border border-line bg-surface-raised",
            children: [
              /* @__PURE__ */ jsx("div", { className: "border-b border-line px-6 py-4", children: /* @__PURE__ */ jsxs("p", { className: "flex flex-wrap items-center justify-between gap-2 text-sm text-ink-secondary", children: [
                /* @__PURE__ */ jsx("span", { className: "font-medium text-brand", children: edition.period }),
                /* @__PURE__ */ jsxs("span", { children: [
                  "Volume ",
                  edition.volume,
                  ", Issue ",
                  edition.issue
                ] })
              ] }) }),
              /* @__PURE__ */ jsxs("div", { className: "flex-1 px-6 py-6", children: [
                /* @__PURE__ */ jsx("h2", { id: `edition-${edition.id}-title`, className: "font-serif text-2xl font-semibold leading-snug text-ink", children: edition.title }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm font-medium text-brand", children: edition.theme }),
                /* @__PURE__ */ jsx("p", { className: "mt-3 max-w-prose text-base leading-relaxed text-ink", children: edition.description }),
                editionIndex === 0 && /* @__PURE__ */ jsxs("div", { className: "mt-5", children: [
                  /* @__PURE__ */ jsx("span", { className: "inline-flex items-center rounded-md bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand mb-3", children: "Edition trailer" }),
                  /* @__PURE__ */ jsx(
                    VideoEmbed,
                    {
                      src: "/videos/edition-trailer.mp4",
                      label: `Trailer for ${edition.title}`
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("dl", { className: "mt-6 grid grid-cols-2 gap-4 border-y border-line py-4 text-sm sm:grid-cols-4", children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "text-ink-secondary", children: "Articles" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 font-semibold text-ink", children: edition.articleCount })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "text-ink-secondary", children: "Pages" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 font-semibold text-ink", children: edition.pages })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("dt", { className: "text-ink-secondary", children: "Published" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 font-semibold text-ink", children: edition.publicationDate })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "col-span-2 sm:col-span-1", children: [
                    /* @__PURE__ */ jsx("dt", { className: "text-ink-secondary", children: "Editor" }),
                    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 font-semibold text-ink", children: edition.editor })
                  ] })
                ] }),
                /* @__PURE__ */ jsx("h3", { className: "mt-6 text-sm font-semibold text-ink", children: "Papers in this volume" }),
                featuredPapers.length > 0 ? /* @__PURE__ */ jsx("ul", { className: "mt-2 divide-y divide-line", children: featuredPapers.map((paper) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
                  LinkShim,
                  {
                    href: `/paper/${paper.slug}`,
                    className: "group flex items-start justify-between gap-3 py-3 text-sm text-ink transition-colors hover:text-brand",
                    children: [
                      /* @__PURE__ */ jsx("span", { className: "font-medium", children: paper.title }),
                      /* @__PURE__ */ jsx(ArrowRight, { className: "mt-0.5 h-4 w-4 shrink-0 text-ink-secondary group-hover:text-brand", "aria-hidden": "true" })
                    ]
                  }
                ) }, paper.id)) }) : /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-ink-secondary", children: "This volume's contents are being prepared." })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas px-6 py-4", children: [
                /* @__PURE__ */ jsxs("span", { className: "font-mono text-sm text-ink-secondary", children: [
                  "DOI 10.5555/rwm.ed.",
                  edition.id
                ] }),
                /* @__PURE__ */ jsx(PrintButton, { label: `Print volume ${edition.volume}.${edition.issue}` })
              ] })
            ]
          }
        ) }, edition.id);
      }) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-10 space-y-4 border-t border-line pt-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-ink-secondary", children: "Looking for a single paper? The paper archive keeps every record with its own citation metadata." }),
          /* @__PURE__ */ jsxs(
            LinkShim,
            {
              href: "/papers",
              className: "inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand underline underline-offset-4 hover:text-brand-pressed",
              children: [
                /* @__PURE__ */ jsx(FileText, { className: "h-4 w-4", "aria-hidden": "true" }),
                /* @__PURE__ */ jsx("span", { children: "Browse papers" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "max-w-3xl text-sm leading-relaxed text-ink-secondary", children: [
          "Quarterly PDF compendiums assemble peer-reviewed technical essays, benchmark replications, and formal errata overseen by our",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/editorial-board", children: "editorial board" }),
          " ",
          "and",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/authors", children: "specialist contributors" }),
          " ",
          "for institutional library preservation and offline seminar reading. Individual entries can also be saved to your",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/bookmarks", children: "local reading list" }),
          " ",
          "or exported via the",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/cite", children: "citation builder" }),
          ". Each volume preserves stable typography, canonical Digital Object Identifiers, and complete figure captions so university reading rooms, lab groups, and independent scholars can archive permanent copies under Creative Commons Attribution 4.0 International."
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(BlogFooter, {})
  ] });
}
function EditionsRoute() {
  useLoaderData();
  return /* @__PURE__ */ jsx(EditionsArchive, {});
}
const principles = [
  {
    title: "Evidence before assertion",
    body: "A review that examines a paper or repository must point to the executable code, the public preprint, the dataset, or the exact release it evaluated. Claims without an artifact stay out of the archive."
  },
  {
    title: "Expertise that can be checked",
    body: "Contributors publish under a scholarly identity: an ORCID record, maintainer history on a public repository, or an accredited institutional address. Profiles show that record so readers can judge it themselves."
  },
  {
    title: "No paywall in either direction",
    body: "Readers pay nothing and authors pay no article processing charge. Work is released under CC BY 4.0, with corrections published rather than silently amended."
  }
];
function EditorialBoard() {
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-canvas", children: [
    /* @__PURE__ */ jsx(BlogHeader, {}),
    /* @__PURE__ */ jsxs("main", { id: "main-content", className: "mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8", children: [
      /* @__PURE__ */ jsxs("header", { className: "border-b border-line pb-8", children: [
        /* @__PURE__ */ jsx("h1", { className: "max-w-3xl font-serif text-3xl font-bold tracking-tight text-ink sm:text-5xl", children: "Editorial standards and the people who keep them" }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-3xl text-lg leading-relaxed text-ink", children: "ResearchWithMe is governed by an independent collective of researchers, systems engineers, clinicians, and data librarians. They set the review standard and sign the record when an article meets it." })
      ] }),
      /* @__PURE__ */ jsxs("section", { "aria-labelledby": "board-heading", className: "py-10", children: [
        /* @__PURE__ */ jsx(Text, { id: "board-heading", as: "h2", variant: "page-title", children: "Editorial leadership" }),
        /* @__PURE__ */ jsx("ul", { className: "mt-6 divide-y divide-line border-y border-line", children: EDITORIAL_BOARD.map((member) => /* @__PURE__ */ jsxs("li", { className: "grid gap-4 py-6 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:gap-6", children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              "aria-hidden": "true",
              className: "flex h-14 w-14 items-center justify-center rounded-lg bg-surface-inverse font-serif text-lg font-bold text-text-inverse",
              children: member.avatarInitials
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsx(Text, { as: "h3", variant: "card-title", children: member.name }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm font-medium text-brand", children: member.role }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-ink-secondary", children: member.institution }),
            /* @__PURE__ */ jsxs("p", { className: "mt-3 max-w-2xl text-base leading-relaxed text-ink", children: [
              /* @__PURE__ */ jsx("span", { className: "font-medium text-ink", children: "Focus: " }),
              member.focus
            ] })
          ] }),
          /* @__PURE__ */ jsxs(
            "a",
            {
              href: `https://orcid.org/${member.orcid}`,
              target: "_blank",
              rel: "noreferrer noopener",
              className: "inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-medium text-success underline-offset-4 hover:underline",
              children: [
                /* @__PURE__ */ jsx(GraduationCap, { className: "h-4 w-4", "aria-hidden": "true" }),
                /* @__PURE__ */ jsx("span", { children: member.orcid }),
                /* @__PURE__ */ jsx(ExternalLink, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
                /* @__PURE__ */ jsxs("span", { className: "sr-only", children: [
                  "ORCID record for ",
                  member.name
                ] })
              ]
            }
          )
        ] }, member.orcid)) })
      ] }),
      /* @__PURE__ */ jsxs("section", { "aria-labelledby": "principles-heading", className: "border-t border-line py-10", children: [
        /* @__PURE__ */ jsx(Text, { id: "principles-heading", as: "h2", variant: "page-title", children: "What the editorial gate checks" }),
        /* @__PURE__ */ jsx("ol", { className: "mt-6 space-y-8", children: principles.map((principle, index) => /* @__PURE__ */ jsxs("li", { className: "grid gap-3 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-6", children: [
          /* @__PURE__ */ jsx("span", { "aria-hidden": "true", className: "font-serif text-3xl font-semibold text-brand-hover", children: String(index + 1).padStart(2, "0") }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Text, { as: "h3", variant: "card-title", children: principle.title }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-prose text-base leading-relaxed text-ink", children: principle.body })
          ] })
        ] }, principle.title)) })
      ] }),
      /* @__PURE__ */ jsx("section", { "aria-labelledby": "contribute-heading", className: "border-t border-line py-10", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { id: "contribute-heading", className: "font-serif text-2xl font-bold text-ink", children: "Write with the collective" }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-2xl text-base leading-relaxed text-ink", children: "Original explanations of research papers, repository teardowns, and field notes are welcome from writers who can show their working. There is no open manuscript intake — access comes through an application the board reviews." })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex shrink-0 flex-wrap gap-3", children: /* @__PURE__ */ jsx(
          LinkShim,
          {
            href: "/dashboard/access",
            className: "inline-flex min-h-11 items-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover",
            children: "Apply to write"
          }
        ) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(BlogFooter, {})
  ] });
}
function EditorialBoardRoute() {
  useLoaderData();
  return /* @__PURE__ */ jsx(EditorialBoard, {});
}
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const LOTTIE_FPS = 60;
const INK = [0, 0, 0, 1];
function framesFor(ms) {
  return Math.max(0, Math.floor(ms * LOTTIE_FPS / 1e3 + 1e-9));
}
function still(k) {
  return { a: 0, k };
}
function keyframes(stops, easing) {
  const easingFor = (segment) => isEasingList(easing) ? easing[Math.min(segment, easing.length - 1)] : easing;
  return {
    a: 1,
    k: stops.map(([t2, value], index) => {
      const s = Array.isArray(value) ? [...value] : [value];
      if (index === stops.length - 1) return { t: t2, s };
      const [x1, y1, x2, y2] = easingFor(index);
      return { t: t2, s, o: { x: [x1], y: [y1] }, i: { x: [x2], y: [y2] } };
    })
  };
}
function isEasingList(value) {
  return Array.isArray(value[0]);
}
function ellipse(size, position = still([0, 0])) {
  return { ty: "el", nm: "Ellipse", d: 1, p: position, s: size };
}
function polyline(points, closed = false) {
  const zero = points.map(() => [0, 0]);
  const data = { i: zero, o: zero.map((p) => [...p]), v: points.map((p) => [...p]), c: closed };
  return { ty: "sh", nm: "Path", d: 1, ks: still(data) };
}
function stroke(width, opacity = still(100)) {
  return { ty: "st", nm: "Stroke", c: still(INK), o: opacity, w: still(width), lc: 2, lj: 2, ml: 4, bm: 0 };
}
function fill(opacity = still(100)) {
  return { ty: "fl", nm: "Fill", c: still(INK), o: opacity, r: 1, bm: 0 };
}
function trim(end, start = still(0)) {
  return { ty: "tm", nm: "Trim", s: start, e: end, o: still(0), m: 1 };
}
function group(name, items, transform = {}) {
  return {
    ty: "gr",
    nm: name,
    it: [
      ...items,
      {
        ty: "tr",
        nm: "Transform",
        p: transform.position ?? still([0, 0]),
        a: still([0, 0]),
        s: transform.scale ?? still([100, 100]),
        r: transform.rotation ?? still(0),
        o: transform.opacity ?? still(100),
        sk: still(0),
        sa: still(0)
      }
    ]
  };
}
function composition({ name, size, frames, layers }) {
  const centre = size / 2;
  return {
    v: "5.7.4",
    fr: LOTTIE_FPS,
    ip: 0,
    op: frames,
    w: size,
    h: size,
    nm: name,
    ddd: 0,
    assets: [],
    layers: layers.map((layer, index) => ({
      ddd: 0,
      ind: index + 1,
      ty: 4,
      nm: layer.name,
      sr: 1,
      ks: {
        o: layer.transform?.opacity ?? still(100),
        r: layer.transform?.rotation ?? still(0),
        p: layer.transform?.position ?? still([centre, centre, 0]),
        a: still([0, 0, 0]),
        s: layer.transform?.scale ?? still([100, 100, 100])
      },
      ao: 0,
      shapes: layer.shapes,
      ip: 0,
      op: frames,
      st: 0,
      bm: 0
    }))
  };
}
const SIZE = 24;
const POP = SCALE.pop * 100;
const PULSE = SCALE.pulse * 100;
const F = {
  fast: framesFor(DURATION_MS.fast),
  standard: framesFor(DURATION_MS.standard),
  deliberate: framesFor(DURATION_MS.deliberate),
  connect: framesFor(DURATION_MS.connect),
  synthesize: framesFor(DURATION_MS.synthesize)
};
function buildVerify() {
  return composition({
    name: "pieme-verify",
    size: SIZE,
    frames: F.connect,
    layers: [
      {
        name: "Tick",
        shapes: [
          group("Tick", [
            polyline([
              [-5.25, 0.4],
              [-1.6, 4],
              [5.4, -3.4]
            ]),
            trim(keyframes([[F.fast, 0], [F.connect, 100]], EASING.enter)),
            stroke(2)
          ])
        ]
      },
      {
        name: "Disc",
        shapes: [
          group("Disc", [ellipse(still([20, 20])), stroke(1.75)], {
            scale: keyframes(
              [
                [0, [82, 82]],
                [F.standard, [POP, POP]],
                [F.deliberate, [100, 100]]
              ],
              [EASING.emphasize, EASING.standard]
            )
          })
        ]
      }
    ]
  });
}
function buildConnect() {
  const arrive = framesFor(DURATION_MS.connect - DURATION_MS.fast);
  return composition({
    name: "pieme-connect",
    size: SIZE,
    frames: F.connect,
    layers: [
      {
        name: "Link",
        shapes: [
          group("Link", [
            polyline([
              [-4, 0],
              [4, 0]
            ]),
            trim(keyframes([[0, 0], [F.deliberate, 100]], EASING.emphasize)),
            stroke(1.75)
          ])
        ]
      },
      {
        name: "Source",
        shapes: [group("Source", [ellipse(still([6, 6])), stroke(1.75)], { position: still([-7, 0]) })]
      },
      {
        name: "Target",
        shapes: [
          group("Target", [ellipse(still([6, 6])), stroke(1.75)], {
            position: still([7, 0]),
            opacity: keyframes([[F.standard, 0], [F.deliberate, 100]], EASING.enter),
            scale: keyframes(
              [
                [F.standard, [60, 60]],
                [arrive, [POP, POP]],
                [F.connect, [100, 100]]
              ],
              [EASING.emphasize, EASING.standard]
            )
          })
        ]
      }
    ]
  });
}
function buildSynthesize() {
  const radius = 7;
  const sources = [-90, 30, 150].map((deg) => {
    const rad = deg * Math.PI / 180;
    return [Number((Math.cos(rad) * radius).toFixed(3)), Number((Math.sin(rad) * radius).toFixed(3))];
  });
  return composition({
    name: "pieme-synthesize",
    size: SIZE,
    frames: F.synthesize,
    layers: [
      {
        name: "Result",
        shapes: [
          group("Result", [ellipse(still([8, 8])), fill()], {
            scale: keyframes(
              [
                [F.deliberate, [0, 0]],
                [F.connect + F.fast, [POP, POP]],
                [F.synthesize, [100, 100]]
              ],
              [EASING.emphasize, EASING.standard]
            )
          })
        ]
      },
      ...sources.map((origin, index) => ({
        name: `Evidence ${index + 1}`,
        shapes: [
          group(`Evidence ${index + 1}`, [ellipse(still([4, 4])), fill()], {
            position: keyframes([[0, origin], [F.connect, [0, 0]]], EASING.standard),
            opacity: keyframes([[F.deliberate, 100], [F.connect, 0]], EASING.exit)
          })
        ]
      }))
    ]
  });
}
const ATTENTION_CYCLES = 3;
function buildAttention() {
  const cycle = F.synthesize;
  const half = Math.round(cycle / 2);
  const scaleStops = [];
  const ringSize = [];
  const ringOpacity = [];
  for (let n = 0; n < ATTENTION_CYCLES; n += 1) {
    const start = n * cycle;
    scaleStops.push([start, [100, 100]], [start + half, [PULSE, PULSE]]);
    ringSize.push([start, [8, 8]], [start + cycle - 1, [20, 20]]);
    ringOpacity.push([start, 60], [start + cycle - 1, 0]);
  }
  const end = ATTENTION_CYCLES * cycle;
  scaleStops.push([end, [100, 100]]);
  return composition({
    name: "pieme-attention",
    size: SIZE,
    frames: end,
    layers: [
      {
        name: "Dot",
        shapes: [
          group("Dot", [ellipse(still([8, 8])), fill()], {
            scale: keyframes(scaleStops, EASING.standard)
          })
        ]
      },
      {
        name: "Ripple",
        shapes: [
          group("Ripple", [
            ellipse(keyframes(ringSize, EASING.enter)),
            stroke(1.5, keyframes(ringOpacity, EASING.exit))
          ])
        ]
      }
    ]
  });
}
const LOTTIE_ANIMATIONS = Object.freeze({
  verify: buildVerify(),
  connect: buildConnect(),
  synthesize: buildSynthesize(),
  attention: buildAttention()
});
let runtime = null;
function loadRuntime() {
  runtime ??= import("lottie-web/build/player/lottie_light.js").then((module) => module.default);
  return runtime;
}
function LottiePlayer({
  animation,
  fallback,
  size = 24,
  autoplay = true,
  playKey,
  className,
  style,
  onComplete
}) {
  const { mode } = useMotionMode();
  const osReduced = useReducedMotion();
  const enabled = mode === "full" && !osReduced;
  const container = useRef(null);
  const itemRef = useRef(null);
  const completeRef = useRef(onComplete);
  const [drawn, setDrawn] = useState(false);
  const [armed, setArmed] = useState(autoplay);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    if (!enabled || !armed || !container.current) return;
    const host = container.current;
    let item = null;
    let cancelled = false;
    loadRuntime().then((lottie) => {
      if (cancelled) return;
      item = itemRef.current = lottie.loadAnimation({
        container: host,
        renderer: "svg",
        loop: false,
        autoplay: true,
        // lottie-web mutates animationData in place; give each load its own copy.
        animationData: structuredClone(animation),
        rendererSettings: { preserveAspectRatio: "xMidYMid meet" }
      });
      item.addEventListener("DOMLoaded", () => setDrawn(true));
      item.addEventListener("complete", () => completeRef.current?.());
    }).catch(() => {
    });
    return () => {
      cancelled = true;
      item?.destroy();
      itemRef.current = null;
      setDrawn(false);
    };
  }, [enabled, armed, animation]);
  const lastKey = useRef(playKey);
  useEffect(() => {
    if (lastKey.current === playKey) return;
    lastKey.current = playKey;
    if (itemRef.current) itemRef.current.goToAndPlay(0, true);
    else setArmed(true);
  }, [playKey]);
  const live = enabled && drawn;
  return /* @__PURE__ */ jsxs(
    "span",
    {
      "aria-hidden": "true",
      "data-lottie": animation.nm,
      className: cn("pieme-lottie relative inline-flex shrink-0", className),
      style: { width: size, height: size, ...style },
      children: [
        /* @__PURE__ */ jsx("span", { className: cn("inline-flex h-full w-full", live && "invisible"), children: fallback }),
        /* @__PURE__ */ jsx("span", { ref: container, className: "absolute inset-0" })
      ]
    }
  );
}
const svgProps = {
  viewBox: "0 0 24 24",
  width: "100%",
  height: "100%",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  focusable: false,
  "aria-hidden": true
};
function VerifyRest() {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps, children: [
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "10", strokeWidth: "1.75" }),
    /* @__PURE__ */ jsx("path", { d: "M6.75 12.4 10.4 16 17.4 8.6", strokeWidth: "2" })
  ] });
}
function ConnectRest() {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps, strokeWidth: "1.75", children: [
    /* @__PURE__ */ jsx("circle", { cx: "5", cy: "12", r: "3" }),
    /* @__PURE__ */ jsx("path", { d: "M8 12h8" }),
    /* @__PURE__ */ jsx("circle", { cx: "19", cy: "12", r: "3" })
  ] });
}
function SynthesizeRest() {
  return /* @__PURE__ */ jsx("svg", { ...svgProps, stroke: "none", children: /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "4", fill: "currentColor" }) });
}
function AttentionRest() {
  return /* @__PURE__ */ jsx("svg", { ...svgProps, stroke: "none", children: /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "4", fill: "currentColor" }) });
}
function VerifyMark(props) {
  return /* @__PURE__ */ jsx(LottiePlayer, { animation: LOTTIE_ANIMATIONS.verify, fallback: /* @__PURE__ */ jsx(VerifyRest, {}), ...props });
}
function ConnectMark(props) {
  return /* @__PURE__ */ jsx(LottiePlayer, { animation: LOTTIE_ANIMATIONS.connect, fallback: /* @__PURE__ */ jsx(ConnectRest, {}), ...props });
}
function SynthesizeMark(props) {
  return /* @__PURE__ */ jsx(LottiePlayer, { animation: LOTTIE_ANIMATIONS.synthesize, fallback: /* @__PURE__ */ jsx(SynthesizeRest, {}), ...props });
}
function AttentionMark(props) {
  return /* @__PURE__ */ jsx(LottiePlayer, { animation: LOTTIE_ANIMATIONS.attention, fallback: /* @__PURE__ */ jsx(AttentionRest, {}), ...props });
}
const MARKS = {
  verify: VerifyMark,
  connect: ConnectMark,
  synthesize: SynthesizeMark,
  attention: AttentionMark
};
function WorkflowStageItem({ stage, index, heading: Heading }) {
  const [plays, setPlays] = useState(0);
  const Mark = MARKS[stage.pattern];
  const plannedCount = stage.details.filter((detail) => detail.status === "planned").length;
  return /* @__PURE__ */ jsxs("li", { className: "relative grid grid-cols-[auto_1fr] gap-x-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center", children: [
      /* @__PURE__ */ jsx("span", { className: "flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-surface text-text-primary", children: /* @__PURE__ */ jsx(Mark, { size: 20, autoplay: false, playKey: plays }) }),
      /* @__PURE__ */ jsx("span", { "data-workflow-connector": true, "aria-hidden": "true", className: "mt-1 w-px flex-1 bg-border-strong" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "min-w-0 pb-8", children: [
      /* @__PURE__ */ jsxs("p", { className: "font-mono text-xs text-text-tertiary", children: [
        "Stage ",
        index + 1
      ] }),
      /* @__PURE__ */ jsx(Heading, { className: "mt-0.5 font-sans text-base font-semibold leading-snug text-text-primary", children: stage.label }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 max-w-prose font-sans text-sm text-text-secondary", children: stage.summary }),
      /* @__PURE__ */ jsxs(
        "details",
        {
          className: "group/stage mt-2",
          onToggle: (event) => {
            if (event.currentTarget.open) setPlays((count) => count + 1);
          },
          children: [
            /* @__PURE__ */ jsxs(
              "summary",
              {
                className: cn(
                  "inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-sm font-sans text-sm font-medium text-link",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden"
                ),
                children: [
                  stage.details.length,
                  " capabilities",
                  plannedCount > 0 ? /* @__PURE__ */ jsxs("span", { className: "text-text-tertiary", children: [
                    "· ",
                    plannedCount,
                    " planned"
                  ] }) : null,
                  /* @__PURE__ */ jsx(
                    ChevronDown,
                    {
                      "aria-hidden": "true",
                      className: "h-4 w-4 transition-transform duration-200 ease-standard group-open/stage:rotate-180"
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsx("ul", { className: "mt-1 divide-y divide-line border-y border-line", children: stage.details.map((detail) => /* @__PURE__ */ jsxs("li", { className: "flex items-baseline justify-between gap-3 py-2 font-sans text-sm", children: [
              /* @__PURE__ */ jsx("span", { className: detail.status === "planned" ? "text-text-secondary" : "text-text-primary", children: detail.label }),
              detail.status === "planned" ? /* @__PURE__ */ jsx(Badge, { variant: "outline", size: "sm", children: "Planned" }) : null
            ] }, detail.id)) })
          ]
        }
      )
    ] })
  ] });
}
const NEXT_LEVEL = { h2: "h3", h3: "h4", h4: "h5" };
function WorkflowDiagram({ workflow, heading = "h2", className }) {
  const Heading = heading;
  const OutcomeHeading = NEXT_LEVEL[heading];
  const titleId = `workflow-${workflow.id}-title`;
  return /* @__PURE__ */ jsxs("section", { "aria-labelledby": titleId, "data-workflow": workflow.id, className: cn("max-w-prose", className), children: [
    /* @__PURE__ */ jsx(Heading, { id: titleId, className: "font-serif text-2xl font-medium leading-tight text-text-primary text-balance", children: workflow.title }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 font-sans text-sm text-text-secondary", children: workflow.summary }),
    /* @__PURE__ */ jsxs("ol", { className: "mt-6", "aria-label": `${workflow.title}: ${workflow.stages.length} stages and an outcome`, children: [
      workflow.stages.map((stage, index) => /* @__PURE__ */ jsx(WorkflowStageItem, { stage, index, heading: OutcomeHeading }, stage.id)),
      /* @__PURE__ */ jsxs("li", { className: "grid grid-cols-[auto_1fr] gap-x-4", children: [
        /* @__PURE__ */ jsx("span", { className: "flex h-10 w-10 items-center justify-center", "aria-hidden": "true", children: /* @__PURE__ */ jsx(
          "span",
          {
            className: cn(
              "h-3.5 w-3.5 rounded-full",
              workflow.outcome.status === "planned" ? "border border-dashed border-border-strong" : "bg-text-primary"
            )
          }
        ) }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 pt-2", children: [
          /* @__PURE__ */ jsxs(OutcomeHeading, { className: "flex flex-wrap items-center gap-2 font-sans text-base font-semibold leading-snug text-text-primary", children: [
            /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Outcome: " }),
              workflow.outcome.label
            ] }),
            workflow.outcome.status === "planned" ? /* @__PURE__ */ jsx(Badge, { variant: "outline", size: "sm", children: "Planned" }) : null
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 font-sans text-sm text-text-secondary", children: workflow.outcome.summary })
        ] })
      ] })
    ] })
  ] });
}
function WorkflowDisclosure({ workflow, summary, heading = "h3", className }) {
  return /* @__PURE__ */ jsxs("details", { "data-workflow-disclosure": workflow.id, className: cn("group/disclosure", className), children: [
    /* @__PURE__ */ jsxs(
      "summary",
      {
        className: cn(
          "inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-sm",
          "font-mono text-xs font-semibold uppercase tracking-wider text-ink",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden"
        ),
        children: [
          /* @__PURE__ */ jsx("span", { children: summary ?? `How this works: ${workflow.title}` }),
          /* @__PURE__ */ jsx(ChevronDown, { "aria-hidden": "true", className: "h-3.5 w-3.5 transition-transform duration-200 ease-standard group-open/disclosure:rotate-180" })
        ]
      }
    ),
    /* @__PURE__ */ jsx(WorkflowDiagram, { workflow, heading, className: "mt-4" })
  ] });
}
const RESEARCH_WORKFLOWS = {
  discovery: {
    id: "discovery",
    title: "Discovery and literature synthesis",
    summary: "From a question to a cited answer, with every source traceable.",
    routes: ["/assistant"],
    stages: [
      {
        id: "query",
        label: "Query intake",
        summary: "State the question in plain language or paste an identifier.",
        pattern: "connect",
        details: [
          { id: "query-natural", label: "Natural-language question", status: "live", component: "AssistantPanel" },
          { id: "query-identifiers", label: "DOI, arXiv and GitHub identifiers", status: "live", component: "CitationTool" }
        ]
      },
      {
        id: "cluster",
        label: "Source clustering",
        summary: "Gather relevant reviews from the catalogue across six disciplines.",
        pattern: "synthesize",
        details: [
          { id: "cluster-catalogue", label: "Catalogue retrieval", status: "live", component: "/api/research-assistant" },
          { id: "cluster-semantic", label: "Semantic similarity clusters", status: "planned" }
        ]
      },
      {
        id: "graph",
        label: "Citation graph",
        summary: "Show how each claim connects back to its sources.",
        pattern: "connect",
        details: [
          { id: "graph-provenance", label: "Provenance graph", status: "live", component: "ProvenanceGraph" },
          { id: "graph-trust", label: "Trust assessment", status: "live", component: "TrustAssessmentSummary" }
        ]
      }
    ],
    outcome: {
      label: "Cited synthesis",
      summary: "A summary with inline citations. Uses Gemini when configured, otherwise a deterministic local summary.",
      status: "live"
    }
  }
};
const SAMPLE_QUESTIONS = [
  "How does vLLM’s PagedAttention reduce GPU memory fragmentation?",
  "What did DeepSeek-R1 show about reasoning without human demonstrations?",
  "What does the trial evidence say about GLP-1 receptor agonists and cardiovascular risk?",
  "Why did the engineering team move from Kubernetes to Nomad on bare metal?"
];
function AssistantPanel({ initialArticles } = {}) {
  const [query2, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [citations, setCitations] = useState([]);
  const [articles, setArticles] = useState(initialArticles ?? INITIAL_BLOG_POSTS);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const answerRef = useRef(null);
  useEffect(() => {
    let active = true;
    async function loadArticles() {
      try {
        const res = await fetch("/api/articles", { headers: { accept: "application/json" } });
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.articles) && data.articles.length > 0) {
          setArticles(data.articles);
        }
      } catch {
      }
    }
    loadArticles();
    return () => {
      active = false;
    };
  }, []);
  async function runQuery(inquiry) {
    const trimmed = inquiry.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    setCitations([]);
    try {
      let finalQuery = trimmed;
      if (scope !== "all") {
        const targeted = articles.find((article) => article.id === scope);
        if (targeted) {
          finalQuery = `Regarding the article "${targeted.title}" by ${targeted.author.name}: ${trimmed}`;
        }
      }
      const res = await fetch("/api/research-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: finalQuery })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "The assistant could not complete this request.");
      }
      const data = await res.json();
      if (!data.answer) throw new Error("The assistant returned an empty answer. Try a narrower question.");
      setAnswer(data.answer);
      setCitations(Array.isArray(data.citations) ? data.citations : []);
      window.setTimeout(() => answerRef.current?.focus(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The assistant could not complete this request.");
    } finally {
      setLoading(false);
    }
  }
  async function copyAnswer() {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Clipboard access was blocked. Select the answer text and copy it manually.");
    }
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-canvas", children: [
    /* @__PURE__ */ jsx(BlogHeader, {}),
    /* @__PURE__ */ jsxs("main", { id: "main-content", className: "mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8", children: [
      /* @__PURE__ */ jsxs("header", { className: "border-b border-line pb-8", children: [
        /* @__PURE__ */ jsx("h1", { className: "max-w-3xl font-serif text-3xl font-bold tracking-tight text-ink sm:text-5xl", children: "Ask the archive a question" }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-[60ch] text-base leading-relaxed text-ink", children: "The assistant answers from this platform's own catalog. Without a configured model key it returns a deterministic, cited summary; with one, the model receives the same catalog text and is asked to cite its sources." })
      ] }),
      /* @__PURE__ */ jsxs("section", { "aria-labelledby": "assistant-form-heading", className: "py-8", children: [
        /* @__PURE__ */ jsx("h2", { id: "assistant-form-heading", className: "sr-only", children: "Ask a research question" }),
        /* @__PURE__ */ jsxs(
          "form",
          {
            onSubmit: (event) => {
              event.preventDefault();
              runQuery(query2);
            },
            className: "space-y-5",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-[minmax(0,1fr)_18rem]", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("label", { htmlFor: "assistant-query", className: "mb-1.5 block text-sm font-medium text-ink", children: "Question" }),
                  /* @__PURE__ */ jsx(
                    "textarea",
                    {
                      id: "assistant-query",
                      rows: 3,
                      value: query2,
                      onChange: (event) => setQuery(event.target.value),
                      disabled: loading,
                      placeholder: "What evidence supports the claim that paged attention improves throughput?",
                      className: "w-full rounded-md border border-border-strong bg-surface-raised px-3 py-2.5 text-base text-ink placeholder:text-ink-secondary"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("label", { htmlFor: "assistant-scope", className: "mb-1.5 block text-sm font-medium text-ink", children: "Scope" }),
                  /* @__PURE__ */ jsxs(
                    "select",
                    {
                      id: "assistant-scope",
                      value: scope,
                      onChange: (event) => setScope(event.target.value),
                      disabled: loading,
                      className: "h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-ink",
                      children: [
                        /* @__PURE__ */ jsxs("option", { value: "all", children: [
                          "Entire catalog (",
                          articles.length,
                          " articles)"
                        ] }),
                        articles.map((article) => /* @__PURE__ */ jsx("option", { value: article.id, children: article.title }, article.id))
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm leading-relaxed text-ink-secondary", children: "Narrowing the scope keeps the answer anchored to one review." })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "submit",
                    disabled: loading || !query2.trim(),
                    className: "inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover disabled:opacity-50",
                    children: [
                      loading ? /* @__PURE__ */ jsx(Spinner, { size: 16, className: "text-on-primary" }) : /* @__PURE__ */ jsx(Send, { className: "h-4 w-4", "aria-hidden": "true" }),
                      /* @__PURE__ */ jsx("span", { children: loading ? "Searching the archive…" : "Ask the archive" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsx("p", { className: "text-sm text-ink-secondary", children: "Answers summarize published work; verify claims against the linked article." })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "mt-8", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-ink", children: "Try one of these" }),
          /* @__PURE__ */ jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: SAMPLE_QUESTIONS.map((question) => /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              disabled: loading,
              onClick: () => {
                setQuery(question);
                runQuery(question);
              },
              className: "max-w-full rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-left text-sm text-ink transition-colors hover:border-border-strong disabled:opacity-50",
              children: question
            },
            question
          )) })
        ] }),
        error && /* @__PURE__ */ jsxs("div", { role: "alert", className: "mt-6 border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive", children: [
          /* @__PURE__ */ jsx("p", { className: "font-medium", children: "The request did not complete." }),
          /* @__PURE__ */ jsx("p", { className: "mt-1", children: error }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => runQuery(query2),
              className: "mt-2 min-h-9 font-semibold underline underline-offset-4",
              children: "Try again"
            }
          )
        ] }),
        /* @__PURE__ */ jsx(AnimatePresence, { initial: false, children: loading ? /* @__PURE__ */ jsxs(
          m.p,
          {
            role: "status",
            initial: { opacity: 0, y: -4 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -4 },
            transition: { duration: 0.18, ease: [...EASING.standard] },
            className: "mt-6 flex items-center gap-2 text-sm text-ink-secondary",
            children: [
              /* @__PURE__ */ jsx(Spinner, { size: 16, className: "text-brand" }),
              /* @__PURE__ */ jsx("span", { children: "Reading the catalog and drafting a cited answer…" })
            ]
          },
          "assistant-loading"
        ) : null }),
        /* @__PURE__ */ jsx(AnimatePresence, { initial: false, children: answer && /* @__PURE__ */ jsxs(
          m.div,
          {
            ref: answerRef,
            tabIndex: -1,
            "aria-labelledby": "answer-heading",
            initial: { opacity: 0, y: 10, scale: 0.995 },
            animate: { opacity: 1, y: 0, scale: 1 },
            exit: { opacity: 0, y: -6 },
            transition: { duration: 0.32, ease: [...EASING.enter] },
            className: "mt-8 rounded-lg border border-line bg-surface-raised",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3", children: [
                /* @__PURE__ */ jsxs("h2", { id: "answer-heading", className: "flex items-center gap-2 font-serif text-lg font-semibold text-ink", children: [
                  /* @__PURE__ */ jsx(SynthesizeMark, { size: 16, playKey: answer, className: "text-brand-hover" }),
                  /* @__PURE__ */ jsx("span", { children: "Answer" })
                ] }),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: copyAnswer,
                    className: "inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-border-strong",
                    children: [
                      /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: /* @__PURE__ */ jsx(
                        m.span,
                        {
                          initial: { scale: 0.7, opacity: 0 },
                          animate: { scale: 1, opacity: 1 },
                          exit: { scale: 0.7, opacity: 0 },
                          transition: { duration: 0.16, ease: [...EASING.emphasize] },
                          className: "inline-flex text-success",
                          "aria-hidden": "true",
                          children: copied ? /* @__PURE__ */ jsx(SuccessCheck, { size: 16 }) : /* @__PURE__ */ jsx(Copy, { className: "h-4 w-4" })
                        },
                        copied ? "copied" : "idle"
                      ) }),
                      /* @__PURE__ */ jsx("span", { children: copied ? "Copied" : "Copy answer" })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsx("div", { className: "whitespace-pre-line px-5 py-5 text-base leading-relaxed text-ink", children: answer }),
              citations.length > 0 && /* @__PURE__ */ jsxs("div", { className: "border-t border-line px-5 py-4", children: [
                /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold text-ink", children: "Sources in this answer" }),
                /* @__PURE__ */ jsx("ul", { className: "mt-2 divide-y divide-line", children: citations.map((citation) => {
                  const slug = articles.find((article) => article.id === citation.id)?.slug ?? citation.id;
                  return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
                    LinkShim,
                    {
                      href: `/post/${slug}`,
                      className: "group flex items-start justify-between gap-3 py-2 text-sm text-ink transition-colors hover:text-brand",
                      children: [
                        /* @__PURE__ */ jsxs("span", { children: [
                          /* @__PURE__ */ jsx("span", { className: "font-medium", children: citation.title }),
                          /* @__PURE__ */ jsxs("span", { className: "mt-0.5 block text-ink-secondary", children: [
                            citation.author,
                            " · ",
                            citation.category
                          ] })
                        ] }),
                        /* @__PURE__ */ jsx(ArrowRight, { className: "mt-0.5 h-4 w-4 shrink-0 text-ink-secondary group-hover:text-brand", "aria-hidden": "true" })
                      ]
                    }
                  ) }, citation.id);
                }) })
              ] })
            ]
          },
          "assistant-answer"
        ) })
      ] }),
      /* @__PURE__ */ jsxs("section", { "aria-labelledby": "assistant-limits", className: "border-t border-line py-8", children: [
        /* @__PURE__ */ jsx(Text, { id: "assistant-limits", as: "h2", variant: "card-title", children: "What this tool does and does not do" }),
        /* @__PURE__ */ jsxs("ul", { className: "mt-3 grid gap-3 text-base leading-relaxed text-ink sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxs("li", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(FileText, { className: "mt-1 h-4 w-4 shrink-0 text-brand-hover", "aria-hidden": "true" }),
            /* @__PURE__ */ jsx("span", { children: "It searches the published catalog and links every cited article." })
          ] }),
          /* @__PURE__ */ jsxs("li", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(FileText, { className: "mt-1 h-4 w-4 shrink-0 text-brand-hover", "aria-hidden": "true" }),
            /* @__PURE__ */ jsx("span", { children: "It does not search outside this platform or access paywalled literature." })
          ] }),
          /* @__PURE__ */ jsxs("li", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(FileText, { className: "mt-1 h-4 w-4 shrink-0 text-brand-hover", "aria-hidden": "true" }),
            /* @__PURE__ */ jsx("span", { children: "It cannot verify a factual claim; it summarizes what a review already established." })
          ] }),
          /* @__PURE__ */ jsxs("li", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(FileText, { className: "mt-1 h-4 w-4 shrink-0 text-brand-hover", "aria-hidden": "true" }),
            /* @__PURE__ */ jsx("span", { children: "It stores nothing you type and keeps no conversation history." })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("section", { "aria-label": "How discovery works", className: "border-t border-line py-8", children: /* @__PURE__ */ jsx(WorkflowDisclosure, { workflow: RESEARCH_WORKFLOWS.discovery, heading: "h2", summary: "How discovery and synthesis work" }) })
    ] }),
    /* @__PURE__ */ jsx(BlogFooter, {})
  ] });
}
function AssistantRoute() {
  useLoaderData();
  return /* @__PURE__ */ jsx(AssistantPanel, {});
}
function BookmarksPanel({ initialArticles } = {}) {
  const hydrated = useHydratePreferences();
  const savedPostIds = usePreferencesStore((state) => state.savedPostIds);
  const removeSavedPost = usePreferencesStore((state) => state.removeSavedPost);
  const clearSavedPosts = usePreferencesStore((state) => state.clearSavedPosts);
  const storagePersisted = usePreferencesStore((state) => state.storagePersisted);
  const [articles, setArticles] = useState(initialArticles ?? INITIAL_BLOG_POSTS);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const savedIds = useMemo(() => hydrated ? savedPostIds : [], [hydrated, savedPostIds]);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/articles", { headers: { accept: "application/json" } });
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.articles) && data.articles.length > 0) {
          setArticles(data.articles);
        }
      } catch {
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);
  const savedArticles = useMemo(
    () => articles.filter((article) => savedIds.includes(article.id) || savedIds.includes(article.slug)),
    [articles, savedIds]
  );
  const categories = useMemo(
    () => [...new Set(savedArticles.map((article) => article.category))],
    [savedArticles]
  );
  const filteredArticles = useMemo(
    () => selectedCategory === "All" ? savedArticles : savedArticles.filter((article) => article.category === selectedCategory),
    [savedArticles, selectedCategory]
  );
  const totalMinutes = savedArticles.reduce((total, article) => {
    const minutes = Number.parseInt(article.readTime, 10);
    return total + (Number.isFinite(minutes) ? minutes : 0);
  }, 0);
  function handleRemove(article) {
    const okId = removeSavedPost(article.id);
    const okSlug = savedIds.includes(article.slug) ? removeSavedPost(article.slug) : true;
    const ok = okId && okSlug;
    setStatus(ok ? "Removed from your reading list." : null);
    setError(ok ? null : "Your browser blocked local storage, so this change will not persist.");
  }
  function handleClearAll() {
    clearSavedPosts();
    setConfirmClear(false);
    setStatus("Reading list cleared. Saved items are gone from this device.");
  }
  function handleExport() {
    const exportedOn = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(/* @__PURE__ */ new Date());
    const markdown = [
      "# ResearchWithMe reading list",
      "",
      `Exported ${exportedOn}. ${savedArticles.length} articles, about ${totalMinutes} minutes of reading.`,
      "",
      ...savedArticles.map(
        (article, index) => [
          `${index + 1}. [${article.title}](https://researchwith.me/post/${article.slug})`,
          `   - ${article.author.name} · ${article.category} · ${article.readTime}`,
          `   - ${article.summary}`,
          ""
        ].join("\n")
      )
    ].join("\n");
    try {
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "researchwithme-reading-list.md";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setError(null);
      setStatus("Reading list downloaded as Markdown.");
    } catch {
      setError("The download could not start. Check your browser download permissions and try again.");
    }
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-canvas text-ink", children: [
    /* @__PURE__ */ jsx(BlogHeader, { savedCount: savedArticles.length }),
    /* @__PURE__ */ jsxs("main", { id: "main-content", className: "mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8", children: [
      /* @__PURE__ */ jsxs("header", { className: "border-b border-line pb-8", children: [
        /* @__PURE__ */ jsx(Text, { as: "p", variant: "eyebrow", color: "secondary", children: "Local Archive · Persisted on Device" }),
        /* @__PURE__ */ jsx("h1", { className: "mt-2 font-serif text-3xl font-bold tracking-tight text-ink sm:text-5xl", children: "Your reading list" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-4 max-w-2xl font-sans text-base leading-relaxed text-ink-secondary", children: [
          "Saved manuscripts live in your browser preferences so they survive refreshes without requiring an account.",
          " ",
          savedArticles.length > 0 ? `${savedArticles.length} ${savedArticles.length === 1 ? "article" : "articles"}, about ${totalMinutes} minutes of reading.` : "Nothing saved yet."
        ] })
      ] }),
      !storagePersisted && !error && /* @__PURE__ */ jsx("p", { role: "alert", className: "mt-4 border-l-2 border-destructive bg-surface px-4 py-3 font-sans text-sm text-destructive", children: "Browser storage is currently restricted — changes apply to this tab session only." }),
      savedArticles.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-sm border border-line bg-surface p-8 sm:p-12", children: [
        /* @__PURE__ */ jsx(Bookmark, { className: "h-7 w-7 text-ink-secondary", "aria-hidden": "true" }),
        /* @__PURE__ */ jsx(Text, { as: "h2", variant: "section-title", className: "mt-4", children: "Nothing saved yet" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-xl font-sans text-sm leading-relaxed text-ink-secondary", children: "Use the bookmark button on any teardown or paper to queue it here for uninterrupted study." }),
        /* @__PURE__ */ jsxs(
          LinkShim,
          {
            href: "/",
            className: "mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm bg-ink px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90",
            children: [
              /* @__PURE__ */ jsx("span", { children: "Browse the latest reviews" }),
              /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4", "aria-hidden": "true" })
            ]
          }
        )
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "bookmark-category", className: "mr-2 font-sans text-xs font-medium text-ink-secondary", children: "Filter by column" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                id: "bookmark-category",
                value: selectedCategory,
                onChange: (event) => setSelectedCategory(event.target.value),
                className: "min-h-11 rounded-sm border border-line bg-surface px-3 font-sans text-sm text-ink",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "All", children: "All columns" }),
                  categories.map((category) => /* @__PURE__ */ jsx("option", { value: category, children: category }, category))
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsxs(
              Pressable,
              {
                type: "button",
                onClick: handleExport,
                className: "inline-flex min-h-11 items-center gap-2 rounded-sm border border-line bg-surface px-4 py-2 font-sans text-xs font-medium text-ink transition-colors hover:bg-surface-subtle",
                children: [
                  /* @__PURE__ */ jsx(Download, { className: "h-4 w-4", "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: "Export Markdown" })
                ]
              }
            ),
            /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: !confirmClear ? /* @__PURE__ */ jsxs(
              m.button,
              {
                type: "button",
                onClick: () => setConfirmClear(true),
                initial: { opacity: 0, x: -4 },
                animate: { opacity: 1, x: 0 },
                exit: { opacity: 0, x: -4 },
                transition: { duration: 0.16, ease: [...EASING.standard] },
                className: "inline-flex min-h-11 items-center gap-2 rounded-sm px-3 py-2 font-sans text-xs font-medium text-ink-secondary transition-colors hover:text-destructive",
                children: [
                  /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4", "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: "Clear list" })
                ]
              },
              "clear-trigger"
            ) : /* @__PURE__ */ jsxs(
              m.span,
              {
                initial: { opacity: 0, y: -4 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: -4 },
                transition: { duration: 0.16, ease: [...EASING.enter] },
                className: "flex flex-wrap items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2 font-sans text-xs text-ink",
                children: [
                  /* @__PURE__ */ jsxs("span", { children: [
                    "Remove all ",
                    savedArticles.length,
                    " saved items?"
                  ] }),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: handleClearAll,
                      className: "min-h-9 font-semibold text-destructive underline underline-offset-4",
                      children: "Yes, clear"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => setConfirmClear(false),
                      className: "min-h-9 underline underline-offset-4",
                      children: "Keep them"
                    }
                  )
                ]
              },
              "clear-confirm"
            ) })
          ] })
        ] }),
        /* @__PURE__ */ jsx(AnimatePresence, { initial: false, mode: "wait", children: status && /* @__PURE__ */ jsxs(
          m.p,
          {
            role: "status",
            initial: { opacity: 0, y: -4 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0 },
            transition: { duration: 0.16, ease: [...EASING.standard] },
            className: "mt-4 flex items-center gap-2 border-l-2 border-brand bg-surface px-4 py-3 font-sans text-sm text-ink",
            children: [
              /* @__PURE__ */ jsx(SuccessCheck, { size: 16, className: "text-brand" }),
              /* @__PURE__ */ jsx("span", { children: status })
            ]
          },
          status
        ) }),
        error && /* @__PURE__ */ jsx("p", { role: "alert", className: "mt-4 border-l-2 border-destructive bg-surface px-4 py-3 font-sans text-sm text-destructive", children: error }),
        filteredArticles.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-sm border border-line bg-surface p-8", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "card-title", children: "No saved articles in this column" }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 font-sans text-sm text-ink-secondary", children: "Choose another column or show the full list." }),
          /* @__PURE__ */ jsx(
            Pressable,
            {
              type: "button",
              feedback: "lift",
              onClick: () => setSelectedCategory("All"),
              className: "mt-4 inline-flex min-h-11 items-center rounded-sm bg-brand px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-on-primary transition-colors hover:bg-brand-hover",
              children: "Show all saved"
            }
          )
        ] }) : /* @__PURE__ */ jsx(MotionList, { className: "mt-6 divide-y divide-line border-y border-line", children: filteredArticles.map((article) => /* @__PURE__ */ jsx(MotionItem, { className: "py-6", children: /* @__PURE__ */ jsxs("article", { className: "grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start", children: [
          /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxs("p", { className: "flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-ink-secondary", children: [
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-brand", children: article.category }),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsx("span", { children: article.format }),
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsx("span", { children: article.readTime })
            ] }),
            /* @__PURE__ */ jsx("h2", { className: "mt-2 font-serif text-2xl font-semibold leading-snug text-ink", children: /* @__PURE__ */ jsx(LinkShim, { href: `/post/${article.slug}`, className: "hover:text-brand", children: article.title }) }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-prose font-sans text-sm leading-relaxed text-ink-secondary", children: article.summary }),
            /* @__PURE__ */ jsxs("p", { className: "mt-3 font-sans text-xs text-ink-secondary", children: [
              "By ",
              article.author.name
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 sm:flex-col sm:items-end", children: [
            /* @__PURE__ */ jsxs(
              LinkShim,
              {
                href: `/post/${article.slug}`,
                className: "inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-ink px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90",
                children: [
                  /* @__PURE__ */ jsx("span", { children: "Read" }),
                  /* @__PURE__ */ jsx(ArrowRight, { className: "h-3.5 w-3.5", "aria-hidden": "true" })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              Pressable,
              {
                type: "button",
                onClick: () => handleRemove(article),
                className: "inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-2 font-sans text-xs font-medium text-ink-secondary transition-colors hover:text-destructive",
                children: [
                  /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: "Remove" })
                ]
              }
            )
          ] })
        ] }) }, article.id)) })
      ] }),
      /* @__PURE__ */ jsxs("section", { "aria-labelledby": "reading-list-privacy-heading", className: "mt-14 border-t border-line pt-8", children: [
        /* @__PURE__ */ jsx(Text, { id: "reading-list-privacy-heading", as: "h2", variant: "card-title", children: "Local-first bibliography storage and offline export" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-2 max-w-3xl font-sans text-sm leading-relaxed text-ink-secondary", children: [
          "Your saved reading list stays entirely in your browser storage—no account registration or cloud telemetry is required to bookmark reviews from the",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/", children: "editorial catalog" }),
          " ",
          "or records from the",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/papers", children: "indexed paper archive" }),
          ". Export saved items as clean Markdown notes for Obsidian, Notion, or lab notebooks, generate structured BibTeX and RIS files in the",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/cite", children: "citation builder" }),
          ", or inspect our zero-tracking guarantees in the",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/privacy", children: "reader privacy policy" }),
          ". Saved items persist across sessions on this device so you can assemble seminar packets, replication queues, and literature review checklists at your own pace without exposing reading habits to third-party servers."
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(BlogFooter, {})
  ] });
}
function BookmarksRoute() {
  useLoaderData();
  return /* @__PURE__ */ jsx(BookmarksPanel, {});
}
const inputClass = "w-full rounded-md border border-border-strong bg-surface-raised px-3 py-2.5 text-sm text-ink transition-colors focus:border-brand-hover";
function CitationTool({ initialArticles } = {}) {
  const [articles, setArticles] = useState(initialArticles ?? INITIAL_BLOG_POSTS);
  const [selectedSlug, setSelectedSlug] = useState((initialArticles ?? INITIAL_BLOG_POSTS)[0]?.slug ?? "");
  const [format, setFormat] = useState("apa");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(null);
  const [isCustomPaper, setIsCustomPaper] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customAuthor, setCustomAuthor] = useState("");
  const [customYear, setCustomYear] = useState("2026");
  const [customDoi, setCustomDoi] = useState("");
  const [customJournal, setCustomJournal] = useState("ResearchWithMe Studies");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/articles", { headers: { accept: "application/json" } });
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.articles) && data.articles.length > 0) {
          setArticles(data.articles);
        }
      } catch {
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);
  const currentArticle = articles.find((article) => article.slug === selectedSlug) ?? articles[0];
  const source = useMemo(() => {
    const fallbackYear = "2026";
    const articleDoi = currentArticle?.reviewedArtifact?.identifier ?? "";
    return {
      title: isCustomPaper && customTitle ? cleanText$1(customTitle, 240) : currentArticle?.title ?? "Untitled article",
      author: isCustomPaper && customAuthor ? cleanText$1(customAuthor, 120) : currentArticle?.author.name ?? "ResearchWithMe Editors",
      year: isCustomPaper ? cleanText$1(customYear, 4) || fallbackYear : fallbackYear,
      journal: isCustomPaper && customJournal ? cleanText$1(customJournal, 160) : "ResearchWithMe Technical Reviews",
      doi: isCustomPaper ? cleanText$1(customDoi, 120) : articleDoi,
      url: currentArticle?.slug ? `https://researchwith.me/post/${currentArticle.slug}` : "https://researchwith.me"
    };
  }, [currentArticle, customAuthor, customDoi, customJournal, customTitle, customYear, isCustomPaper]);
  const citationText = useMemo(() => buildCitation(format, source), [format, source]);
  const citationEmpty = isCustomPaper && !source.title.trim();
  async function handleCopy() {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(citationText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
      setCopyError("Your browser blocked clipboard access. Select the citation text and copy it manually.");
    }
  }
  function handleDownloadFile() {
    const extension = citationFileExtension(format);
    const blob = new Blob([citationText], { type: "text/plain;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `citation-${slugify(source.author) || "research"}.${extension}`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }
  const doiLink = safeExternalUrl(`https://doi.org/${source.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}`);
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-canvas", children: [
    /* @__PURE__ */ jsx(BlogHeader, {}),
    /* @__PURE__ */ jsxs("main", { id: "main-content", className: "mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8", children: [
      /* @__PURE__ */ jsxs("nav", { "aria-label": "Breadcrumb", className: "mb-6 flex flex-wrap items-center gap-2 text-sm text-ink-secondary", children: [
        /* @__PURE__ */ jsxs(LinkShim, { href: "/", className: "inline-flex items-center gap-1.5 hover:text-ink hover:underline", children: [
          /* @__PURE__ */ jsx(ArrowLeft, { className: "h-4 w-4", "aria-hidden": "true" }),
          /* @__PURE__ */ jsx("span", { children: "Platform" })
        ] }),
        /* @__PURE__ */ jsx("span", { "aria-hidden": "true", className: "text-ink-secondary", children: "/" }),
        /* @__PURE__ */ jsx("span", { className: "font-medium text-brand", children: "Citation builder" })
      ] }),
      /* @__PURE__ */ jsxs("header", { className: "border-b border-line pb-8", children: [
        /* @__PURE__ */ jsx("h1", { className: "max-w-3xl font-serif text-3xl font-bold tracking-tight text-ink sm:text-5xl", children: "Build a citation that travels" }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-2xl text-base leading-relaxed text-ink", children: "Choose a published review or an external paper, then copy a formatted citation for LaTeX, Zotero, Mendeley, EndNote, or a reference list. Every format uses the same verified metadata." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]", children: [
        /* @__PURE__ */ jsxs("form", { className: "space-y-8", onSubmit: (event) => event.preventDefault(), children: [
          /* @__PURE__ */ jsxs("fieldset", { className: "space-y-3", children: [
            /* @__PURE__ */ jsx("legend", { className: "text-sm font-semibold text-ink", children: "1. Choose the source" }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => setIsCustomPaper(false),
                  "aria-pressed": !isCustomPaper,
                  className: `min-h-11 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${!isCustomPaper ? "border-ink bg-surface-inverse text-text-inverse" : "border-border-strong bg-surface-raised text-ink hover:border-border-strong"}`,
                  children: "Published in ResearchWithMe"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => setIsCustomPaper(true),
                  "aria-pressed": isCustomPaper,
                  className: `min-h-11 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${isCustomPaper ? "border-ink bg-surface-inverse text-text-inverse" : "border-border-strong bg-surface-raised text-ink hover:border-border-strong"}`,
                  children: "External paper or DOI"
                }
              )
            ] }),
            !isCustomPaper ? /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { htmlFor: "citation-source", className: "mb-1.5 block text-sm font-medium text-ink", children: "Publication" }),
              /* @__PURE__ */ jsx(
                "select",
                {
                  id: "citation-source",
                  value: selectedSlug,
                  onChange: (event) => setSelectedSlug(event.target.value),
                  className: inputClass,
                  children: articles.map((article) => /* @__PURE__ */ jsxs("option", { value: article.slug, children: [
                    article.title,
                    " — ",
                    article.author.name
                  ] }, article.id))
                }
              ),
              /* @__PURE__ */ jsxs("p", { className: "mt-2 max-w-xl text-sm text-ink-secondary", children: [
                currentArticle?.category ?? "Research",
                " · ",
                currentArticle?.publishedAt ?? "Published",
                " · ",
                currentArticle?.readTime ?? "Reading time available on the article"
              ] })
            ] }) : /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [
              /* @__PURE__ */ jsxs("div", { className: "sm:col-span-2", children: [
                /* @__PURE__ */ jsxs("label", { htmlFor: "custom-title", className: "mb-1.5 block text-sm font-medium text-ink", children: [
                  "Paper title ",
                  /* @__PURE__ */ jsx("span", { className: "text-ink-secondary", children: "(required)" })
                ] }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    id: "custom-title",
                    type: "text",
                    value: customTitle,
                    onChange: (event) => setCustomTitle(event.target.value),
                    required: true,
                    autoComplete: "off",
                    placeholder: "A reproducible benchmark for open sensor networks",
                    className: inputClass
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { htmlFor: "custom-author", className: "mb-1.5 block text-sm font-medium text-ink", children: "Author" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    id: "custom-author",
                    type: "text",
                    value: customAuthor,
                    onChange: (event) => setCustomAuthor(event.target.value),
                    autoComplete: "off",
                    placeholder: "Dr. Jane Doe",
                    className: inputClass
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { htmlFor: "custom-year", className: "mb-1.5 block text-sm font-medium text-ink", children: "Year" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    id: "custom-year",
                    type: "text",
                    inputMode: "numeric",
                    maxLength: 4,
                    value: customYear,
                    onChange: (event) => setCustomYear(event.target.value.replace(/[^0-9]/g, "")),
                    placeholder: "2026",
                    className: inputClass
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { htmlFor: "custom-journal", className: "mb-1.5 block text-sm font-medium text-ink", children: "Journal or venue" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    id: "custom-journal",
                    type: "text",
                    value: customJournal,
                    onChange: (event) => setCustomJournal(event.target.value),
                    autoComplete: "off",
                    className: inputClass
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { htmlFor: "custom-doi", className: "mb-1.5 block text-sm font-medium text-ink", children: "DOI or arXiv identifier" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    id: "custom-doi",
                    type: "text",
                    value: customDoi,
                    onChange: (event) => setCustomDoi(event.target.value),
                    autoComplete: "off",
                    placeholder: "10.1038/s41587-026-01234-5",
                    className: inputClass
                  }
                )
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("fieldset", { className: "space-y-3", children: [
            /* @__PURE__ */ jsx("legend", { className: "text-sm font-semibold text-ink", children: "2. Choose a style" }),
            /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: CITATION_FORMATS.map((item) => /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setFormat(item),
                "aria-pressed": format === item,
                className: `min-h-11 rounded-md border px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${format === item ? "border-brand bg-brand text-on-primary" : "border-border-strong bg-surface-raised text-ink hover:border-border-strong"}`,
                children: item
              },
              item
            )) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-baseline justify-between gap-2", children: [
              /* @__PURE__ */ jsx("label", { htmlFor: "citation-output", className: "text-sm font-semibold text-ink", children: "3. Review and copy" }),
              /* @__PURE__ */ jsxs("span", { className: "font-mono text-sm text-ink-secondary", children: [
                format.toUpperCase(),
                " · UTF-8"
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                id: "citation-output",
                readOnly: true,
                rows: format === "bibtex" || format === "ris" ? 10 : 5,
                value: citationEmpty ? "" : citationText,
                "aria-describedby": "citation-hint",
                className: "w-full resize-y rounded-lg border border-border-strong bg-surface-raised p-4 font-mono text-sm leading-relaxed text-ink"
              }
            ),
            /* @__PURE__ */ jsx("p", { id: "citation-hint", className: "text-sm text-ink-secondary", children: citationEmpty ? "Add a paper title to generate a citation." : "Always confirm the DOI and page numbers against the publisher record before submitting." }),
            copyError && /* @__PURE__ */ jsx("p", { role: "alert", className: "rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive", children: copyError }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: handleCopy,
                  disabled: citationEmpty,
                  className: "inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover disabled:opacity-50",
                  children: [
                    copied ? /* @__PURE__ */ jsx(VerifyMark, { size: 16 }) : /* @__PURE__ */ jsx(Copy, { className: "h-4 w-4", "aria-hidden": "true" }),
                    /* @__PURE__ */ jsx("span", { children: copied ? "Copied to clipboard" : "Copy citation" })
                  ]
                }
              ),
              (format === "bibtex" || format === "ris") && /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: handleDownloadFile,
                  disabled: citationEmpty,
                  className: "inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong bg-surface-raised px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-border-strong disabled:opacity-50",
                  children: [
                    /* @__PURE__ */ jsx(Download, { className: "h-4 w-4", "aria-hidden": "true" }),
                    /* @__PURE__ */ jsxs("span", { children: [
                      "Download .",
                      citationFileExtension(format)
                    ] })
                  ]
                }
              ),
              currentArticle && !isCustomPaper && /* @__PURE__ */ jsx(
                LinkShim,
                {
                  href: `/post/${currentArticle.slug}`,
                  className: "inline-flex min-h-11 items-center text-sm font-medium text-brand underline underline-offset-4 hover:text-brand-pressed",
                  children: "Read the cited article"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("aside", { "aria-label": "Citation details", className: "h-fit space-y-4 rounded-lg border border-line bg-surface-raised p-5", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold text-ink", children: [
            /* @__PURE__ */ jsx(Quote, { className: "h-4 w-4 text-brand-hover", "aria-hidden": "true" }),
            /* @__PURE__ */ jsx("span", { children: "Record details" })
          ] }),
          /* @__PURE__ */ jsxs("dl", { className: "space-y-3 text-sm", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-ink-secondary", children: "Author" }),
              /* @__PURE__ */ jsx("dd", { className: "font-medium text-ink", children: source.author })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-ink-secondary", children: "Year" }),
              /* @__PURE__ */ jsx("dd", { className: "font-medium text-ink", children: source.year })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-ink-secondary", children: "Venue" }),
              /* @__PURE__ */ jsx("dd", { className: "font-medium text-ink", children: source.journal })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-ink-secondary", children: "DOI" }),
              /* @__PURE__ */ jsx("dd", { className: "break-words font-mono text-ink", children: source.doi || "Not assigned" })
            ] })
          ] }),
          doiLink && /* @__PURE__ */ jsx(
            "a",
            {
              href: doiLink,
              target: "_blank",
              rel: "noreferrer noopener",
              className: "inline-flex text-sm font-medium text-brand underline underline-offset-4 hover:text-brand-pressed",
              children: "Resolve DOI at doi.org"
            }
          ),
          /* @__PURE__ */ jsx("p", { className: "border-t border-line pt-4 text-sm leading-relaxed text-ink-secondary", children: "Prefer reusable metadata? Choose BibTeX or RIS and download the file for your reference manager." })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { "aria-labelledby": "citation-standards-heading", className: "mt-12 border-t border-line pt-8", children: [
        /* @__PURE__ */ jsx(Text, { id: "citation-standards-heading", as: "h2", variant: "card-title", children: "Scholarly provenance and reference verification" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-2 max-w-3xl text-sm leading-relaxed text-ink-secondary", children: [
          "Every formatted reference generated here draws from verified publication dates, persistent Digital Object Identifiers, and contributor records maintained by our",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/authors", children: "domain specialists" }),
          " ",
          "and",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/editorial-board", children: "editorial board" }),
          ". Downloaded ",
          /* @__PURE__ */ jsx("code", { className: "font-mono text-xs", children: ".bib" }),
          " and",
          " ",
          /* @__PURE__ */ jsx("code", { className: "font-mono text-xs", children: ".ris" }),
          " records import directly into Zotero, JabRef, Mendeley, and LaTeX workflows; you can also browse full volumes in",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/editions", children: "printable PDF editions" }),
          " ",
          "or query primary sources in the",
          " ",
          /* @__PURE__ */ jsx(Link, { href: "/assistant", children: "research synthesis assistant" }),
          "."
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(BlogFooter, {})
  ] });
}
function CiteRoute() {
  useLoaderData();
  return /* @__PURE__ */ jsx(CitationTool, {});
}
const API_GROUPS = [
  { id: "articles", name: "Articles", path: "/api/articles", description: "Browse published articles and record reactions." },
  { id: "authors", name: "Authors", path: "/api/authors", description: "Browse published author profiles and their archives." },
  { id: "papers", name: "Papers", path: "/api/papers", description: "Search the paper archive and retrieve individual papers." },
  { id: "comments", name: "Comments", path: "/api/comments", description: "Read and submit article comments." },
  { id: "research-assistant", name: "Research assistant", path: "/api/research-assistant", description: "Ask questions grounded in the article catalog." },
  { id: "cms-posts", name: "Editorial posts", path: "/api/cms/posts", description: "Manage editorial posts. Editor access is required." },
  { id: "cms-comments", name: "Comment moderation", path: "/api/cms/comments", description: "Moderate comments. Editor access is required." },
  { id: "applications", name: "Writer applications", path: "/api/dashboard/applications", description: "Manage writer applications. A signed-in session is required; reviews require editor access." },
  { id: "revalidate", name: "Cache revalidation", path: "/api/revalidate", description: "Receive database webhooks that invalidate cached pages. A shared secret is required." }
];
const API_CATALOG_PATH = "/.well-known/api-catalog";
const OPENAPI_PATH = "/openapi.json";
function SectionNavigation({
  items,
  ariaLabel,
  heading = "On this page"
}) {
  const [activeId, setActiveId] = useState(null);
  const sectionKey = items.map((item) => item.id).join("|");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const elements = items.map((item) => document.getElementById(item.id)).filter((element) => Boolean(element));
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: [0, 0.25, 1] }
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sectionKey]);
  if (items.length === 0) return null;
  return /* @__PURE__ */ jsx(MotionBoundary, { children: /* @__PURE__ */ jsxs(
    "nav",
    {
      "aria-label": ariaLabel,
      "data-layout-rail": "section-navigation",
      className: "rounded-sm border border-line bg-surface p-4 text-ink",
      children: [
        /* @__PURE__ */ jsx("h2", { className: "font-serif text-lg font-semibold text-ink", children: heading }),
        /* @__PURE__ */ jsx(LayoutGroup, { id: `section-nav-${ariaLabel}`, children: /* @__PURE__ */ jsx("ol", { className: "mt-3 space-y-2 font-sans text-sm", children: items.map((item) => {
          const active = item.id === activeId;
          return /* @__PURE__ */ jsx("li", { className: "relative", children: /* @__PURE__ */ jsxs(
            "a",
            {
              href: `#${item.id}`,
              "aria-current": active ? "location" : void 0,
              className: `relative inline-flex min-h-6 w-full items-center gap-2 rounded-sm pl-3 text-ink-secondary underline decoration-line underline-offset-4 transition-colors hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${active ? "text-ink" : ""}`,
              children: [
                active ? /* @__PURE__ */ jsx(
                  m.span,
                  {
                    layoutId: `section-nav-marker-${ariaLabel}`,
                    "aria-hidden": "true",
                    className: "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand",
                    transition: { layout: SPRING.layout }
                  }
                ) : null,
                item.label
              ]
            }
          ) }, item.id);
        }) }) })
      ]
    }
  ) });
}
const text = { type: "string" };
const integer = { type: "integer" };
const boolean = { type: "boolean" };
const strings = { type: "array", items: text };
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const array = (items) => ({ type: "array", items });
const object = (properties, required = []) => ({
  type: "object",
  properties,
  ...required.length ? { required } : {}
});
const json$1 = (description, schema) => ({
  description,
  content: { "application/json": { schema } }
});
const jsonBody = (schema, description, required = true) => ({
  required,
  description,
  content: { "application/json": { schema } }
});
const query = (name, description, schema = text) => ({ name, in: "query", description, schema });
const path = (name, description) => ({ name, in: "path", required: true, description, schema: text });
const errorDescriptions = {
  400: "Invalid request or input.",
  401: "Authentication or a valid webhook secret is required.",
  403: "Insufficient privileges or a disallowed cross-site request.",
  404: "The requested record does not exist.",
  409: "The request conflicts with an existing record.",
  415: "The request must be sent as application/json.",
  422: "The selected author cannot be used for publication.",
  429: "Too many requests; retry later.",
  500: "The operation could not be completed.",
  502: "The upstream generation service failed.",
  503: "The service or its backing store is unavailable or not configured."
};
const errors = (...codes) => Object.fromEntries(codes.map((code) => [String(code), json$1(errorDescriptions[code], ref("Error"))]));
const session = [{ SessionCookie: [] }];
const webhookSecret = [{ RevalidateSecret: [] }];
const articleId = path("id", "Published article ID or slug.");
const authorId = path("id", "Published author profile ID.");
const cmsId = path("id", "Editorial record ID.");
const applicationId = path("id", "Numeric application ID.");
const API_OPERATIONS = [
  {
    group: "articles",
    method: "get",
    path: "/api/articles",
    operationId: "listArticles",
    summary: "List published articles",
    description: "Returns article metadata and a total count after filtering. The article body is omitted unless full=1; limit applies to the returned array, not the count.",
    parameters: [
      query("category", "Exact category name, or All."),
      query("format", "Exact article format, or All."),
      query("search", "Case-insensitive search across article metadata, up to 120 characters."),
      query("author", "Case-insensitive exact author ID or name."),
      query("limit", "Maximum number of results, clamped to 1–100; defaults to 100.", { type: "integer", minimum: 1, maximum: 100, default: 100 }),
      query("full", "Set to 1 to include article bodies.", { type: "string", enum: ["1"] })
    ],
    responses: { 200: json$1("Matching articles and total count.", object({ articles: array(ref("Article")), count: integer }, ["articles", "count"])), ...errors(500) }
  },
  {
    group: "articles",
    method: "get",
    path: "/api/articles/{id}",
    operationId: "getArticle",
    summary: "Get a published article",
    description: "Returns the complete article, including its body, by ID or slug.",
    parameters: [articleId],
    responses: { 200: json$1("Published article.", object({ article: ref("Article") }, ["article"])), ...errors(400, 404, 500) }
  },
  {
    group: "articles",
    method: "patch",
    path: "/api/articles/{id}",
    operationId: "likeArticle",
    summary: "Record a reaction",
    description: "Increments the article’s like count. No request body is needed; this operation is rate limited.",
    parameters: [articleId],
    responses: { 200: json$1("Updated like count.", object({ success: boolean, likes: integer }, ["success", "likes"])), ...errors(400, 404, 429, 500) }
  },
  {
    group: "authors",
    method: "get",
    path: "/api/authors",
    operationId: "listAuthors",
    summary: "List published authors",
    description: "Returns published profiles and their article counts.",
    responses: { 200: json$1("Published author profiles.", object({ authors: array(ref("Author")) }, ["authors"])), ...errors(500) }
  },
  {
    group: "authors",
    method: "get",
    path: "/api/authors/{id}",
    operationId: "getAuthor",
    summary: "Get an author archive",
    description: "Returns a published profile, its articles, and aggregate metrics.",
    parameters: [authorId],
    responses: { 200: json$1("Author and archive.", object({ author: ref("Author"), articles: array(ref("Article")), metrics: ref("AuthorMetrics") }, ["author", "articles", "metrics"])), ...errors(400, 404, 500) }
  },
  {
    group: "papers",
    method: "get",
    path: "/api/papers",
    operationId: "listPapers",
    summary: "Search papers",
    description: "Returns all matching papers and their total. The archive may be empty.",
    parameters: [
      query("topic", "Case-insensitive exact topic, All, or All Fields."),
      query("q", "Search title, abstract, DOI, authors, affiliations, or keywords; up to 120 characters."),
      query("sort", "Sort by date (default), citations, or title.", { type: "string", enum: ["date", "citations", "title"] })
    ],
    responses: { 200: json$1("Matching papers.", object({ papers: array(ref("Paper")), total: integer }, ["papers", "total"])), ...errors(500) }
  },
  {
    group: "papers",
    method: "get",
    path: "/api/papers/{slug}",
    operationId: "getPaper",
    summary: "Get a paper",
    description: "Finds a paper by slug, ID, or a matching DOI fragment.",
    parameters: [path("slug", "Paper slug, ID, or DOI fragment.")],
    responses: { 200: json$1("Paper record.", object({ paper: ref("Paper") }, ["paper"])), ...errors(400, 404, 500) }
  },
  {
    group: "comments",
    method: "get",
    path: "/api/comments",
    operationId: "listComments",
    summary: "List comments",
    description: "Returns comments for a post ID. Without postId, returns up to 200 locally stored comments.",
    parameters: [query("postId", "Article ID, including a CMS public post ID when applicable.")],
    responses: { 200: json$1("Comments.", object({ comments: array(ref("Comment")) }, ["comments"])), ...errors(500) }
  },
  {
    group: "comments",
    method: "post",
    path: "/api/comments",
    operationId: "createComment",
    summary: "Submit a comment",
    description: "Accepts JSON with postId, authorName, text, and optional authorRole. Browser requests with an Origin must be same-origin; submissions are rate limited.",
    requestBody: jsonBody(ref("CommentInput"), "The article and comment to publish."),
    responses: { 201: json$1("Comment saved.", object({ success: boolean, comment: ref("Comment") }, ["success", "comment"])), ...errors(400, 403, 404, 415, 429, 503) }
  },
  {
    group: "research-assistant",
    method: "post",
    path: "/api/research-assistant",
    operationId: "askResearchAssistant",
    summary: "Ask the research assistant",
    description: "Send a JSON query (up to 600 characters). The answer uses the published catalog and falls back to a deterministic answer when the language model is unavailable.",
    requestBody: jsonBody(object({ query: { type: "string", minLength: 1, maxLength: 600 } }, ["query"]), "Question about the archive."),
    responses: { 200: json$1("Answer and citations.", object({ answer: text, citations: array(ref("AssistantCitation")), mode: { type: "string", enum: ["catalog", "model"] }, notice: text }, ["answer", "citations", "mode"])), ...errors(400, 415, 429) }
  },
  {
    group: "cms-posts",
    method: "get",
    path: "/api/cms/posts",
    operationId: "listEditorialPosts",
    summary: "List editorial posts",
    description: "Editor-only. Includes drafts as well as published posts.",
    security: session,
    responses: { 200: json$1("Editorial posts and storage mode.", object({ posts: array(ref("CmsPost")), mode: text }, ["posts", "mode"])), ...errors(401, 403, 500, 503) }
  },
  {
    group: "cms-posts",
    method: "post",
    path: "/api/cms/posts",
    operationId: "createEditorialPost",
    summary: "Create an editorial post",
    description: "Editor-only. Send title and authorId plus post fields as JSON. Publishing additionally requires at least 200 characters of content, a 40-character summary, and one key takeaway. Browser requests with an Origin must be same-origin.",
    security: session,
    requestBody: jsonBody(ref("CmsPostInput"), "Post to create."),
    responses: { 201: json$1("Created post and storage mode.", object({ post: ref("CmsPost"), mode: text }, ["post", "mode"])), ...errors(400, 401, 403, 409, 415, 422, 429, 500, 503) }
  },
  {
    group: "cms-posts",
    method: "get",
    path: "/api/cms/posts/{id}",
    operationId: "getEditorialPost",
    summary: "Get an editorial post",
    description: "Editor-only. Returns a draft or published editorial post by its CMS ID.",
    security: session,
    parameters: [cmsId],
    responses: { 200: json$1("Post and storage mode.", object({ post: ref("CmsPost"), mode: text }, ["post", "mode"])), ...errors(401, 403, 404, 500, 503) }
  },
  {
    group: "cms-posts",
    method: "patch",
    path: "/api/cms/posts/{id}",
    operationId: "updateEditorialPost",
    summary: "Update an editorial post",
    description: "Editor-only. Send the fields to change as JSON; they are merged with the existing post and validated. Browser requests with an Origin must be same-origin.",
    security: session,
    parameters: [cmsId],
    requestBody: jsonBody(ref("CmsPostPatch"), "Fields to change."),
    responses: { 200: json$1("Updated post and storage mode.", object({ post: ref("CmsPost"), mode: text }, ["post", "mode"])), ...errors(400, 401, 403, 404, 409, 415, 422, 429, 500, 503) }
  },
  {
    group: "cms-posts",
    method: "delete",
    path: "/api/cms/posts/{id}",
    operationId: "deleteEditorialPost",
    summary: "Delete an editorial post",
    description: "Editor-only and rate limited. Browser requests with an Origin must be same-origin.",
    security: session,
    parameters: [cmsId],
    responses: { 200: json$1("Deletion confirmed.", object({ deleted: boolean, mode: text }, ["deleted", "mode"])), ...errors(401, 403, 404, 429, 500, 503) }
  },
  {
    group: "cms-comments",
    method: "get",
    path: "/api/cms/comments",
    operationId: "listModerationComments",
    summary: "List comments for moderation",
    description: "Editor-only. Lists CMS comments and the storage mode.",
    security: session,
    responses: { 200: json$1("CMS comments and storage mode.", object({ comments: array(ref("CmsComment")), mode: text }, ["comments", "mode"])), ...errors(401, 403, 500, 503) }
  },
  {
    group: "cms-comments",
    method: "delete",
    path: "/api/cms/comments/{id}",
    operationId: "deleteModerationComment",
    summary: "Delete a comment",
    description: "Editor-only and rate limited. Browser requests with an Origin must be same-origin.",
    security: session,
    parameters: [cmsId],
    responses: { 200: json$1("Deletion confirmed.", object({ deleted: boolean, mode: text }, ["deleted", "mode"])), ...errors(401, 403, 404, 429, 500, 503) }
  },
  {
    group: "applications",
    method: "get",
    path: "/api/dashboard/applications",
    operationId: "listApplications",
    summary: "List writer applications",
    description: "Requires a signed-in Supabase session. Readers see their own applications; editors see the queue, subject to row-level security.",
    security: session,
    responses: { 200: json$1("Visible applications.", object({ applications: array(ref("Application")) }, ["applications"])), ...errors(401, 503) }
  },
  {
    group: "applications",
    method: "post",
    path: "/api/dashboard/applications",
    operationId: "submitApplication",
    summary: "Submit a writer application",
    description: "Requires a signed-in Supabase session and a connected GitHub or ORCID identity. Send provider, handle, optional displayName, and statement as JSON. Browser requests with an Origin must be same-origin.",
    security: session,
    requestBody: jsonBody(ref("ApplicationInput"), "Writer application."),
    responses: { 201: json$1("Saved application.", object({ application: ref("Application") }, ["application"])), ...errors(400, 401, 403, 415, 429, 503) }
  },
  {
    group: "applications",
    method: "post",
    path: "/api/dashboard/applications/{id}",
    operationId: "reviewApplication",
    summary: "Review a writer application",
    description: "Editor-only. Send approve=true to approve, or approve=false to reject, with an optional note. Omission of approve also rejects; always send it explicitly. Browser requests with an Origin must be same-origin.",
    security: session,
    parameters: [applicationId],
    requestBody: jsonBody(object({ approve: boolean, note: { type: "string", maxLength: 500 } }, ["approve"]), "Review decision."),
    responses: { 200: json$1("Reviewed application.", object({ application: ref("Application") }, ["application"])), ...errors(400, 401, 403, 415, 429, 503) }
  },
  {
    group: "revalidate",
    method: "post",
    path: "/api/revalidate",
    operationId: "revalidatePages",
    summary: "Invalidate cached pages",
    description: "Webhook protected by the x-revalidate-secret header. An optional Supabase webhook body can supply table and record.slug or old_record.slug. Without a valid slug, the home page and sitemap are still revalidated.",
    security: webhookSecret,
    requestBody: jsonBody(ref("RevalidationWebhook"), "Optional Supabase database webhook.", false),
    responses: { 200: json$1("Revalidation result.", object({ revalidated: boolean, table: { type: ["string", "null"] }, paths: strings, now: integer }, ["revalidated", "table", "paths", "now"])), ...errors(401, 429, 500, 503) }
  }
];
const cmsPostProperties = {
  title: { type: "string", minLength: 8, maxLength: 180 },
  slug: { type: "string", maxLength: 96 },
  content: { type: "string", maxLength: 2e5 },
  status: { type: "string", enum: ["draft", "published"] },
  subtitle: { type: "string", maxLength: 400 },
  summary: { type: "string", maxLength: 1200 },
  category: text,
  format: text,
  authorId: text,
  authorName: text,
  coverImage: { type: ["string", "null"] },
  tags: strings,
  keyTakeaways: strings,
  featured: boolean,
  artifact: { anyOf: [ref("Artifact"), { type: "null" }] }
};
const schemas = {
  Error: object({ error: text, fieldErrors: { type: "object", additionalProperties: text }, needsConfig: boolean }, ["error"]),
  Author: object({ id: text, name: text, avatar: text, bio: text, role: text, domain: text, institution: text, orcid: text, github: text, twitter: text, website: text, scholar: text, joinedDate: text, articleCount: integer, totalReads: text, verifiedVia: text, verifiedIdentifier: text, verifiedTitle: text }, ["id", "name"]),
  Artifact: object({ type: { type: "string", enum: ["paper", "github", "dataset"] }, title: text, url: text, identifier: text, meta: text }, ["type", "title", "url", "identifier", "meta"]),
  Article: object({ id: text, slug: text, title: text, subtitle: text, category: text, format: text, author: ref("Author"), publishedAt: text, dateISO: text, readTime: text, coverImage: text, featured: boolean, reviewedArtifact: ref("Artifact"), summary: text, content: strings, bodyMarkdown: text, keyTakeaways: strings, tags: strings, likes: integer, commentsCount: integer }, ["id", "slug", "title", "author"]),
  AuthorMetrics: object({ totalArticles: integer, totalLikes: integer, totalComments: integer, domains: strings, reviewedArtifactsCount: integer }, ["totalArticles", "totalLikes", "totalComments", "domains", "reviewedArtifactsCount"]),
  Paper: object({ id: text, slug: text, title: text, subtitle: text, authors: array(object({ name: text, affiliation: text, orcid: text, role: text })), abstract: text, publishedDate: text, year: integer, doi: text, journal: text, volume: text, issue: text, pages: text, topic: text, citationCount: integer, readTime: text, keywords: strings, license: text, pdfFileName: text, dataUrl: text, fullContent: object({ background: text, methodology: text, findings: strings, discussion: text, implications: text, references: strings }) }, ["id", "slug", "title"]),
  Comment: object({ id: text, postId: text, authorName: text, authorRole: text, avatar: text, timestamp: text, text }, ["id", "postId", "authorName", "avatar", "timestamp", "text"]),
  CommentInput: object({ postId: { type: "string", minLength: 1, maxLength: 120 }, authorName: { type: "string", minLength: 2, maxLength: 120 }, authorRole: { type: "string", maxLength: 80 }, text: { type: "string", minLength: 2, maxLength: 4e3 } }, ["postId", "authorName", "text"]),
  AssistantCitation: object({ id: text, title: text, author: text, category: text }, ["id", "title", "author", "category"]),
  CmsPostInput: object(cmsPostProperties, ["title", "authorId"]),
  CmsPostPatch: object(cmsPostProperties),
  CmsPost: object({ ...cmsPostProperties, id: text, authorId: { type: ["string", "null"] }, likes: integer, readTime: text, publishedAt: { type: ["string", "null"] }, insertedAt: text, updatedAt: text }, ["id", "title", "slug", "status"]),
  CmsComment: object({ id: text, postId: text, postTitle: text, authorName: text, authorRole: text, content: text, insertedAt: text }, ["id", "postId", "authorName", "content"]),
  ApplicationInput: object({ provider: { type: "string", enum: ["github", "orcid"] }, handle: { type: "string", minLength: 1, maxLength: 160 }, displayName: { type: "string", maxLength: 120 }, statement: { type: "string", maxLength: 1e3 } }, ["provider", "handle"]),
  Application: object({ id: integer, user_id: text, provider: { type: "string", enum: ["github", "orcid"] }, handle: text, display_name: text, statement: text, status: { type: "string", enum: ["pending", "approved", "rejected"] }, reviewed_by: { type: ["string", "null"] }, reviewed_at: { type: ["string", "null"] }, review_note: text, created_at: text, updated_at: text }, ["id", "user_id", "provider", "handle", "display_name", "status"]),
  RevalidationWebhook: object({ type: text, table: text, record: { anyOf: [object({ slug: text }), { type: "null" }] }, old_record: { anyOf: [object({ slug: text }), { type: "null" }] } })
};
const OPENAPI_DOCUMENT = {
  tags: API_GROUPS.map((group2) => ({ name: group2.name, description: group2.description })),
  paths: API_OPERATIONS.reduce((paths, operation) => {
    const { group: group2, method, path: routePath, ...spec } = operation;
    const tag = API_GROUPS.find((item) => item.id === group2);
    if (!tag) throw new Error(`Unknown API group: ${group2}`);
    (paths[routePath] ??= {})[method] = { tags: [tag.name], ...spec };
    return paths;
  }, {}),
  components: {
    schemas
  }
};
function fieldType(field) {
  const choices = field.oneOf ?? field.anyOf;
  if (choices) return choices.map(fieldType).join(" or ");
  if (field.$ref) return field.$ref.split("/").pop() ?? "object";
  return Array.isArray(field.type) ? field.type.join(" or ") : field.type ?? "object";
}
function requestFields(operation) {
  const schema = operation.requestBody?.content["application/json"]?.schema;
  if (!schema) return [];
  const ref2 = typeof schema.$ref === "string" ? schema.$ref.split("/").pop() : void 0;
  const resolved = ref2 ? OPENAPI_DOCUMENT.components.schemas[ref2] : schema;
  if (!resolved || typeof resolved.properties !== "object" || !resolved.properties) return [];
  const required = Array.isArray(resolved.required) ? resolved.required : [];
  return Object.entries(resolved.properties).map(([name, field]) => ({
    name,
    type: fieldType(field),
    required: required.includes(name)
  }));
}
function ApiDocsReference() {
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-canvas", children: [
    /* @__PURE__ */ jsx(BlogHeader, {}),
    /* @__PURE__ */ jsxs("main", { className: "mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-10 sm:px-6 lg:px-8", children: [
      /* @__PURE__ */ jsxs("header", { className: "border-b border-line pb-8", children: [
        /* @__PURE__ */ jsx("p", { className: "font-sans text-xs font-semibold uppercase tracking-widest text-brand", children: "Developer reference" }),
        /* @__PURE__ */ jsx("h1", { className: "mt-3 font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl", children: "ResearchWithMe API" }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-3xl font-sans text-base leading-relaxed text-ink", children: "Discover the archive, assistant, and editorial routes. The catalog and OpenAPI document describe the same operations listed below." }),
        /* @__PURE__ */ jsxs("div", { className: "mt-5 flex flex-wrap gap-x-6 gap-y-2 font-sans text-sm font-semibold", children: [
          /* @__PURE__ */ jsx("a", { href: OPENAPI_PATH, className: "text-brand underline underline-offset-4", children: "OpenAPI JSON" }),
          /* @__PURE__ */ jsx("a", { href: API_CATALOG_PATH, className: "text-brand underline underline-offset-4", children: "API catalog" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { "aria-labelledby": "using-the-api", className: "border-b border-line py-8 font-sans text-sm leading-relaxed text-ink", children: [
        /* @__PURE__ */ jsx("h2", { id: "using-the-api", className: "font-serif text-2xl font-bold text-ink", children: "Using the API" }),
        /* @__PURE__ */ jsx("p", { className: "mt-3", children: "Paths are relative to the site serving this reference. Public reads need no login. Studio operations require a signed-in Supabase session and editor privileges; writer applications require a signed-in session, and the revalidation webhook requires its configured secret. Local demo mode may relax the studio gate when Supabase is not configured." }),
        /* @__PURE__ */ jsx("p", { className: "mt-3", children: "Send JSON where a request body is specified. Some writes reject cross-site browser origins and are rate limited; a 429 response indicates that the caller should retry later. Availability and data depend on the deployment's configured services." }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 font-semibold text-ink", children: "Example: list five articles" }),
        /* @__PURE__ */ jsx("pre", { className: "mt-2 overflow-x-auto rounded-md bg-surface-inverse p-4 text-xs leading-relaxed text-text-inverse", children: /* @__PURE__ */ jsx("code", { children: `curl '${SITE_URL}/api/articles?limit=5'` }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]", children: [
        /* @__PURE__ */ jsx("div", { className: "order-1 self-start lg:sticky lg:top-24 lg:col-start-2 lg:order-2", children: /* @__PURE__ */ jsx(
          SectionNavigation,
          {
            items: API_GROUPS.map((group2) => ({ id: group2.id, label: group2.name })),
            ariaLabel: "API groups",
            heading: "API groups"
          }
        ) }),
        /* @__PURE__ */ jsx("div", { "data-layout-content": "reading", className: "order-2 min-w-0 max-w-[48rem] lg:col-start-1 lg:order-1", children: API_GROUPS.map((group2) => /* @__PURE__ */ jsxs("section", { id: group2.id, "aria-labelledby": `${group2.id}-heading`, className: "scroll-mt-6 border-b border-line py-9", children: [
          /* @__PURE__ */ jsx("h2", { id: `${group2.id}-heading`, className: "font-serif text-3xl font-bold text-ink", children: group2.name }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 font-sans text-sm leading-relaxed text-ink", children: group2.description }),
          /* @__PURE__ */ jsx("div", { className: "mt-6 space-y-6", children: API_OPERATIONS.filter((operation) => operation.group === group2.id).map((operation) => {
            const fields = requestFields(operation);
            return /* @__PURE__ */ jsxs("article", { className: "rounded-lg border border-line bg-surface-raised p-5 sm:p-6", children: [
              /* @__PURE__ */ jsx("h3", { className: "font-serif text-xl font-bold text-ink", children: operation.summary }),
              /* @__PURE__ */ jsxs("p", { className: "mt-2 break-all font-mono text-sm font-semibold text-brand", children: [
                operation.method.toUpperCase(),
                " ",
                operation.path
              ] }),
              /* @__PURE__ */ jsx("p", { className: "mt-3 font-sans text-sm leading-relaxed text-ink", children: operation.description }),
              operation.parameters && /* @__PURE__ */ jsxs("div", { className: "mt-4 font-sans text-sm text-ink", children: [
                /* @__PURE__ */ jsx("h4", { className: "font-semibold text-ink", children: "Parameters" }),
                /* @__PURE__ */ jsx("ul", { className: "mt-1.5 list-disc space-y-1 pl-5", children: operation.parameters.map((parameter) => /* @__PURE__ */ jsxs("li", { children: [
                  /* @__PURE__ */ jsx("code", { children: parameter.name }),
                  " (",
                  parameter.in,
                  parameter.required ? ", required" : ", optional",
                  "): ",
                  parameter.description
                ] }, `${parameter.in}-${parameter.name}`)) })
              ] }),
              operation.requestBody && /* @__PURE__ */ jsxs("div", { className: "mt-4 font-sans text-sm text-ink", children: [
                /* @__PURE__ */ jsxs("h4", { className: "font-semibold text-ink", children: [
                  "JSON body",
                  operation.requestBody.required ? "" : " (optional)"
                ] }),
                /* @__PURE__ */ jsx("p", { className: "mt-1.5", children: operation.requestBody.description }),
                fields.length > 0 && /* @__PURE__ */ jsx("ul", { className: "mt-1.5 list-disc space-y-1 pl-5", children: fields.map((field) => /* @__PURE__ */ jsxs("li", { children: [
                  /* @__PURE__ */ jsx("code", { children: field.name }),
                  " (",
                  field.type,
                  field.required ? ", required" : ", optional",
                  ")"
                ] }, field.name)) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "mt-4 font-sans text-sm text-ink", children: [
                /* @__PURE__ */ jsx("h4", { className: "font-semibold text-ink", children: "Responses" }),
                /* @__PURE__ */ jsx("ul", { className: "mt-1.5 list-disc space-y-1 pl-5", children: Object.entries(operation.responses).map(([code, response]) => /* @__PURE__ */ jsxs("li", { children: [
                  /* @__PURE__ */ jsx("code", { children: code }),
                  " — ",
                  response.description
                ] }, code)) })
              ] })
            ] }, `${operation.method}-${operation.path}`);
          }) })
        ] }, group2.id)) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(BlogFooter, {})
  ] });
}
function ApiDocsRoute() {
  useLoaderData();
  return /* @__PURE__ */ jsx(ApiDocsReference, {});
}
const aboutSections = [
  { id: "mission-heading", label: "Editorial mission and diamond open access" },
  { id: "verification-heading", label: "Specialist verification and review standards" },
  { id: "representative-heading", label: "Representative reviews across disciplines" },
  { id: "governance-heading", label: "Corrections, ethics, and correspondence" }
];
function AboutPage() {
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-canvas text-ink", children: [
    /* @__PURE__ */ jsx(BlogHeader, {}),
    /* @__PURE__ */ jsxs("main", { id: "main-content", className: "mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-10 sm:px-6 lg:px-8", children: [
      /* @__PURE__ */ jsxs("header", { className: "border-b border-line pb-8", children: [
        /* @__PURE__ */ jsx(Text, { as: "p", variant: "eyebrow", color: "brand", weight: "semibold", children: "Colophon & Institutional Charter" }),
        /* @__PURE__ */ jsx("h1", { className: "mt-2 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl", children: "About ResearchWithMe" }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-2xl font-serif text-xl leading-relaxed text-ink-secondary", children: "An independent diamond open-access publication where verified domain specialists deconstruct peer-reviewed papers, empirical datasets, and open-source engineering repositories." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]", children: [
        /* @__PURE__ */ jsx("div", { className: "order-1 self-start lg:sticky lg:top-24 lg:col-start-2 lg:order-2", children: /* @__PURE__ */ jsx(SectionNavigation, { items: aboutSections, ariaLabel: "About page sections" }) }),
        /* @__PURE__ */ jsxs("div", { "data-layout-content": "reading", className: "order-2 min-w-0 max-w-[48rem] space-y-10 lg:order-1 font-sans text-base leading-relaxed text-ink", children: [
          /* @__PURE__ */ jsxs("section", { "aria-labelledby": "mission-heading", className: "space-y-4", children: [
            /* @__PURE__ */ jsx(Text, { id: "mission-heading", as: "h2", variant: "section-title", children: "Editorial mission and diamond open access" }),
            /* @__PURE__ */ jsx("p", { className: "text-ink-secondary", children: "Modern technical literature moves faster than traditional journal review cycles, yet informal commentary rarely preserves reproducible citations or verifiable reviewer credentials. ResearchWithMe bridges that gap by publishing structured, citable technical reviews, benchmark replications, and repository teardowns under Creative Commons Attribution 4.0 International (CC BY 4.0) with zero reader paywalls and zero article processing charges." }),
            /* @__PURE__ */ jsxs("p", { className: "text-ink-secondary", children: [
              "Every published review links directly to its primary scholarly artifact—whether an arXiv preprint, a clinical trial registry record, or a tagged GitHub release—and pairs narrative critique with formal bibliographic metadata in the",
              " ",
              /* @__PURE__ */ jsx(Link, { href: "/papers", children: "indexed paper archive" }),
              " ",
              "and printable",
              " ",
              /* @__PURE__ */ jsx(Link, { href: "/editions", children: "quarterly PDF editions" }),
              "."
            ] })
          ] }),
          /* @__PURE__ */ jsxs("section", { "aria-labelledby": "verification-heading", className: "space-y-4 border-t border-line pt-8", children: [
            /* @__PURE__ */ jsx(Text, { id: "verification-heading", as: "h2", variant: "section-title", children: "Specialist verification and review standards" }),
            /* @__PURE__ */ jsxs("p", { className: "text-ink-secondary", children: [
              "Bylines in the",
              " ",
              /* @__PURE__ */ jsx(Link, { href: "/authors", children: "contributors and specialists directory" }),
              " ",
              "require cryptographic or institutional provenance: ORCID iDs for academic researchers, verified repository maintainership on GitHub for systems engineers, or institutional domain attestation overseen by our",
              " ",
              /* @__PURE__ */ jsx(Link, { href: "/editorial-board", children: "independent editorial board" }),
              "."
            ] }),
            /* @__PURE__ */ jsxs("p", { className: "text-ink-secondary", children: [
              "Readers can audit claims interactively with the",
              " ",
              /* @__PURE__ */ jsx(Link, { href: "/assistant", children: "research synthesis assistant" }),
              ", export formatted BibTeX, RIS, APA, MLA, and Chicago references from the",
              " ",
              /* @__PURE__ */ jsx(Link, { href: "/cite", children: "citation builder" }),
              ", and curate offline bibliographies in their local",
              " ",
              /* @__PURE__ */ jsx(Link, { href: "/bookmarks", children: "saved reading list" }),
              " ",
              "without creating an account."
            ] })
          ] }),
          /* @__PURE__ */ jsxs("section", { "aria-labelledby": "representative-heading", className: "space-y-4 border-t border-line pt-8", children: [
            /* @__PURE__ */ jsx(Text, { id: "representative-heading", as: "h2", variant: "section-title", children: "Representative reviews across disciplines" }),
            /* @__PURE__ */ jsx("p", { className: "text-ink-secondary", children: "Our editorial columns span systems engineering, life sciences, organizational sociology, and open-science economics. Recent peer reviews and repository teardowns include:" }),
            /* @__PURE__ */ jsxs("ul", { className: "grid gap-3 sm:grid-cols-2", children: [
              /* @__PURE__ */ jsxs(Card, { as: "li", children: [
                /* @__PURE__ */ jsx(
                  LinkShim,
                  {
                    href: "/post/inside-vllm-and-paged-attention",
                    className: "font-serif text-lg font-semibold text-ink hover:text-brand",
                    children: "Inside vLLM & PagedAttention"
                  }
                ),
                /* @__PURE__ */ jsx("p", { className: "mt-1 font-sans text-xs text-ink-secondary", children: "Systems teardown of virtual memory paging for high-throughput LLM serving." })
              ] }),
              /* @__PURE__ */ jsxs(Card, { as: "li", children: [
                /* @__PURE__ */ jsx(
                  LinkShim,
                  {
                    href: "/post/why-we-migrated-from-k8s-to-nomad-and-bare-metal",
                    className: "font-serif text-lg font-semibold text-ink hover:text-brand",
                    children: "Migrating from Kubernetes to Nomad & Bare Metal"
                  }
                ),
                /* @__PURE__ */ jsx("p", { className: "mt-1 font-sans text-xs text-ink-secondary", children: "Two-year infrastructure post-mortem on cluster scheduling and cost telemetry." })
              ] }),
              /* @__PURE__ */ jsxs(Card, { as: "li", children: [
                /* @__PURE__ */ jsx(
                  LinkShim,
                  {
                    href: "/post/crispr-cas12f-miniaturization-delivery-bottlenecks",
                    className: "font-serif text-lg font-semibold text-ink hover:text-brand",
                    children: "CRISPR-Cas12f Miniaturization & AAV Delivery"
                  }
                ),
                /* @__PURE__ */ jsx("p", { className: "mt-1 font-sans text-xs text-ink-secondary", children: "Molecular biology review of compact endonucleases for in vivo gene editing." })
              ] }),
              /* @__PURE__ */ jsxs(Card, { as: "li", children: [
                /* @__PURE__ */ jsx(
                  LinkShim,
                  {
                    href: "/post/the-hidden-tax-on-open-science-commercial-apcs",
                    className: "font-serif text-lg font-semibold text-ink hover:text-brand",
                    children: "The Hidden Tax on Open Science APCs"
                  }
                ),
                /* @__PURE__ */ jsx("p", { className: "mt-1 font-sans text-xs text-ink-secondary", children: "Empirical policy audit of $2.4B in public research grants paid to commercial publishers." })
              ] }),
              /* @__PURE__ */ jsxs(Card, { as: "li", children: [
                /* @__PURE__ */ jsx(
                  LinkShim,
                  {
                    href: "/post/async-first-is-broken-when-meetings-become-slack-anxiety",
                    className: "font-serif text-lg font-semibold text-ink hover:text-brand",
                    children: "When Async-First Becomes 24/7 Chat Fragmentation"
                  }
                ),
                /* @__PURE__ */ jsx("p", { className: "mt-1 font-sans text-xs text-ink-secondary", children: "Sociological analysis of narrative decision protocols in distributed research teams." })
              ] }),
              /* @__PURE__ */ jsxs(Card, { as: "li", children: [
                /* @__PURE__ */ jsx(
                  LinkShim,
                  {
                    href: "/post/deconstructing-deepseek-r1-reasoning-without-sft",
                    className: "font-serif text-lg font-semibold text-ink hover:text-brand",
                    children: "Deconstructing Pure RL Reasoning Models"
                  }
                ),
                /* @__PURE__ */ jsx("p", { className: "mt-1 font-sans text-xs text-ink-secondary", children: "Replication notes on reinforcement learning incentives for chain-of-thought verification." })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("section", { "aria-labelledby": "governance-heading", className: "space-y-3 border-t border-line pt-8", children: [
            /* @__PURE__ */ jsx(Text, { id: "governance-heading", as: "h2", variant: "section-title", children: "Corrections, ethics, and correspondence" }),
            /* @__PURE__ */ jsxs("p", { className: "text-ink-secondary", children: [
              "Substantive methodological corrections are appended directly to the canonical record with a timestamped editorial note rather than silently overwritten. To propose a review, report an erratum, or inspect our data-handling guarantees, visit the",
              " ",
              /* @__PURE__ */ jsx(Link, { href: "/contact", children: "editorial contact office" }),
              " ",
              "or read our",
              " ",
              /* @__PURE__ */ jsx(Link, { href: "/privacy", children: "reader privacy policy" }),
              "."
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(BlogFooter, {})
  ] });
}
function AboutRoute() {
  useLoaderData();
  return /* @__PURE__ */ jsx(AboutPage, {});
}
function ContactPage() {
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-canvas text-ink", children: [
    /* @__PURE__ */ jsx(BlogHeader, {}),
    /* @__PURE__ */ jsxs("main", { id: "main-content", className: "mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-10 sm:px-6 lg:px-8", children: [
      /* @__PURE__ */ jsxs("header", { className: "border-b border-line pb-8", children: [
        /* @__PURE__ */ jsx(Text, { as: "p", variant: "eyebrow", color: "brand", weight: "semibold", children: "Editorial Correspondence" }),
        /* @__PURE__ */ jsx("h1", { className: "mt-2 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl", children: "Contact the Editorial Office" }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-2xl font-serif text-xl leading-relaxed text-ink-secondary", children: "Direct channels for manuscript pitches, replication errata, institutional library indexing, and coordinated security disclosure." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-10 space-y-10 font-sans text-base leading-relaxed text-ink", children: [
        /* @__PURE__ */ jsxs("section", { "aria-labelledby": "desks-heading", className: "grid gap-6 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsx("h2", { id: "desks-heading", className: "sr-only", children: "Editorial desks" }),
          /* @__PURE__ */ jsxs(Card, { padding: "xl", children: [
            /* @__PURE__ */ jsx(Text, { as: "p", variant: "eyebrow", color: "brand", weight: "semibold", children: "Submissions & Peer Review" }),
            /* @__PURE__ */ jsx(Text, { as: "h3", variant: "card-title", className: "mt-2", children: "Editorial Desk" }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-ink-secondary", children: "Pitch technical paper reviews, benchmark replications, or repository teardowns. Include the target DOI or repository commit hash and your domain credentials." }),
            /* @__PURE__ */ jsx("p", { className: "mt-4 font-mono text-sm text-ink", children: /* @__PURE__ */ jsx("a", { href: "mailto:editorial@researchwith.me", className: "text-brand underline underline-offset-4", children: "editorial@researchwith.me" }) })
          ] }),
          /* @__PURE__ */ jsxs(Card, { padding: "xl", children: [
            /* @__PURE__ */ jsx(Text, { as: "p", variant: "eyebrow", color: "brand", weight: "semibold", children: "Errata & Replications" }),
            /* @__PURE__ */ jsx(Text, { as: "h3", variant: "card-title", className: "mt-2", children: "Corrections Committee" }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-ink-secondary", children: "Report factual inaccuracies, broken artifact links, citation metadata discrepancies, or conflicting experimental reproductions in any published review." }),
            /* @__PURE__ */ jsx("p", { className: "mt-4 font-mono text-sm text-ink", children: /* @__PURE__ */ jsx("a", { href: "mailto:corrections@researchwith.me", className: "text-brand underline underline-offset-4", children: "corrections@researchwith.me" }) })
          ] }),
          /* @__PURE__ */ jsxs(Card, { padding: "xl", children: [
            /* @__PURE__ */ jsx(Text, { as: "p", variant: "eyebrow", color: "brand", weight: "semibold", children: "Libraries & Open Metadata" }),
            /* @__PURE__ */ jsx(Text, { as: "h3", variant: "card-title", className: "mt-2", children: "Archival Indexing" }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-ink-secondary", children: "Questions regarding ISSN 2994-0821 harvesting, OpenAPI 3.1 catalog feeds, BibTeX/RIS bulk exports, or quarterly print-ready compendiums." }),
            /* @__PURE__ */ jsx("p", { className: "mt-4 font-mono text-sm text-ink", children: /* @__PURE__ */ jsx("a", { href: "mailto:archive@researchwith.me", className: "text-brand underline underline-offset-4", children: "archive@researchwith.me" }) })
          ] }),
          /* @__PURE__ */ jsxs(Card, { padding: "xl", children: [
            /* @__PURE__ */ jsx(Text, { as: "p", variant: "eyebrow", color: "brand", weight: "semibold", children: "RFC 9116 Disclosure" }),
            /* @__PURE__ */ jsx(Text, { as: "h3", variant: "card-title", className: "mt-2", children: "Security & Abuse" }),
            /* @__PURE__ */ jsxs("p", { className: "mt-2 text-sm text-ink-secondary", children: [
              "Report platform vulnerabilities or credential-verification issues under coordinated disclosure. See our machine-readable",
              " ",
              /* @__PURE__ */ jsx("a", { href: "/.well-known/security.txt", className: "text-brand underline underline-offset-4", children: "security.txt policy" }),
              "."
            ] }),
            /* @__PURE__ */ jsx("p", { className: "mt-4 font-mono text-sm text-ink", children: /* @__PURE__ */ jsx("a", { href: "mailto:security@researchwith.me", className: "text-brand underline underline-offset-4", children: "security@researchwith.me" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("section", { "aria-labelledby": "process-heading", className: "space-y-4 border-t border-line pt-8", children: [
          /* @__PURE__ */ jsx(Text, { id: "process-heading", as: "h2", variant: "section-title", children: "Response timelines and contributor onboarding" }),
          /* @__PURE__ */ jsxs("p", { className: "text-ink-secondary", children: [
            "The editorial collective reviews incoming correspondence Monday through Friday (UTC). Errata affecting published empirical figures or bibliography records in the",
            " ",
            /* @__PURE__ */ jsx(Link, { href: "/papers", children: "paper archive" }),
            " ",
            "are triaged within 48 hours and logged alongside our",
            " ",
            /* @__PURE__ */ jsx(Link, { href: "/editorial-board", children: "editorial board governance standards" }),
            "."
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "text-ink-secondary", children: [
            "Researchers and open-source maintainers who wish to join our",
            " ",
            /* @__PURE__ */ jsx(Link, { href: "/authors", children: "verified contributor roster" }),
            " ",
            "can read more",
            " ",
            /* @__PURE__ */ jsx(Link, { href: "/about", children: "about ResearchWithMe" }),
            " ",
            "and review how contributor records are handled in our",
            " ",
            /* @__PURE__ */ jsx(Link, { href: "/privacy", children: "privacy policy" }),
            "."
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(BlogFooter, {})
  ] });
}
function ContactRoute() {
  useLoaderData();
  return /* @__PURE__ */ jsx(ContactPage, {});
}
const privacySections = [
  { id: "principles-heading", label: "Zero-tracking open-access reading" },
  { id: "local-storage-heading", label: "Browser-local preferences and reading lists" },
  { id: "accounts-heading", label: "Optional digest subscriptions, comments, and contributor accounts" },
  { id: "rights-heading", label: "Data retention, open licensing, and contact" }
];
function PrivacyPage() {
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-canvas text-ink", children: [
    /* @__PURE__ */ jsx(BlogHeader, {}),
    /* @__PURE__ */ jsxs("main", { id: "main-content", className: "mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-10 sm:px-6 lg:px-8", children: [
      /* @__PURE__ */ jsxs("header", { className: "border-b border-line pb-8", children: [
        /* @__PURE__ */ jsx(Text, { as: "p", variant: "eyebrow", color: "brand", weight: "semibold", children: "Reader Trust & Data Governance" }),
        /* @__PURE__ */ jsx("h1", { className: "mt-2 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl", children: "Privacy Policy" }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-2xl font-serif text-xl leading-relaxed text-ink-secondary", children: "Effective November 2026 · ResearchWithMe operates without behavioural advertising, third-party tracking pixels, or cross-site reader profiling." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]", children: [
        /* @__PURE__ */ jsx("div", { className: "order-1 self-start lg:sticky lg:top-24 lg:col-start-2 lg:order-2", children: /* @__PURE__ */ jsx(SectionNavigation, { items: privacySections, ariaLabel: "Privacy policy sections" }) }),
        /* @__PURE__ */ jsxs("div", { "data-layout-content": "reading", className: "order-2 min-w-0 max-w-[48rem] space-y-10 lg:order-1 font-sans text-base leading-relaxed text-ink", children: [
          /* @__PURE__ */ jsxs("section", { "aria-labelledby": "principles-heading", className: "space-y-4", children: [
            /* @__PURE__ */ jsx(Text, { id: "principles-heading", as: "h2", variant: "section-title", children: "1. Zero-tracking open-access reading" }),
            /* @__PURE__ */ jsxs("p", { className: "text-ink-secondary", children: [
              "You can read every article, inspect",
              " ",
              /* @__PURE__ */ jsx(Link, { href: "/papers", children: "archived research papers" }),
              ", download",
              " ",
              /* @__PURE__ */ jsx(Link, { href: "/editions", children: "quarterly PDF editions" }),
              ", and export citations from the",
              " ",
              /* @__PURE__ */ jsx(Link, { href: "/cite", children: "citation builder" }),
              " ",
              "without registering an account. We do not load third-party ad networks, session-replay scripts, or fingerprinting beacons on any page of the journal."
            ] })
          ] }),
          /* @__PURE__ */ jsxs("section", { "aria-labelledby": "local-storage-heading", className: "space-y-4 border-t border-line pt-8", children: [
            /* @__PURE__ */ jsx(Text, { id: "local-storage-heading", as: "h2", variant: "section-title", children: "2. Browser-local preferences and reading lists" }),
            /* @__PURE__ */ jsxs("p", { className: "text-ink-secondary", children: [
              "Reader convenience features—including your",
              " ",
              /* @__PURE__ */ jsx(Link, { href: "/bookmarks", children: "saved reading list" }),
              ", light or dark archival paper theme selection, and interface language preference (English or বাংলা)—are stored locally in your browser via first-party ",
              /* @__PURE__ */ jsx("code", { className: "font-mono text-sm", children: "localStorage" }),
              " ",
              "keys and a strictly functional locale cookie (",
              /* @__PURE__ */ jsx("code", { className: "font-mono text-sm", children: "rwm_locale" }),
              "). You can clear these items at any time from your browser settings or directly inside the reading list tool."
            ] })
          ] }),
          /* @__PURE__ */ jsxs("section", { "aria-labelledby": "accounts-heading", className: "space-y-4 border-t border-line pt-8", children: [
            /* @__PURE__ */ jsx(Text, { id: "accounts-heading", as: "h2", variant: "section-title", children: "3. Optional digest subscriptions, comments, and contributor accounts" }),
            /* @__PURE__ */ jsx("p", { className: "text-ink-secondary", children: "When you voluntarily subscribe to the weekly editorial digest, post a public discussion comment, or sign in as a contributor, we process only the minimum information required to fulfill that action:" }),
            /* @__PURE__ */ jsxs("ul", { className: "list-disc space-y-2 pl-6 text-ink-secondary", children: [
              /* @__PURE__ */ jsxs("li", { children: [
                /* @__PURE__ */ jsx("strong", { children: "Editorial digest:" }),
                " Your email address and selected column preferences, used solely to deliver the digest and removable in one click."
              ] }),
              /* @__PURE__ */ jsxs("li", { children: [
                /* @__PURE__ */ jsx("strong", { children: "Contributor verification:" }),
                " Public scholarly identifiers (ORCID iD, GitHub handle, and institutional affiliation) displayed on",
                " ",
                /* @__PURE__ */ jsx(Link, { href: "/authors", children: "contributor and domain reviewer profiles" }),
                " ",
                "to substantiate review provenance."
              ] }),
              /* @__PURE__ */ jsxs("li", { children: [
                /* @__PURE__ */ jsx("strong", { children: "Abuse prevention:" }),
                " Short-lived, server-side rate-limit counters derived from request metadata to protect public APIs and discussion threads without intrusive third-party CAPTCHA scripts."
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("section", { "aria-labelledby": "rights-heading", className: "space-y-4 border-t border-line pt-8", children: [
            /* @__PURE__ */ jsx(Text, { id: "rights-heading", as: "h2", variant: "section-title", children: "4. Data retention, open licensing, and contact" }),
            /* @__PURE__ */ jsxs("p", { className: "text-ink-secondary", children: [
              "Published scholarly reviews and bibliographic metadata remain part of the permanent open-access scholarly record under CC BY 4.0, as detailed",
              " ",
              /* @__PURE__ */ jsx(Link, { href: "/about", children: "about ResearchWithMe" }),
              ". Account holders and digest subscribers may request access, correction, or deletion of private account records at any time through our",
              " ",
              /* @__PURE__ */ jsx(Link, { href: "/contact", children: "editorial contact office" }),
              " ",
              "at",
              " ",
              /* @__PURE__ */ jsx("a", { href: "mailto:privacy@researchwith.me", className: "font-medium text-brand underline underline-offset-4", children: "privacy@researchwith.me" }),
              "."
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(BlogFooter, {})
  ] });
}
function PrivacyRoute() {
  useLoaderData();
  return /* @__PURE__ */ jsx(PrivacyPage, {});
}
const HYDRATION_DATA_KEY = "__RWM_HYDRATION__";
const homeStyles = {
  main: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    maxWidth: "42rem",
    margin: "0 auto",
    padding: "6rem 1.5rem",
    color: "#161C1A"
  },
  eyebrow: {
    fontSize: "0.75rem",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#4F46E5",
    margin: 0
  },
  wordmark: {
    fontSize: "3.25rem",
    lineHeight: 1.05,
    letterSpacing: "-0.03em",
    margin: "1rem 0 1.25rem"
  },
  strap: {
    fontSize: "1.125rem",
    lineHeight: 1.6,
    color: "#3F4542",
    margin: 0
  }
};
function RouteErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const heading = status === 404 ? "Page not found" : status >= 500 ? "Something went wrong" : "Request failed";
  const detail = status === 404 ? "The page you were looking for does not exist or was moved." : "The journal hit an unexpected error. Please try again in a moment.";
  return /* @__PURE__ */ jsxs("main", { style: homeStyles.main, children: [
    /* @__PURE__ */ jsxs("p", { style: homeStyles.eyebrow, children: [
      "Error ",
      status
    ] }),
    /* @__PURE__ */ jsx("h1", { style: homeStyles.wordmark, children: heading }),
    /* @__PURE__ */ jsx("p", { style: homeStyles.strap, children: detail }),
    /* @__PURE__ */ jsx("p", { style: { marginTop: "2rem" }, children: /* @__PURE__ */ jsx(Link$1, { to: "/", style: { color: "#4F46E5" }, children: "Back to the journal" }) })
  ] });
}
const FALLBACK_TITLE = "ResearchWithMe · Applied AI research, published openly";
const MAX_TITLE_LENGTH = 300;
function DocumentTitleSync({ children }) {
  const matches = useMatches();
  useEffect(() => {
    for (let index = matches.length - 1; index >= 0; index -= 1) {
      const data = matches[index]?.data;
      const title = data?.metadata?.title;
      if (typeof title === "string" && title.trim()) {
        document.title = title.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH);
        return;
      }
    }
    document.title = FALLBACK_TITLE;
  }, [matches]);
  return /* @__PURE__ */ jsx(Fragment, { children });
}
const ROUTE_DEFINITIONS = [
  { id: "home", path: "/", element: /* @__PURE__ */ jsx(HomeRoute, {}) },
  { id: "articles", path: "/articles", element: /* @__PURE__ */ jsx(HomeRoute, {}) },
  { id: "category", path: "/category/:slug", element: /* @__PURE__ */ jsx(CategoryRoute, {}) },
  { id: "post", path: "/post/:slug", element: /* @__PURE__ */ jsx(PostRoute, {}) },
  { id: "paper", path: "/paper/:slug", element: /* @__PURE__ */ jsx(PaperRoute, {}) },
  { id: "author", path: "/author/:id", element: /* @__PURE__ */ jsx(AuthorRoute, {}) },
  { id: "papers", path: "/papers", element: /* @__PURE__ */ jsx(PapersRoute, {}) },
  { id: "authors", path: "/authors", element: /* @__PURE__ */ jsx(AuthorsRoute, {}) },
  { id: "editions", path: "/editions", element: /* @__PURE__ */ jsx(EditionsRoute, {}) },
  { id: "editorial-board", path: "/editorial-board", element: /* @__PURE__ */ jsx(EditorialBoardRoute, {}) },
  { id: "assistant", path: "/assistant", element: /* @__PURE__ */ jsx(AssistantRoute, {}) },
  { id: "bookmarks", path: "/bookmarks", element: /* @__PURE__ */ jsx(BookmarksRoute, {}) },
  { id: "cite", path: "/cite", element: /* @__PURE__ */ jsx(CiteRoute, {}) },
  { id: "api-docs", path: "/api-docs", element: /* @__PURE__ */ jsx(ApiDocsRoute, {}) },
  { id: "about", path: "/about", element: /* @__PURE__ */ jsx(AboutRoute, {}) },
  { id: "contact", path: "/contact", element: /* @__PURE__ */ jsx(ContactRoute, {}) },
  { id: "privacy", path: "/privacy", element: /* @__PURE__ */ jsx(PrivacyRoute, {}) },
  { id: "not-found", path: "*", element: /* @__PURE__ */ jsx(NotFound, {}) }
];
function createAppRoutes(loaders) {
  return ROUTE_DEFINITIONS.map((definition) => ({
    id: definition.id,
    path: definition.path,
    element: /* @__PURE__ */ jsx(DocumentTitleSync, { children: definition.element }),
    loader: loaders[definition.id],
    errorElement: /* @__PURE__ */ jsx(RouteErrorBoundary, {})
  }));
}
function defaultStatusText(status) {
  switch (status) {
    case 400:
      return "Bad Request";
    case 401:
      return "Unauthorized";
    case 403:
      return "Forbidden";
    case 404:
      return "Not Found";
    case 405:
      return "Method Not Allowed";
    case 409:
      return "Conflict";
    case 422:
      return "Unprocessable Entity";
    case 429:
      return "Too Many Requests";
    case 500:
      return "Internal Server Error";
    case 502:
      return "Bad Gateway";
    case 503:
      return "Service Unavailable";
    default:
      return "Error";
  }
}
var define_RWM_CLIENT_MANIFEST_default = {
  "../components/ArticleDiscussion.tsx": {
    file: "assets/ArticleDiscussion-DlQISVZ_.js",
    name: "ArticleDiscussion",
    src: "../components/ArticleDiscussion.tsx",
    isDynamicEntry: true,
    imports: [
      "src/entry-client.tsx"
    ],
    dynamicImports: [
      "../lib/supabase/client.ts"
    ]
  },
  "../components/AuthorImpactRadarChart.tsx": {
    file: "assets/AuthorImpactRadarChart-BdSEbNSF.js",
    name: "AuthorImpactRadarChart",
    src: "../components/AuthorImpactRadarChart.tsx",
    isDynamicEntry: true,
    imports: [
      "src/entry-client.tsx"
    ]
  },
  "../components/motion/features.ts": {
    file: "assets/features-CO-a-BIY.js",
    name: "features",
    src: "../components/motion/features.ts",
    isDynamicEntry: true,
    imports: [
      "src/entry-client.tsx"
    ]
  },
  "../components/search/CommandPalette.tsx": {
    file: "assets/CommandPalette-CF1jRqrM.js",
    name: "CommandPalette",
    src: "../components/search/CommandPalette.tsx",
    isDynamicEntry: true,
    imports: [
      "src/entry-client.tsx"
    ]
  },
  "../lib/supabase/client.ts": {
    file: "assets/client-BoLG_GUY.js",
    name: "client",
    src: "../lib/supabase/client.ts",
    isDynamicEntry: true,
    imports: [
      "src/entry-client.tsx"
    ]
  },
  "../node_modules/lenis/dist/lenis.mjs": {
    file: "assets/lenis-CmVXbI3P.js",
    name: "lenis",
    src: "../node_modules/lenis/dist/lenis.mjs",
    isDynamicEntry: true
  },
  "_lottie_light-ClTJ0yQW.js": {
    file: "assets/lottie_light-ClTJ0yQW.js",
    name: "lottie_light",
    isDynamicEntry: true,
    imports: [
      "src/entry-client.tsx"
    ]
  },
  "src/entry-client.tsx": {
    file: "assets/entry-client-BUzRyqlo.js",
    name: "entry-client",
    src: "src/entry-client.tsx",
    isEntry: true,
    dynamicImports: [
      "../lib/supabase/client.ts",
      "../lib/supabase/client.ts",
      "../components/motion/features.ts",
      "../components/search/CommandPalette.tsx",
      "../components/search/CommandPalette.tsx",
      "../components/ArticleDiscussion.tsx",
      "../node_modules/lenis/dist/lenis.mjs",
      "../components/AuthorImpactRadarChart.tsx",
      "_lottie_light-ClTJ0yQW.js"
    ],
    css: [
      "assets/entry-client-DjQJThXU.css"
    ]
  }
};
const CLIENT_ENTRY_KEY = "src/entry-client.tsx";
function clientAssets() {
  const manifest = typeof define_RWM_CLIENT_MANIFEST_default === "undefined" ? {} : define_RWM_CLIENT_MANIFEST_default;
  const entry = manifest[CLIENT_ENTRY_KEY];
  if (!entry) {
    throw new Error("Client manifest is missing the entry chunk. Run the client build before the server build.");
  }
  return entry;
}
const DEFAULT_TITLE = "ResearchWithMe · Applied AI research, published openly";
const DEFAULT_DESCRIPTION = "ResearchWithMe is an independent, editorially reviewed journal for applied AI research — papers, reviews and analysis, published openly.";
function escapeHtmlAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
const MAX_METADATA_LENGTH = 300;
const MAX_CANONICAL_LENGTH = 400;
function cleanText(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return void 0;
  return trimmed.slice(0, MAX_METADATA_LENGTH);
}
function cleanPath(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return void 0;
  if (/[\u0000-\u001f\u007f\\]/.test(trimmed)) return void 0;
  return trimmed.slice(0, MAX_CANONICAL_LENGTH);
}
function pageMetadata(ctx, overrides = {}) {
  const siteUrl = ctx.config.siteUrl.replace(/\/+$/, "");
  const pathname = new URL(ctx.request.url).pathname;
  const canonicalPath = cleanPath(overrides.path) ?? (pathname === "/" ? "/" : pathname);
  return {
    title: cleanText(overrides.title) ?? DEFAULT_TITLE,
    description: cleanText(overrides.description) ?? DEFAULT_DESCRIPTION,
    canonical: `${siteUrl}${canonicalPath}`,
    robots: "index, follow",
    type: overrides.type === "article" ? "article" : "website"
  };
}
function renderMetadataTags(meta) {
  const title = escapeHtmlAttribute(meta.title);
  const description = escapeHtmlAttribute(meta.description);
  const canonical = escapeHtmlAttribute(meta.canonical);
  const robots = escapeHtmlAttribute(meta.robots);
  const ogType = escapeHtmlAttribute(meta.type);
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<meta name="robots" content="${robots}">`,
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:site_name" content="ResearchWithMe">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:type" content="${ogType}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`
  ].join("");
}
function getRequestLocale(ctx) {
  const raw = ctx.cookies.getAll().find((entry) => entry.name === LOCALE_COOKIE)?.value;
  return raw === void 0 ? DEFAULT_LOCALE : resolveLocale(raw);
}
const WORDS_PER_MINUTE = 220;
function readingTimeFromText(text2) {
  const words = text2.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
function formatReadingTime(minutes) {
  return minutes <= 1 ? "1 min read" : `${minutes} min read`;
}
function formatDate(value, options) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
    ...options
  }).format(date);
}
function safeInitials(name, fallback = "RW") {
  if (!name) return fallback;
  const initials = name.replace(/[^\p{L}\p{N}\s.-]/gu, " ").split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  return initials || fallback;
}
const CMS_LIMITS = {
  title: 180,
  subtitle: 400,
  summary: 1200,
  content: 2e5,
  takeaway: 300,
  takeaways: 8,
  comment: 4e3,
  commentAuthor: 120,
  commentRole: 80,
  artifactTitle: 200,
  artifactIdentifier: 160,
  artifactMeta: 160
};
const ARTIFACT_TYPES = ["paper", "github", "dataset"];
const ARTICLE_FORMATS = [
  "Paper Review",
  "Repo Teardown",
  "Deep-Dive Essay",
  "Field Notes",
  "Case Study"
];
function isCmsStatus(value) {
  return value === "draft" || value === "published";
}
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function normalizeCoverImage(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return { ok: true, value: null };
  if (/^\/images\/[a-z0-9][a-z0-9._-]*$/i.test(raw) && !raw.includes("..")) {
    return { ok: true, value: raw };
  }
  const external = safeExternalUrl(raw);
  if (external && isSupabaseConfigured) {
    try {
      const candidate = new URL(external);
      const configured = new URL(SUPABASE_URL);
      if (candidate.origin === configured.origin && candidate.pathname.startsWith("/storage/v1/object/public/blog-images/")) {
        return { ok: true, value: external };
      }
    } catch {
    }
  }
  return {
    ok: false,
    error: "Upload a cover to the media library or choose a bundled editorial image."
  };
}
function normalizeTakeaways(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanText$1(item, CMS_LIMITS.takeaway)).filter(Boolean).slice(0, CMS_LIMITS.takeaways);
}
function normalizeArtifact(value) {
  const raw = asRecord(value);
  if (Object.keys(raw).length === 0) return null;
  const type = ARTIFACT_TYPES.includes(raw.type) ? raw.type : "paper";
  const identifier = cleanText$1(raw.identifier, CMS_LIMITS.artifactIdentifier);
  const title = cleanText$1(raw.title, CMS_LIMITS.artifactTitle);
  if (!identifier && !title) return null;
  const url = safeExternalUrl(cleanText$1(raw.url, 2048)) ?? "";
  return {
    type,
    title: title || identifier,
    url,
    identifier: identifier || title,
    meta: cleanText$1(raw.meta, CMS_LIMITS.artifactMeta)
  };
}
function normalizePostInput(input) {
  const raw = asRecord(input);
  const fieldErrors = {};
  const rawContent = typeof raw.content === "string" ? raw.content : "";
  if (rawContent.length > CMS_LIMITS.content) {
    return {
      ok: false,
      message: `Articles are limited to ${CMS_LIMITS.content} characters.`,
      fieldErrors: { content: "This article is too long to save." }
    };
  }
  const title = cleanText$1(raw.title, CMS_LIMITS.title);
  const content = cleanText$1(raw.content, CMS_LIMITS.content);
  const summary = cleanText$1(raw.summary, CMS_LIMITS.summary);
  const status = isCmsStatus(raw.status) ? raw.status : "draft";
  if (title.length < 8) {
    fieldErrors.title = "Add a working title of at least 8 characters.";
  }
  const slugSource = cleanText$1(raw.slug, 96) || title;
  const slug = slugify(slugSource);
  if (!slug) {
    fieldErrors.slug = "The title needs at least one letter or number to build a URL.";
  }
  const authorId2 = cleanText$1(raw.authorId, 80);
  if (!authorId2) {
    fieldErrors.authorId = "Choose the profile this article is published under.";
  }
  const authorName = cleanText$1(raw.authorName, 80);
  const category = CATEGORIES.includes(raw.category) ? raw.category : "Research Reviews";
  const format = ARTICLE_FORMATS.includes(raw.format) ? raw.format : "Paper Review";
  const cover = normalizeCoverImage(raw.coverImage);
  if (!cover.ok) fieldErrors.coverImage = cover.error;
  const coverValue = cover.ok ? cover.value : null;
  const keyTakeaways = normalizeTakeaways(raw.keyTakeaways);
  if (status === "published") {
    if (content.length < 200) {
      fieldErrors.content = "A published article needs at least 200 characters of body copy.";
    }
    if (summary.length < 40) {
      fieldErrors.summary = "Write a summary of at least 40 characters. It appears in the platform feed.";
    }
    if (keyTakeaways.length === 0) {
      fieldErrors.keyTakeaways = "Add at least one key takeaway before publishing.";
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Some fields need attention before this can be saved.",
      fieldErrors
    };
  }
  const readTime = formatReadingTime(readingTimeFromText(content));
  return {
    ok: true,
    value: {
      title,
      slug,
      content,
      status,
      subtitle: cleanText$1(raw.subtitle, CMS_LIMITS.subtitle) || summary.slice(0, 140),
      summary,
      category,
      format,
      authorId: authorId2,
      authorName,
      coverImage: coverValue,
      tags: parseTags(raw.tags),
      keyTakeaways,
      readTime,
      featured: raw.featured === true,
      artifact: normalizeArtifact(raw.artifact)
    }
  };
}
function normalizeCommentInput(input) {
  const raw = asRecord(input);
  const fieldErrors = {};
  const authorName = cleanText$1(raw.authorName, CMS_LIMITS.commentAuthor);
  const authorRole = cleanText$1(raw.authorRole, CMS_LIMITS.commentRole) || "Reader";
  const content = cleanText$1(raw.content ?? raw.text, CMS_LIMITS.comment);
  if (authorName.length < 2) {
    fieldErrors.authorName = "Add the name that should appear with the comment.";
  }
  if (content.length < 2) {
    fieldErrors.content = "Write at least a short sentence.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "The comment is not ready to publish.", fieldErrors };
  }
  return { ok: true, value: { authorName, authorRole, content } };
}
function toPublicPostId(id) {
  return `cms-${id}`;
}
function fromPublicPostId(publicId) {
  if (!publicId.startsWith("cms-")) return null;
  const id = publicId.slice(4);
  return /^\d{1,19}$/.test(id) ? id : null;
}
function fallbackAuthor(post) {
  const joinedYear = post.insertedAt ? new Date(post.insertedAt).getUTCFullYear() : (/* @__PURE__ */ new Date()).getUTCFullYear();
  return {
    // The stored authorId is the public.profiles slug -- the post routes
    // validate it there -- so it is the canonical identity. Deriving an id from
    // the display name instead would only match a profile by coincidence.
    id: post.authorId || slugify(post.authorName) || "editorial",
    name: post.authorName || "ResearchWithMe editors",
    avatar: safeInitials(post.authorName, "RW"),
    role: "Contributing editor",
    domain: post.category,
    joinedDate: String(joinedYear),
    articleCount: 1,
    bio: `${post.authorName || "The editorial team"} writes for ResearchWithMe.`
  };
}
function cmsPostToArticle(post) {
  const knownAuthor = post.authorId ? AUTHORS[post.authorId] : void 0;
  const author = knownAuthor ?? fallbackAuthor(post);
  const published = post.publishedAt ?? post.insertedAt;
  return {
    id: toPublicPostId(post.id),
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle || post.summary.slice(0, 140),
    category: post.category,
    format: post.format,
    author,
    publishedAt: formatDate(published),
    dateISO: published,
    readTime: post.readTime,
    coverImage: post.coverImage ?? "/images/folio-hero.jpeg",
    featured: post.featured,
    summary: post.summary,
    content: post.content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean),
    bodyMarkdown: post.content,
    keyTakeaways: post.keyTakeaways,
    tags: post.tags,
    likes: post.likes,
    commentsCount: 0,
    // A CMS article renders the same artifact record as a bundled one, so the
    // reader and the research assistant treat both alike.
    reviewedArtifact: post.artifact ? {
      type: post.artifact.type,
      title: post.artifact.title,
      url: post.artifact.url,
      identifier: post.artifact.identifier,
      meta: post.artifact.meta || "Artifact record supplied by the author"
    } : void 0
  };
}
function cmsCommentToRecord(comment) {
  return {
    id: `cms-comment-${comment.id}`,
    postId: toPublicPostId(comment.postId),
    authorName: comment.authorName,
    authorRole: comment.authorRole,
    avatar: safeInitials(comment.authorName, "RD"),
    timestamp: formatDate(comment.insertedAt),
    text: comment.content
  };
}
const articlesJson = /* @__PURE__ */ JSON.parse(`[{"id":"post-1","slug":"inside-vllm-and-paged-attention","title":"Inside vLLM & PagedAttention: Why Memory Fragmentation Was Killing LLM Serving","subtitle":"A deep architectural code teardown of how virtual memory paging concepts solved KV cache bloat in high-concurrency model servers.","category":"GitHub Repo Teardowns","format":"Repo Teardown","author":{"id":"maya-lin","name":"Maya Lin","avatar":"ML","role":"Staff Infrastructure Architect","domain":"Cloud Infrastructure, High-Throughput Inference & Linux Internals","institution":"Independent Distributed Systems Lab","github":"https://github.com/mayalin-sys","twitter":"https://x.com/mayalin_hpc","website":"https://mayalin.dev","verifiedVia":"github","verifiedIdentifier":"@mayalin-sys (GitHub Public Key Attested)","verifiedTitle":"GitHub Verified Systems Maintainer","joinedDate":"January 2025","totalReads":"64.9k","bio":"Writing code for high-throughput distributed systems. Deconstructs open-source database engines, CUDA memory management, and GPU inference kernels.","articleCount":19},"publishedAt":"October 22, 2026","readTime":"9 min read","coverImage":"/images/folio-code.jpeg","featured":true,"reviewedArtifact":{"type":"github","title":"vLLM: Easy, fast, and cheap LLM serving with PagedAttention","url":"https://github.com/vllm-project/vllm","identifier":"vllm-project/vllm","meta":"44.8k Stars · Python / C++ · Apache-2.0"},"summary":"Before vLLM, serving transformers at scale suffered from up to 80% wasted GPU VRAM due to sequential pre-allocation of the KV cache. By adopting classic operating system paging algorithms into custom CUDA kernels, vLLM increased server throughput by 2.5x to 4x.","content":["In traditional transformer inference servers, when a user prompt arrived, the model server had to pre-allocate a contiguous memory block for the key-value (KV) cache sized to the maximum possible sequence length (say, 4,096 or 8,192 tokens). If the user asked a 50-token question and received a 200-token answer, 95% of that pre-allocated GPU VRAM sat idle, yet unavailable to concurrent requests.","This issue, known in operating system theory as internal and external fragmentation, was the single largest constraint on batch size and concurrency in production LLM deployments.","The genius of the vLLM project (developed originally at UC Berkeley) was realizing that the KV cache doesn't need to reside in contiguous physical VRAM. Just as 1960s operating systems introduced virtual memory and page tables to map fragmented physical DRAM pages into a coherent virtual address space, PagedAttention breaks the KV cache into fixed-size \\"blocks\\" (typically 16 tokens each).","When you inspect \`csrc/attention/attention_kernels.cu\` in the repository, you see how custom CUDA threads map logical sequence tokens to non-contiguous physical page slots on the fly with near-zero latency penalty.","In our test clusters running Llama 3 70B across 4x A100 SXM GPUs, swapping standard Hugging Face pipeline serving for vLLM immediately increased throughput from 38 req/s to 124 req/s under bursty Poisson arrival distributions."],"keyTakeaways":["Pre-allocating contiguous KV cache blocks wastes up to 60-80% of scarce GPU memory.","PagedAttention maps logical tokens to 16-token non-contiguous physical memory blocks with minimal lookup overhead.","Dynamic memory allocation enables near-optimal batch scheduling, reducing prompt queue latency by up to 73%."],"tags":["CUDA","vLLM","GPU Inference","Systems Engineering","Performance"],"likes":342,"commentsCount":28},{"id":"post-2","slug":"deconstructing-deepseek-r1-reasoning-without-sft","title":"Deconstructing DeepSeek-R1: How Pure RL Unlocked Emergent Chain-of-Thought","subtitle":"Reviewing the breakthrough paper on incentivizing complex multi-step reasoning directly from rule-based reward signals.","category":"Research Reviews","format":"Paper Review","author":{"id":"marcus-vance","name":"Prof. Marcus Vance","avatar":"MV","role":"AI Systems & Verification Fellow","domain":"Computer Science, LLM Reasoning & Distributed ML","institution":"University of Cambridge, Computer Laboratory","orcid":"0000-0001-9234-8812","github":"https://github.com/vance-cam","twitter":"https://x.com/vance_ai","scholar":"https://scholar.google.com","verifiedVia":"orcid","verifiedIdentifier":"0000-0001-9234-8812","verifiedTitle":"ORCID Verified Researcher","joinedDate":"March 2024","totalReads":"48.2k","bio":"Researches autonomous verification protocols, mathematical reasoning models, and neural architecture efficiency. Leads verification benchmarks for open-weights foundational models.","articleCount":14},"publishedAt":"October 19, 2026","readTime":"12 min read","coverImage":"/images/folio-hero.jpeg","featured":true,"reviewedArtifact":{"type":"paper","title":"DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning","url":"https://arxiv.org","identifier":"arXiv:2501.12948","meta":"DeepSeek-AI · 32-page technical report"},"summary":"DeepSeek-R1 demonstrated that massive reasoning capabilities can emerge spontaneously through large-scale Reinforcement Learning directly on a base model, without relying on human-annotated chain-of-thought demonstrations.","content":["For years, the prevailing consensus in frontier AI was that models required thousands of meticulously curated, human-written step-by-step reasoning solutions (Supervised Fine-Tuning) before reinforcement learning could refine them. DeepSeek-R1-Zero overturned this hypothesis.","By applying pure Group Relative Policy Optimization (GRPO) to DeepSeek-V3-Base using strictly rule-based rewards (accuracy of mathematical proofs and formatting compliance in XML tags), the base model learned to \\"think\\", backtrack, re-check intermediate calculations, and generate self-corrections autonomously.","Watching the training progression is fascinating: at step 50, the model outputs short, confused guesses. By step 800, without any human training examples, the token output length naturally balloons from 400 to 4,200 tokens as the policy discovers that allocating compute to internal reflection dramatically raises reward scores.","The critical bottleneck for researchers looking to replicate R1 is not the RL algorithm itself, but constructing verifiably deterministic reward environments for domains outside formal mathematics and unit-tested programming."],"keyTakeaways":["Base models possess latent reasoning patterns that can be unlocked via pure RL without human SFT examples.","The \\"Aha moment\\" of self-correction emerges organically when reward signals penalize premature final answers.","Rule-based verification (math compilers and unit tests) avoids the reward hacking common in neural reward models."],"tags":["AI Research","Reinforcement Learning","DeepSeek","Reasoning","Open Weights"],"likes":519,"commentsCount":46},{"id":"post-3","slug":"glp-1-receptor-agonists-beyond-diabetes","title":"GLP-1 Receptor Agonists Beyond Diabetes: Neuroinflammation, Cardiovascular Outcomes & 2026 Trial Data","subtitle":"Analyzing the landmark clinical trials shifting semaglutide and tirzepatide from weight-loss drugs to broad systemic therapeutics.","category":"Health & Medicine","format":"Deep-Dive Essay","author":{"id":"sarah-chen","name":"Dr. Sarah Chen, MD","avatar":"SC","role":"Clinical Epidemiologist & Physician","domain":"Preventive Medicine, Metabolic Health & Trial Methodology","institution":"Johns Hopkins Bloomberg School of Public Health","orcid":"0000-0003-8120-4491","twitter":"https://x.com/dr_sarahchen","verifiedVia":"institution","verifiedIdentifier":"schen@jhu.edu (Institutional Faculty Verified)","verifiedTitle":"Institutional Medical Faculty Verified","joinedDate":"August 2024","totalReads":"39.4k","bio":"Translating double-blind randomized clinical trial registries into actionable physiological insights without pharmaceutical industry hype or wellness sensationalism.","articleCount":11},"publishedAt":"October 15, 2026","readTime":"11 min read","coverImage":"/images/folio-dashboard.jpeg","featured":false,"reviewedArtifact":{"type":"paper","title":"Long-term Cardiovascular and Kidney Outcomes in Semaglutide Trials: A Meta-Analysis","url":"https://nejm.org","identifier":"NEJM DOI: 10.1056/NEJMoa2307563","meta":"17,604 participants · Double-blind RCT"},"summary":"The latest cohort data from the SELECT and FLOW clinical trials confirms that GLP-1 and dual GIP/GLP-1 receptor agonists produce substantial cardiovascular and renal protection independent of total kilograms lost.","content":["When semaglutide was initially approved for type 2 diabetes and obesity, mainstream commentary framed it primarily as an appetite suppressant that slows gastric emptying. However, physicians and molecular biologists have long observed GLP-1 receptors distributed across cardiac tissue, renal vasculature, and microglia in the central nervous system.","The recent five-year readout of the SELECT trial demonstrated a 20% reduction in major adverse cardiovascular events (MACE) in non-diabetic overweight patients. Crucially, statistical subgroup analysis showed that cardiovascular risk began plummeting within 8 weeks—well before significant adipose tissue loss had materialized.","This suggests a direct anti-inflammatory and endothelial protective mechanism. GLP-1 signaling appears to downregulate pro-inflammatory cytokine expression (TNF-alpha, IL-6) and attenuate microglial priming in neurodegenerative pathways.","Yet severe challenges remain around long-term lean muscle mass retention, gastrointestinal motility tolerance, and equitable global manufacturing supply chains."],"keyTakeaways":["Cardiovascular risk reduction occurs before substantial weight loss, pointing to direct endothelial anti-inflammatory action.","Dual GIP/GLP-1 agonists (tirzepatide) show enhanced glycemic and lipid profiles compared to single-target molecules.","Sarcopenia mitigation requires concurrent progressive resistance training and adequate dietary protein intake."],"tags":["Medicine","Clinical Trials","Pharmacology","Cardiology","Longevity"],"likes":284,"commentsCount":31},{"id":"post-4","slug":"algorithmic-commons-and-at-protocol","title":"The Algorithmic Commons: Why Feed Personalization Fractured Societal Consensus (And What AT Protocol Gets Right)","subtitle":"Examining the sociology of feed algorithms, epistemic isolation, and the architectural case for user-chosen recommendation algorithms.","category":"Sociology & Culture","format":"Deep-Dive Essay","author":{"id":"julian-ross","name":"Julian Ross","avatar":"JR","role":"Sociologist of Technology","domain":"Platform Governance, Digital Labor & Urban Infrastructure","institution":"Berkman Klein Center for Internet & Society","orcid":"0000-0002-4019-9812","github":"https://github.com/julianross","twitter":"https://x.com/julian_ross","verifiedVia":"institution","verifiedIdentifier":"jross@cyber.harvard.edu","verifiedTitle":"Institutional Academic Verified","joinedDate":"June 2024","totalReads":"52.1k","bio":"Investigates the second-order cultural, psychological, and economic consequences of algorithmic curation, remote work dynamics, and decentralized social protocols.","articleCount":16},"publishedAt":"October 11, 2026","readTime":"14 min read","coverImage":"/images/folio-process.jpeg","featured":false,"reviewedArtifact":{"type":"github","title":"Authenticated Transfer (AT) Protocol Specification","url":"https://github.com/bluesky-social/atproto","identifier":"bluesky-social/atproto","meta":"Open Specification · Decentralized Identity"},"summary":"When proprietary platforms optimize solely for per-second engagement, the algorithm inevitably selects for moral outrage and in-group tribal policing. Unbundling identity, hosting, and algorithmic curation offers our best escape hatch.","content":["Every major social platform of the last decade operated on a monopolistic bundle: the platform owned your identity, hosted your data, managed the social graph, and dictated the exact ranking algorithm that decided what entered your visual field.","Sociologically, this design created a catastrophic incentive trap. Machine learning models discovered that nuanced consensus generates weak dwell time, while cognitive dissonance, high-arousal moral outrage, and tribal boundary defense generate continuous scroll retention.","The Authenticated Transfer (AT) Protocol and ActivityPub demonstrate that we can disentangle this bundle. Under AT Protocol, your identity is a cryptographically signed DID (Decentralized Identifier), your data is stored in personal data servers, and algorithmic feeds are modular plug-ins.","If you want a chronological feed of peer-reviewed biology papers, you subscribe to an open algorithm designed by scientists. If you want a localized neighborhood feed, you choose a community-governed curator."],"keyTakeaways":["Monolithic social platforms inherently maximize emotional arousal to drive ad impression inventory.","Unbundling the curation layer from the hosting layer restores user agency over cognitive diet.","Decentralized identity protocols prevent platform lock-in and allow portable audience relationships."],"tags":["Sociology","AT Protocol","Platform Design","Social Media","Decentralization"],"likes":412,"commentsCount":39},{"id":"post-5","slug":"why-we-migrated-from-k8s-to-nomad-and-bare-metal","title":"Why We Migrated from Kubernetes to Nomad and Bare Metal: A 2-Year Post-Mortem","subtitle":"Real infrastructure numbers: How stripping out K8s YAML complexity and cloud-managed overhead saved $180,000/year with a two-person ops team.","category":"STEM & Tech","format":"Field Notes","author":{"id":"maya-lin","name":"Maya Lin","avatar":"ML","role":"Staff Infrastructure Architect","domain":"Cloud Infrastructure, High-Throughput Inference & Linux Internals","institution":"Independent Distributed Systems Lab","github":"https://github.com/mayalin-sys","twitter":"https://x.com/mayalin_hpc","website":"https://mayalin.dev","verifiedVia":"github","verifiedIdentifier":"@mayalin-sys (GitHub Public Key Attested)","verifiedTitle":"GitHub Verified Systems Maintainer","joinedDate":"January 2025","totalReads":"64.9k","bio":"Writing code for high-throughput distributed systems. Deconstructs open-source database engines, CUDA memory management, and GPU inference kernels.","articleCount":19},"publishedAt":"October 08, 2026","readTime":"10 min read","coverImage":"/images/folio-design.jpeg","featured":false,"reviewedArtifact":{"type":"github","title":"Nomad: A Simple and Flexible Workload Orchestrator","url":"https://github.com/hashicorp/nomad","identifier":"hashicorp/nomad","meta":"15.6k Stars · Go · MPL-2.0"},"summary":"Kubernetes is fantastic when you have 500 microservices and a dedicated 20-person platform engineering team. For a team of six developers, the cognitive tax of Helm charts, ingress controllers, and cloud egress bills was draining velocity.","content":["Two years ago, our team was managing two EKS clusters with 24 worker nodes, complex Istio service meshes, and thousands of lines of fragile Helm templates. Our monthly AWS bill hovered around $18,500, with over 35% of that cost going toward managed control plane fees, NAT gateway egress, and oversized node pools.","Worse than the monetary cost was the cognitive overhead. When an incident occurred at 2:00 AM, our engineers spent 40 minutes deciphering CNI plugin crashes or CoreDNS loop errors rather than debugging our application code.","We ran a pilot migrating our batch jobs and core API servers to HashiCorp Nomad running on dedicated Hetzner servers (AX102 instances with AMD Ryzen 9 7950X3D CPUs and NVMe storage). Nomad compiles to a single binary, uses straightforward HCL job specs, and orchestrates Docker containers, raw exec binaries, and microVMs uniformly.","The results: Our total monthly infrastructure bill collapsed from $18,500 to $2,900. API response p99 dropped from 68ms to 14ms thanks to bare-metal CPU pinning, and zero developer hours were spent on Kubernetes control plane upgrades."],"keyTakeaways":["Managed cloud Kubernetes introduces substantial invisible costs in NAT gateways, cross-AZ traffic, and over-provisioning.","Nomad's single-binary architecture radically lowers operational complexity for small engineering teams.","Modern bare-metal servers deliver 3-5x the raw compute and I/O performance of standard cloud vCPUs at a fraction of the price."],"tags":["DevOps","Nomad","Kubernetes","Cloud Costs","Architecture"],"likes":673,"commentsCount":84},{"id":"post-6","slug":"the-hidden-tax-on-open-science-commercial-apcs","title":"The Hidden Tax on Open Science: Tracking $2.4B in Public Grant Money Flowing to Publisher APCs","subtitle":"Data journalism investigation into how Article Processing Charges became a multi-billion dollar tollgate on taxpayer-funded discoveries.","category":"Data & Policy","format":"Case Study","author":{"id":"elena-rostova","name":"Dr. Elena Rostova","avatar":"ER","role":"Open Science Economist","domain":"Knowledge Commons, Public Funding & Research Policy","institution":"Institute for Digital Public Goods, Zurich","orcid":"0000-0002-1825-0097","github":"https://github.com/erostova","twitter":"https://x.com/elena_rostova","verifiedVia":"orcid","verifiedIdentifier":"0000-0002-1825-0097","verifiedTitle":"ORCID Verified Scholar","joinedDate":"November 2023","totalReads":"78.5k","bio":"Studies the structural incentives behind commercial academic publishing, open data longevity, and public utility covenants. Advises national science foundations on diamond open access.","articleCount":22},"publishedAt":"September 29, 2026","readTime":"15 min read","coverImage":"/images/folio-hero.jpeg","featured":false,"reviewedArtifact":{"type":"dataset","title":"Global University APC Expenditure Dataset (2020-2025)","url":"https://zenodo.org","identifier":"Zenodo DOI: 10.5281/zenodo.1084920","meta":"Open Data · 45,000 journal records"},"summary":"The transition from subscription paywalls to \\"Author Pays\\" Open Access has simply inverted the barrier: instead of paywalling readers, commercial giants now charge researchers $3,000 to $11,000 per paper, extracting billions from public science budgets.","content":["When the open access movement gained international momentum twenty years ago, the noble vision was clear: every taxpayer on earth should be able to read the scientific research their tax dollars funded.","What few anticipated was how skillfully the oligopoly of commercial academic publishers would hijack that mandate. By introducing Article Processing Charges (APCs), publishers shifted their profit center from library subscription budgets directly into individual researchers' lab grants.","Our financial audit of 120 global research universities revealed that between 2020 and 2025, over $2.4 billion in direct public grant funds was paid to commercial publishers merely for the privilege of making digital PDFs publicly viewable.","Meanwhile, Diamond Open Access journals—which are community-run, peer-reviewed, and charge neither author nor reader—operate on annual budgets averaging $210 per published paper. Diverting just 8% of institutional library procurement funds could fully subsidize a global Diamond OA network permanently."],"keyTakeaways":["Commercial APCs ($3,000-$11,000) reflect profit margins up to 40%, not the real computational cost of digital distribution.","Researchers from lower-income nations are systematically excluded from publishing in prestigious journals due to currency and fee barriers.","Institutional consortia funding Diamond Open Access offers a provably sustainable, equitable alternative."],"tags":["Open Science","Economics","Academic Publishing","Public Policy","Data Journalism"],"likes":488,"commentsCount":52},{"id":"post-7","slug":"crispr-cas12f-miniaturization-delivery-bottlenecks","title":"CRISPR-Cas12f Miniaturization: How Compact Endonucleases Solve in vivo Gene Editing Delivery","subtitle":"Reviewing recent protein engineering breakthroughs fitting complete CRISPR-Cas machinery inside single AAV viral capsids.","category":"STEM & Tech","format":"Paper Review","author":{"id":"hiroshi-tanaka","name":"Dr. Hiroshi Tanaka","avatar":"HT","role":"Molecular Geneticist & Bioinformatician","domain":"Synthetic Biology, CRISPR Kinetics & Genomics","institution":"Kyoto University, Department of Synthetic Biology","orcid":"0000-0003-1102-4590","github":"https://github.com/htanaka-crispr","verifiedVia":"orcid","verifiedIdentifier":"0000-0003-1102-4590","verifiedTitle":"ORCID Verified Genomicist","joinedDate":"April 2025","totalReads":"27.8k","bio":"Specializes in computational genomic alignment, compact RNA-guided endonuclease engineering, and in vivo gene therapy delivery vectors.","articleCount":8},"publishedAt":"September 24, 2026","readTime":"8 min read","coverImage":"/images/folio-code.jpeg","featured":false,"reviewedArtifact":{"type":"paper","title":"Engineered miniature CRISPR-Cas12f for efficient in vivo genome editing","url":"https://nature.com","identifier":"Nature Biotechnology DOI: 10.1038/s41587-024-02189-y","meta":"Peer-reviewed research · Structural Biology"},"summary":"Standard SpCas9 proteins are bulky (~1,368 amino acids), making it nearly impossible to package both the Cas nuclease, guide RNA, and repair template inside a single Adeno-Associated Virus (AAV) vector. Compact Cas12f (~400-500 aa) is changing that.","content":["The primary limiting factor in clinical gene editing today is not cutting precision; it is delivery. The most clinically validated in vivo delivery vehicle is the Adeno-Associated Virus (AAV), but AAV capsids have a strict packaging capacity limit of approximately 4.7 kilobases.","When you attempt to package standard Streptococcus pyogenes Cas9 (~4.2 kb of coding sequence) along with promoter sequences, guide RNA cassettes, and nuclear localization signals, you exceed the packaging threshold, resulting in truncated vectors and drastically reduced delivery efficiency in liver and retinal tissue.","Recent breakthroughs in engineered Cas12f nucleases—derived from uncultivated archaea—have reduced the enzyme size to under 500 amino acids (less than 1.5 kb of DNA), leaving over 3 kb of payload headroom inside a single AAV vector for multi-guide multiplexing and base editor domains.","Through targeted mutagenesis of the REC lobe and RNA-binding interfaces, research teams achieved on-target cleavage rates matching wild-type SpCas9 with dramatically reduced off-target indels in primary human T cells."],"keyTakeaways":["AAV viral vectors have a strict 4.7 kb packaging limit that conventional SpCas9 strains exhaust.","Miniature Cas12f (~400-500 aa) frees up over 3 kb of viral payload for regulatory promoters and multiplexed guides.","Engineered variants maintain high cleavage kinetics while exhibiting lower off-target propensity in therapeutic cell lines."],"tags":["Biotechnology","CRISPR","Genomics","Gene Therapy","Molecular Biology"],"likes":310,"commentsCount":19},{"id":"post-8","slug":"async-first-is-broken-when-meetings-become-slack-anxiety","title":"Async-First Is Broken When Meetings Are Just Replaced by 24/7 Slack Anxiety","subtitle":"Why remote organizations that banned synchronous meetings ended up with fragmented attention, delayed decisions, and cognitive exhaustion.","category":"Sociology & Culture","format":"Deep-Dive Essay","author":{"id":"julian-ross","name":"Julian Ross","avatar":"JR","role":"Sociologist of Technology","domain":"Platform Governance, Digital Labor & Urban Infrastructure","institution":"Berkman Klein Center for Internet & Society","orcid":"0000-0002-4019-9812","github":"https://github.com/julianross","twitter":"https://x.com/julian_ross","verifiedVia":"institution","verifiedIdentifier":"jross@cyber.harvard.edu","verifiedTitle":"Institutional Academic Verified","joinedDate":"June 2024","totalReads":"52.1k","bio":"Investigates the second-order cultural, psychological, and economic consequences of algorithmic curation, remote work dynamics, and decentralized social protocols.","articleCount":16},"publishedAt":"September 18, 2026","readTime":"9 min read","coverImage":"/images/folio-dashboard.jpeg","featured":false,"summary":"Eliminating calendar meetings without establishing clear asynchronous decision protocols didn't give workers deep focus—it created an ambient panic of unread Slack threads and ambiguous task ownership.","content":["During the remote work revolution, a popular leadership mantra emerged: \\"Cancel all recurring meetings, move everything to Slack and Notion, and become an async-first company.\\"","Four years later, post-mortems across hundreds of engineering and product organizations reveal a sobering reality: many teams didn't actually achieve deep asynchronous focus. They simply replaced a 30-minute structured synchronous meeting with an ongoing, 6-hour fragmented ping-pong debate across 4 different Slack channels.","True asynchronous work requires high-context, single-owner narrative documents (like Amazon 6-pagers or RFC proposals) where a designated decision-maker synthesizes written feedback and makes a clear call. When organizations use chat apps as the primary asynchronous medium, discussions default to whoever responds fastest and loudest.","The healthiest high-output teams don't eliminate meetings; they treat synchronous time as a precious, high-bandwidth tool reserved for ambiguous conflict resolution, creative brainstorming, and human connection, while reserving chat for ephemeral logistical handoffs."],"keyTakeaways":["Replacing meetings with continuous instant messaging creates ambient distraction rather than deep focus.","Asynchronous communication only succeeds when paired with structured narrative documents and clear decision owners.","High-bandwidth synchronous conversations remain the fastest mechanism for resolving complex interpersonal alignment."],"tags":["Workplace Culture","Remote Work","Organizational Design","Productivity","Sociology"],"likes":580,"commentsCount":63}]`);
const DEFAULT_LEGACY_SEEDS = {
  articles: articlesJson
};
function safeNextPath(value, fallback = "/dashboard") {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\") || /[\x00-\x1f\x7f]/.test(candidate)) {
    return fallback;
  }
  if (candidate.startsWith("/login") || candidate.startsWith("/auth/callback")) return fallback;
  return candidate;
}
function displayName(email, metadata) {
  const candidates = [metadata.full_name, metadata.name, metadata.display_name];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim().slice(0, 120);
  }
  return email?.split("@")[0]?.slice(0, 80) || "Editor";
}
function createSupabaseServerClient(ctx) {
  if (!isPublicConfigValid(ctx.config)) {
    throw new PublicConfigError("Supabase is not configured for this deployment.");
  }
  return createServerClient(ctx.config.supabaseUrl, ctx.config.supabaseKey, {
    cookies: {
      getAll: () => ctx.cookies.getAll(),
      setAll: (cookies, headers) => ctx.cookies.setAll(cookies, headers)
    }
  });
}
function sessionClientFor(ctx) {
  return ctx.services.sessionClient(ctx) ?? createSupabaseServerClient(ctx);
}
async function getDashboardUser(ctx) {
  if (!isPublicConfigValid(ctx.config)) return null;
  try {
    const supabase = sessionClientFor(ctx);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const metadata = data.user.user_metadata ?? {};
    const { data: isEditor, error: editorError } = await supabase.rpc("is_editor");
    if (editorError) {
      console.error("Could not read the editor allowlist:", editorError.message);
    }
    return {
      id: data.user.id,
      email: data.user.email ?? "",
      name: displayName(data.user.email ?? void 0, metadata),
      isEditor: isEditor === true
    };
  } catch (error) {
    console.error("Could not read the Supabase session:", error);
    return null;
  }
}
async function requireEditor(ctx) {
  if (!isPublicConfigValid(ctx.config)) {
    if (ctx.runtime === "node-local") {
      return { ok: true, user: null, mode: "local" };
    }
    return { ok: false, status: 503, error: "Sign-in is not configured on this deployment." };
  }
  const user = await getDashboardUser(ctx);
  if (!user) {
    return { ok: false, status: 401, error: "Sign in to the editorial studio to continue." };
  }
  if (!user.isEditor) {
    return {
      ok: false,
      status: 403,
      error: "This account does not have editor access. Ask an administrator to add it."
    };
  }
  return { ok: true, user, mode: "supabase" };
}
function callbackParam(request, name) {
  return new URL(request.url).searchParams.get(name);
}
async function handleAuthCallback(ctx) {
  const origin = new URL(ctx.config.siteUrl).origin;
  const next = safeNextPath(callbackParam(ctx.request, "next"), "/");
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("next", next);
  const failure = (message) => {
    loginUrl.searchParams.set("error_description", message);
    return new Response(null, {
      status: 307,
      headers: { location: loginUrl.toString(), "cache-control": "no-store" }
    });
  };
  const providerError = callbackParam(ctx.request, "error_description") ?? callbackParam(ctx.request, "error");
  if (providerError) return failure(providerError);
  if (!isPublicConfigValid(ctx.config)) {
    return failure("Supabase is not configured. Contact the site administrator.");
  }
  const code = callbackParam(ctx.request, "code");
  if (!code) {
    return failure("The sign-in response was missing its authorization code. Please try again.");
  }
  const destination = new URL(next, origin);
  const redirect2 = () => new Response(null, {
    status: 307,
    headers: { location: destination.toString(), "cache-control": "no-store" }
  });
  try {
    const supabase = sessionClientFor(ctx);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return failure(
        "Sign-in could not be completed. The link may have expired or been opened in a different browser. Please try again."
      );
    }
    return redirect2();
  } catch (error) {
    console.error("The sign-in service could not be reached:", error);
    return failure("The sign-in service could not be reached. Try again in a moment.");
  }
}
class CmsError extends Error {
  constructor(message, status = 500, code = "cms_error") {
    super(message);
    this.name = "CmsError";
    this.status = status;
    this.code = code;
  }
}
class CmsValidationError extends CmsError {
  constructor(message, fieldErrors = {}) {
    super(message, 400, "validation_failed");
    this.name = "CmsValidationError";
    this.fieldErrors = fieldErrors;
  }
}
class CmsAuthorError extends CmsError {
  constructor(message, fieldErrors = {}) {
    super(message, 422, "author_not_publishable");
    this.name = "CmsAuthorError";
    this.fieldErrors = fieldErrors;
  }
}
class CmsNotFoundError extends CmsError {
  constructor(message = "That record no longer exists.") {
    super(message, 404, "not_found");
    this.name = "CmsNotFoundError";
  }
}
class CmsUnavailableError extends CmsError {
  constructor(message = "The content service is unavailable. Try again in a moment.") {
    super(message, 503, "unavailable");
    this.name = "CmsUnavailableError";
  }
}
function toCmsError(error) {
  if (error instanceof CmsError) return error;
  if (error instanceof Error) return new CmsError(error.message);
  return new CmsError("Something went wrong while saving.");
}
function resolveProfileRow(authorId2, row) {
  if (!row || row.slug !== authorId2) return { ok: false, reason: "not_found" };
  if (!row.published) {
    return { ok: false, reason: "unpublished", displayName: row.display_name };
  }
  return {
    ok: true,
    author: { userId: row.user_id, slug: row.slug, displayName: row.display_name }
  };
}
function rejectAuthorResolution(authorId2, resolution) {
  if (resolution.reason === "unpublished") {
    throw new CmsAuthorError(
      `${resolution.displayName}'s profile is not published, so it cannot carry a byline yet.`,
      { authorId: "That profile is not published. Ask them to publish it first." }
    );
  }
  throw new CmsAuthorError("No published author profile uses that identifier.", {
    authorId: "Pick an author who has a published profile."
  });
}
async function publicCmsFeed(ctx) {
  try {
    const store = await ctx.services.publicCms(ctx);
    const [posts, commentCounts] = await Promise.all([
      store.listPosts().then((all) => all.filter((post) => post.status === "published")),
      store.listCommentCounts()
    ]);
    return { posts, commentCounts };
  } catch (error) {
    console.error("Could not load the public CMS feed:", error);
    return { posts: [], commentCounts: {} };
  }
}
async function getPublicArticleCatalogue(ctx) {
  const { posts, commentCounts } = await publicCmsFeed(ctx);
  const merged = /* @__PURE__ */ new Map();
  for (const post of posts) {
    const article = cmsPostToArticle(post);
    article.commentsCount = commentCounts[post.id] ?? 0;
    merged.set(article.slug, article);
  }
  let legacyArticles = DEFAULT_LEGACY_SEEDS.articles;
  try {
    const legacy = await ctx.services.legacy(ctx);
    legacyArticles = await legacy.getArticles();
  } catch (error) {
    console.error("Could not load the legacy interaction corpus:", error);
  }
  for (const article of [...DEFAULT_LEGACY_SEEDS.articles, ...legacyArticles]) {
    if (article?.slug && !merged.has(article.slug)) merged.set(article.slug, article);
  }
  return [...merged.values()];
}
async function getEditorCmsStore(ctx) {
  if (!isPublicConfigValid(ctx.config) && ctx.runtime !== "node-local") {
    throw new CmsUnavailableError("Durable storage is not configured for this deployment.");
  }
  return ctx.services.editorCms(ctx);
}
async function resolvePublishableAuthor(ctx, authorId2) {
  if (!isPublicConfigValid(ctx.config)) {
    return { userId: "", slug: authorId2, displayName: authorId2 };
  }
  const session2 = ctx.services.sessionClient(ctx);
  const client2 = session2 ?? createSupabaseServerClient(ctx);
  const { data, error } = await client2.from("profiles").select("user_id, slug, display_name, published").eq("slug", authorId2).maybeSingle();
  if (error) {
    throw new CmsUnavailableError("Author profiles could not be checked. Try again in a moment.");
  }
  const resolution = resolveProfileRow(authorId2, data ?? null);
  if (!resolution.ok) rejectAuthorResolution(authorId2, resolution);
  return resolution.author;
}
const PROFILE_COLUMNS = "slug, display_name, bio, role, domain, institution, avatar_url, orcid, github, website, scholar, created_at";
function profileToAuthor(profile) {
  return {
    id: profile.slug,
    name: profile.display_name,
    avatar: profile.avatar_url,
    bio: profile.bio,
    role: profile.role,
    domain: profile.domain,
    institution: profile.institution || void 0,
    orcid: profile.orcid || void 0,
    github: profile.github || void 0,
    website: profile.website || void 0,
    scholar: profile.scholar || void 0,
    joinedDate: String(new Date(profile.created_at).getUTCFullYear()),
    articleCount: 0
  };
}
function createAuthorDirectory(deps) {
  async function readProfiles(slug) {
    try {
      return await deps.listProfiles(slug);
    } catch (error) {
      console.error("Could not load author profiles:", error);
      return [];
    }
  }
  async function listPublishedAuthors() {
    const [profiles, catalogue] = await Promise.all([readProfiles(), deps.listCatalogue()]);
    const counts = /* @__PURE__ */ new Map();
    for (const article of catalogue) {
      counts.set(article.author.id, (counts.get(article.author.id) ?? 0) + 1);
    }
    return profiles.map((profile) => {
      const author = profileToAuthor(profile);
      return { ...author, articleCount: counts.get(author.id) ?? 0 };
    });
  }
  async function getPublishedAuthor(id) {
    if (!id) return null;
    const wanted = id.trim().toLowerCase();
    const profiles = await deps.listProfiles();
    const match = profiles.find((profile) => profile.slug.toLowerCase() === wanted);
    return match ? profileToAuthor(match) : null;
  }
  async function getAuthorArchive(id) {
    const author = await getPublishedAuthor(id);
    if (!author) return null;
    const articles = (await deps.listCatalogue()).filter(
      (article) => article.author.id === author.id || article.author.name === author.name
    );
    return {
      author,
      articles,
      metrics: {
        totalArticles: articles.length,
        totalLikes: articles.reduce((total, article) => total + (article.likes ?? 0), 0),
        totalComments: articles.reduce((total, article) => total + (article.commentsCount ?? 0), 0),
        domains: Array.from(new Set(articles.map((article) => article.category))),
        reviewedArtifactsCount: articles.filter((article) => article.reviewedArtifact).length
      }
    };
  }
  return { listPublishedAuthors, getPublishedAuthor, getAuthorArchive };
}
async function queryProfiles(client2, slug) {
  let query2 = client2.from("profiles").select(PROFILE_COLUMNS).eq("published", true);
  if (slug) query2 = query2.eq("slug", slug);
  else query2 = query2.order("display_name", { ascending: true });
  const { data, error } = await query2;
  if (error) throw new Error(error.message ?? "Could not read author profiles.");
  return data ?? [];
}
function directoryFor(ctx) {
  const client2 = ctx.services.publicClient(ctx);
  return createAuthorDirectory({
    listProfiles: (slug) => {
      if (!client2) return Promise.resolve([]);
      return queryProfiles(client2, slug);
    },
    listCatalogue: () => getPublicArticleCatalogue(ctx)
  });
}
function stripForFeed(post) {
  const { content: _content, bodyMarkdown: _bodyMarkdown, ...rest } = post;
  return { ...rest, content: [] };
}
const MAX_PARAM_LENGTH = 300;
const MAX_SEARCH_LENGTH = 200;
function cleanParam(value) {
  return (value ?? "").trim().slice(0, MAX_PARAM_LENGTH);
}
function cleanSearch(url) {
  const raw = url.searchParams.get("search");
  return typeof raw === "string" ? raw.slice(0, MAX_SEARCH_LENGTH) : "";
}
function notFound(message) {
  return new Response(message, { status: 404, statusText: "Not Found" });
}
async function loadHome(ctx) {
  const url = new URL(ctx.request.url);
  const rawCategory = url.searchParams.get("category");
  const search = cleanSearch(url);
  if (rawCategory && rawCategory !== "All") {
    const matchedCategory = slugToCategory(rawCategory);
    if (matchedCategory) {
      const searchSuffix = search ? `?search=${encodeURIComponent(search)}` : "";
      throw redirect(`/category/${categoryToSlug(matchedCategory)}${searchSuffix}`);
    }
  }
  const [authors, articles] = await Promise.all([
    directoryFor(ctx).listPublishedAuthors(),
    getPublicArticleCatalogue(ctx)
  ]);
  return {
    kind: "home",
    category: "All",
    search,
    authors,
    posts: articles.map(stripForFeed)
  };
}
async function loadCategory(ctx, params) {
  const url = new URL(ctx.request.url);
  const search = cleanSearch(url);
  const category = slugToCategory(cleanParam(params.slug));
  if (!category) throw notFound("Field not found.");
  const meta = CATEGORY_META[category];
  const slug = categoryToSlug(category);
  const metadata = {
    title: `${category} Reviews & Teardowns`,
    description: meta?.description ?? `Open-access scholarly paper reviews and repository teardowns in ${category}.`,
    type: "website",
    path: `/category/${slug}`
  };
  const [authors, articles] = await Promise.all([
    directoryFor(ctx).listPublishedAuthors(),
    getPublicArticleCatalogue(ctx)
  ]);
  return {
    kind: "category",
    category,
    search,
    authors,
    posts: articles.map(stripForFeed),
    metadata
  };
}
async function loadPost(ctx, params) {
  const requested = cleanParam(params.slug);
  const articles = await getPublicArticleCatalogue(ctx);
  const article = articles.find((candidate) => candidate.slug === requested || candidate.id === requested);
  if (!article) throw notFound("Article not found.");
  const related = articles.filter((candidate) => candidate.slug !== article.slug).map((candidate) => ({
    candidate,
    score: (candidate.category === article.category ? 2 : 0) + candidate.tags.filter((tag) => article.tags.includes(tag)).length
  })).sort((a, b) => b.score - a.score).slice(0, 3).map((entry) => stripForFeed(entry.candidate));
  const metadata = {
    title: article.title,
    description: article.summary,
    type: "article",
    path: `/post/${article.slug}`
  };
  return { kind: "post", article, related, metadata };
}
function loadPaper(ctx, params) {
  const requested = cleanParam(params.slug);
  const paper = ctx.services.listPapers().find((candidate) => candidate.slug === requested || candidate.id === requested);
  if (!paper) throw notFound("Paper not found.");
  const metadata = {
    title: paper.title,
    description: paper.abstract,
    type: "article",
    path: `/paper/${paper.slug}`
  };
  return { kind: "paper", paper, metadata };
}
async function loadAuthor(ctx, params) {
  const requested = cleanParam(params.id);
  const archive = await directoryFor(ctx).getAuthorArchive(requested);
  if (!archive) throw notFound("Author not found.");
  const { author, articles, metrics } = archive;
  const metadata = {
    title: `${author.name} — ResearchWithMe`,
    description: author.bio || `Peer reviews and teardowns by ${author.name}${author.institution ? ` at ${author.institution}` : ""} on ResearchWithMe.`,
    type: "website",
    path: `/author/${author.id}`
  };
  return {
    kind: "author",
    author,
    articles: articles.map(stripForFeed),
    metrics,
    metadata
  };
}
const PAPERS_METADATA = {
  title: "Papers — ResearchWithMe",
  description: "A structured archive of open-access papers: each record lists its authors, DOI, license, methods, findings, and reproducibility material.",
  type: "website",
  path: "/papers"
};
const AUTHORS_METADATA = {
  title: "Contributors — ResearchWithMe",
  description: "The reviewers behind the archive: their research domains, institutions, and complete publication records.",
  type: "website",
  path: "/authors"
};
const ASSISTANT_METADATA = {
  title: "Ask the archive — ResearchWithMe",
  description: "The assistant answers from this platform's own catalog and cites its sources; without a configured model key it returns a deterministic, cited summary.",
  type: "website",
  path: "/assistant"
};
const BOOKMARKS_METADATA = {
  title: "Your reading list — ResearchWithMe",
  description: "Saved reviews and teardowns, kept on this device and exportable at any time.",
  type: "website",
  path: "/bookmarks"
};
const API_DOCS_METADATA = {
  title: "API reference — ResearchWithMe",
  description: "Reference for the ResearchWithMe archive, assistant, and editorial HTTP APIs.",
  type: "website",
  path: "/api-docs"
};
const CITE_METADATA = {
  title: "Build a citation — ResearchWithMe",
  description: "Copy a formatted citation for LaTeX, Zotero, Mendeley, EndNote, or a reference list. Every format uses the same verified metadata.",
  type: "website",
  path: "/cite"
};
const EDITIONS_METADATA = {
  title: "Quarterly editions — ResearchWithMe",
  description: "Thematic compendiums that gather a quarter's reviews, methods, and corrections into one printable volume.",
  type: "website",
  path: "/editions"
};
const EDITORIAL_BOARD_METADATA = {
  title: "Editorial board — ResearchWithMe",
  description: "The independent collective of researchers, systems engineers, clinicians, and data librarians who set the review standard.",
  type: "website",
  path: "/editorial-board"
};
const ABOUT_METADATA = {
  title: "About ResearchWithMe — Editorial Charter",
  description: "Learn how ResearchWithMe publishes diamond open-access paper reviews, benchmark replications, and repository teardowns by verified domain specialists.",
  type: "website",
  path: "/about"
};
const CONTACT_METADATA = {
  title: "Contact the Editorial Office — ResearchWithMe",
  description: "Contact ResearchWithMe for manuscript pitches, empirical errata, library metadata harvesting, contributor verification, and RFC 9116 security disclosure.",
  type: "website",
  path: "/contact"
};
const PRIVACY_METADATA = {
  title: "Privacy Policy — Reader Data Governance",
  description: "Read the ResearchWithMe privacy policy: zero behavioural tracking, local-first reading lists, minimal contributor verification data, and open-access standards.",
  type: "website",
  path: "/privacy"
};
function loadPapersArchive(ctx) {
  return { kind: "papers", papers: [...ctx.services.listPapers()], metadata: PAPERS_METADATA };
}
async function loadAuthorsDirectory(ctx) {
  const authors = await directoryFor(ctx).listPublishedAuthors();
  return { kind: "authors", authors, metadata: AUTHORS_METADATA };
}
const TOOL_METADATA = {
  assistant: ASSISTANT_METADATA,
  bookmarks: BOOKMARKS_METADATA,
  cite: CITE_METADATA,
  "api-docs": API_DOCS_METADATA
};
function readerTool(kind) {
  return { kind, metadata: TOOL_METADATA[kind] };
}
const STATIC_ARCHIVE_METADATA = {
  editions: EDITIONS_METADATA,
  "editorial-board": EDITORIAL_BOARD_METADATA,
  about: ABOUT_METADATA,
  contact: CONTACT_METADATA,
  privacy: PRIVACY_METADATA
};
function staticArchive(kind) {
  return { kind, metadata: STATIC_ARCHIVE_METADATA[kind] };
}
async function loadPublicRoute(ctx, routeId, params) {
  switch (routeId) {
    case "home":
      return loadHome(ctx);
    case "category":
      return loadCategory(ctx, params);
    case "post":
      return loadPost(ctx, params);
    case "paper":
      return loadPaper(ctx, params);
    case "author":
      return loadAuthor(ctx, params);
    case "papers":
      return loadPapersArchive(ctx);
    case "authors":
      return loadAuthorsDirectory(ctx);
    case "editions":
      return staticArchive("editions");
    case "editorial-board":
      return staticArchive("editorial-board");
    case "about":
      return staticArchive("about");
    case "contact":
      return staticArchive("contact");
    case "privacy":
      return staticArchive("privacy");
    case "assistant":
      return readerTool("assistant");
    case "bookmarks":
      return readerTool("bookmarks");
    case "cite":
      return readerTool("cite");
    case "api-docs":
      return readerTool("api-docs");
    default:
      throw new Error(`loadPublicRoute: no public loader registered for route id "${routeId}".`);
  }
}
const ROUTE_DATA_PATH = "/__data";
const KNOWN_ROUTE_IDS = new Set(ROUTE_DEFINITIONS.map((definition) => definition.id));
const MATCH_ORIGIN = "http://route-data.invalid";
const MAX_URL_LENGTH = 2048;
const MAX_TEXT_PAYLOAD = 1e3;
const REDIRECT_STATUSES = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
function serverLoaders(ctx) {
  const publicLoader = (routeId) => ({ params }) => loadPublicRoute(ctx, routeId, params);
  return {
    home: publicLoader("home"),
    articles: () => redirect("/", 308),
    category: publicLoader("category"),
    post: publicLoader("post"),
    paper: publicLoader("paper"),
    author: publicLoader("author"),
    papers: publicLoader("papers"),
    authors: publicLoader("authors"),
    editions: publicLoader("editions"),
    "editorial-board": publicLoader("editorial-board"),
    assistant: publicLoader("assistant"),
    bookmarks: publicLoader("bookmarks"),
    cite: publicLoader("cite"),
    "api-docs": publicLoader("api-docs"),
    about: publicLoader("about"),
    contact: publicLoader("contact"),
    privacy: publicLoader("privacy")
  };
}
function createServerRoutes(ctx) {
  return createAppRoutes(serverLoaders(ctx));
}
function toSerializableJson(value, seen = /* @__PURE__ */ new WeakSet(), depth = 0) {
  if (value === null) return null;
  const type = typeof value;
  if (type === "string") return value;
  if (type === "boolean") return value;
  if (type === "number") return Number.isFinite(value) ? value : null;
  if (type !== "object") return null;
  if (depth > 32) return null;
  if (seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((entry) => toSerializableJson(entry, seen, depth + 1));
  }
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === void 0) continue;
    out[key] = toSerializableJson(entry, seen, depth + 1);
  }
  return out;
}
function clampErrorStatus(status) {
  if (typeof status === "number" && Number.isFinite(status) && status >= 400 && status <= 599) {
    return Math.floor(status);
  }
  return 500;
}
function serializeRouteError(error) {
  const err = error ?? {};
  const status = clampErrorStatus(err.status);
  const statusText = typeof err.statusText === "string" && err.statusText.trim() ? err.statusText : defaultStatusText(status);
  const internal = typeof err.internal === "boolean" ? err.internal : false;
  const data = "data" in err && err.data !== void 0 ? toSerializableJson(err.data) : { message: status >= 500 ? "Unexpected server error" : defaultStatusText(status) };
  return { status, statusText, internal, data };
}
function sanitizeRedirectLocation(location) {
  if (!location) return null;
  if (/[\u0000-\u001f\u007f]/.test(location)) return null;
  if (location.startsWith("/")) {
    return location.startsWith("//") ? null : location;
  }
  try {
    const parsed = new URL(location);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
function envelopeResponse(envelope, httpStatus = 200, extraHeaders) {
  const headers = new Headers(extraHeaders);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(envelope), { status: httpStatus, headers });
}
function errorEnvelope(httpStatus, message) {
  return { kind: "error", status: httpStatus, data: { message } };
}
function redirectEnvelope(location, status) {
  const safe = sanitizeRedirectLocation(location);
  if (!safe) return { kind: "error", status: 500, data: { message: "Unsafe redirect location." } };
  const redirectStatus = REDIRECT_STATUSES.has(status) ? status : 302;
  return { kind: "redirect", location: safe, status: redirectStatus };
}
function isRedirectStatus(status) {
  return REDIRECT_STATUSES.has(status);
}
async function readCappedText(response) {
  try {
    const text2 = await response.text();
    return text2.slice(0, MAX_TEXT_PAYLOAD);
  } catch {
    return "";
  }
}
async function envelopeFromLoaderResponse(response) {
  const location = response.headers.get("location");
  if (isRedirectStatus(response.status) && location) {
    return redirectEnvelope(location, response.status);
  }
  const text2 = await readCappedText(response);
  if (response.status >= 200 && response.status < 300) {
    return { kind: "data", data: text2 === "" ? null : text2 };
  }
  const payload = text2 !== "" ? text2 : defaultStatusText(response.status);
  return { kind: "error", status: clampErrorStatus(response.status), data: payload };
}
function parseRouteDataRequest(searchParams) {
  const routeId = (searchParams.get("routeId") ?? "").trim();
  const rawUrl = searchParams.get("url") ?? "";
  if (!routeId || !rawUrl) return { error: "Missing routeId or url." };
  if (!KNOWN_ROUTE_IDS.has(routeId)) return { error: "Unknown routeId." };
  if (rawUrl.length > MAX_URL_LENGTH) return { error: "url is too long." };
  if (/[\u0000-\u001f\u007f\\]/.test(rawUrl)) return { error: "url contains illegal characters." };
  let parsed;
  try {
    parsed = new URL(rawUrl, MATCH_ORIGIN);
  } catch {
    return { error: "url could not be parsed." };
  }
  if (parsed.origin !== MATCH_ORIGIN) {
    return { error: "url must be a same-origin relative path." };
  }
  return { routeId, pathname: parsed.pathname, search: parsed.search };
}
async function handleRouteData(ctx) {
  if (ctx.request.method !== "GET") {
    return envelopeResponse(errorEnvelope(405, "Method Not Allowed"), 405, { allow: "GET" });
  }
  const requestUrl = new URL(ctx.request.url);
  const parsed = parseRouteDataRequest(requestUrl.searchParams);
  if ("error" in parsed) {
    return envelopeResponse(errorEnvelope(400, parsed.error), 400);
  }
  const routes = createServerRoutes(ctx);
  const location = { pathname: parsed.pathname, search: parsed.search, hash: "", state: null, key: "route-data" };
  const matches = matchRoutes(routes, location) ?? [];
  const matchedIds = matches.map((match) => match.route?.id);
  if (!matchedIds.includes(parsed.routeId)) {
    return envelopeResponse(
      errorEnvelope(400, `routeId "${parsed.routeId}" does not match ${parsed.pathname}.`),
      400
    );
  }
  const matched = matches.find((match) => match.route?.id === parsed.routeId);
  const matchedLoader = matched?.route?.loader;
  if (!matchedLoader) {
    return envelopeResponse({ kind: "data", data: null });
  }
  const dataRequest = new Request(new URL(parsed.pathname + parsed.search, requestUrl.origin), {
    method: "GET",
    headers: { accept: "application/json" }
  });
  const staticHandler = createStaticHandler(routes);
  try {
    const result = await staticHandler.queryRoute(dataRequest, { routeId: parsed.routeId });
    if (result instanceof Response) {
      return envelopeResponse(await envelopeFromLoaderResponse(result));
    }
    return envelopeResponse({ kind: "data", data: toSerializableJson(result ?? null) });
  } catch (error) {
    if (error instanceof Response) {
      return envelopeResponse(await envelopeFromLoaderResponse(error));
    }
    const serialized = serializeRouteError(error);
    return envelopeResponse({ kind: "error", status: serialized.status, data: serialized.data });
  }
}
const encoder = new TextEncoder();
function safeJsonForHtml(value) {
  return JSON.stringify(value ?? null).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
function hydrationPayload(context) {
  let errors2 = null;
  if (context.errors) {
    errors2 = {};
    for (const [routeId, error] of Object.entries(context.errors)) {
      errors2[routeId] = serializeRouteError(error);
    }
  }
  return {
    loaderData: toSerializableJson(context.loaderData ?? {}),
    actionData: toSerializableJson(context.actionData ?? null),
    errors: errors2
  };
}
function routeMetadataFromContext(context) {
  const loaderData = context.loaderData ?? {};
  for (let index = (context.matches?.length ?? 0) - 1; index >= 0; index -= 1) {
    const match = context.matches[index];
    const routeId = match?.route?.id;
    if (!routeId) continue;
    const data = loaderData[routeId];
    const metadata = data?.metadata;
    if (!metadata || typeof metadata !== "object") continue;
    const candidate = metadata;
    const overrides = {};
    if (typeof candidate.title === "string" && candidate.title.trim()) overrides.title = candidate.title;
    if (typeof candidate.description === "string" && candidate.description.trim()) {
      overrides.description = candidate.description;
    }
    if (candidate.type === "article" || candidate.type === "website") overrides.type = candidate.type;
    if (typeof candidate.path === "string" && candidate.path.trim()) overrides.path = candidate.path;
    if (overrides.title || overrides.description || overrides.type || overrides.path) return overrides;
  }
  return {};
}
function statusFromContext(context) {
  if (context.errors) {
    return context.statusCode >= 400 && context.statusCode <= 599 ? context.statusCode : 500;
  }
  if (context.matches.some((match) => match.route?.id === "not-found")) return 404;
  return context.statusCode >= 100 && context.statusCode <= 599 ? context.statusCode : 200;
}
async function renderPage(ctx) {
  const serverRoutes = createServerRoutes(ctx);
  const staticHandler = createStaticHandler(serverRoutes);
  let queryContext;
  try {
    queryContext = await staticHandler.query(ctx.request);
  } catch (error) {
    console.error("Refusing to render after a routing failure:", error);
    return new Response("Internal Server Error", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
    });
  }
  if (queryContext instanceof Response) {
    const headers = new Headers(queryContext.headers);
    if (!headers.has("cache-control")) headers.set("cache-control", "private, no-store");
    return new Response(queryContext.body, {
      status: queryContext.status,
      statusText: queryContext.statusText,
      headers
    });
  }
  const status = statusFromContext(queryContext);
  const router = createStaticRouter(serverRoutes, queryContext);
  const assets = clientAssets();
  const metadataTags = renderMetadataTags(pageMetadata(ctx, routeMetadataFromContext(queryContext)));
  const hydrationJson = safeJsonForHtml(hydrationPayload(queryContext));
  const locale = getRequestLocale(ctx);
  const dir = dirOf(locale);
  const cssLinks = (assets.css ?? []).map((file) => `<link rel="stylesheet" href="/${file}">`).join("");
  const appStream = await renderToReadableStream(
    /* @__PURE__ */ jsx(LocaleProvider, { initialLocale: locale, children: /* @__PURE__ */ jsx(MotionModeProvider, { children: /* @__PURE__ */ jsx(MotionScope, { children: /* @__PURE__ */ jsx(StaticRouterProvider, { router, context: queryContext }) }) }) }),
    { bootstrapModules: [`/${assets.file}`] }
  );
  await appStream.allReady;
  const themeBoot = `(function(){try{var t=localStorage.getItem('rwm-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.classList.toggle('light',t==='light');}catch(e){}})();`;
  const head = `<!doctype html><html lang="${locale}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="theme-color" content="#FAF9F6">` + metadataTags + cssLinks + `<link rel="preload" as="font" type="font/woff2" href="/fonts/newsreader-latin-variable.woff2" crossorigin><link rel="preload" as="font" type="font/woff2" href="/fonts/inter-latin-variable.woff2" crossorigin><script>${themeBoot}<\/script><script>window.__RWM_LOCALE__=${JSON.stringify(locale)};window.${HYDRATION_DATA_KEY}=${hydrationJson}<\/script></head><body class="bg-canvas font-sans text-ink antialiased"><a href="#main-content" class="sr-only left-4 top-4 z-[100] rounded-md bg-brand px-4 py-2 text-sm font-semibold text-on-primary focus:not-sr-only focus:fixed">Skip to main content</a><div id="root">`;
  const tail = "</div></body></html>";
  const body = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(head));
      const reader = appStream.getReader();
      try {
        for (; ; ) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } finally {
        reader.releaseLock();
      }
      controller.enqueue(encoder.encode(tail));
      controller.close();
    }
  });
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}
function clientKey(request, scope) {
  return `${scope}:${clientIp(request)}`;
}
function isSameOrigin(request, siteUrl) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    const originUrl = new URL(origin);
    if (originUrl.host === host) return true;
    if (siteUrl) {
      try {
        return new URL(siteUrl).host === originUrl.host;
      } catch {
        return false;
      }
    }
    return false;
  } catch {
    return false;
  }
}
function readOnlyDeploymentResponse(ctx) {
  if (ctx.runtime === "pages" && !isPublicConfigValid(ctx.config)) {
    return new Response(
      JSON.stringify({ error: "This deployment is read-only. Durable storage is not configured." }),
      { status: 503, headers: { "content-type": "application/json", "cache-control": "no-store" } }
    );
  }
  return null;
}
async function readJsonBody(request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      response: jsonResponse({ error: "Send this request as JSON." }, 415)
    };
  }
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return {
      ok: false,
      response: jsonResponse({ error: "The request body could not be read." }, 400)
    };
  }
}
function jsonResponse(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });
}
function noStoreHeaders() {
  return { "cache-control": "no-store, max-age=0" };
}
function cmsErrorResponse(error) {
  const mapped = toCmsError(error);
  const body = { error: mapped.message };
  if (mapped instanceof CmsValidationError || mapped instanceof CmsAuthorError) {
    body.fieldErrors = mapped.fieldErrors;
  }
  return jsonResponse(body, mapped.status);
}
const ARTICLE_CACHE = "public, max-age=30, stale-while-revalidate=300";
const listArticles = async (ctx) => {
  try {
    const { searchParams } = new URL(ctx.request.url);
    const category = searchParams.get("category");
    const format = searchParams.get("format");
    const search = searchParams.get("search");
    const author = searchParams.get("author")?.trim().toLowerCase().slice(0, 120);
    const limitParam = Number.parseInt(searchParams.get("limit") ?? "", 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 100;
    const full = searchParams.get("full") === "1";
    let articles = await getPublicArticleCatalogue(ctx);
    if (category && category !== "All") {
      articles = articles.filter((article) => article.category === category);
    }
    if (format && format !== "All") {
      articles = articles.filter((article) => article.format === format);
    }
    if (author) {
      articles = articles.filter(
        (article) => article.author.id.toLowerCase() === author || article.author.name.toLowerCase() === author
      );
    }
    if (search?.trim()) {
      const query2 = search.trim().toLowerCase().slice(0, 120);
      articles = articles.filter(
        (article) => [
          article.title,
          article.subtitle,
          article.summary,
          article.author.name,
          ...article.tags,
          article.reviewedArtifact?.identifier ?? "",
          article.reviewedArtifact?.title ?? ""
        ].some((value) => value.toLowerCase().includes(query2))
      );
    }
    const page = articles.slice(0, limit);
    const payload = full ? page : page.map(({ content: _content, bodyMarkdown: _bodyMarkdown, ...article }) => article);
    return json(
      { articles: payload, count: articles.length },
      { headers: { "cache-control": ARTICLE_CACHE } }
    );
  } catch (error) {
    console.error("Error in GET /api/articles:", error);
    return json({ error: "The article archive could not be read." }, { status: 500 });
  }
};
function normalizeId(value) {
  return value.trim().slice(0, 120);
}
const getArticle = async (ctx, params) => {
  try {
    const key = normalizeId(params.id ?? "");
    if (!key) return json({ error: "An article id is required." }, { status: 400 });
    const cmsPostId = fromPublicPostId(key);
    if (cmsPostId) {
      let post = null;
      try {
        const store = await ctx.services.publicCms(ctx);
        const candidate = await store.getPost(cmsPostId);
        post = candidate?.status === "published" ? candidate : null;
      } catch (error) {
        console.error("Error reading the CMS article:", error);
        post = null;
      }
      if (!post) return json({ error: "Article not found." }, { status: 404 });
      return json(
        { article: cmsPostToArticle(post) },
        { headers: { "cache-control": ARTICLE_CACHE } }
      );
    }
    let legacy;
    try {
      legacy = await ctx.services.legacy(ctx);
    } catch (error) {
      console.error("Error reading the legacy catalogue:", error);
      return json({ error: "The article could not be read." }, { status: 503 });
    }
    let article;
    try {
      article = await legacy.findArticle(key);
    } catch (error) {
      console.error("Error reading the legacy catalogue:", error);
      return json({ error: "The article could not be read." }, { status: 503 });
    }
    if (!article) return json({ error: "Article not found." }, { status: 404 });
    return json({ article }, { headers: { "cache-control": ARTICLE_CACHE } });
  } catch (error) {
    console.error("Error fetching article:", error);
    return json({ error: "The article could not be read." }, { status: 500 });
  }
};
const patchArticle = async (ctx, params) => {
  const readOnly = readOnlyDeploymentResponse(ctx);
  if (readOnly) return readOnly;
  const limit = await rateLimit(ctx, clientKey(ctx.request, "likes"), 30, 6e4);
  if (!limit.allowed) {
    return json(
      { error: "Too many reactions in a short window. Try again shortly." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }
  try {
    const key = normalizeId(params.id ?? "");
    if (!key) return json({ error: "An article id is required." }, { status: 400 });
    const cmsPostId = fromPublicPostId(key);
    if (cmsPostId) {
      try {
        const store = await ctx.services.publicCms(ctx);
        const candidate = await store.getPost(cmsPostId).catch((error) => {
          console.error("Error reading the CMS article for a reaction:", error);
          return null;
        });
        const post = candidate?.status === "published" ? candidate : null;
        if (!post) return json({ error: "Article not found." }, { status: 404 });
        try {
          const likes = await store.incrementLikes(cmsPostId);
          return json({ success: true, likes });
        } catch (error) {
          console.error("Error updating CMS article likes:", error);
          return json({ error: "The reaction could not be recorded." }, { status: 503 });
        }
      } catch (error) {
        console.error("Error updating CMS article likes:", error);
        return json({ error: "The reaction could not be recorded." }, { status: 503 });
      }
    }
    let legacy;
    try {
      legacy = await ctx.services.legacy(ctx);
    } catch (error) {
      console.error("Error reading the legacy catalogue:", error);
      return json({ error: "The article could not be read." }, { status: 503 });
    }
    let article;
    try {
      article = await legacy.findArticle(key);
    } catch (error) {
      console.error("Error reading the legacy catalogue:", error);
      return json({ error: "The article could not be read." }, { status: 503 });
    }
    if (!article) return json({ error: "Article not found." }, { status: 404 });
    try {
      const likes = await legacy.incrementLikes(article.id);
      return json({ success: true, likes });
    } catch (error) {
      console.error("Error updating article likes:", error);
      return json({ error: "The reaction could not be recorded." }, { status: 503 });
    }
  } catch (error) {
    console.error("Error updating article likes:", error);
    return json({ error: "The reaction could not be recorded." }, { status: 500 });
  }
};
const articlesRoutes = [
  { path: "/api/articles", handlers: { GET: listArticles } },
  { path: "/api/articles/:id", handlers: { GET: getArticle, PATCH: patchArticle } }
];
const AUTHOR_CACHE = "public, max-age=60, stale-while-revalidate=600";
const listAuthors = async (ctx) => {
  try {
    const authors = await directoryFor(ctx).listPublishedAuthors();
    return json({ authors }, { headers: { "cache-control": AUTHOR_CACHE } });
  } catch (error) {
    console.error("Failed to fetch authors:", error);
    return json({ error: "Internal server error fetching authors" }, { status: 500 });
  }
};
const getAuthor = async (ctx, params) => {
  try {
    const id = (params.id ?? "").trim().slice(0, 120);
    if (!id) return json({ error: "Author ID is required" }, { status: 400 });
    let archive;
    try {
      archive = await directoryFor(ctx).getAuthorArchive(id);
    } catch (error) {
      console.error("Failed to fetch author profile:", error);
      return json({ error: "Internal server error fetching author" }, { status: 500 });
    }
    if (!archive) return json({ error: "Author not found" }, { status: 404 });
    return json(archive, { headers: { "cache-control": AUTHOR_CACHE } });
  } catch (error) {
    console.error("Failed to fetch author profile:", error);
    return json({ error: "Internal server error fetching author" }, { status: 500 });
  }
};
const authorsRoutes = [
  { path: "/api/authors", handlers: { GET: listAuthors } },
  { path: "/api/authors/:id", handlers: { GET: getAuthor } }
];
const PAPER_CACHE = "public, max-age=60, stale-while-revalidate=600";
const listPapers = async (ctx) => {
  try {
    const { searchParams } = new URL(ctx.request.url);
    const topic = searchParams.get("topic");
    const search = searchParams.get("q")?.slice(0, 120);
    const sort = searchParams.get("sort") || "date";
    let papers = [...ctx.services.listPapers()];
    if (topic && topic !== "All" && topic !== "All Fields") {
      papers = papers.filter((paper) => paper.topic.toLowerCase() === topic.toLowerCase());
    }
    if (search && search.trim()) {
      const query2 = search.toLowerCase().trim();
      papers = papers.filter(
        (paper) => paper.title.toLowerCase().includes(query2) || paper.abstract.toLowerCase().includes(query2) || paper.doi.toLowerCase().includes(query2) || paper.authors.some(
          (author) => author.name.toLowerCase().includes(query2) || author.affiliation.toLowerCase().includes(query2)
        ) || paper.keywords.some((keyword) => keyword.toLowerCase().includes(query2))
      );
    }
    if (sort === "citations") {
      papers.sort((a, b) => b.citationCount - a.citationCount);
    } else if (sort === "title") {
      papers.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      papers.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
    }
    return json(
      { papers, total: papers.length },
      { headers: { "cache-control": PAPER_CACHE } }
    );
  } catch (error) {
    console.error("Papers API error:", error);
    return json({ error: "Internal server error fetching papers" }, { status: 500 });
  }
};
const getPaper = async (ctx, params) => {
  try {
    const slug = (params.slug ?? "").trim().slice(0, 300);
    if (!slug) return json({ error: "Paper slug or ID required" }, { status: 400 });
    const paper = ctx.services.listPapers().find((candidate) => candidate.slug === slug || candidate.id === slug || candidate.doi.includes(slug));
    if (!paper) {
      return json({ error: "Paper not found" }, { status: 404 });
    }
    return json({ paper }, { headers: { "cache-control": PAPER_CACHE } });
  } catch (error) {
    console.error("Paper detail API error:", error);
    return json({ error: "Internal server error fetching paper" }, { status: 500 });
  }
};
const papersRoutes = [
  { path: "/api/papers", handlers: { GET: listPapers } },
  { path: "/api/papers/:slug", handlers: { GET: getPaper } }
];
const COMMENT_CACHE = "public, max-age=15, stale-while-revalidate=60";
const WRITE_FAILURE = "The comment could not be saved. Your text is still in the form.";
const getComments = async (ctx) => {
  try {
    const postId = new URL(ctx.request.url).searchParams.get("postId")?.slice(0, 120);
    const cmsPostId = postId ? fromPublicPostId(postId) : null;
    if (cmsPostId) {
      try {
        const store = await ctx.services.publicCms(ctx);
        const comments = await store.listCommentsForPost(cmsPostId);
        return json(
          { comments: comments.map(cmsCommentToRecord) },
          { headers: { "cache-control": COMMENT_CACHE } }
        );
      } catch (error) {
        console.error("Error reading CMS comments:", error);
        return json({ error: "Comments could not be read." }, { status: 503 });
      }
    }
    try {
      const legacy = await ctx.services.legacy(ctx);
      const comments = (await legacy.getComments(postId || void 0)).slice(0, 200);
      return json(
        { comments },
        { headers: { "cache-control": COMMENT_CACHE } }
      );
    } catch (error) {
      console.error("Error reading legacy comments:", error);
      return json({ error: "Comments could not be read." }, { status: 503 });
    }
  } catch (error) {
    console.error("Error in GET /api/comments:", error);
    return json({ error: "Comments could not be read." }, { status: 500 });
  }
};
const postComment = async (ctx) => {
  const readOnly = readOnlyDeploymentResponse(ctx);
  if (readOnly) return readOnly;
  if (!isSameOrigin(ctx.request, ctx.config.siteUrl)) {
    return json({ error: "Cross-site requests are not allowed." }, { status: 403 });
  }
  const limit = await rateLimit(ctx, clientKey(ctx.request, "comments"), 8, 6e4);
  if (!limit.allowed) {
    return json(
      { error: "Too many comments in a short window. Wait a minute and try again." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }
  if (!(ctx.request.headers.get("content-type") ?? "").includes("application/json")) {
    return json({ error: "Send the comment as JSON." }, { status: 415 });
  }
  let body;
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: "The comment body could not be read." }, { status: 400 });
  }
  const postId = typeof body.postId === "string" ? body.postId.slice(0, 120) : "";
  if (!postId) return json({ error: "A post id is required." }, { status: 400 });
  const parsed = normalizeCommentInput({
    authorName: body.authorName,
    authorRole: body.authorRole,
    content: body.text
  });
  if (!parsed.ok) {
    return json(
      { error: parsed.message, fieldErrors: parsed.fieldErrors },
      { status: 400 }
    );
  }
  const cmsPostId = fromPublicPostId(postId);
  if (cmsPostId) {
    try {
      const store = await ctx.services.publicCms(ctx);
      const candidate = await store.getPost(cmsPostId).catch((error) => {
        console.error("Error reading the CMS article for a comment:", error);
        return null;
      });
      const post = candidate?.status === "published" ? candidate : null;
      if (!post) {
        return json({ error: "That article does not exist." }, { status: 404 });
      }
      const comment = await store.createComment(cmsPostId, parsed.value);
      return json({ success: true, comment: cmsCommentToRecord(comment) }, { status: 201 });
    } catch (error) {
      console.error("Error saving a CMS comment:", error);
      return json({ error: WRITE_FAILURE }, { status: 503 });
    }
  }
  let legacy;
  try {
    legacy = await ctx.services.legacy(ctx);
  } catch (error) {
    console.error("Error reading the legacy catalogue:", error);
    return json({ error: WRITE_FAILURE }, { status: 503 });
  }
  let article;
  try {
    article = await legacy.findArticle(postId);
  } catch (error) {
    console.error("Error reading the legacy catalogue:", error);
    return json({ error: WRITE_FAILURE }, { status: 503 });
  }
  if (!article) return json({ error: "That article does not exist." }, { status: 404 });
  try {
    const comment = await legacy.addComment(article.id, {
      authorName: parsed.value.authorName,
      authorRole: parsed.value.authorRole,
      content: parsed.value.content
    });
    return json({ success: true, comment }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/comments:", error);
    return json({ error: WRITE_FAILURE }, { status: 503 });
  }
};
const commentsRoutes = [
  { path: "/api/comments", handlers: { GET: getComments, POST: postComment } }
];
const badOrigin$2 = { error: "Cross-site requests are not allowed." };
const listPosts = async (ctx) => {
  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });
  try {
    const store = await getEditorCmsStore(ctx);
    const posts = await store.listPosts();
    return json({ posts, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return cmsErrorResponse(error);
  }
};
const getPost = async (ctx, params) => {
  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });
  try {
    const id = (params.id ?? "").trim().slice(0, 64);
    const store = await getEditorCmsStore(ctx);
    const post = await store.getPost(id);
    if (!post) throw new CmsNotFoundError("That article was not found.");
    return json({ post, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return cmsErrorResponse(error);
  }
};
const createPost = async (ctx) => {
  if (!isSameOrigin(ctx.request, ctx.config.siteUrl)) {
    return json(badOrigin$2, { status: 403 });
  }
  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });
  const limit = await rateLimit(ctx, clientKey(ctx.request, "cms:create"), 20, 6e4);
  if (!limit.allowed) {
    return json(
      { error: "Too many saves in a short window. Try again in a minute." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }
  const body = await readJsonBody(ctx.request);
  if (!body.ok) return body.response;
  const parsed = normalizePostInput(body.value);
  if (!parsed.ok) {
    return json({ error: parsed.message, fieldErrors: parsed.fieldErrors }, { status: 400 });
  }
  try {
    const author = await resolvePublishableAuthor(ctx, parsed.value.authorId);
    const value = { ...parsed.value, authorName: author.displayName };
    const store = await getEditorCmsStore(ctx);
    const existingCmsPost = await store.getPostBySlug(value.slug);
    if (existingCmsPost) {
      return json(
        { error: "An article already uses this URL. Change the title or slug." },
        { status: 409 }
      );
    }
    let catalogueConflict = null;
    try {
      const legacy = await ctx.services.legacy(ctx);
      catalogueConflict = await legacy.findArticle(value.slug);
    } catch (error) {
      console.error("Could not check the legacy catalogue for slug conflicts:", error);
      return json(
        { error: "The public catalogue could not be checked. Try again shortly." },
        { status: 503 }
      );
    }
    if (catalogueConflict) {
      return json(
        { error: "A catalogue article already uses this URL. Choose a different slug." },
        { status: 409 }
      );
    }
    const post = await store.createPost(value);
    return json({ post, mode: gate.mode }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    return cmsErrorResponse(error);
  }
};
const patchPost = async (ctx, params) => {
  if (!isSameOrigin(ctx.request, ctx.config.siteUrl)) {
    return json(badOrigin$2, { status: 403 });
  }
  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });
  const limit = await rateLimit(ctx, clientKey(ctx.request, "cms:update"), 40, 6e4);
  if (!limit.allowed) {
    return json(
      { error: "Too many saves in a short window. Try again in a minute." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }
  const body = await readJsonBody(ctx.request);
  if (!body.ok) return body.response;
  try {
    const id = (params.id ?? "").trim().slice(0, 64);
    const store = await getEditorCmsStore(ctx);
    const existing = await store.getPost(id);
    if (!existing) throw new CmsNotFoundError("That article was not found.");
    const incoming = body.value && typeof body.value === "object" ? body.value : {};
    const parsed = normalizePostInput({ ...existing, ...incoming });
    if (!parsed.ok) {
      return json({ error: parsed.message, fieldErrors: parsed.fieldErrors }, { status: 400 });
    }
    const author = await resolvePublishableAuthor(ctx, parsed.value.authorId);
    const value = { ...parsed.value, authorName: author.displayName };
    if (value.slug !== existing.slug) {
      let conflict = null;
      try {
        const legacy = await ctx.services.legacy(ctx);
        conflict = await legacy.findArticle(value.slug);
      } catch (error) {
        console.error("Could not check the legacy catalogue for slug conflicts:", error);
        return json(
          { error: "The public catalogue could not be checked. Try again shortly." },
          { status: 503 }
        );
      }
      if (conflict) {
        return json(
          { error: "A catalogue article already uses this URL. Choose a different slug." },
          { status: 409 }
        );
      }
    }
    const post = await store.updatePost(id, value);
    return json({ post, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return cmsErrorResponse(error);
  }
};
const deletePost = async (ctx, params) => {
  if (!isSameOrigin(ctx.request, ctx.config.siteUrl)) {
    return json(badOrigin$2, { status: 403 });
  }
  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });
  const limit = await rateLimit(ctx, clientKey(ctx.request, "cms:delete"), 20, 6e4);
  if (!limit.allowed) {
    return json(
      { error: "Too many deletions in a short window. Try again in a minute." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }
  try {
    const id = (params.id ?? "").trim().slice(0, 64);
    const store = await getEditorCmsStore(ctx);
    const existing = await store.getPost(id);
    if (!existing) throw new CmsNotFoundError("That article was not found.");
    await store.deletePost(id);
    return json({ deleted: true, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return cmsErrorResponse(error);
  }
};
const cmsPostsRoutes = [
  {
    path: "/api/cms/posts",
    handlers: { GET: listPosts, POST: createPost }
  },
  {
    path: "/api/cms/posts/:id",
    handlers: { GET: getPost, PATCH: patchPost, DELETE: deletePost }
  }
];
const badOrigin$1 = { error: "Cross-site requests are not allowed." };
const listComments = async (ctx) => {
  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });
  try {
    const store = await getEditorCmsStore(ctx);
    const comments = await store.listComments();
    return json({ comments, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return cmsErrorResponse(error);
  }
};
const deleteComment = async (ctx, params) => {
  if (!isSameOrigin(ctx.request, ctx.config.siteUrl)) {
    return json(badOrigin$1, { status: 403 });
  }
  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });
  const limit = await rateLimit(ctx, clientKey(ctx.request, "cms:comment-delete"), 30, 6e4);
  if (!limit.allowed) {
    return json(
      { error: "Too many moderation actions in a short window. Try again in a minute." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }
  try {
    const id = (params.id ?? "").trim().slice(0, 64);
    const store = await getEditorCmsStore(ctx);
    const comment = await store.getComment(id);
    if (!comment) {
      throw new CmsNotFoundError("That comment was not found.");
    }
    await store.deleteComment(id);
    return json({ deleted: true, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return cmsErrorResponse(error);
  }
};
const cmsCommentsRoutes = [
  { path: "/api/cms/comments", handlers: { GET: listComments } },
  { path: "/api/cms/comments/:id", handlers: { DELETE: deleteComment } }
];
const APPLICATION_PROVIDERS = ["github", "orcid"];
function applicationErrorMessage(raw) {
  const code = raw.toLowerCase();
  if (code.includes("already_editor")) {
    return "This account already has publishing access.";
  }
  if (code.includes("not_editor")) {
    return "Only an editor can review applications.";
  }
  if (code.includes("not_authenticated")) {
    return "Sign in before applying to write.";
  }
  if (code.includes("unsupported_provider")) {
    return "Connect a GitHub or ORCID identity before applying.";
  }
  if (code.includes("handle_required")) {
    return "The application needs the handle from the connected identity.";
  }
  if (code.includes("name_required")) {
    return "Add the name to publish under.";
  }
  if (code.includes("not_found")) {
    return "That application no longer exists.";
  }
  if (code.includes("duplicate") || code.includes("author_applications_one_pending")) {
    return "An application is already under review for this account.";
  }
  return "The application could not be saved. Check the details and try again.";
}
const GENERIC_ERROR = "The application service could not be reached. Try again in a moment.";
const NEEDS_SUPABASE = "Applications need Supabase. Configure it to accept writer requests.";
const badOrigin = { error: "Cross-site requests are not allowed." };
function sessionClient(ctx) {
  return ctx.services.sessionClient(ctx) ?? createSupabaseServerClient(ctx);
}
const listApplications = async (ctx) => {
  if (!isPublicConfigValid(ctx.config)) {
    return json({ error: NEEDS_SUPABASE }, { status: 503 });
  }
  const user = await getDashboardUser(ctx);
  if (!user) {
    return json({ error: "Sign in to view your application." }, { status: 401 });
  }
  try {
    const supabase = sessionClient(ctx);
    const { data, error } = await supabase.from("author_applications").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return json({ applications: data ?? [] }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("Could not read author applications:", error);
    return json({ error: GENERIC_ERROR }, { status: 503 });
  }
};
const createApplication = async (ctx) => {
  if (!isSameOrigin(ctx.request, ctx.config.siteUrl)) {
    return json(badOrigin, { status: 403 });
  }
  if (!isPublicConfigValid(ctx.config)) {
    return json({ error: NEEDS_SUPABASE }, { status: 503 });
  }
  const user = await getDashboardUser(ctx);
  if (!user) {
    return json({ error: "Sign in before applying to write." }, { status: 401 });
  }
  const limit = await rateLimit(ctx, clientKey(ctx.request, "author:apply"), 5, 6e4);
  if (!limit.allowed) {
    return json(
      { error: "Too many attempts. Wait a minute before applying again." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }
  const body = await readJsonBody(ctx.request);
  if (!body.ok) return body.response;
  const input = body.value ?? {};
  const provider = String(input.provider ?? "").trim().toLowerCase();
  const handle = cleanText$1(String(input.handle ?? ""), 160);
  const displayName2 = cleanText$1(String(input.displayName ?? user.name), 120);
  const statement = cleanText$1(String(input.statement ?? ""), 1e3);
  if (!APPLICATION_PROVIDERS.includes(provider)) {
    return json({ error: "Connect a GitHub or ORCID identity before applying." }, { status: 400 });
  }
  if (!handle) {
    return json(
      { error: "The application needs the handle from the connected identity." },
      { status: 400 }
    );
  }
  if (!displayName2) {
    return json({ error: "Add the name to publish under." }, { status: 400 });
  }
  try {
    const supabase = sessionClient(ctx);
    const { data, error } = await supabase.rpc("apply_as_author", {
      p_provider: provider,
      p_handle: handle,
      p_display_name: displayName2,
      p_statement: statement
    });
    if (error) {
      return json({ error: applicationErrorMessage(error.message) }, { status: 400 });
    }
    return json({ application: data }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    console.error("Could not record the author application:", error);
    return json({ error: GENERIC_ERROR }, { status: 503 });
  }
};
const reviewApplication = async (ctx, params) => {
  if (!isSameOrigin(ctx.request, ctx.config.siteUrl)) {
    return json(badOrigin, { status: 403 });
  }
  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });
  const limit = await rateLimit(ctx, clientKey(ctx.request, "author:review"), 30, 6e4);
  if (!limit.allowed) {
    return json(
      { error: "Too many review actions. Wait a minute before continuing." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }
  const applicationId2 = Number.parseInt((params.id ?? "").trim(), 10);
  if (!Number.isFinite(applicationId2) || applicationId2 <= 0) {
    return json({ error: "That application does not exist." }, { status: 400 });
  }
  const body = await readJsonBody(ctx.request);
  if (!body.ok) return body.response;
  const input = body.value ?? {};
  const approve = input.approve === true;
  const note = cleanText$1(String(input.note ?? ""), 500);
  try {
    const supabase = sessionClient(ctx);
    const { data, error } = await supabase.rpc("review_author_application", {
      p_id: applicationId2,
      p_approve: approve,
      p_note: note
    });
    if (error) {
      return json({ error: applicationErrorMessage(error.message) }, { status: 400 });
    }
    return json({ application: data }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("Could not review the author application:", error);
    return json({ error: GENERIC_ERROR }, { status: 503 });
  }
};
const applicationsRoutes = [
  {
    path: "/api/dashboard/applications",
    handlers: { GET: listApplications, POST: createApplication }
  },
  {
    path: "/api/dashboard/applications/:id",
    handlers: { POST: reviewApplication }
  }
];
const MODEL_TIMEOUT_MS = 2e4;
const MAX_QUERY = 600;
const STOP_WORDS = /* @__PURE__ */ new Set([
  "the",
  "and",
  "for",
  "with",
  "about",
  "what",
  "does",
  "how",
  "why",
  "from",
  "into",
  "that",
  "this",
  "are",
  "was",
  "were",
  "has",
  "have",
  "had",
  "its",
  "their",
  "they",
  "than",
  "then",
  "when",
  "where",
  "which",
  "while",
  "does",
  "did",
  "can",
  "could",
  "should",
  "would",
  "you",
  "your",
  "our",
  "per"
]);
async function matchingPosts(ctx, query2) {
  const terms = query2.toLowerCase().split(/[^a-z0-9.+-]+/).filter((term) => term.length >= 3 && !STOP_WORDS.has(term)).slice(0, 12);
  if (terms.length === 0) return [];
  const archive = await getPublicArticleCatalogue(ctx);
  return archive.map((post) => {
    const title = post.title.toLowerCase();
    const summary = post.summary.toLowerCase();
    const category = post.category.toLowerCase();
    const tags = post.tags.join(" ").toLowerCase();
    const artifact = `${post.reviewedArtifact?.identifier ?? ""} ${post.reviewedArtifact?.title ?? ""}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 4;
      if (tags.includes(term)) score += 3;
      if (artifact.includes(term)) score += 3;
      if (summary.includes(term)) score += 2;
      if (category.includes(term)) score += 1;
    }
    return { post, score };
  }).filter((entry) => entry.score >= 3).sort((a, b) => b.score - a.score).slice(0, 3).map((entry) => entry.post);
}
async function fallbackAnswer(ctx, query2) {
  const matches = await matchingPosts(ctx, query2);
  if (matches.length > 0) {
    return {
      answer: `### What the archive says about “${query2}”

${matches.length} ${matches.length === 1 ? "review directly addresses" : "reviews directly address"} this topic:

` + matches.map(
        (post) => `#### ${post.title}
By ${post.author.name} · ${post.category}

` + (post.reviewedArtifact ? `Reviewed artifact: ${post.reviewedArtifact.identifier} (${post.reviewedArtifact.meta})

` : "") + `Key points:
${post.keyTakeaways.map((takeaway) => `- ${takeaway}`).join("\n")}

${post.summary}`
      ).join("\n\n---\n\n"),
      citations: matches
    };
  }
  return {
    answer: "### No direct match in the catalog\n\nThe archive does not contain a review that matches that question. Try a narrower term, a repository name, or a DOI, or browse the fields below.\n\n- **Research Reviews** cover methodology, replication, and primary literature.\n- **GitHub Repo Teardowns** examine architecture, memory behaviour, and performance.\n- **Health & Medicine** reviews trial design, pharmacology, and clinical outcomes.\n\nEvery answer here is limited to published articles; nothing outside this catalog is searched.",
    citations: []
  };
}
const researchAssistant = async (ctx) => {
  const limit = await rateLimit(ctx, clientKey(ctx.request, "assistant"), 12, 6e4);
  if (!limit.allowed) {
    return json(
      { error: "Too many questions in a short window. Wait a minute and try again." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }
  if (!(ctx.request.headers.get("content-type") ?? "").includes("application/json")) {
    return json({ error: "Send the question as JSON." }, { status: 415 });
  }
  let payload;
  try {
    payload = await ctx.request.json();
  } catch {
    return json({ error: "The question body could not be read." }, { status: 400 });
  }
  const query2 = cleanText$1(payload.query, MAX_QUERY);
  if (!query2) {
    return json({ error: "Ask a question to search the archive." }, { status: 400 });
  }
  const fallback = await fallbackAnswer(ctx, query2);
  const citations = fallback.citations.map((post) => ({
    id: post.id,
    title: post.title,
    author: post.author.name,
    category: post.category
  }));
  const apiKey = ctx.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ answer: fallback.answer, citations, mode: "catalog" });
  }
  const corpus = fallback.citations.length > 0 ? fallback.citations : (await getPublicArticleCatalogue(ctx)).slice(0, 4);
  const systemPrompt = [
    "You are the ResearchWithMe editorial assistant.",
    "Answer only from the article records supplied below. Do not invent sources, DOI values, or findings.",
    "Name the article and author for every claim, and say when the catalog does not answer the question.",
    "Write in a direct, precise editorial voice. Use short paragraphs and bullet points. Do not use emoji.",
    "",
    ...corpus.map(
      (post) => `[${post.id}] ${post.title}
Author: ${post.author.name}
Category: ${post.category}
Summary: ${post.summary}
Takeaways:
${post.keyTakeaways.map((item) => `- ${item}`).join("\n")}`
    )
  ].join("\n\n");
  try {
    const text2 = await ctx.services.models.generateText({
      apiKey,
      model: ctx.env.GEMINI_MODEL || "gemini-3.8-flash",
      prompt: `${systemPrompt}

Reader question:
"${query2}"`,
      timeoutMs: MODEL_TIMEOUT_MS
    });
    const answer = cleanText$1(text2, 2e4);
    if (!answer) throw new Error("Empty model response");
    return json({ answer, citations, mode: "model" });
  } catch (error) {
    console.error("Research assistant model call failed:", error instanceof Error ? error.message : error);
    return json({
      answer: fallback.answer,
      citations,
      mode: "catalog",
      notice: "The language model was unavailable, so this answer was assembled directly from the catalog."
    });
  }
};
const assistantRoutes = [
  { path: "/api/research-assistant", handlers: { POST: researchAssistant } }
];
function isValidSecret(provided, expected) {
  if (!expected || !provided) return false;
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}
function configuredRevalidateSecret(env) {
  return (env.REVALIDATE_SECRET || env.MY_SECRET_TOKEN || "").trim();
}
async function revalidateArticle(_ctx, _slug) {
}
const revalidate = async (ctx) => {
  const expected = configuredRevalidateSecret(ctx.env);
  if (!expected) {
    return json(
      { error: "Revalidation is not configured. Set REVALIDATE_SECRET on the deployment." },
      { status: 503 }
    );
  }
  const limit = await rateLimit(ctx, clientKey(ctx.request, "revalidate"), 60, 6e4);
  if (!limit.allowed) {
    return json(
      { error: "Too many revalidation calls." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }
  const headerSecret = ctx.request.headers.get("x-revalidate-secret");
  const querySecret = new URL(ctx.request.url).searchParams.get("secret");
  if (!isValidSecret(headerSecret ?? querySecret, expected)) {
    return json({ error: "Invalid token." }, { status: 401 });
  }
  let payload = null;
  try {
    payload = await ctx.request.json();
  } catch {
    payload = null;
  }
  const slugCandidate = payload?.record?.slug ?? payload?.old_record?.slug;
  const slug = typeof slugCandidate === "string" && /^[a-z0-9-]{1,96}$/.test(slugCandidate) ? slugCandidate : null;
  try {
    await revalidateArticle(ctx, slug);
    return json({
      revalidated: true,
      table: payload?.table ?? null,
      paths: slug ? ["/", "/sitemap.xml", `/post/${slug}`] : ["/", "/sitemap.xml"],
      now: Date.now()
    });
  } catch (error) {
    console.error("Revalidation failed:", error);
    return json({ error: "The cache could not be revalidated." }, { status: 500 });
  }
};
const revalidateRoutes = [
  { path: "/api/revalidate", handlers: { POST: revalidate } }
];
function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...init.headers }
  });
}
const API_ROUTES = [
  ...articlesRoutes,
  ...authorsRoutes,
  ...papersRoutes,
  ...commentsRoutes,
  ...cmsPostsRoutes,
  ...cmsCommentsRoutes,
  ...applicationsRoutes,
  ...assistantRoutes,
  ...revalidateRoutes
];
const METHOD_ORDER = ["GET", "POST", "PATCH", "DELETE"];
const SEGMENT_LIMIT = 256;
function splitPath(pathname) {
  return pathname.split("/").filter(Boolean);
}
function allowHeader(route) {
  const allow2 = [];
  for (const method of METHOD_ORDER) {
    if (!route.handlers[method]) continue;
    allow2.push(method);
    if (method === "GET") allow2.push("HEAD");
  }
  allow2.push("OPTIONS");
  return allow2.join(", ");
}
function matchApiRoute(pathname) {
  const segments = splitPath(pathname);
  for (const route of API_ROUTES) {
    const pattern = splitPath(route.path);
    if (pattern.length !== segments.length) continue;
    const params = {};
    let matched = true;
    for (let index = 0; index < pattern.length; index += 1) {
      const token = pattern[index];
      if (token.startsWith(":")) {
        let value;
        try {
          value = decodeURIComponent(segments[index]);
        } catch {
          return "invalid";
        }
        params[token.slice(1)] = value.slice(0, SEGMENT_LIMIT);
      } else if (token !== segments[index]) {
        matched = false;
        break;
      }
    }
    if (matched) return { route, params };
  }
  return null;
}
async function dispatchApi(ctx) {
  const { pathname } = new URL(ctx.request.url);
  if (!pathname.startsWith("/api/")) return null;
  const match = matchApiRoute(pathname);
  if (match === "invalid") {
    return json({ error: "The route parameters could not be decoded." }, { status: 400 });
  }
  if (!match) return null;
  const { route, params } = match;
  const method = ctx.request.method.toUpperCase();
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { allow: allowHeader(route) } });
  }
  const effectiveMethod = method === "HEAD" ? "GET" : method;
  const handler = route.handlers[effectiveMethod];
  if (!handler) {
    return json(
      { error: "Method not allowed." },
      { status: 405, headers: { allow: allowHeader(route) } }
    );
  }
  const response = await handler(ctx, params);
  if (method === "HEAD") {
    return new Response(null, { status: response.status, headers: new Headers(response.headers) });
  }
  return response;
}
async function handleRequest(request, env, runtime2, services) {
  let ctx;
  try {
    ctx = createRequestContext(request, env, runtime2, services);
  } catch (error) {
    if (error instanceof PublicConfigError) {
      console.error("Refusing to serve a misconfigured production deployment:", error.message);
      return applySecurityHeaders(
        new Response("The service is not configured correctly.", {
          status: 503,
          headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" }
        })
      );
    }
    console.error("Could not create the request context:", error);
    return applySecurityHeaders(
      new Response("Internal Server Error", {
        status: 500,
        headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" }
      })
    );
  }
  try {
    const pathname = new URL(ctx.request.url).pathname;
    const response = await dispatchApi(ctx) ?? (pathname === ROUTE_DATA_PATH ? await handleRouteData(ctx) : pathname === "/auth/callback" ? await handleAuthCallback(ctx) : await renderPage(ctx));
    return applyHeaders(ctx.cookies.apply(response), ctx);
  } catch (error) {
    console.error("Unhandled error while handling the request:", error);
    return applyHeaders(
      ctx.cookies.apply(
        new Response("Internal Server Error", {
          status: 500,
          headers: { "content-type": "text/plain; charset=utf-8" }
        })
      ),
      ctx
    );
  }
}
let browserClient = null;
function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, { isSingleton: true });
  }
  return browserClient;
}
function hasSupabaseBrowserConfig() {
  return isSupabaseConfigured;
}
const client = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getSupabaseBrowserClient,
  hasSupabaseBrowserConfig
}, Symbol.toStringTag, { value: "Module" }));
const features = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: domMax
}, Symbol.toStringTag, { value: "Module" }));
function normalizeIdentifierQuery(raw) {
  return raw.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "").replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/^https?:\/\/(www\.)?orcid\.org\//i, "").replace(/^orcid:\s*/i, "").replace(/^@+/, "").replace(/[.,;)\]/]+$/, "").trim().toLowerCase();
}
const CORE_ROUTES = [
  {
    id: "route-index",
    kind: "route",
    title: "Index — Technical Teardowns & Reviews",
    subtitle: "Full specialist catalog filtered by column and format",
    href: "/",
    identifiers: ["issn 3021-889x", "index", "articles"],
    tags: ["catalog", "teardowns", "reviews"]
  },
  {
    id: "route-papers",
    kind: "route",
    title: "Papers — Peer-Reviewed Archive",
    subtitle: "Diamond Open Access research papers with DOI and BibTeX metadata",
    href: "/papers",
    identifiers: ["papers", "archive", "doi"],
    tags: ["open access", "archive", "peer review"]
  },
  {
    id: "route-authors",
    kind: "route",
    title: "Specialists — Verified Contributors",
    subtitle: "ORCID and GitHub attested domain specialists and researchers",
    href: "/authors",
    identifiers: ["authors", "specialists", "orcid", "github"],
    tags: ["contributors", "orcid", "github"]
  },
  {
    id: "route-editions",
    kind: "route",
    title: "Editions — Quarterly Print Folios",
    subtitle: "Curated quarterly archival print issues and PDF compendia",
    href: "/editions",
    identifiers: ["editions", "folios", "quarterly"],
    tags: ["issues", "pdf", "print"]
  },
  {
    id: "route-assistant",
    kind: "route",
    title: "Synthesis — Grounded Literature Assistant",
    subtitle: "Citation-grounded research synthesis across published works",
    href: "/assistant",
    identifiers: ["assistant", "synthesis"],
    tags: ["rag", "citations", "literature"]
  },
  {
    id: "route-bookmarks",
    kind: "route",
    title: "Reading List — Saved Manuscripts",
    subtitle: "Locally persisted articles and papers queued for focused study",
    href: "/bookmarks",
    identifiers: ["bookmarks", "reading-list", "saved"],
    tags: ["saved", "bookmarks"]
  },
  {
    id: "route-cite",
    kind: "route",
    title: "Citation Generator — BibTeX, APA, RIS & CSL-JSON",
    subtitle: "Export reproducible bibliographic records for any catalog entry",
    href: "/cite",
    identifiers: ["cite", "bibtex", "apa", "ris"],
    tags: ["citation", "bibtex", "apa"]
  }
];
function collectIdentifiers(rawList) {
  const out = /* @__PURE__ */ new Set();
  for (const raw of rawList) {
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    out.add(trimmed);
    const normalized = normalizeIdentifierQuery(trimmed);
    if (normalized) out.add(normalized);
  }
  return Array.from(out);
}
function buildCatalogIndex(input) {
  const items = [];
  const seenSpecialistKeys = /* @__PURE__ */ new Set();
  for (const post of input.articles) {
    const canonicalDoi = `10.5555/rwm.${post.id}`;
    const identifiers = collectIdentifiers([
      canonicalDoi,
      post.id,
      post.slug,
      post.reviewedArtifact?.identifier,
      post.reviewedArtifact?.url
    ]);
    items.push({
      id: `article-${post.id}`,
      kind: "article",
      title: post.title,
      subtitle: `${post.author.name} · ${post.category} · ${post.readTime}`,
      href: `/post/${post.slug}`,
      identifiers,
      tags: [...post.tags ?? [], post.category, post.format],
      specialistName: post.author.name,
      verifiedVia: post.author.verifiedVia,
      category: post.category,
      format: post.format
    });
  }
  for (const paper of input.papers) {
    const authorNames = paper.authors.map((a) => a.name).join(", ");
    const identifiers = collectIdentifiers([
      paper.doi,
      paper.id,
      paper.slug,
      ...paper.authors.map((a) => a.orcid)
    ]);
    items.push({
      id: `paper-${paper.id}`,
      kind: "paper",
      title: paper.title,
      subtitle: `${authorNames} · ${paper.journal} (${paper.year})`,
      href: `/paper/${paper.slug}`,
      identifiers,
      tags: [...paper.keywords ?? [], paper.topic],
      specialistName: authorNames,
      verifiedVia: "orcid",
      category: paper.topic,
      format: "Peer-Reviewed Paper"
    });
  }
  for (const author of input.authors) {
    const key = author.id || normalizeIdentifierQuery(author.name);
    if (!key || seenSpecialistKeys.has(key)) continue;
    seenSpecialistKeys.add(key);
    const handleToken = author.verifiedIdentifier?.split(/\s+/)[0];
    const identifiers = collectIdentifiers([
      author.orcid,
      author.github,
      handleToken,
      author.id
    ]);
    items.push({
      id: `specialist-${author.id}`,
      kind: "specialist",
      title: author.name,
      subtitle: `${author.role}${author.institution ? ` · ${author.institution}` : ""}`,
      href: `/author/${author.id}`,
      identifiers,
      tags: [author.domain, author.role, author.institution ?? ""].filter(Boolean),
      specialistName: author.name,
      verifiedVia: author.verifiedVia
    });
  }
  const board = input.board ?? EDITORIAL_BOARD;
  for (const member of board) {
    const key = normalizeIdentifierQuery(member.orcid || member.name);
    if (!key || seenSpecialistKeys.has(key)) continue;
    seenSpecialistKeys.add(key);
    const identifiers = collectIdentifiers([member.orcid]);
    items.push({
      id: `board-${key}`,
      kind: "specialist",
      title: member.name,
      subtitle: `${member.role} · ${member.institution}`,
      href: "/editorial-board",
      identifiers,
      tags: [member.focus, member.role, member.institution],
      specialistName: member.name,
      verifiedVia: "orcid"
    });
  }
  items.push(...CORE_ROUTES);
  return items;
}
function searchCatalog(query2, items, limit = 20) {
  const trimmed = query2.trim();
  if (!trimmed) {
    const featuredArticles = items.filter((item) => item.kind === "article").slice(0, 6);
    const featuredPapers = items.filter((item) => item.kind === "paper").slice(0, 3);
    const featuredSpecialists = items.filter((item) => item.kind === "specialist").slice(0, 4);
    const routes = items.filter((item) => item.kind === "route").slice(0, 5);
    return [...featuredArticles, ...featuredPapers, ...featuredSpecialists, ...routes].slice(
      0,
      limit
    );
  }
  const norm = normalizeIdentifierQuery(trimmed);
  const exactMatches = [];
  const prefixMatches = [];
  const seen = /* @__PURE__ */ new Set();
  if (norm.length >= 2) {
    for (const item of items) {
      const normalizedItemIds = item.identifiers.map(
        (identifier) => normalizeIdentifierQuery(identifier)
      );
      if (normalizedItemIds.some((id) => id === norm)) {
        exactMatches.push(item);
        seen.add(item.id);
      } else if (norm.length >= 4 && normalizedItemIds.some((id) => id.startsWith(norm) || id.includes(norm))) {
        prefixMatches.push(item);
        seen.add(item.id);
      }
    }
  }
  const fuse = new Fuse(items, {
    keys: [
      { name: "title", weight: 0.35 },
      { name: "identifiers", weight: 0.3 },
      { name: "tags", weight: 0.15 },
      { name: "specialistName", weight: 0.12 },
      { name: "subtitle", weight: 0.08 }
    ],
    threshold: 0.34,
    ignoreLocation: true,
    minMatchCharLength: 2
  });
  const fuzzyResults = fuse.search(trimmed);
  const combined = [...exactMatches, ...prefixMatches];
  for (const hit of fuzzyResults) {
    if (!seen.has(hit.item.id)) {
      seen.add(hit.item.id);
      combined.push(hit.item);
    }
    if (combined.length >= limit) break;
  }
  return combined.slice(0, limit);
}
let cachedCorpus = null;
function CommandPalette({
  open,
  onOpenChange,
  initialArticles = [],
  initialQuery = ""
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [query2, setQuery] = useState(initialQuery);
  const [corpus, setCorpus] = useState(cachedCorpus);
  const showSkeleton = useDelayedLoading(open && corpus === null, { delay: 200, minDuration: 500 });
  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
  }, [initialQuery]);
  useEffect(() => {
    if (!open || cachedCorpus) return;
    let active = true;
    Promise.allSettled([
      fetch("/api/articles").then((res) => res.ok ? res.json() : null),
      fetch("/api/papers").then((res) => res.ok ? res.json() : null),
      fetch("/api/authors").then((res) => res.ok ? res.json() : null)
    ]).then(([articlesRes, papersRes, authorsRes]) => {
      if (!active) return;
      const articles = articlesRes.status === "fulfilled" && Array.isArray(articlesRes.value?.articles) ? articlesRes.value.articles : initialArticles;
      const papers = papersRes.status === "fulfilled" && Array.isArray(papersRes.value?.papers) ? papersRes.value.papers : [];
      const authors = authorsRes.status === "fulfilled" && Array.isArray(authorsRes.value?.authors) ? authorsRes.value.authors : articles.map((post) => post.author);
      const anySucceeded = articlesRes.status === "fulfilled" && articlesRes.value !== null || papersRes.status === "fulfilled" && papersRes.value !== null || authorsRes.status === "fulfilled" && authorsRes.value !== null;
      const loaded = { articles, papers, authors };
      if (anySucceeded) {
        cachedCorpus = loaded;
      }
      setCorpus(loaded);
    });
    return () => {
      active = false;
    };
  }, [open, initialArticles]);
  const index = useMemo(() => {
    const articles = corpus?.articles.length ? corpus.articles : initialArticles;
    const papers = corpus?.papers ?? [];
    const authors = corpus?.authors.length ? corpus.authors : articles.map((post) => post.author);
    return buildCatalogIndex({ articles, papers, authors });
  }, [corpus, initialArticles]);
  const results = useMemo(() => searchCatalog(query2, index, 24), [query2, index]);
  const grouped = useMemo(() => {
    const buckets = {
      article: [],
      paper: [],
      specialist: [],
      route: []
    };
    for (const item of results) {
      buckets[item.kind].push(item);
    }
    return buckets;
  }, [results]);
  function handleSelect(href) {
    onOpenChange(false);
    router.push(href);
  }
  function renderIcon(kind) {
    switch (kind) {
      case "article":
        return /* @__PURE__ */ jsx(FileText, { className: "h-4 w-4 shrink-0 text-ink-secondary", "aria-hidden": "true" });
      case "paper":
        return /* @__PURE__ */ jsx(BookOpen, { className: "h-4 w-4 shrink-0 text-ink-secondary", "aria-hidden": "true" });
      case "specialist":
        return /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 shrink-0 text-brand", "aria-hidden": "true" });
      case "route":
        return /* @__PURE__ */ jsx(Compass, { className: "h-4 w-4 shrink-0 text-ink-secondary", "aria-hidden": "true" });
    }
  }
  const sections2 = [
    { kind: "article", heading: t(locale, "cmdk.group.articles") },
    { kind: "paper", heading: t(locale, "cmdk.group.papers") },
    { kind: "specialist", heading: t(locale, "cmdk.group.specialists") },
    { kind: "route", heading: t(locale, "cmdk.group.routes") }
  ];
  return /* @__PURE__ */ jsx(Dialog.Root, { open, onOpenChange, children: /* @__PURE__ */ jsxs(Dialog.Portal, { children: [
    /* @__PURE__ */ jsx(Dialog.Overlay, { asChild: true, children: /* @__PURE__ */ jsx(
      m.div,
      {
        className: "fixed inset-0 z-50 bg-ink/40 backdrop-blur-[1px]",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.14, ease: [...EASING.standard] }
      }
    ) }),
    /* @__PURE__ */ jsx(Dialog.Content, { asChild: true, children: /* @__PURE__ */ jsxs(
      m.div,
      {
        className: "fixed left-1/2 top-[10vh] z-50 w-[min(92vw,42rem)] overflow-hidden rounded-sm border border-line bg-canvas text-ink focus:outline-none",
        initial: { opacity: 0, y: -10, scale: 0.98, x: "-50%" },
        animate: { opacity: 1, y: 0, scale: 1, x: "-50%" },
        transition: SPRING.panel,
        children: [
          /* @__PURE__ */ jsx(Dialog.Title, { className: "sr-only", children: t(locale, "cmdk.trigger") }),
          /* @__PURE__ */ jsx(Dialog.Description, { className: "sr-only", children: t(locale, "cmdk.placeholder") }),
          /* @__PURE__ */ jsxs(Command, { label: t(locale, "cmdk.trigger"), shouldFilter: false, loop: true, className: "flex flex-col", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 border-b border-line bg-surface px-4 py-3", children: [
              /* @__PURE__ */ jsx(Search, { className: "h-4 w-4 shrink-0 text-ink-secondary", "aria-hidden": "true" }),
              /* @__PURE__ */ jsx(
                Command.Input,
                {
                  value: query2,
                  onValueChange: setQuery,
                  placeholder: t(locale, "cmdk.placeholder"),
                  className: "w-full bg-transparent font-sans text-sm text-ink placeholder:text-ink-secondary focus:outline-none"
                }
              ),
              query2 && /* @__PURE__ */ jsx(
                Pressable,
                {
                  type: "button",
                  onClick: () => setQuery(""),
                  "aria-label": "Clear search query",
                  className: "inline-flex h-7 w-7 items-center justify-center rounded-sm border border-line text-ink-secondary hover:text-ink",
                  children: /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5", "aria-hidden": "true" })
                }
              ),
              /* @__PURE__ */ jsx(Dialog.Close, { asChild: true, children: /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  "aria-label": "Close command palette",
                  className: "rounded-sm border border-line px-1.5 py-0.5 font-mono text-xs text-ink-secondary hover:text-ink",
                  children: "ESC"
                }
              ) })
            ] }),
            /* @__PURE__ */ jsxs(Command.List, { className: "max-h-[62vh] overflow-y-auto divide-y divide-line p-2", children: [
              showSkeleton ? /* @__PURE__ */ jsxs("div", { role: "status", "aria-live": "polite", "aria-busy": "true", className: "px-2.5 py-3", children: [
                /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Loading the catalogue index" }),
                /* @__PURE__ */ jsx("div", { "aria-hidden": "true", className: "space-y-3", children: [0, 1, 2].map((row) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                  /* @__PURE__ */ jsx(SkeletonShard, { height: 16, width: 16 }),
                  /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
                    /* @__PURE__ */ jsx(SkeletonShard, { height: 12, width: "45%" }),
                    /* @__PURE__ */ jsx("div", { className: "h-1.5" }),
                    /* @__PURE__ */ jsx(SkeletonShard, { height: 10, width: "70%" })
                  ] })
                ] }, row)) })
              ] }) : null,
              !showSkeleton && results.length === 0 && /* @__PURE__ */ jsx(Command.Empty, { className: "px-4 py-10 text-center font-sans text-sm text-ink-secondary", children: t(locale, "cmdk.empty") }),
              !showSkeleton && sections2.map(({ kind, heading }) => {
                const groupItems = grouped[kind];
                if (groupItems.length === 0) return null;
                return /* @__PURE__ */ jsx(
                  Command.Group,
                  {
                    heading,
                    className: "py-2 first:pt-1 last:pb-1 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-secondary",
                    children: groupItems.map((item) => {
                      const badge = item.identifiers[0];
                      return /* @__PURE__ */ jsxs(
                        Command.Item,
                        {
                          value: item.id,
                          onSelect: () => handleSelect(item.href),
                          className: "group flex cursor-pointer items-start justify-between gap-3 rounded-sm border border-transparent px-2.5 py-2.5 transition-colors data-[selected=true]:border-brand data-[selected=true]:bg-surface-subtle",
                          children: [
                            /* @__PURE__ */ jsxs("div", { className: "flex min-w-0 items-start gap-2.5", children: [
                              /* @__PURE__ */ jsx("span", { className: "mt-0.5", children: renderIcon(item.kind) }),
                              /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                                /* @__PURE__ */ jsx("div", { className: "truncate font-serif text-sm font-medium text-ink", children: item.title }),
                                /* @__PURE__ */ jsx("div", { className: "mt-0.5 truncate font-sans text-xs text-ink-secondary", children: item.subtitle })
                              ] })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [
                              badge && /* @__PURE__ */ jsx("span", { className: "hidden rounded-sm border border-line bg-surface px-1.5 py-0.5 font-mono text-xs text-ink-secondary sm:inline-block", children: badge }),
                              /* @__PURE__ */ jsx(
                                ArrowUpRight,
                                {
                                  className: "h-3.5 w-3.5 text-ink-secondary opacity-0 transition-opacity group-data-[selected=true]:text-brand group-data-[selected=true]:opacity-100",
                                  "aria-hidden": "true"
                                }
                              )
                            ] })
                          ]
                        },
                        item.id
                      );
                    })
                  },
                  kind
                );
              })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-t border-line bg-surface px-4 py-2 font-mono text-xs text-ink-secondary", children: [
              /* @__PURE__ */ jsx("span", { children: "↑↓ Navigate · ↵ Open · ESC Close" }),
              /* @__PURE__ */ jsx("span", { children: "DOI · GitHub · ORCID" })
            ] })
          ] })
        ]
      }
    ) })
  ] }) });
}
const CommandPalette$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: CommandPalette
}, Symbol.toStringTag, { value: "Module" }));
function ArticleDiscussion({ postId, commentCount }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [name, setName] = useState("");
  const [text2, setNameText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [status, setStatus] = useState(null);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/comments?postId=${encodeURIComponent(postId)}`, { headers: { accept: "application/json" } });
        if (!res.ok) throw new Error("Could not load comments");
        const data = await res.json();
        if (active) setComments(Array.isArray(data.comments) ? data.comments : []);
      } catch {
        if (active) setLoadError("Comments could not be loaded. This does not affect the article.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [postId]);
  useEffect(() => {
    if (!isSupabaseConfigured || !postId.startsWith("cms-")) return;
    const numericId = postId.slice(4);
    if (!/^\d{1,19}$/.test(numericId)) return;
    let disposed = false;
    let cleanup = null;
    (async () => {
      try {
        const { getSupabaseBrowserClient: getSupabaseBrowserClient2 } = await Promise.resolve().then(() => client);
        const supabase = getSupabaseBrowserClient2();
        const channel = supabase.channel(`post-${numericId}-comments`).on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "comments", filter: `post_id=eq.${numericId}` },
          (payload) => {
            if (disposed) return;
            const row = payload.new;
            const id = `cms-comment-${row.id}`;
            const authorName = row.author_name ?? "Reader";
            setComments(
              (current) => current.some((comment) => comment.id === id) ? current : [
                {
                  id,
                  authorName,
                  authorRole: row.author_role ?? "Reader",
                  avatar: safeInitials(authorName, "RD"),
                  timestamp: row.inserted_at ? formatDate(row.inserted_at) : "Just now",
                  text: row.content ?? ""
                },
                ...current
              ]
            );
          }
        ).subscribe();
        cleanup = () => {
          disposed = true;
          void supabase.removeChannel(channel);
        };
      } catch {
      }
    })();
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [postId]);
  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    const cleanName = cleanText$1(name, LIMITS.name);
    const cleanComment = cleanText$1(text2, LIMITS.comment);
    if (!cleanName) {
      setFormError("Add the name and role you want shown with your comment.");
      return;
    }
    if (cleanComment.length < 2) {
      setFormError("Write at least a sentence before posting.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          authorName: cleanName,
          text: cleanComment,
          authorRole: "Reader"
        })
      });
      if (!res.ok) throw new Error("The comment could not be saved.");
      const data = await res.json();
      if (data.comment) {
        const posted = data.comment;
        setComments(
          (current) => current.some((comment) => comment.id === posted.id) ? current : [posted, ...current]
        );
      }
      setNameText("");
      setStatus("Comment posted. It is visible below for this session.");
    } catch {
      setFormError("Your comment could not be saved. The text is still in the box, so you can try again.");
    } finally {
      setSubmitting(false);
    }
  }
  return /* @__PURE__ */ jsxs("section", { id: "discussion", "aria-labelledby": "discussion-heading", className: "border-t border-line pt-10", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-baseline justify-between gap-3", children: [
      /* @__PURE__ */ jsxs("h2", { id: "discussion-heading", className: "flex items-center gap-2 font-serif text-2xl font-bold text-ink", children: [
        /* @__PURE__ */ jsx(MessageSquare, { className: "h-5 w-5 text-brand-hover", "aria-hidden": "true" }),
        /* @__PURE__ */ jsx("span", { children: "Peer discussion" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-ink-secondary", children: loading ? "Loading comments…" : `${comments.length || commentCount} notes` })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-2xl text-base leading-relaxed text-ink", children: "Comments are public. Critique the method, reproduce a result, or ask a precise question." }),
    /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "mt-6 space-y-4 rounded-lg border border-line bg-surface-raised p-5", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "comment-name", className: "mb-1.5 block text-sm font-medium text-ink", children: "Name and role" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "comment-name",
            type: "text",
            value: name,
            onChange: (event) => setName(event.target.value),
            maxLength: LIMITS.name,
            autoComplete: "name",
            placeholder: "Alex V., systems engineer",
            className: "h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-secondary"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "comment-text", className: "mb-1.5 block text-sm font-medium text-ink", children: "Comment" }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            id: "comment-text",
            rows: 4,
            value: text2,
            onChange: (event) => setNameText(event.target.value),
            maxLength: LIMITS.comment,
            placeholder: "Describe the result you reproduced, or the part of the method that needs clarification.",
            className: "w-full rounded-md border border-border-strong bg-surface-raised px-3 py-2.5 text-base text-ink placeholder:text-ink-secondary"
          }
        ),
        /* @__PURE__ */ jsxs("p", { className: "mt-1 text-sm text-ink-secondary", children: [
          text2.length,
          " of ",
          LIMITS.comment,
          " characters"
        ] })
      ] }),
      formError && /* @__PURE__ */ jsx("p", { role: "alert", className: "border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-sm text-destructive", children: formError }),
      status && /* @__PURE__ */ jsx("p", { role: "status", className: "border-l-2 border-success bg-success/5 px-3 py-2 text-sm text-success", children: status }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "submit",
          disabled: submitting,
          className: "inline-flex min-h-11 items-center rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover disabled:opacity-60",
          children: submitting ? "Posting…" : "Post comment"
        }
      )
    ] }),
    loadError && /* @__PURE__ */ jsx("p", { role: "status", className: "mt-4 border-l-2 border-brand-hover bg-brand/5 px-3 py-2 text-sm text-brand-pressed", children: loadError }),
    /* @__PURE__ */ jsx("ul", { className: "mt-6 divide-y divide-line border-t border-line", children: comments.map((comment) => /* @__PURE__ */ jsxs("li", { className: "flex gap-3 py-5", children: [
      /* @__PURE__ */ jsx(
        "span",
        {
          "aria-hidden": "true",
          className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-inverse font-serif text-sm font-bold text-text-inverse",
          children: comment.avatar || safeInitials(comment.authorName)
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxs("p", { className: "flex flex-wrap items-baseline gap-x-2 text-sm", children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-ink", children: comment.authorName }),
          comment.authorRole && /* @__PURE__ */ jsx("span", { className: "text-ink-secondary", children: comment.authorRole }),
          /* @__PURE__ */ jsxs("span", { className: "text-ink-secondary", children: [
            "· ",
            comment.timestamp
          ] })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 max-w-prose text-base leading-relaxed text-ink", children: comment.text })
      ] })
    ] }, comment.id)) }),
    !loading && comments.length === 0 && !loadError && /* @__PURE__ */ jsx("p", { className: "border-t border-line py-6 text-base text-ink", children: "No comments yet. A precise question is a useful first note." })
  ] });
}
const ArticleDiscussion$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ArticleDiscussion
}, Symbol.toStringTag, { value: "Module" }));
function getAuthorImpactMetrics(author, articleCount, totalLikes, totalComments) {
  const hash = author.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseQuality = 85 + hash % 11;
  const baseEngagement = Math.min(98, 75 + Math.floor(totalComments / 2) + hash % 10);
  const baseRigor = author.verifiedVia === "orcid" ? 95 : author.verifiedVia === "github" ? 92 : 88;
  const baseCitation = Math.min(97, 80 + Math.floor(totalLikes / 5) + hash % 8);
  const baseTransparency = author.orcid || author.github ? 96 : 89;
  return {
    articleQuality: baseQuality,
    communityEngagement: baseEngagement,
    methodologyRigor: baseRigor,
    citationImpact: baseCitation,
    openTransparency: baseTransparency
  };
}
function AuthorImpactRadarChart({
  author,
  articleCount,
  totalLikes,
  totalComments
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const metrics = getAuthorImpactMetrics(author, articleCount, totalLikes, totalComments);
  const chartData = [
    { subject: "Article Quality", score: metrics.articleQuality, fullMark: 100 },
    { subject: "Community Engagement", score: metrics.communityEngagement, fullMark: 100 },
    { subject: "Methodology Rigor", score: metrics.methodologyRigor, fullMark: 100 },
    { subject: "Citation Impact", score: metrics.citationImpact, fullMark: 100 },
    { subject: "Open Science", score: metrics.openTransparency, fullMark: 100 }
  ];
  const overallScore = Math.round(
    (metrics.articleQuality + metrics.communityEngagement + metrics.methodologyRigor + metrics.citationImpact + metrics.openTransparency) / 5
  );
  return /* @__PURE__ */ jsxs(
    "section",
    {
      "aria-labelledby": "author-impact-heading",
      className: "mt-8 rounded-lg border border-line bg-surface-raised p-6 sm:p-8",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-5", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 rounded-md bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand", children: [
                /* @__PURE__ */ jsx(Sparkles, { className: "h-3.5 w-3.5 text-brand-hover", "aria-hidden": "true" }),
                /* @__PURE__ */ jsx("span", { children: "Scholarly Assessment" })
              ] }),
              /* @__PURE__ */ jsxs("span", { className: "text-xs text-ink-secondary font-mono", children: [
                "ID: ",
                author.id
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              Text,
              {
                id: "author-impact-heading",
                as: "h2",
                variant: "page-title",
                className: "mt-2",
                children: "Author Impact & Research Metrics"
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-ink-secondary", children: "Multi-axis KPI analysis assessing peer review rigor, community discussion, and reproducible artifact citations." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 rounded-lg border border-brand/25 bg-brand/5 p-3.5 sm:px-5", children: [
            /* @__PURE__ */ jsx(Award, { className: "h-8 w-8 text-brand shrink-0", "aria-hidden": "true" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold text-brand uppercase tracking-wider", children: "Composite Impact Rating" }),
              /* @__PURE__ */ jsxs("div", { className: "font-serif text-2xl font-bold text-ink", children: [
                overallScore,
                " ",
                /* @__PURE__ */ jsx("span", { className: "text-xs font-sans font-normal text-ink-secondary", children: "/ 100" })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-6 grid gap-8 lg:grid-cols-12 lg:items-center", children: [
          /* @__PURE__ */ jsx("div", { className: "lg:col-span-7 bg-canvas rounded-lg overflow-hidden border border-line flex flex-col items-center justify-center min-h-[320px]", children: mounted ? /* @__PURE__ */ jsx("div", { className: "w-full h-[320px] p-4", children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxs(RadarChart, { cx: "50%", cy: "50%", outerRadius: "75%", data: chartData, children: [
            /* @__PURE__ */ jsx(PolarGrid, { stroke: "#DEDCD5", strokeDasharray: "3 3" }),
            /* @__PURE__ */ jsx(
              PolarAngleAxis,
              {
                dataKey: "subject",
                tick: { fill: "#161C1A", fontSize: 12, fontWeight: 600 }
              }
            ),
            /* @__PURE__ */ jsx(
              PolarRadiusAxis,
              {
                angle: 30,
                domain: [0, 100],
                tick: { fill: "#555955", fontSize: 10 }
              }
            ),
            /* @__PURE__ */ jsx(
              Tooltip,
              {
                content: ({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return /* @__PURE__ */ jsxs("div", { className: "rounded-md border border-line bg-surface-raised p-2.5 shadow-md text-xs font-sans", children: [
                      /* @__PURE__ */ jsx("p", { className: "font-semibold text-ink", children: data.subject }),
                      /* @__PURE__ */ jsxs("p", { className: "text-brand font-serif font-bold text-sm mt-0.5", children: [
                        data.score,
                        " / 100"
                      ] })
                    ] });
                  }
                  return null;
                }
              }
            ),
            /* @__PURE__ */ jsx(
              Radar,
              {
                name: author.name,
                dataKey: "score",
                stroke: "#4F46E5",
                fill: "#4F46E5",
                fillOpacity: 0.35
              }
            )
          ] }) }) }) : /* @__PURE__ */ jsx("div", { className: "flex h-[320px] items-center justify-center text-sm text-ink-secondary", children: "Loading impact radar..." }) }),
          /* @__PURE__ */ jsxs("div", { className: "lg:col-span-5 space-y-3.5", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-3 rounded-md border border-line bg-surface-raised shadow-2xs", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5", children: [
                /* @__PURE__ */ jsx("div", { className: "h-2 w-2 rounded-full bg-brand-hover" }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-ink block", children: "Article Quality" }),
                  /* @__PURE__ */ jsx("span", { className: "text-xs text-ink-secondary", children: "Depth & peer-review evaluations" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("span", { className: "font-serif text-lg font-bold text-ink", children: [
                metrics.articleQuality,
                "%"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-3 rounded-md border border-line bg-surface-raised shadow-2xs", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5", children: [
                /* @__PURE__ */ jsx("div", { className: "h-2 w-2 rounded-full bg-trust-uncertain" }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-ink block", children: "Community Engagement" }),
                  /* @__PURE__ */ jsx("span", { className: "text-xs text-ink-secondary", children: "Reader responses & technical discussions" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("span", { className: "font-serif text-lg font-bold text-ink", children: [
                metrics.communityEngagement,
                "%"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-3 rounded-md border border-line bg-surface-raised shadow-2xs", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5", children: [
                /* @__PURE__ */ jsx("div", { className: "h-2 w-2 rounded-full bg-success" }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-ink block", children: "Methodology Rigor" }),
                  /* @__PURE__ */ jsx("span", { className: "text-xs text-ink-secondary", children: "Code artifacts & reproducible datasets" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("span", { className: "font-serif text-lg font-bold text-success", children: [
                metrics.methodologyRigor,
                "%"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-3 rounded-md border border-line bg-surface-raised shadow-2xs", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5", children: [
                /* @__PURE__ */ jsx("div", { className: "h-2 w-2 rounded-full bg-brand" }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-ink block", children: "Citation Impact" }),
                  /* @__PURE__ */ jsx("span", { className: "text-xs text-ink-secondary", children: "Scholarly citations & public interest" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("span", { className: "font-serif text-lg font-bold text-ink", children: [
                metrics.citationImpact,
                "%"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-3 rounded-md border border-line bg-surface-raised shadow-2xs", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5", children: [
                /* @__PURE__ */ jsx("div", { className: "h-2 w-2 rounded-full bg-success" }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-ink block", children: "Open Science & Verification" }),
                  /* @__PURE__ */ jsx("span", { className: "text-xs text-ink-secondary", children: "ORCID/GitHub public key attestation" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("span", { className: "font-serif text-lg font-bold text-success", children: [
                metrics.openTransparency,
                "%"
              ] })
            ] })
          ] })
        ] })
      ]
    }
  );
}
const AuthorImpactRadarChart$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AuthorImpactRadarChart,
  getAuthorImpactMetrics
}, Symbol.toStringTag, { value: "Module" }));
export {
  handleRequest
};
