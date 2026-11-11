/**
 * Inert stand-in for the `server-only` marker, aliased only into the SSR
 * build. The client build never sees this module — it fails the build on any
 * `server-only` import via the failOnServerOnly plugin in vite.config.ts.
 */
export {};
