'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import AuthorAvatar from '@/components/AuthorAvatar';
import { secondaryButtonClass } from '@/components/cms/styles';
import LazyImageCropDialog from '@/components/media/LazyImageCropDialog';
import type { Author } from '@/lib/blog-data';
import type { EncodedImage } from '@/lib/images/process';
import { uploadOwnAvatar } from '@/lib/profile-photo';

const UPDATED = 'Profile photo updated. It can take about a minute to appear on public pages.';

export default function ProfilePhotoCard({ userId, author }: { userId: string; author: Author }) {
  const router = useRouter();
  const [cropOpen, setCropOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleConfirm(images: EncodedImage[]) {
    await uploadOwnAvatar(images[0], userId, author.avatar || null);
    setSaved(true);
    setCropOpen(false);
    router.refresh();
  }

  return (
    <section
      aria-labelledby="profile-photo-heading"
      className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface-raised p-4"
    >
      <AuthorAvatar author={author} size="xl" />
      <div className="min-w-0 flex-1">
        <h2 id="profile-photo-heading" className="font-serif text-lg font-semibold text-ink">
          Profile photo
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
          Shown on your author page and bylines. Choose a JPEG up to 512 KB and crop it to a circle.
        </p>
        <button
          type="button"
          onClick={() => {
            setSaved(false);
            setCropOpen(true);
          }}
          aria-haspopup="dialog"
          className={`${secondaryButtonClass} mt-3`}
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          <span>Change photo</span>
        </button>
        <p role="status" className="mt-2 text-sm text-ink-secondary">
          {saved ? UPDATED : ''}
        </p>
      </div>
      {cropOpen && (
        <LazyImageCropDialog
          kind="avatar"
          open={cropOpen}
          onCancel={() => setCropOpen(false)}
          onConfirm={handleConfirm}
        />
      )}
    </section>
  );
}
