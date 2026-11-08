/**
 * Accepts only same-origin relative paths for post-sign-in redirects, so a
 * crafted `?next=` can never bounce a fresh session to another site.
 */
export function safeNextPath(value: string | string[] | null | undefined, fallback = '/dashboard') {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\') || /[\x00-\x1f\x7f]/.test(candidate)) {
    return fallback;
  }
  if (candidate.startsWith('/login') || candidate.startsWith('/auth/callback')) return fallback;
  return candidate;
}
