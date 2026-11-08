/**
 * Stand-in for the `server-only` package under vitest.
 *
 * The real module throws on import outside a React Server Component, which makes
 * every module that guards itself with it untestable. It is a build-time marker
 * with no runtime behaviour, so replacing it with an empty module is safe and
 * lets lib/cms/{auth,authors,catalogue,read,store}.ts be exercised directly.
 */
export {};
