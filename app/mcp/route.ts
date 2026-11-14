import { runAnswer } from '@/lib/api/answers';
import { authenticateApiRequest } from '@/lib/api/authenticate';
import { checkBurst } from '@/lib/api/burst';
import { sha256Hex } from '@/lib/api/keys';
import { handleMcp, type AskArchive } from '@/lib/mcp';
import { getArticleCatalogue } from '@/lib/cms/catalogue';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { SITE_URL } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function refusal(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
  return body?.error?.message ?? 'The request was refused.';
}

/**
 * `ask_archive` is the same metered answer as POST /api/v1/assistant/answers:
 * same key, same burst limit, same allowance (lib/api/answers.ts).
 *
 * A client that retries a call resends the same JSON-RPC id and question, so
 * the idempotency key is derived from both and the retry is counted once.
 * The id alone is not enough: clients restart their ids at 1 in every session.
 */
const askArchive: AskArchive = async (request, query, rpcId) => {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return { ok: false, message: await refusal(auth.response) };

  const burst = await checkBurst(auth.identity.keyId);
  if (!burst.allowed) return { ok: false, message: `Too many requests. Retry after ${burst.retryAfter} seconds.` };

  const idempotencyKey = `mcp_${(await sha256Hex(JSON.stringify([rpcId, query]))).slice(0, 40)}`;
  const outcome = await runAnswer({ identity: auth.identity, query, idempotencyKey });
  if (!outcome.ok) return { ok: false, message: outcome.message };

  const { answer, citations, notice, usage } = outcome.body;
  const sources = citations.length
    ? `\n\nSources:\n${citations.map((citation) => `- ${citation.title} (${citation.author}): ${citation.url}`).join('\n')}`
    : '';
  const note = notice ? `\n\nNote: ${notice}` : '';
  const allowance = `\n\n${usage.requestsUsed} of ${usage.requestsIncluded} answers used this month.`;
  return { ok: true, text: `${answer}${sources}${note}${allowance}` };
};

export async function POST(request: Request) {
  const limit = await rateLimit(clientKey(request, 'mcp'), 30, 60_000);
  if (!limit.allowed) return Response.json({ error: 'Too many requests.' }, {
    // retryAfter is already in seconds (lib/rate-limit-core.ts).
    status: 429, headers: { 'Retry-After': String(limit.retryAfter), 'Cache-Control': 'no-store' },
  });
  return handleMcp(request, getArticleCatalogue, SITE_URL, askArchive);
}

// This server does not provide a server-initiated SSE stream.
export function GET(request: Request) {
  return handleMcp(request, getArticleCatalogue, SITE_URL);
}
