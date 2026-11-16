import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDashboardUser, requireEditor } from '@/lib/cms/auth';

const { getUser, rpc } = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/supabase/config', () => ({ isSupabaseConfigured: true }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: async () => ({ auth: { getUser }, rpc }) }));

beforeEach(() => { vi.resetAllMocks(); });
describe('configured dashboard session and editor boundary', () => {
  it('rejects an expired session without reading editor access', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'session expired' } });
    expect(await requireEditor()).toMatchObject({ ok: false, status: 401 });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('fails closed when the editor lookup fails', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'reader-1', email: 'reader@example.org', user_metadata: {} } }, error: null });
    rpc.mockResolvedValue({ data: null, error: { message: 'not available' } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect((await getDashboardUser())?.isEditor).toBe(false);
      expect(await requireEditor()).toMatchObject({ ok: false, status: 403 });
    } finally { consoleError.mockRestore(); }
  });
  it('permits a confirmed editor and rejects a reader', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'reader@example.org', user_metadata: {} } }, error: null });
    rpc.mockResolvedValueOnce({ data: false, error: null }).mockResolvedValueOnce({ data: true, error: null });
    expect(await requireEditor()).toMatchObject({ ok: false, status: 403 });
    expect(await requireEditor()).toMatchObject({ ok: true, mode: 'supabase', user: { id: 'user-1', isEditor: true } });
  });
});
