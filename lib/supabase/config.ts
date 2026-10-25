/**
 * Single source of truth for Supabase configuration.
 *
 * The public environment variables are inlined by Next.js at build time, so a
 * deployed build must be rebuilt after changing them. Everything in this module
 * is safe to import from the browser.
 */

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

function isValidHttpUrl(value: string) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * True only when both public credentials are present and the URL is well formed.
 * When false the app runs in local demo mode: the CMS persists to JSON files and
 * the public site keeps using the bundled catalogue.
 */
export const isSupabaseConfigured = isValidHttpUrl(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 0;

/** Hostname used by next/image for the public storage bucket. */
export function supabaseStorageHostname() {
  if (!isSupabaseConfigured) return null;
  try {
    return new URL(SUPABASE_URL).hostname;
  } catch {
    return null;
  }
}
