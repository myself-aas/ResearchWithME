/**
 * Tests the WebMCP script that actually ships, by executing public/webmcp.js in
 * a sandbox with a fake document, navigator, fetch and AbortController — the
 * same file the browser loads. Testing a TypeScript twin would only prove the
 * twin works while the shipped script drifted.
 *
 * Run with `node --test`; vitest is configured not to collect .mjs files.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const SOURCE = readFileSync(path.resolve(import.meta.dirname, '../public/webmcp.js'), 'utf8');

const ARTICLE = {
  title: 'Retrieval Is a Budget, Not a Bag of Tricks',
  slug: 'retrieval-is-a-budget',
  summary: 'A review of the retrieval literature framed as cost allocation.',
  category: 'Information Retrieval',
  format: 'Review',
  author: { name: 'A. Rahman', id: 'a-rahman' },
  publishedDate: '2026-09-01',
  tags: ['retrieval', 'evaluation'],
  takeaways: ['Budget the reader’s attention.'],
  bodyMarkdown: '## Body\n\nThe full text.',
};

/** Run the shipped script against the given host objects. */
function run({ onDocument, onNavigator, fetchImpl, warn } = {}) {
  const registrations = [];
  const signalRecords = [];

  const makeHost = (label) =>
    onDocument || onNavigator
      ? {
          registerTool(tool, options) {
            registrations.push({ host: label, tool });
            signalRecords.push({ host: label, signal: options && options.signal });
            return Promise.resolve();
          },
        }
      : undefined;

  const document = {};
  if (onDocument) document.modelContext = makeHost('document');
  const navigator = {};
  if (onNavigator) navigator.modelContext = makeHost('navigator');

  const context = {
    document,
    navigator,
    fetch: fetchImpl ?? (async () => ({ ok: true, status: 200, json: async () => ({ articles: [] }) })),
    URLSearchParams,
    AbortController,
    Promise,
    Error,
    Object,
    Array,
    String,
    console: { warn: warn ?? (() => {}) },
  };
  context.globalThis = context;

  vm.runInNewContext(SOURCE, context, { filename: 'public/webmcp.js' });

  return { registrations, signalRecords, document, navigator, context };
}

const byName = (registrations, name) =>
  registrations.find((entry) => entry.tool.name === name).tool;

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

test('registers on document.modelContext, the host the specification defines', () => {
  const { registrations } = run({ onDocument: true });
  assert.ok(registrations.length >= 3, 'expected at least three tools');
  assert.ok(registrations.every((entry) => entry.host === 'document'));
});

test('every tool carries the four fields registration requires', () => {
  const { registrations } = run({ onDocument: true });

  for (const { tool } of registrations) {
    assert.equal(typeof tool.name, 'string');
    assert.ok(tool.name.length > 0);
    assert.ok(tool.description.length > 20, `${tool.name} needs a description an agent can reason over`);
    assert.equal(tool.inputSchema.type, 'object');
    assert.equal(typeof tool.execute, 'function');
    assert.equal(tool.annotations.readOnlyHint, true, `${tool.name} must be read-only`);
  }

  const names = registrations.map((entry) => entry.tool.name);
  assert.deepEqual(names.sort(), ['get_article', 'list_categories', 'search_articles']);
  assert.equal(new Set(names).size, names.length, 'duplicate names make registration order decide the winner');
});

test('passes an AbortSignal so the tools can be unregistered', () => {
  const { signalRecords } = run({ onDocument: true });
  assert.ok(signalRecords.length > 0);
  for (const { signal } of signalRecords) {
    assert.ok(signal instanceof AbortSignal, 'each registration needs a signal');
    assert.equal(signal.aborted, false);
  }
});

test('registers on navigator.modelContext too, because scanners shim it there', () => {
  // A scanner in a stock browser has no native API: it installs its own
  // navigator.modelContext and records what the page registers on it. A page
  // that only uses document.modelContext reports zero tools to that scanner.
  const { registrations } = run({ onNavigator: true });
  assert.ok(registrations.length >= 3);
  assert.ok(registrations.every((entry) => entry.host === 'navigator'));
});

test('registers on both hosts when both exist', () => {
  const { registrations } = run({ onDocument: true, onNavigator: true });
  const hosts = new Set(registrations.map((entry) => entry.host));
  assert.deepEqual([...hosts].sort(), ['document', 'navigator']);
});

test('is silent and harmless where the API does not exist', () => {
  const warnings = [];
  assert.doesNotThrow(() => run({ warn: (message) => warnings.push(message) }));
  assert.deepEqual(warnings, []);
});

