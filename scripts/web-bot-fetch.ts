/** Operator-invoked bot GET: npm exec tsx scripts/web-bot-fetch.ts -- https://example.org/robots.txt */
import { signedBotRequest } from '../lib/web-bot-auth';

async function main() {
  const target = process.argv[2];
  const privateJwk = process.env.WEB_BOT_AUTH_PRIVATE_JWK;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://researchwith.me';
  if (!target || !privateJwk) throw new Error('Provide an HTTPS target URL and WEB_BOT_AUTH_PRIVATE_JWK.');
  const request = await signedBotRequest(target, privateJwk, siteUrl);
  // Do not follow redirects with the original signature (it binds to the
  // original authority and target URI). Re-sign separately after review.
  const response = await fetch(request, { redirect: 'manual' });
  console.log(`HTTP ${response.status} ${response.url}`);
  if (!response.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
