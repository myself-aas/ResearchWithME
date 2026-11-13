import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EncodedImage } from '@/lib/images/process';

const uid = '7f9c2d1e-4b3a-4c5d-8e6f-0a1b2c3d4e5f';
const ORIGIN = 'https://abc.supabase.co';
const PUBLIC = `${ORIGIN}/storage/v1/object/public/profile-images/`;

type Err = { message: string } | null;

function fakeClient({ updateError = null, removeError = null }: { updateError?: Err; removeError?: Err } = {}) {
  const uploads: { bucket: string; path: string; opts: Record<string, unknown> }[] = [];
  const removes: { bucket: string; paths: string[] }[] = [];
  const updates: { table: string; values: Record<string, unknown>; column: string; value: unknown }[] = [];
  const client = {
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, _blob: Blob, opts: Record<string, unknown>) {
            uploads.push({ bucket, path, opts });
            return { data: { path }, error: null };
          },
          getPublicUrl(path: string) {
            return { data: { publicUrl: `${PUBLIC}${path}` } };
          },
          async remove(paths: string[]) {
            removes.push({ bucket, paths });
            return { data: null, error: removeError };
          },
        };
      },
    },
    from(table: string) {
      return {
        update(values: Record<string, unknown>) {
          return {
            async eq(column: string, value: unknown) {
              updates.push({ table, values, column, value });
              return { error: updateError };
            },
          };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, uploads, removes, updates };
}

const image: EncodedImage = { blob: new Blob(['a'], { type: 'image/webp' }), width: 512, height: 512, type: 'image/webp' };

async function load() {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', ORIGIN);
  vi.resetModules();
  return import('@/lib/profile-photo');
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('uploadOwnAvatar', () => {
  it("uploads into the user's own folder and saves the URL", async () => {
    const { uploadOwnAvatar } = await load();
    const { client, uploads, updates } = fakeClient();
    const url = await uploadOwnAvatar(image, uid, null, client);

    expect(uploads).toHaveLength(1);
    expect(uploads[0].bucket).toBe('profile-images');
    expect(uploads[0].path).toMatch(new RegExp(`^${uid}/avatar-[a-z0-9]+-[a-z0-9]{8}\\.webp$`));
    expect(uploads[0].opts).toEqual({ contentType: 'image/webp', cacheControl: '31536000', upsert: false });
    expect(url).toBe(`${PUBLIC}${uploads[0].path}`);
    expect(updates).toEqual([
      { table: 'profiles', values: { avatar_url: url }, column: 'user_id', value: uid },
    ]);
  });

  it("removes the user's previous photo", async () => {
    const { uploadOwnAvatar } = await load();
    const { client, removes } = fakeClient();
    await uploadOwnAvatar(image, uid, `${PUBLIC}${uid}/avatar-old.webp`, client);
    expect(removes).toEqual([{ bucket: 'profile-images', paths: [`${uid}/avatar-old.webp`] }]);
  });

  it("never removes someone else's photo or a foreign URL", async () => {
    const { uploadOwnAvatar } = await load();
    for (const previous of [`${PUBLIC}other-uid/a.webp`, 'https://evil.example/a.webp', `${PUBLIC}${uid}/../other/a.webp`]) {
      const { client, removes } = fakeClient();
      await uploadOwnAvatar(image, uid, previous, client);
      expect(removes).toEqual([]);
    }
  });

  it('does not fail when cleanup fails', async () => {
    const { uploadOwnAvatar } = await load();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { client } = fakeClient({ removeError: { message: 'nope' } });
    await expect(uploadOwnAvatar(image, uid, `${PUBLIC}${uid}/avatar-old.webp`, client)).resolves.toContain(PUBLIC);
    expect(warn).toHaveBeenCalled();
  });

  it('rolls back the upload when the profile update fails', async () => {
    const { uploadOwnAvatar } = await load();
    const { client, uploads, removes } = fakeClient({ updateError: { message: 'rls' } });
    await expect(uploadOwnAvatar(image, uid, `${PUBLIC}${uid}/avatar-old.webp`, client)).rejects.toThrow(
      'Your profile photo could not be saved. Try again.',
    );
    expect(removes).toEqual([{ bucket: 'profile-images', paths: [uploads[0].path] }]);
  });
});
