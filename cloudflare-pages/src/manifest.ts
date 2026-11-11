/**
 * Build-time view of the client build's manifest. The server build reads
 * dist/.vite/manifest.json in vite.config.server.ts and injects it via the
 * __RWM_CLIENT_MANIFEST__ define, so nothing here touches the filesystem at
 * request time.
 */
export interface ClientManifestEntry {
  file: string;
  css?: string[];
}

declare const __RWM_CLIENT_MANIFEST__: Record<string, ClientManifestEntry> | undefined;

const CLIENT_ENTRY_KEY = 'src/entry-client.tsx';

export function clientAssets(): ClientManifestEntry {
  const manifest = typeof __RWM_CLIENT_MANIFEST__ === 'undefined' ? {} : __RWM_CLIENT_MANIFEST__;
  const entry = manifest[CLIENT_ENTRY_KEY];
  if (!entry) {
    throw new Error('Client manifest is missing the entry chunk. Run the client build before the server build.');
  }
  return entry;
}
