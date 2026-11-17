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

export type ConfiguredLanding = 'dashboard' | 'research-os' | 'feed' | 'library' | 'projects';

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
}): string {
  if (input.returnTo && input.returnTo !== '/' && isSafeInternalPath(input.returnTo)) {
    return input.returnTo.trim();
  }

  switch (input.configuredLanding) {
    case 'feed':
      return '/feed';
    case 'library':
      return '/library';
    case 'projects':
      return '/projects';
    case 'dashboard':
      return '/dashboard';
    case 'research-os':
    default:
      return '/research-os';
  }
}
