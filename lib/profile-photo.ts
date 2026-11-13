'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { EncodedImage } from '@/lib/images/process';
import { isProfileImageUrl, uniqueImageId } from '@/lib/images/urls';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const BUCKET = 'profile-images';
const PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/`;
const SAVE_ERROR = 'Your profile photo could not be saved. Try again.';

const EXTENSIONS: Record<EncodedImage['type'], string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
};

/** The object path inside `profile-images` for a URL in this user's folder, else null. */
function ownObjectPath(url: string | null, userId: string): string | null {
  if (!url || !isProfileImageUrl(url)) return null;
  const path = decodeURIComponent(new URL(url).pathname.slice(PUBLIC_PREFIX.length));
  if (!path.startsWith(`${userId}/`) || path.split('/').includes('..')) return null;
  return path;
}

/**
 * Stores a cropped 1:1 profile photo at `profile-images/<userId>/avatar-<id>.<ext>`
 * and points the owner's `profiles.avatar_url` at it. If the profile update
 * fails the new object is removed. The previous photo is removed best-effort,
 * and only when it lives in the caller's own folder.
 */
export async function uploadOwnAvatar(
  image: EncodedImage,
  userId: string,
  previousUrl: string | null,
  client: SupabaseClient = getSupabaseBrowserClient(),
): Promise<string> {
  const bucket = client.storage.from(BUCKET);
  const path = `${userId}/avatar-${uniqueImageId()}.${EXTENSIONS[image.type]}`;

  const { error: uploadError } = await bucket.upload(path, image.blob, {
    contentType: image.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = bucket.getPublicUrl(path);
  const publicUrl = data.publicUrl;
  if (!publicUrl) {
    await bucket.remove([path]);
    throw new Error('The upload succeeded but no public URL was returned.');
  }

  const { error: updateError } = await client
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('user_id', userId);
  if (updateError) {
    const { error: rollbackError } = await bucket.remove([path]);
    if (rollbackError) console.warn('Could not remove the unused profile photo:', rollbackError.message);
    throw new Error(SAVE_ERROR);
  }

  const oldPath = ownObjectPath(previousUrl, userId);
  if (oldPath && oldPath !== path) {
    const { error: removeError } = await bucket.remove([oldPath]);
    if (removeError) console.warn('Could not remove the previous profile photo:', removeError.message);
  }

  return publicUrl;
}
