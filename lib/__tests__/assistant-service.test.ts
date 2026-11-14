import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseAssistantAnswer, parseAssistantInput } from '@/lib/assistant/compose';
import { answerQuestion, setAssistantForTesting } from '@/lib/assistant/service';

const article = {
  id: 'a1', slug: 's', title: 'T', author: 'A', category: 'C', summary: 'S', keyTakeaways: ['k'], artifact: null,
};

afterEach(() => { setAssistantForTesting(null); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('answerQuestion', () => {
  it('uses the binding when present', async () => {
    const answer = vi.fn(async () => ({ answer: 'From worker', mode: 'MODEL', notice: null }));
    expect(await answerQuestion({ query: 'q', articles: [] }, { answer })).toEqual({ answer: 'From worker', mode: 'MODEL', notice: null });
    expect(answer).toHaveBeenCalledWith({ query: 'q', articles: [] });
  });
  it('falls back in-process when the binding throws', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = await answerQuestion({ query: 'q', articles: [] }, { answer: async () => { throw new Error('down'); } });
    expect(out.mode).toBe('CATALOG');
    expect(String(log.mock.calls[0][0])).toContain('assistant.binding_fallback');
  });
  it('falls back in-process when the worker reply is malformed', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = await answerQuestion({ query: 'q', articles: [] }, { answer: async () => ({ answer: '<script>', mode: 'OTHER' }) });
    expect(out.mode).toBe('CATALOG');
    expect(out.answer).toContain('No direct match');
  });
  it('answers in-process when there is no binding', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    expect((await answerQuestion({ query: 'q', articles: [] }, null)).mode).toBe('CATALOG');
  });
});

describe('parseAssistantAnswer', () => {
  it('accepts a well-formed reply and caps its length', () => {
    expect(parseAssistantAnswer({ answer: 'x', mode: 'MODEL', notice: null })).toEqual({ answer: 'x', mode: 'MODEL', notice: null });
    expect(parseAssistantAnswer({ answer: 'x'.repeat(30_000), mode: 'CATALOG', notice: 'n' })?.answer).toHaveLength(20_000);
  });
  it('rejects a malformed worker reply', () => {
    expect(parseAssistantAnswer({ answer: '', mode: 'MODEL', notice: null })).toBeNull();
    expect(parseAssistantAnswer({ answer: 'x', mode: 'OTHER', notice: null })).toBeNull();
    expect(parseAssistantAnswer({ answer: 'x', mode: 'MODEL', notice: 7 })).toBeNull();
    expect(parseAssistantAnswer(null)).toBeNull();
    expect(parseAssistantAnswer('text')).toBeNull();
  });
});

describe('parseAssistantInput', () => {
  it('accepts a well-formed input', () => {
    expect(parseAssistantInput({ query: ' q ', articles: [article], context: [article] })).toEqual({ query: 'q', articles: [article], context: [article] });
    expect(parseAssistantInput({ query: 'q', articles: [] })).toEqual({ query: 'q', articles: [] });
  });
  it('caps what the worker accepts', () => {
    expect(parseAssistantInput({ query: 'q', articles: new Array(5).fill(article) })).toBeNull();
    expect(parseAssistantInput({ query: 'q', articles: [], context: new Array(5).fill(article) })).toBeNull();
    expect(parseAssistantInput({ query: 'x'.repeat(601), articles: [] })).toBeNull();
    expect(parseAssistantInput({ query: '', articles: [] })).toBeNull();
    expect(parseAssistantInput({ query: 'q', articles: [{}] })).toBeNull();
    expect(parseAssistantInput({ query: 'q', articles: [{ ...article, summary: 'x'.repeat(4001) }] })).toBeNull();
    expect(parseAssistantInput({ query: 'q', articles: [{ ...article, keyTakeaways: new Array(21).fill('k') }] })).toBeNull();
    expect(parseAssistantInput({ query: 'q' })).toBeNull();
    expect(parseAssistantInput(null)).toBeNull();
  });
});
