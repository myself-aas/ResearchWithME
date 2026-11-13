import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { vi } from 'vitest';

/**
 * Import a Next route handler against a fresh, empty data dir with Supabase
 * disabled, so the file-backed stores run. Call before importing anything else
 * from the app (vi.resetModules discards earlier module instances).
 */
const createdDirs: string[] = [];

/** Remove the temp data dirs created by loadRoute; call from afterEach. */
export async function cleanupLoadedRoutes(): Promise<void> {
  const dirs = createdDirs.splice(0);
  await Promise.all(dirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
}

export async function loadRoute<T>(modulePath: string): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rwm-next-'));
  createdDirs.push(dir);
  vi.stubEnv('RWM_DATA_DIR', dir);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  vi.resetModules();
  return (await import(/* @vite-ignore */ modulePath)) as T;
}
