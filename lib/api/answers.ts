import 'server-only';

import { rankArticles, toAssistantArticle, toCitation } from '@/lib/assistant/retrieve';
import { answerQuestion } from '@/lib/assistant/service';
import type { AssistantCitation } from '@/lib/assistant/types';
import { getArticleCatalogue } from '@/lib/cms/catalogue';
import { SITE_URL } from '@/lib/seo';
import type { ApiErrorCode } from './errors';
import type { ApiKeyIdentity } from './key-store';
import { sha256Hex } from './keys';
import { LedgerUnavailableError, getLedger, monthlyIncluded, type Usage } from './ledger';

/**
 * One metered Assistant answer. Shared by `POST /api/v1/assistant/answers` and
 * the MCP tool `ask_archive`, so both spend the same allowance by the same rules.
 *
 * The order is the contract:
 *   claim (spends one unit, recognises a retry) → retrieve → answer → complete.
 * Anything that throws after the claim releases it, so a failed request costs
 * nothing.
 */

export const MAX_QUERY = 600;
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export interface AnswerBody {
  id: string;
  answer: string;
  citations: AssistantCitation[];
  mode: 'MODEL' | 'CATALOG';
  notice: string | null;
  usage: Usage;
}

export type AnswerOutcome =
  | { ok: true; body: AnswerBody; replayed: boolean }
  | { ok: false; code: ApiErrorCode; message: string; details?: Record<string, unknown> };

class ArchiveUnavailableError extends Error {}

function isAnswerBody(value: unknown): value is AnswerBody {
  const body = value as Partial<AnswerBody> | null;
  return Boolean(body && typeof body.id === 'string' && typeof body.answer === 'string' && Array.isArray(body.citations));
}

export async function runAnswer(input: {
  identity: ApiKeyIdentity;
  query: string;
  /** Client-supplied, already validated; or null to count every call separately. */
  idempotencyKey: string | null;
}): Promise<AnswerOutcome> {
  const started = Date.now();
  const { identity, query } = input;
  const ledger = getLedger();
  const included = monthlyIncluded();
  const log = (fields: Record<string, unknown>) =>
    console.log(JSON.stringify({ event: 'api.answer', keyId: identity.keyId, ...fields, ms: Date.now() - started }));

  let claim;
  try {
    claim = await ledger.claim({
      keyId: identity.keyId,
      idempotencyKey: input.idempotencyKey ?? `auto_${crypto.randomUUID()}`,
      requestHash: await sha256Hex(JSON.stringify({ query })),
      included,
    });
  } catch (error) {
    console.error('API ledger claim failed:', error instanceof Error ? error.message : error);
    log({ status: 503 });
    return { ok: false, code: 'UPSTREAM_UNAVAILABLE', message: 'Usage cannot be recorded right now, so no answer was produced. Try again shortly.' };
  }

  switch (claim.status) {
    case 'REPLAY':
      if (isAnswerBody(claim.response)) {
        log({ status: 200, replayed: true });
        return { ok: true, body: claim.response, replayed: true };
      }
      log({ status: 500 });
      return { ok: false, code: 'INTERNAL', message: 'The stored answer for this Idempotency-Key could not be read. Use a new key.' };
    case 'IN_FLIGHT':
      log({ status: 409 });
      return { ok: false, code: 'IDEMPOTENCY_IN_FLIGHT', message: 'The first request with this Idempotency-Key is still running. Retry shortly.' };
    case 'MISMATCH':
      log({ status: 422 });
      return { ok: false, code: 'IDEMPOTENCY_KEY_REUSED', message: 'This Idempotency-Key was already used with a different body.' };
    case 'UNKNOWN_KEY':
      // Revoked between authentication and the claim.
      log({ status: 401 });
      return { ok: false, code: 'UNAUTHENTICATED', message: 'A valid API key is required.' };
    case 'QUOTA_EXHAUSTED':
      log({ status: 429, quota: true });
      return {
        ok: false,
        code: 'QUOTA_EXHAUSTED',
        message: `The monthly allowance of ${claim.usage.requestsIncluded} answers is used. It resets on ${claim.usage.resetsAt.slice(0, 10)}.`,
        details: { resetsAt: claim.usage.resetsAt, requestsIncluded: claim.usage.requestsIncluded },
      };
  }

  const { requestId, usage } = claim;
  try {
    const archive = await getArticleCatalogue().catch((error: unknown) => {
      throw new ArchiveUnavailableError(error instanceof Error ? error.message : String(error));
    });
    const articles = rankArticles(query, archive).map(toAssistantArticle);
    const result = await answerQuestion({ query, articles, context: archive.slice(0, 4).map(toAssistantArticle) });

    const body: AnswerBody = {
      id: `req_${requestId.replace(/-/g, '').slice(0, 16)}`,
      answer: result.answer,
      citations: articles.map((article) => toCitation(article, SITE_URL)),
      mode: result.mode,
      notice: result.notice,
      usage,
    };

    try {
      await ledger.complete(requestId, result.mode, body);
    } catch (error) {
      // The answer exists and was counted; only its replay is lost. Returning it
      // is better than charging for an answer the caller never sees.
      console.error('API ledger completion failed:', error instanceof Error ? error.message : error);
    }
    log({ status: 200, requestId, mode: result.mode });
    return { ok: true, body, replayed: false };
  } catch (error) {
    console.error('API answer failed:', error instanceof Error ? error.message : error);
    await ledger.release(requestId).catch((releaseError: unknown) => {
      console.error('API ledger release failed:', releaseError instanceof Error ? releaseError.message : releaseError);
    });
    if (error instanceof ArchiveUnavailableError || error instanceof LedgerUnavailableError) {
      log({ status: 503, requestId });
      return { ok: false, code: 'UPSTREAM_UNAVAILABLE', message: 'The archive could not be reached. No allowance was used.' };
    }
    log({ status: 500, requestId });
    return { ok: false, code: 'INTERNAL', message: 'The answer could not be produced. No allowance was used.' };
  }
}
