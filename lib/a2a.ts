import type { BlogPost } from './blog-data';

/** Public, read-only A2A interface. No OAuth or editorial privileges are implied. */
export function agentCard(siteUrl: string) {
  const origin = new URL(siteUrl).origin;
  return {
    name: 'ResearchWithMe Archive Agent',
    description: 'Find published ResearchWithMe reviews and their source articles. Answers are limited to the public archive.',
    version: '1.0.0',
    supportedInterfaces: [{ url: `${origin}/api/a2a`, protocolBinding: 'JSONRPC', protocolVersion: '1.0' }],
    capabilities: { streaming: false, pushNotifications: false },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    skills: [{
      id: 'search-published-reviews',
      name: 'Find published reviews',
      description: 'Search published articles by title, topic, tag, or reviewed artifact and return linked summaries. No external sources are searched.',
      tags: ['research', 'articles', 'search'],
    }],
  };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
const rpcError = (id: string | number | null, code: number, message: string, status = 200) =>
  json({ jsonrpc: '2.0', id, error: { code, message } }, status);

function archiveAnswer(query: string, posts: BlogPost[], siteUrl: string) {
  const terms = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((term) => term.length >= 3).slice(0, 12);
  const matches = posts.map((post) => ({
    post,
    score: terms.reduce((score, term) => score +
      (post.title.toLowerCase().includes(term) ? 4 : 0) +
      (post.tags.some((tag) => tag.toLowerCase().includes(term)) ? 3 : 0) +
      (post.summary.toLowerCase().includes(term) ? 2 : 0) +
      ((post.reviewedArtifact?.identifier ?? '').toLowerCase().includes(term) ? 3 : 0), 0),
  })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  if (!matches.length) return 'No published review matches that query. Try a title, topic, DOI, or repository name. Only the ResearchWithMe archive is searched.';
  return matches.map(({ post }) =>
    `${post.title} — ${post.author.name}\n${post.summary}\n${new URL(`/post/${encodeURIComponent(post.slug)}`, siteUrl)}`,
  ).join('\n\n');
}

/** Synchronous, text-only SendMessage: no tasks, streaming, or persistence. */
export async function handleA2aMessage(request: Request, loadPosts: () => Promise<BlogPost[]>, siteUrl: string) {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    return rpcError(null, -32600, 'Content-Type must be application/json.', 415);
  }
  if (Number(request.headers.get('content-length')) > 8192) return rpcError(null, -32600, 'Request too large.', 413);
  let payload: unknown;
  try {
    const text = await request.text();
    if (text.length > 8192) return rpcError(null, -32600, 'Request too large.', 413);
    payload = JSON.parse(text);
  } catch {
    return rpcError(null, -32700, 'Invalid JSON.');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return rpcError(null, -32600, 'Invalid request.');
  const rpc = payload as Record<string, unknown>;
  const id = (typeof rpc.id === 'string' && rpc.id.length <= 120) || (typeof rpc.id === 'number' && Number.isSafeInteger(rpc.id)) ? rpc.id as string | number : null;
  if (rpc.jsonrpc !== '2.0' || id === null || typeof rpc.method !== 'string') return rpcError(id, -32600, 'Invalid request.');
  if (rpc.method !== 'SendMessage') return rpcError(id, -32601, 'Method not supported.');
  const params = rpc.params;
  const message = params && typeof params === 'object' ? (params as Record<string, unknown>).message : null;
  if (!message || typeof message !== 'object' || Array.isArray(message)) return rpcError(id, -32602, 'A user message is required.');
  const input = message as Record<string, unknown>;
  const parts = input.parts;
  if (input.role !== 'ROLE_USER' || typeof input.messageId !== 'string' || !input.messageId.trim() ||
      input.messageId.length > 120 || input.taskId !== undefined ||
      (input.contextId !== undefined && (typeof input.contextId !== 'string' || !input.contextId || input.contextId.length > 120)) ||
      !Array.isArray(parts) || parts.length !== 1 || !parts[0] || typeof parts[0] !== 'object' ||
      typeof parts[0].text !== 'string' || !parts[0].text.trim() || parts[0].text.length > 600) {
    return rpcError(id, -32602, 'Send one text part (up to 600 characters) in a new user message.');
  }
  try {
    const answer = archiveAnswer(parts[0].text.trim(), await loadPosts(), siteUrl);
    return json({ jsonrpc: '2.0', id, result: { message: {
      messageId: crypto.randomUUID(), contextId: input.contextId ?? crypto.randomUUID(),
      role: 'ROLE_AGENT', parts: [{ text: answer, mediaType: 'text/plain' }],
    } } });
  } catch {
    return rpcError(id, -32603, 'The archive is unavailable.', 503);
  }
}
