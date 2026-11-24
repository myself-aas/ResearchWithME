import { CONTACT, SITE } from '@/lib/site';

/**
 * RFC 9116 security contact, generated so the domain comes from `SITE.url`
 * instead of being hardcoded in a static file.
 */
export const dynamic = 'force-static';

export function GET() {
  const expires = new Date();
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);

  const body = [
    `Contact: ${CONTACT.advisories}`,
    `Expires: ${expires.toISOString()}`,
    `Canonical: ${new URL('/.well-known/security.txt', SITE.url).toString()}`,
    'Preferred-Languages: en',
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
