import { buildLlmsTxt } from '@/lib/content/llms-index';

/**
 * `/llms.txt` — the human-and-agent-readable index of what is here.
 *
 * This follows the llms.txt convention: an H1, a one-paragraph summary, then
 * annotated links. It is generated from the same content collection as the
 * site, so it cannot list a post that does not exist. It is an index, not a
 * second copy of the writing: every link resolves to the canonical page or to
 * that page's markdown representation.
 *
 * The text is built by `buildLlmsTxt` in `lib/content/llms-index.ts`, which
 * the MCP server's `get_llms_index` tool also renders through.
 */
export const dynamic = 'force-static';

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
