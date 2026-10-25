'use client';

import { getSupabaseBrowserClient } from './client';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const BUCKET = 'blog-images';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Choose a JPEG, PNG, WebP, AVIF, or GIF image.';
  }
  if (file.size > MAX_BYTES) {
    return 'That image is larger than 5 MB. Resize it and try again.';
  }
  return null;
}

/**
 * Uploads an image to the public `blog-images` bucket and returns its public URL.
 * The bucket enforces the same type and size limits as a second line of defence.
 */
export async function uploadBlogImage(file: File): Promise<string> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);

  const supabase = getSupabaseBrowserClient();
  const extension = EXTENSIONS[file.type] ?? 'bin';
  const now = new Date();
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `uploads/${folder}/${unique}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error('The upload succeeded but no public URL was returned.');
  return data.publicUrl;
}
