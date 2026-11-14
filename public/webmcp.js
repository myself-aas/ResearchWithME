/*
 * WebMCP — the archive's tools, registered on page load.
 *
 * WebMCP (W3C Web Machine Learning CG draft) lets a page hand a browser agent a
 * set of callable functions with names, descriptions and JSON Schemas, so the
 * agent queries the archive instead of guessing at DOM selectors or driving the
 * reader's navigation.
 *
 * ── Why this is a static script and not a React effect ──────────────────────
 *
 * Cloudflare's agent-readiness scanner loads the page in a headless browser and
 * samples it a few seconds after navigation. A tool registered from a hydration
 * effect is registered only after the bundle has parsed, executed and committed —
 * and not at all if hydration fails, is delayed on a slow connection, or the
 * reader is on the Next.js build, whose layout is a different tree from the
 * production React SSR document. A classic script in <head> registers in both
 * builds, before anything can fail.
 *
 * ── Which host object ───────────────────────────────────────────────────────
 *
 * The specification puts the registry on `document.modelContext`; the earlier
 * preview builds used `navigator.modelContext`. A scanner running in a stock
 * browser has neither, so it installs its own `navigator.modelContext` shim and
 * records the calls it sees there. Registering into only one of the two means
 * failing on whichever build or shim the reader (or the scanner) happens to run:
 * whichever host exists gets every tool, and if both exist both get them.
 *
 * ── Absent API is not an error ──────────────────────────────────────────────
 *
 * Every browser that is not an enabled preview build lacks this API. This script
 * must be invisible there: no throw, no warning, no network. A page that logged
 * an error for the 99% in order to serve a scanner would be a bad trade.
 *
 * ── Read-only ───────────────────────────────────────────────────────────────
 *
 * Every tool reads the public archive. None writes, submits, spends, or moves the
 * reader. A scanner loads this page on every scan; if registering a tool had a
 * side effect, each scan would cause it.
 */
(function () {
  'use strict';

  var SITE = 'https://researchwith.me';

  // Registered synchronously for the same reason this file exists: a scanner
  // that samples the page early must still see a tool.
  var controller = typeof AbortController === 'function' ? new AbortController() : null;

  function asText(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
  }

  function summarise(article) {
    article = article || {};
    var author = article.author || {};
    return {
      title: article.title || '',
      slug: article.slug || '',
      url: article.slug ? SITE + '/post/' + String(article.slug) : '',
      summary: article.summary || '',
      category: article.category || '',
      author: author.name || '',
      publishedDate: article.publishedDate || '',
      tags: Array.isArray(article.tags) ? article.tags.slice(0, 8) : [],
    };
  }

  function readArchive(params) {
    return fetch('/api/articles?' + params, { headers: { accept: 'application/json' } }).then(function (response) {
      return response
        .json()
        .catch(function () {
          return null;
        })
        .then(function (body) {
          if (!response.ok) {
            var message =
              body && typeof body.error === 'string' ? body.error : 'The archive returned ' + response.status + '.';
            throw new Error(message);
          }
          return body || {};
        });
    });
  }

  var tools = [
    {
      name: 'search_articles',
      description:
        'Search the published ResearchWithMe archive by keyword. Matches titles, summaries, authors, tags, and the reviewed artifact. Start here: the other tools work from what this returns. Returns at most 10 results, each with a link.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Words to look for, compared case-insensitively against titles, summaries, authors, and tags.',
            minLength: 1,
            maxLength: 120,
          },
          category: {
            type: 'string',
            description: 'Optional. Narrow to one category. Omit to search every category.',
            maxLength: 60,
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: function (input) {
        var query = asText(input && input.query, 120);
        if (!query) return Promise.reject(new Error('A non-empty "query" is required.'));
        var category = asText(input && input.category, 60);

        var params = new URLSearchParams({ search: query, limit: '10' });
        if (category) params.set('category', category);

        return readArchive(params.toString()).then(function (body) {
          var articles = Array.isArray(body.articles) ? body.articles : [];
          return {
            query: query,
            count: articles.length,
            totalMatches: typeof body.count === 'number' ? body.count : articles.length,
            results: articles.map(summarise),
          };
        });
      },
    },
    {
      name: 'list_categories',
      description:
        'List the categories and formats present in the published archive, with how many articles each contains. Use it to choose a value for the category parameter rather than guessing one.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: function () {
        return readArchive('').then(function (body) {
          var articles = Array.isArray(body.articles) ? body.articles : [];
          function tally(key) {
            var counts = {};
            articles.forEach(function (article) {
              var value = article && typeof article[key] === 'string' ? article[key] : '';
              if (value) counts[value] = (counts[value] || 0) + 1;
            });
            return Object.keys(counts)
              .map(function (name) {
                return { name: name, count: counts[name] };
              })
              .sort(function (a, b) {
                return b.count - a.count || a.name.localeCompare(b.name);
              });
          }
          return { categories: tally('category'), formats: tally('format'), totalArticles: articles.length };
        });
      },
    },
    {
      name: 'get_article',
      description:
        'Fetch one published article by its slug, including its summary and body text. Get the slug from search_articles rather than constructing one; an unknown slug fails.',
      inputSchema: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: 'The article slug, exactly as returned by search_articles.',
            minLength: 1,
            maxLength: 200,
          },
        },
        required: ['slug'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: function (input) {
        var slug = asText(input && input.slug, 200);
        if (!slug) return Promise.reject(new Error('A non-empty "slug" is required.'));

        // Matched inside the catalogue, never spliced into a request path, so a
        // crafted slug cannot send the fetch somewhere else.
        return readArchive('full=1&limit=100').then(function (body) {
          var articles = Array.isArray(body.articles) ? body.articles : [];
          var found = null;
          for (var i = 0; i < articles.length; i += 1) {
            if (articles[i] && articles[i].slug === slug) {
              found = articles[i];
              break;
            }
          }
          if (!found) {
            throw new Error('No published article has the slug "' + slug + '". Use search_articles to find one.');
          }
          var result = summarise(found);
          result.readingTime = found.readTime || '';
          result.takeaways = Array.isArray(found.takeaways) ? found.takeaways : [];
          result.body =
            typeof found.bodyMarkdown === 'string' ? found.bodyMarkdown : found.content || '';
          return result;
        });
      },
    },
  ];

  /** Register into one host object; a failure in one must not stop the other. */
  function registerInto(host, label) {
    if (!host || typeof host.registerTool !== 'function') return false;
    for (var i = 0; i < tools.length; i += 1) {
      try {
        var options = controller ? { signal: controller.signal } : undefined;
        var pending = host.registerTool(tools[i], options);
        // The current draft returns a promise; an older sync shim returns
        // undefined. Swallow a rejection so one bad tool cannot reject the rest.
        if (pending && typeof pending.catch === 'function') pending.catch(function () {});
      } catch (error) {
        // Keep registering: a host that rejects one schema may accept another.
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('WebMCP: "' + tools[i].name + '" was not registered on ' + label + '.', error);
        }
      }
    }
    return true;
  }

  function start() {
    var registered = false;
    if (typeof document !== 'undefined') registered = registerInto(document.modelContext, 'document');
    if (typeof navigator !== 'undefined') {
      registered = registerInto(navigator.modelContext, 'navigator') || registered;
    }
    // No host object: every browser without the preview feature. Do nothing.
    return registered;
  }

  // Run on page load. A deferred script in <head> runs before any hydration, so
  // `document` and `navigator` are already present.
  start();
})();
