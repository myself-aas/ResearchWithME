import type { RequestContext } from '../context';
import { rateLimit } from '../context';
import { clientKey } from '../http';
import { json, type ApiRoute, type ApiHandler } from './registry';
import { getDashboardUser } from '../auth';
import { sanitizeSvgMarkup } from '@/lib/svg';
import { cleanText } from '@/lib/validation';
import { createDomainFallbackSvg } from '@/lib/avatar-fallback';
import { MODEL_TIMEOUT_MS } from '../models';

const FIELD_LIMITS = { name: 120, role: 120, domain: 120, bio: 400 } as const;

/**
 * Generates an SVG avatar customized to the author's academic domain and expertise.
 * Model-written avatars are a paid, editor-initiated action: `forceAi` must be set
 * and the caller must hold studio access. Everyone else — including every reader
 * loading an author page — gets the deterministic local avatar, so a page view
 * never spends the Gemini key.
 */
const authorAvatar: ApiHandler = async (ctx: RequestContext) => {
  const limit = await rateLimit(ctx, clientKey(ctx.request, 'author-avatar'), 6, 60_000);
  if (!limit.allowed) {
    return json(
      { error: 'Too many avatars requested in a short window. Wait a minute and try again.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await ctx.request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'The request body could not be read.' }, { status: 400 });
  }

  const name = cleanText(payload.name, FIELD_LIMITS.name);
  const role = cleanText(payload.role, FIELD_LIMITS.role);
  const domain = cleanText(payload.domain, FIELD_LIMITS.domain);
  const bio = cleanText(payload.bio, FIELD_LIMITS.bio);
  const authorId = cleanText(payload.authorId, 80);

  if (!name || !domain) {
    return json({ error: 'Author name and domain are required.' }, { status: 400 });
  }

  const wantsModel = payload.forceAi === true || payload.forceAi === 'true';

  if (wantsModel && ctx.env.GEMINI_API_KEY) {
    const user = await getDashboardUser(ctx);
    if (!user?.isEditor) {
      return json(
        { error: 'Model-generated avatars are a studio feature. Sign in with editor access to request one.' },
        { status: 403 },
      );
    }

    try {
      const prompt = `Generate a high-quality, professional, modern SVG profile avatar for a distinguished scholar and researcher:
Name: ${name}
Role: ${role}
Domain/Field: ${domain}
Bio summary: ${bio || domain}

Design Rules:
- Output ONLY pure, valid SVG code starting with <svg> and ending with </svg>. Do NOT wrap in markdown code blocks or quotes.
- ViewBox must be 0 0 200 200 with rx=24 or rounded container.
- Create an aesthetically appealing geometric or abstract scholarly illustration representing their field (${domain}) with their initials (${name.split(' ').map((w: string) => w[0]).join('')}) integrated smoothly.
- Use professional scholarly palette (deep stone, amber, emerald, indigo, gold).
- High visual quality, vector accuracy, valid SVG tags only.`;

      const text = await ctx.services.models.generateText({
        apiKey: ctx.env.GEMINI_API_KEY,
        model: ctx.env.GEMINI_MODEL || 'gemini-3.8-flash',
        prompt,
        timeoutMs: MODEL_TIMEOUT_MS,
      });

      const svg = sanitizeSvgMarkup(text);
      if (svg) {
        return json({ svg, authorId, source: 'gemini' });
      }
      console.warn('Gemini returned markup that failed sanitisation; using the local avatar.');
    } catch (error) {
      console.warn('Gemini avatar generation failed; using the local avatar:', error);
    }
  }

  // Deterministic domain-customized vector avatar. No external call, so it is
  // safe to serve to any reader on every page view.
  return json({
    svg: createDomainFallbackSvg(name, domain, role),
    authorId,
    source: 'domain-fallback',
  });
};

export const avatarRoutes: ApiRoute[] = [
  { path: '/api/author-avatar', handlers: { POST: authorAvatar } },
];
