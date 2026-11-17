/**
 * ResearchWithME v3.4 Part VI §4.1 — Canonical Post-Auth Landing Resolution.
 *
 * Preserves deep links through authentication when safe (`isSafeInternalPath`),
 * otherwise resolves the user's configured default landing route:
 * - 'feed' -> '/feed'
 * - 'library' -> '/library'
 * - 'projects' -> '/projects'
 * - 'research-os' | 'dashboard' (default) -> '/research-os'
 */

import { safeNextPath } from '@/lib/safe-redirect';

export type ConfiguredLanding =
  | 'home'
  | 'dashboard'
  | 'research-os'
  | 'feed'
  | 'library'
  | 'projects'
  | 'last_workspace';

const VALID_LANDINGS = new Set<ConfiguredLanding>([
  'home',
  'dashboard',
  'research-os',
  'feed',
  'library',
  'projects',
  'last_workspace',
]);

export function parseConfiguredLanding(value: string | null | undefined): ConfiguredLanding | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase() as ConfiguredLanding;
  return VALID_LANDINGS.has(normalized) ? normalized : null;
}

export function isSafeInternalPath(path: string | null | undefined): boolean {
  if (!path) return false;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/')) return false;
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return false;
  return safeNextPath(trimmed, '__INVALID__') === trimmed;
}

export function resolvePostAuthDestination(input: {
  returnTo?: string | null;
  configuredLanding?: ConfiguredLanding | null;
  lastWorkspaceSlug?: string | null;
}): string {
  if (input.returnTo && input.returnTo !== '/' && isSafeInternalPath(input.returnTo)) {
    return input.returnTo.trim();
  }

  switch (input.configuredLanding) {
    case 'home':
      return '/?view=public';
    case 'feed':
      return '/feed';
    case 'library':
      return '/library';
    case 'projects':
      return '/projects';
    case 'last_workspace':
      return input.lastWorkspaceSlug
        ? `/workspaces/${encodeURIComponent(input.lastWorkspaceSlug)}`
        : '/workspaces';
    case 'dashboard':
      return '/dashboard';
    case 'research-os':
    default:
      return '/research-os';
  }
}

/**
 * Resolves whether an incoming request to `/` should redirect to the signed-in
 * user's configured default workspace/landing surface (Part VI §4.1).
 *
 * Anonymous visitors, explicit `/?view=public` requests, and category/search
 * queries always stay on the public HomeFeed (`null`).
 */
export function resolveHomeLandingRedirect(input: {
  isAuthenticated: boolean;
  viewParam?: string | null;
  hasFilterParams?: boolean;
  configuredLanding?: ConfiguredLanding | null;
  lastWorkspaceSlug?: string | null;
}): string | null {
  if (!input.isAuthenticated) return null;
  if (input.viewParam?.trim().toLowerCase() === 'public') return null;
  if (input.hasFilterParams) return null;

  const pref = input.configuredLanding;
  if (!pref || pref === 'home') return null;

  const target = resolvePostAuthDestination({
    configuredLanding: pref,
    lastWorkspaceSlug: input.lastWorkspaceSlug,
  });
  return target === '/' || target === '/?view=public' ? null : target;
}
