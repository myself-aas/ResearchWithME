import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { vi } from 'vitest';

/**
 * Import a Next route handler against a fresh, empty data dir with Supabase
 * disabled, so the file-backed stores run. Call before importing anything else
 * from the app (vi.resetModules discards earlier module instances).
 */
export async function loadRoute<T>(modulePath: string): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rwm-next-'));
  vi.stubEnv('RWM_DATA_DIR', dir);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  vi.resetModules();
  return (await import(/* @vite-ignore */ modulePath)) as T;
}