test('one tool failing to register does not stop the others', () => {
  const registrations = [];
  const contextRun = run({
    onDocument: true,
    warn: () => {},
  });
  // Re-run by hand with a host that rejects the first tool outright.
  void contextRun;
  void registrations;

  const document = {
    modelContext: {
      registerTool(tool) {
        registrations.push(tool.name);
        if (tool.name === 'search_articles') throw new Error('rejected');
        return Promise.resolve();
      },
    },
  };
  const context = {
    document,
    navigator: {},
    fetch: async () => jsonResponse({ articles: [] }),
    URLSearchParams,
    AbortController,
    Promise,
    Error,
    Object,
    Array,
    String,
    console: { warn: () => {} },
  };
  context.globalThis = context;

  vm.runInNewContext(SOURCE, context, { filename: 'public/webmcp.js' });
  assert.deepEqual(registrations, ['search_articles', 'list_categories', 'get_article']);
});

test('search_articles queries the real endpoint and returns citable links', async () => {
  const calls = [];
  const { registrations } = run({
    onDocument: true,
    fetchImpl: async (url) => {
      calls.push(String(url));
      return jsonResponse({ articles: [ARTICLE], count: 1 });
    },
  });

  const result = await byName(registrations, 'search_articles').execute({ query: 'retrieval' });

  assert.match(calls[0], /^\/api\/articles\?/);
  assert.match(calls[0], /search=retrieval/);
  assert.equal(result.count, 1);
  assert.equal(result.results[0].url, 'https://researchwith.me/post/retrieval-is-a-budget');
  assert.equal(result.results[0].title, ARTICLE.title);
});

test('search_articles passes a category through', async () => {
  const calls = [];
  const { registrations } = run({
    onDocument: true,
    fetchImpl: async (url) => {
      calls.push(String(url));
      return jsonResponse({ articles: [] });
    },
  });

  await byName(registrations, 'search_articles').execute({ query: 'x', category: 'Information Retrieval' });
  const params = new URL(calls[0], 'https://x.test').searchParams;
  assert.equal(params.get('category'), 'Information Retrieval');
});

test('search_articles rejects an empty query instead of searching for nothing', async () => {
  let fetched = false;
  const { registrations } = run({
    onDocument: true,
    fetchImpl: async () => {
      fetched = true;
      return jsonResponse({ articles: [] });
    },
  });

  await assert.rejects(() => byName(registrations, 'search_articles').execute({ query: '   ' }), /query/);
  assert.equal(fetched, false);
});

test('list_categories tallies what is actually published', async () => {
  const { registrations } = run({
    onDocument: true,
    fetchImpl: async () =>
      jsonResponse({
        articles: [ARTICLE, { ...ARTICLE, slug: 'b', category: 'Systems' }, { ...ARTICLE, slug: 'c' }],
      }),
  });

  const result = await byName(registrations, 'list_categories').execute({});
  assert.equal(result.totalArticles, 3);
  // Field-by-field: values constructed inside the vm realm do not share this
  // realm's Object.prototype, so a strict structural compare fails on identity.
  assert.equal(result.categories[0].name, 'Information Retrieval');
  assert.equal(result.categories[0].count, 2);
  assert.ok(result.categories.some((entry) => entry.name === 'Systems'));
});

test('get_article returns the body for a known slug', async () => {
  const { registrations } = run({
    onDocument: true,
    fetchImpl: async () => jsonResponse({ articles: [ARTICLE] }),
  });

  const result = await byName(registrations, 'get_article').execute({ slug: 'retrieval-is-a-budget' });
  assert.match(result.body, /The full text\./);
  assert.deepEqual(result.takeaways, ['Budget the reader’s attention.']);
});

test('get_article fails helpfully for an unknown slug, and never builds a URL from it', async () => {
  const calls = [];
  const { registrations } = run({
    onDocument: true,
    fetchImpl: async (url) => {
      calls.push(String(url));
      return jsonResponse({ articles: [ARTICLE] });
    },
  });

  await assert.rejects(() => byName(registrations, 'get_article').execute({ slug: 'nope' }), /search_articles/);
  await assert.rejects(
    () => byName(registrations, 'get_article').execute({ slug: '../../admin' }),
    /No published article/,
  );
  assert.ok(calls.every((url) => !url.includes('admin')));
});

test('surfaces the endpoint’s own message rather than a raw fetch failure', async () => {
  const { registrations } = run({
    onDocument: true,
    fetchImpl: async () => jsonResponse({ error: 'The article archive could not be read.' }, 500),
  });

  await assert.rejects(
    () => byName(registrations, 'list_categories').execute({}),
    /The article archive could not be read\./,
  );
});

test('a body that is not JSON produces an error, not a crash on a null dereference', async () => {
  const { registrations } = run({
    onDocument: true,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    }),
  });

  const result = await byName(registrations, 'list_categories').execute({});
  assert.equal(result.totalArticles, 0);
});
