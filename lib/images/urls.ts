import { SUPABASE_URL } from '@/lib/supabase/config';

const PROFILE_PREFIX = '/storage/v1/object/public/profile-images/';
const COVER_PATH =
  /^\/storage\/v1\/object\/public\/blog-images\/covers\/\d{4}\/\d{2}\/[a-z0-9]+-[a-z0-9]{8}\.(webp|jpg)$/;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function parse(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function supabaseOrigin(): string | null {
  return parse(SUPABASE_URL)?.origin ?? null;
}

export function isProfileImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const parsed = parse(url);
  const origin = supabaseOrigin();
  return !!parsed && !!origin && parsed.origin === origin && parsed.pathname.startsWith(PROFILE_PREFIX);
}

export function uniqueImageId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let suffix = '';
  for (const b of bytes) suffix += ALPHABET[b % ALPHABET.length];
  return `${Date.now().toString(36)}-${suffix}`;
}

export function isProcessedCover(url: string): boolean {
  const parsed = parse(url);
  const origin = supabaseOrigin();
  return !!parsed && !!origin && parsed.origin === origin && COVER_PATH.test(parsed.pathname);
}

export function coverVariantUrl(url: string, width: number): string {
  return url.replace(/(\.[a-z0-9]+)(\?.*)?$/i, `-${width}$1$2`);
}

export function coverLoader({ src, width }: { src: string; width: number }): string {
  return width <= 800 ? coverVariantUrl(src, 800) : src;
}
