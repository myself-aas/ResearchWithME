/**
 * Ambient types for the generated Pages server bundle.
 *
 * `npm run build:pages` emits `cloudflare-pages/.server/entry-server.mjs`
 * (vite.config.server.ts). That artifact is intentionally not type-checked or
 * committed, so this wildcard declaration keeps `tsc --noEmit` green whether
 * or not a local build has been run yet.
 */
declare module '*entry-server.mjs' {
  export const handleRequest: (
    request: Request,
    env: import('../src/server/context').AppEnv,
    runtime: import('../src/server/context').RuntimeMode,
  ) => Promise<Response>;
}
